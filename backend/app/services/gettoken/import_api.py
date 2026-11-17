import base64
import httpx

from app.core.config import config_manager


class ApiError(Exception):
    def __init__(self, status_code, message=""):
        super().__init__(message)
        self.status_code = status_code


class EofficeAPI:
    def __init__(self):
        cfg = config_manager.get()
        creds = f"{cfg.app_username}:{cfg.app_password}"
        token = base64.b64encode(creds.encode()).decode()
        self._http = httpx.AsyncClient(
            base_url=cfg.import_host.rstrip("/"),
            headers={"Content-Type": "application/json", "Authorization": f"Basic {token}"},
            timeout=cfg.eoffice_timeout,
        )

    async def _get(self, path):
        resp = await self._http.get(path)
        if resp.status_code == 404:
            raise ApiError(404, "not found")
        if resp.status_code >= 400:
            raise ApiError(resp.status_code, resp.text)
        ctype = resp.headers.get("Content-Type", "")
        return resp.json() if ctype.startswith("application/json") else None

    async def get_info_by_id(self, account_id):
        return await self._get(f"/public_api/kdp/accounts/info/{account_id}")

    async def get_info_browser_by_id(self, account_id):
        return await self._get(f"/public_api/browser/get_info/{account_id}")

    async def close(self):
        await self._http.aclose()

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_):
        await self.close()