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


import socket, urllib3.util.connection as u
u.allowed_gai_family = lambda: socket.AF_INET   # ép IPv4

import time, requests
import google.auth.transport.requests as gatr
from google.oauth2.service_account import Credentials
from app.core.paths import service_account_path
from app.core.config import config_manager

cfg = config_manager.get()
creds = Credentials.from_service_account_file(str(service_account_path()),
        scopes=["https://www.googleapis.com/auth/spreadsheets.readonly"])
t=time.perf_counter(); creds.refresh(gatr.Request()); print("refresh:", round(time.perf_counter()-t,1),"s")
url=f"https://sheets.googleapis.com/v4/spreadsheets/{cfg.google_sheet_id}/values/{cfg.google_sheet_name}"
t=time.perf_counter()
r=requests.get(url, headers={"Authorization":f"Bearer {creds.token}"}, timeout=60)
print("values GET:", round(time.perf_counter()-t,1),"s", r.status_code, "rows=", len(r.json().get("values",[])))