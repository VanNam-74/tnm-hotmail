from app.db.connection import get_conn

with get_conn() as conn:
    conn.execute("DELETE FROM mail_json")
    conn.execute("DELETE FROM account")
    conn.execute("DELETE FROM browser")
    conn.execute("DELETE FROM fingerprint")
    conn.execute(
        "DELETE FROM sqlite_sequence WHERE name IN ('account','browser','fingerprint','mail_json')"
    )
print("cleared account / browser / fingerprint / mail_json")