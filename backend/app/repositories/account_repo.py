import json
import uuid as uuidlib
from datetime import datetime, timezone
from typing import Optional

from app.db.connection import get_conn, rows_to_dicts
from app.services.gettoken.schemas import AccountWithCredentials


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_uuid() -> str:
    return str(uuidlib.uuid4())

def import_rows(account_row, browser, fingerprint) -> None:
    now = _now()
    with get_conn() as conn:
        existing = conn.execute(
            "SELECT ID, Browser_id, Fingerprint_id FROM account WHERE Email = ? OR Ext_id = ?",
            (account_row.email, str(account_row.id)),
        ).fetchone()

        def upsert_fingerprint(fp_id):
            if fingerprint is None:
                return fp_id
            vals = (fingerprint.group1, fingerprint.group2, fingerprint.device1,
                    fingerprint.device2, fingerprint.device3, fingerprint.gpu,
                    fingerprint.r6408, fingerprint.r35661, fingerprint.r36342,
                    fingerprint.random, fingerprint.user_agent,
                    str(fingerprint.device_memory) if fingerprint.device_memory is not None else None)
            if fp_id:
                conn.execute("""UPDATE fingerprint SET Group1=?,Group2=?,Device1=?,Device2=?,Device3=?,
                    GPU=?,R6408=?,R35661=?,R36342=?,Random=?,User_agent=?,Device_memory=? WHERE ID=?""",
                    vals + (fp_id,))
                return fp_id
            cur = conn.execute("""INSERT INTO fingerprint
                (Group1,Group2,Device1,Device2,Device3,GPU,R6408,R35661,R36342,Random,User_agent,Device_memory)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""", vals)
            return cur.lastrowid

        def upsert_browser(br_id):
            if browser is None:
                return br_id
            vals = (browser.proxy_type, browser.proxy_ip,
                    str(browser.proxy_port) if browser.proxy_port is not None else None,
                    browser.proxy_username, browser.proxy_password,
                    fingerprint.user_agent if fingerprint else None, account_row.email)
            if br_id:
                conn.execute("""UPDATE browser SET Proxy_type=?,Proxy_ip=?,Proxy_port=?,
                    Proxy_username=?,Proxy_password=?,User_agent=?,Profile_name=? WHERE ID=?""",
                    vals + (br_id,))
                return br_id
            cur = conn.execute("""INSERT INTO browser
                (Proxy_type,Proxy_ip,Proxy_port,Proxy_username,Proxy_password,User_agent,Profile_name)
                VALUES (?,?,?,?,?,?,?)""", vals)
            return cur.lastrowid

        if existing:
            fp_id = upsert_fingerprint(existing["Fingerprint_id"])
            br_id = upsert_browser(existing["Browser_id"])
            conn.execute(
                "UPDATE account SET Password=?, Recovery=?, Two_fa=?, Browser_id=?, Fingerprint_id=?, Completed=0 WHERE ID=?",
                (account_row.password, account_row.recovery, account_row.two_fa, br_id, fp_id, existing["ID"]),
            )
        else:
            fp_id = upsert_fingerprint(None)
            br_id = upsert_browser(None)
            conn.execute(
                """INSERT INTO account
                   (Uuid, Ext_id, Email, Password, Recovery, Two_fa, Browser_id, Fingerprint_id,
                    Completed, Source, Created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'local', ?)""",
                (new_uuid(), str(account_row.id), account_row.email, account_row.password,
                 account_row.recovery, account_row.two_fa, br_id, fp_id, now),
            )
            
            
def paginate(offset: int = 0, limit: int = 25) -> dict:
    with get_conn() as conn:
        total = conn.execute("SELECT COUNT(*) AS c FROM account").fetchone()["c"]
        rows = conn.execute(
            """SELECT ID, Ext_id, Uuid, Email, Profile_name, Status, Completed,
                      Read_time, Source, Created_at
               FROM (SELECT a.*, b.Profile_name FROM account a
                     LEFT JOIN browser b ON b.ID = a.Browser_id)
               ORDER BY Created_at DESC LIMIT ? OFFSET ?""",
            (limit, offset),
        ).fetchall()
    return {"total": total, "data": rows_to_dicts(rows)}

