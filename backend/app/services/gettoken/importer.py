import asyncio
import threading
from dataclasses import dataclass
from typing import Optional

from app.core.config import config_manager
from app.repositories import account_repo
from app.services.gettoken.import_api import EofficeAPI, ApiError
from app.services.gettoken.sheets import GoogleSheetsService
import traceback
from app.core.paths import service_account_path
import json
import time


_DEFAULT_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36"


@dataclass
class BrowserRow:
    account_id: int
    browser_type: Optional[str] = None
    proxy_type: Optional[str] = None
    proxy_ip: Optional[str] = None
    proxy_port: Optional[int] = None
    proxy_username: Optional[str] = None
    proxy_password: Optional[str] = None


@dataclass
class FingerprintRow:
    account_id: int
    group1: Optional[str] = None
    group2: Optional[str] = None
    device1: Optional[str] = None
    device2: Optional[str] = None
    device3: Optional[str] = None
    gpu: Optional[str] = None
    r6408: Optional[str] = None
    r35661: Optional[str] = None
    r36342: Optional[str] = None
    random: Optional[str] = None
    user_agent: Optional[str] = None
    device_memory: Optional[str] = None


@dataclass
class AccountRow:
    id: int
    email: Optional[str]
    password: Optional[str]
    recovery: Optional[str]
    two_fa: Optional[str]


class ImportJob:
    def __init__(self):
        self.running = False
        self.done = 0
        self.total = 0
        self.ok = 0
        self.failed = 0
        self.current = ""
        self.errors = []

    def snapshot(self):
        return {"running": self.running, "done": self.done, "total": self.total,
                "ok": self.ok, "failed": self.failed, "current": self.current,
                "errors": self.errors[-20:]}


_job = ImportJob()






def get_job():
    return _job


def start_import(sheet_id=None, sheet_name=None):
    if _job.running:
        return {"ok": False, "message": "Import already running."}
    cfg = config_manager.get()
    sid = sheet_id or cfg.google_sheet_id
    sname = sheet_name or cfg.google_sheet_name
    if not sid or not sname:
        return {"ok": False, "message": "Missing Google Sheet id/name."}
    _job.running = True
    _job.done = _job.ok = _job.failed = 0
    _job.total = 0
    _job.current = ""
    _job.errors = []
    threading.Thread(target=lambda: asyncio.run(_run(sid, sname, cfg.thread)), daemon=True).start()
    return {"ok": True, "message": "Import started."}


async def _safe(fn, *args):
    try:
        return await fn(*args)
    except ApiError as e:
        if e.status_code == 404:
            return None
        raise


async def _fetch_one(api, acc, sem):
    async with sem:
        t = time.perf_counter()
        account_data, browser_data = await asyncio.gather(
            _safe(api.get_info_by_id, acc.id),
            _safe(api.get_info_by_id, acc.id),
        )
        print(f"[import] .91 acc {acc.id}: {time.perf_counter()-t:.1f}s")

    browser = None
    if browser_data:
        info = browser_data.get("browser") or browser_data
        pp = info.get("proxy_port")
        browser = BrowserRow(
            account_id=acc.id,
            browser_type=info.get("browser_type"),
            proxy_type=info.get("proxy_type"),
            proxy_ip=info.get("proxy_ip"),
            proxy_port=int(pp) if pp else None,
            proxy_username=info.get("proxy_user"),
            proxy_password=info.get("proxy_pass"),
        )

    fingerprint = None
    if account_data:
        fp = (account_data.get("browser") or {}).get("finger_info") or account_data.get("tnm_finger_info") or {}
        gpm = fp.get("gpm") or {}
        gpm_data = gpm.get("gpm") or {}
        navigator = gpm_data.get("navigator") or {}
        fingerprint = FingerprintRow(
            account_id=acc.id,
            group1=fp.get("group1"),
            group2=fp.get("group2"),
            device1=fp.get("device1"),
            device2=fp.get("device2"),
            device3=fp.get("device3"),
            gpu=fp.get("DanaFP.webgl.GPU"),
            r6408=fp.get("DanaFP.webgl.R6408"),
            r35661=fp.get("DanaFP.webgl.R35661"),
            r36342=fp.get("DanaFP.webgl.R36349"),
            random=fp.get("DanaFP.webgl.Random"),
            user_agent=gpm_data.get("userAgent") or _DEFAULT_UA,
            device_memory=navigator.get("deviceMemory") or 16,
        )

    return AccountRow(acc.id, acc.email, acc.password, acc.recovery, acc.two_fa), browser, fingerprint

async def _run(sheet_id, sheet_name, thread):
    
    try:
        loop = asyncio.get_running_loop()
        t0 = time.perf_counter()
        try:
            sheet_accounts = await loop.run_in_executor(
                None, lambda: GoogleSheetsService().read_accounts(sheet_id, sheet_name)
            )
        except Exception as e:
            traceback.print_exc()
            _job.errors.append(f"sheet: {e}")
            return

        print(f"[import] sheet read: {time.perf_counter()-t0:.1f}s, rows={len(sheet_accounts)}")
        _job.total = len(sheet_accounts)
        step = max(1, thread)
        sem = asyncio.Semaphore(step)
        async with EofficeAPI() as api:
            for i in range(0, len(sheet_accounts), step):
                batch = sheet_accounts[i:i + step]
                results = await asyncio.gather(
                    *[_fetch_one(api, a, sem) for a in batch], return_exceptions=True
                )
                for acc, res in zip(batch, results):
                    _job.current = acc.email or str(acc.id)
                    if isinstance(res, Exception) or res is None:
                        if isinstance(res, Exception):
                            traceback.print_exception(type(res), res, res.__traceback__)
                        _job.failed += 1
                        _job.errors.append(f"{acc.id}: {res}")
                    else:
                        account_row, browser, fingerprint = res
                        try:
                            account_repo.import_rows(account_row, browser, fingerprint)
                            _job.ok += 1
                        except Exception as e:
                            traceback.print_exc()
                            _job.failed += 1
                            _job.errors.append(f"{acc.id}: db {e}")
                    _job.done += 1
    except Exception as e:
        traceback.print_exc()
        _job.errors.append(f"fatal: {e}")
    finally:
        _job.running = False
        _job.current = ""