# import asyncio
# from app.db.schema import init_db
# init_db()
# from app.core.config import config_manager
# from app.services.gettoken import importer

# cfg = config_manager.get()
# print("reading sheet...", cfg.google_sheet_id, cfg.google_sheet_name)
# asyncio.run(importer._run(cfg.google_sheet_id, cfg.google_sheet_name, cfg.thread))
# print("JOB:", importer.get_job().snapshot())



# import gspread
# import google.auth.transport.requests as t
# from google.oauth2.service_account import Credentials
# from app.core.paths import service_account_path

# SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly",
#           "https://www.googleapis.com/auth/drive.readonly"]

# print("1 load creds")
# creds = Credentials.from_service_account_file(str(service_account_path()), scopes=SCOPES)
# print("   client_email:", creds.service_account_email)

# print("2 refresh token ...")
# creds.refresh(t.Request())
# print("   token ok:", bool(creds.token))

# print("3 authorize")
# gc = gspread.authorize(creds)
# try:
#     gc.set_timeout(20)
#     print("   set_timeout ok")
# except Exception as e:
#     print("   set_timeout NOT available:", e)

# print("4 open_by_key ...")
# sh = gc.open_by_key("1TQ-5WDFUgp9emWhQlDhO7E7O8aLpvocQMHrbsN4pdVE")
# print("   title:", sh.title)

# print("5 worksheet test2 ...")
# ws = sh.worksheet("test2")
# print("   row_count:", ws.row_count)
# print("DONE")

import sqlite3, os
db = os.path.join(os.environ["LOCALAPPDATA"], "tnmhotmail", "tnm_tool.db")
c = sqlite3.connect(db)
n = c.execute("""SELECT COUNT(*) FROM account a
  WHERE a.Email IS NOT NULL AND a.Password IS NOT NULL AND a.Completed=0""").fetchone()[0]
print("eligible:", n)
print("tables  :", [r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type='table'")])