import json

def _norm_list(v):
   
    if not v:
        return []
    if isinstance(v, (str, int)):
        v = [v]
    return [str(x).strip() for x in v if str(x).strip()]


def search(account_ids=None, emails=None, status=None, date_from=None, date_to=None,
           account_id=None, email=None) -> list[dict]:
    
    ids = _norm_list(account_ids) or _norm_list(account_id)
    mails = _norm_list(emails) or _norm_list(email)

    clauses, params = [], []

    if len(ids) == 1:
        
        clauses.append("CAST(Ext_id AS TEXT) LIKE ?"); params.append(f"%{ids[0]}%")
    elif ids:
        
        clauses.append("CAST(Ext_id AS TEXT) IN (SELECT value FROM json_each(?))")
        params.append(json.dumps(ids))

    if len(mails) == 1:
        clauses.append("Email LIKE ?"); params.append(f"%{mails[0]}%")
    elif mails:
        clauses.append("LOWER(Email) IN (SELECT LOWER(value) FROM json_each(?))")
        params.append(json.dumps(mails))

    if status:
        clauses.append("Status = ?"); params.append(status)
    if date_from:
        clauses.append("date(Created_at) >= ?"); params.append(date_from)
    if date_to:
        clauses.append("date(Created_at) <= ?"); params.append(date_to)

    where = (" WHERE " + " AND ".join(clauses)) if clauses else ""
    with get_conn() as conn:
        rows = conn.execute(
            f"""SELECT ID, Ext_id, Uuid, Email, Status, Completed, Read_time, Source, Created_at
                FROM account{where} ORDER BY Created_at DESC""",
            params,
        ).fetchall()
    return rows_to_dicts(rows)

def status_counts() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT Status AS status, COUNT(*) AS count FROM account GROUP BY Status"
        ).fetchall()
    return rows_to_dicts(rows)


def get_detail(account_id: int) -> Optional[dict]:
    with get_conn() as conn:
        acc = conn.execute("SELECT * FROM account WHERE ID = ?", (account_id,)).fetchone()
        if not acc:
            return None
        acc = dict(acc)
        mail = conn.execute(
            "SELECT Content FROM mail_json WHERE Account_uuid = ?", (acc["Uuid"],)
        ).fetchone()
    acc["listmail"] = mail["Content"] if mail else None
    for k in ("Access_token", "Refresh_token", "Password", "Two_fa", "Recovery"):
        acc.pop(k, None)
    return acc


