import sqlite3

from app.core.paths import db_path


SCHEMA_SQL = """
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS fingerprint (
    ID            INTEGER PRIMARY KEY AUTOINCREMENT,
    Group1        TEXT,
    Group2        TEXT,
    Device1       TEXT,
    Device2       TEXT,
    Device3       TEXT,
    GPU           TEXT,
    R6408         TEXT,
    R35661        TEXT,
    R36342        TEXT,
    Random        TEXT,
    User_agent    TEXT,
    Device_memory TEXT
);

CREATE TABLE IF NOT EXISTS browser (
    ID             INTEGER PRIMARY KEY AUTOINCREMENT,
    Proxy_type     TEXT,
    Proxy_ip       TEXT,
    Proxy_port     TEXT,
    Proxy_username TEXT,
    Proxy_password TEXT,
    User_agent     TEXT,
    Profile_name   TEXT
);

CREATE TABLE IF NOT EXISTS account (
    ID               INTEGER PRIMARY KEY AUTOINCREMENT,
    Uuid             TEXT UNIQUE NOT NULL,
    Email            TEXT UNIQUE NOT NULL,
    Password         TEXT,
    Recovery         TEXT,
    Two_fa           TEXT,
    Ext_id           TEXT,
    Client_id        TEXT,
    Browser_id       INTEGER,
    Fingerprint_id   INTEGER,
    Completed        INTEGER DEFAULT 0,
    Status           TEXT DEFAULT 'Unknown',
    Access_token     TEXT,
    Refresh_token    TEXT,
    Token_updated_at TEXT,
    Read_time        TEXT,
    Source           TEXT DEFAULT 'local',
    Origin_machine   TEXT,
    Created_at       TEXT,
    FOREIGN KEY (Browser_id)     REFERENCES browser(ID)     ON DELETE SET NULL,
    FOREIGN KEY (Fingerprint_id) REFERENCES fingerprint(ID) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS mail_json (
    ID           INTEGER PRIMARY KEY AUTOINCREMENT,
    Account_uuid TEXT NOT NULL,
    Content      TEXT,
    Read_time    TEXT,
    Created_at   TEXT,
    UNIQUE(Account_uuid),
    FOREIGN KEY (Account_uuid) REFERENCES account(Uuid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS shares (
    Key            TEXT PRIMARY KEY,
    Label          TEXT,
    Allowed_emails TEXT,
    Created_at     TEXT,
    Last_used_at   TEXT,
    Revoked        INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS share_peers (
    ID           INTEGER PRIMARY KEY AUTOINCREMENT,
    Name         TEXT,
    Url          TEXT NOT NULL,
    Key          TEXT NOT NULL,
    Gateway_mac  TEXT,
    Last_pull_at TEXT,
    UNIQUE(Url, Key)
);
"""

INDEXES = [
    "CREATE INDEX IF NOT EXISTS idx_account_status ON account(Status)",
    "CREATE INDEX IF NOT EXISTS idx_account_email ON account(Email)",
]

MIGRATIONS = {
    "account": [("Recovery", "TEXT"), ("Two_fa", "TEXT"), ("Ext_id", "TEXT")],
    "browser": [("Proxy_username", "TEXT"), ("Proxy_password", "TEXT"), ("User_agent", "TEXT")],
    "fingerprint": [("R36342", "TEXT")],
}


def _migrate(conn) -> None:
    for table, cols in MIGRATIONS.items():
        existing = {r[1] for r in conn.execute(f"PRAGMA table_info({table})").fetchall()}
        for name, coltype in cols:
            if name not in existing:
                try:
                    conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {coltype}")
                except sqlite3.OperationalError:
                    pass


def init_db() -> None:
    conn = sqlite3.connect(db_path())
    try:
        conn.executescript(SCHEMA_SQL)
        _migrate(conn)
        for idx in INDEXES:
            try:
                conn.execute(idx)
            except sqlite3.OperationalError:
                pass
        conn.commit()
    finally:
        conn.close()
