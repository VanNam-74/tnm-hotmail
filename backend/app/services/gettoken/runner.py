import asyncio
import threading
from typing import Optional

from app.repositories import account_repo
from app.services.classify import classify_listmail
from app.services.gettoken.microsoft_auth import MicrosoftAuthClient
from app.services.gettoken.schemas import TokenResult
import httpx
from datetime import datetime, timezone, timedelta
class GetTokenJob:
    def __init__(self):
        self.running = False
        self.done = 0
        self.total = 0
        self.current = ""
        self.ok = 0
        self.failed = 0
        self.errors: list[str] = []
        self._thread: Optional[threading.Thread] = None

    def snapshot(self) -> dict:
        return {
            "running": self.running,
            "done": self.done,
            "total": self.total,
            "current": self.current,
            "ok": self.ok,
            "failed": self.failed,
            "errors": self.errors[-20:],
        }


_job = GetTokenJob()

async def _read_mail_with_token(access_token):
    params = {"$top": 30,
              "$select": "id,subject,from,receivedDateTime,bodyPreview,body",
              "$orderby": "receivedDateTime desc"}
    try:
        async with httpx.AsyncClient(timeout=20) as c:
            r = await c.get("https://graph.microsoft.com/v1.0/me/messages",
                            params=params, headers={"Authorization": f"Bearer {access_token}"})
        if r.status_code == 200:
            return r.json()
    except Exception:
        pass
    return None


def get_job() -> GetTokenJob:
    return _job


def start_job(client_id: str, batch_size: int, max_concurrent: int, limit: Optional[int]) -> dict:
    if _job.running:
        return {"ok": False, "message": "A job is already running."}
    if not client_id:
        return {"ok": False, "message": "Missing OAuth client_id (set it in config)."}

    accounts = account_repo.list_accounts_with_credentials(limit=limit)
    if not accounts:
        return {"ok": False, "message": "No accounts with credentials to process."}

    _job.running = True
    _job.total = len(accounts)
    _job.done = _job.ok = _job.failed = 0
    _job.current = ""
    _job.errors = []

    _job._thread = threading.Thread(
        target=lambda: asyncio.run(_run(accounts, client_id, batch_size, max_concurrent)),
        daemon=True,
    )
    _job._thread.start()
    return {"ok": True, "message": f"Started on {len(accounts)} accounts.", "total": len(accounts)}


async def _run(accounts, client_id, batch_size, max_concurrent):
    batch_size = max(1, int(batch_size or 1))
    max_concurrent = max(1, int(max_concurrent or 1))
    sem = asyncio.Semaphore(max_concurrent)
    queue: asyncio.Queue = asyncio.Queue()

    async def process(acc):
        async with sem:
            _job.current = acc.email
            try:
                client = MicrosoftAuthClient(client_id)
                data, _ = await client.login_and_get_code(acc, queue)
                if not data or not data.get("code"):
                    _job.failed += 1
                    _job.errors.append(f"{acc.email}: no code")
                else:
                    list_mail = data.get("list_mail") or {}
                    status, _m = classify_listmail(list_mail if isinstance(list_mail, dict) else {})
                    expires_at = None
                    ein = data.get("expires_in")
                    if ein:
                        expires_at = (datetime.now(timezone.utc) + timedelta(seconds=int(ein))).isoformat()
                    account_repo.save_capture_result(acc.id, acc.email, status, list_mail,
                        data.get("access_token"), data.get("refresh_token"), expires_at,
                        die_date=(_m or {}).get("receivedDateTime"))
                    _job.ok += 1
                _job.done += 1
            except Exception as e:
                _job.failed += 1
                _job.done += 1
                _job.errors.append(f"{acc.email}: {type(e).__name__}: {e}")

    try:
        for i in range(0, len(accounts), batch_size):
            batch = accounts[i:i + batch_size]
            await asyncio.gather(*(process(a) for a in batch), return_exceptions=True)
    finally:
        _job.running = False
        _job.current = ""