def list_emails() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT Email, Status, Read_time FROM account
               WHERE Uuid IN (SELECT Account_uuid FROM mail_json)
               ORDER BY Read_time DESC"""
        ).fetchall()
    return rows_to_dicts(rows)


def list_for_share(allowed_emails: Optional[list[str]]) -> list[dict]:
    with get_conn() as conn:
        base = """SELECT a.Email AS email, a.Status AS status, a.Read_time AS read_time,
                         m.Content AS json_hotmail
                  FROM account a JOIN mail_json m ON m.Account_uuid = a.Uuid"""
        if allowed_emails:
            ph = ",".join("?" for _ in allowed_emails)
            rows = conn.execute(f"{base} WHERE a.Email IN ({ph})", allowed_emails).fetchall()
        else:
            rows = conn.execute(base).fetchall()
    out = []
    for r in rows:
        d = dict(r)
        if d.get("json_hotmail"):
            try:
                d["json_hotmail"] = json.loads(d["json_hotmail"])
            except Exception:
                pass
        out.append(d)
    return out


def upsert_shared(item: dict, origin_machine: str) -> str:
    email = item["email"]
    status = item.get("status", "Unknown")
    read_time = item.get("read_time")
    content = item.get("json_hotmail")
    if isinstance(content, (dict, list)):
        content = json.dumps(content, ensure_ascii=False)

    with get_conn() as conn:
        existing = conn.execute(
            "SELECT Uuid, Read_time FROM account WHERE Email = ?", (email,)
        ).fetchone()
        if existing:
            acc_uuid = existing["Uuid"]
            if existing["Read_time"] and read_time and read_time <= existing["Read_time"]:
                return acc_uuid
            conn.execute(
                """UPDATE account SET Status=?, Read_time=?, Source='shared', Origin_machine=?
                   WHERE Email=?""",
                (status, read_time, origin_machine, email),
            )
        else:
            acc_uuid = new_uuid()
            conn.execute(
                """INSERT INTO account
                   (Uuid, Email, Status, Completed, Read_time, Source, Origin_machine, Created_at)
                   VALUES (?, ?, ?, 1, ?, 'shared', ?, ?)""",
                (acc_uuid, email, status, read_time, origin_machine, _now()),
            )
        if content is not None:
            conn.execute(
                """INSERT INTO mail_json (Account_uuid, Content, Read_time, Created_at)
                   VALUES (?, ?, ?, ?)
                   ON CONFLICT(Account_uuid) DO UPDATE SET
                       Content=excluded.Content, Read_time=excluded.Read_time""",
                (acc_uuid, content, read_time, _now()),
            )
    return acc_uuid


def list_accounts_with_credentials(limit: Optional[int] = None) -> list[AccountWithCredentials]:
    q = """SELECT a.ID, a.Email, a.Password, a.Recovery, a.Two_fa,
                  b.Proxy_type, b.Proxy_ip, b.Proxy_port, b.Proxy_username, b.Proxy_password,
                  f.User_agent, f.Device_memory, f.Group1, f.Group2, f.Device1, f.Device2,
                  f.Device3, f.GPU, f.R6408, f.R35661, f.R36342, f.Random
           FROM account a
           LEFT JOIN browser b ON b.ID = a.Browser_id
           LEFT JOIN fingerprint f ON f.ID = a.Fingerprint_id
           WHERE a.Email IS NOT NULL AND a.Password IS NOT NULL AND a.Completed = 0
           ORDER BY a.ID"""
    if limit:
        q += f" LIMIT {int(limit)}"
    with get_conn() as conn:
        rows = conn.execute(q).fetchall()
    return [
        AccountWithCredentials(
            id=r["ID"], email=r["Email"], password=r["Password"], recovery=r["Recovery"],
            two_fa=r["Two_fa"], proxy_type=r["Proxy_type"], proxy_ip=r["Proxy_ip"],
            proxy_port=r["Proxy_port"], proxy_username=r["Proxy_username"],
            proxy_password=r["Proxy_password"], user_agent=r["User_agent"],
            device_memory=r["Device_memory"], group1=r["Group1"], group2=r["Group2"],
            device1=r["Device1"], device2=r["Device2"], device3=r["Device3"], gpu=r["GPU"],
            r6408=r["R6408"], r35661=r["R35661"], r36342=r["R36342"], random=r["Random"],
        )
        for r in rows
    ]


def save_capture_result(account_id, email, status, list_mail, access_token, refresh_token) -> None:
    content = json.dumps(list_mail, ensure_ascii=False) if isinstance(list_mail, (dict, list)) else list_mail
    now = _now()
    with get_conn() as conn:
        row = conn.execute("SELECT Uuid FROM account WHERE ID = ?", (account_id,)).fetchone()
        acc_uuid = row["Uuid"] if row and row["Uuid"] else new_uuid()
        if row:
            conn.execute(
                """UPDATE account SET Uuid=?, Status=?, Completed=1, Read_time=?,
                       Access_token=?, Refresh_token=?, Token_updated_at=?, Source='local'
                   WHERE ID=?""",
                (acc_uuid, status, now, access_token, refresh_token, now, account_id),
            )
        else:
            conn.execute(
                """INSERT INTO account (Uuid, Email, Status, Completed, Read_time,
                       Access_token, Refresh_token, Token_updated_at, Source, Created_at)
                   VALUES (?, ?, ?, 1, ?, ?, ?, ?, 'local', ?)""",
                (acc_uuid, email, status, now, access_token, refresh_token, now, now),
            )
        if content is not None:
            conn.execute(
                """INSERT INTO mail_json (Account_uuid, Content, Read_time, Created_at)
                   VALUES (?, ?, ?, ?)
                   ON CONFLICT(Account_uuid) DO UPDATE SET
                       Content=excluded.Content, Read_time=excluded.Read_time""",
                (acc_uuid, content, now, now),
            )
