import socket
import urllib3.util.connection as urllib3_cn
urllib3_cn.allowed_gai_family = lambda: socket.AF_INET  # ép IPv4 (tránh treo IPv6)

import requests
import google.auth.transport.requests as gatr
from google.oauth2.service_account import Credentials

from app.core.paths import service_account_path
from app.core.config import config_manager
from app.services.gettoken.schemas import SheetAccount  # sửa đúng nơi khai báo SheetAccount

SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"]


class GoogleSheetsService:
    def __init__(self):
        self._creds = Credentials.from_service_account_file(
            str(service_account_path()), scopes=SCOPES
        )

    def read_accounts(self, sheet_id=None, sheet_name=None):
        cfg = config_manager.get()
        sheet_id = sheet_id or cfg.google_sheet_id
        sheet_name = sheet_name or cfg.google_sheet_name

        self._creds.refresh(gatr.Request())
        url = f"https://sheets.googleapis.com/v4/spreadsheets/{sheet_id}/values/{sheet_name}"
        r = requests.get(
            url, headers={"Authorization": f"Bearer {self._creds.token}"}, timeout=30
        )
        r.raise_for_status()
        values = r.json().get("values", [])
        if not values:
            return []

        header = [h.strip() for h in values[0]]
        idx = {h: i for i, h in enumerate(header)}

        def col(row, name):
            i = idx.get(name)
            return row[i].strip() if (i is not None and i < len(row)) else ""

        accounts = []
        for row in values[1:]:
            raw_id = col(row, "ID") or col(row, "id")
            if not raw_id:
                continue
            try:
                account_id = int(raw_id)
            except ValueError:
                continue
            accounts.append(SheetAccount(
                id=account_id,
                email=col(row, "EMAIL") or col(row, "Email") or None,
                password=col(row, "Password") or None,
                recovery=col(row, "Recovery") or None,
                two_fa=col(row, "Two_Fa") or col(row, "Two_fa") or None,
            ))
        return accounts