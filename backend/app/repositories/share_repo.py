import json
import secrets
from datetime import datetime, timezone
from typing import Optional

from app.db.connection import get_conn, rows_to_dicts


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_share(label: str, allowed_emails: Optional[list[str]]) -> dict:
    key = secrets.token_urlsafe(24)
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO shares (Key, Label, Allowed_emails, Created_at, Revoked) VALUES (?, ?, ?, ?, 0)",
            (key, label, json.dumps(allowed_emails or []), _now()),
        )
    return {"key": key, "label": label, "allowed_emails": allowed_emails or []}


def list_shares() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT Key, Label, Allowed_emails, Created_at, Last_used_at, Revoked "
            "FROM shares ORDER BY Created_at DESC"
        ).fetchall()
    out = []
    for r in rows:
        d = dict(r)
        d["Allowed_emails"] = json.loads(d.get("Allowed_emails") or "[]")
        out.append(d)
    return out


def revoke_share(key: str) -> None:
    with get_conn() as conn:
        conn.execute("UPDATE shares SET Revoked = 1 WHERE Key = ?", (key,))


def resolve_key(key: str) -> Optional[dict]:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT Key, Allowed_emails, Revoked FROM shares WHERE Key = ?", (key,)
        ).fetchone()
        if not row or row["Revoked"]:
            return None
        conn.execute("UPDATE shares SET Last_used_at = ? WHERE Key = ?", (_now(), key))
    return {"key": row["Key"], "allowed_emails": json.loads(row["Allowed_emails"] or "[]")}


def add_peer(name: str, url: str, key: str, gateway_mac: Optional[str]) -> dict:
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO share_peers (Name, Url, Key, Gateway_mac) VALUES (?, ?, ?, ?)
               ON CONFLICT(Url, Key) DO UPDATE SET Name=excluded.Name, Gateway_mac=excluded.Gateway_mac""",
            (name, url.rstrip("/"), key, gateway_mac),
        )
        row = conn.execute(
            "SELECT * FROM share_peers WHERE Url = ? AND Key = ?", (url.rstrip("/"), key)
        ).fetchone()
    return dict(row)


def list_peers() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT ID, Name, Url, Gateway_mac, Last_pull_at FROM share_peers ORDER BY ID DESC"
        ).fetchall()
    return rows_to_dicts(rows)


def get_peer(peer_id: int) -> Optional[dict]:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM share_peers WHERE ID = ?", (peer_id,)).fetchone()
    return dict(row) if row else None


def delete_peer(peer_id: int) -> None:
    with get_conn() as conn:
        conn.execute("DELETE FROM share_peers WHERE ID = ?", (peer_id,))


def touch_peer(peer_id: int) -> None:
    with get_conn() as conn:
        conn.execute("UPDATE share_peers SET Last_pull_at = ? WHERE ID = ?", (_now(), peer_id))
