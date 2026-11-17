from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from app.core.config import config_manager
from app.repositories import account_repo
from app.services.gettoken import runner
from app.services.gettoken import importer
from app.core.paths import get_client_email

router = APIRouter(prefix="/api/gettoken", tags=["gettoken"])


@router.get("/available")
def available():
    return {"available": True}




@router.get("/config")
def get_config():
    cfg = config_manager.get()
    sa_email = get_client_email()
    return {
        "client_id": cfg.client_id,
        "google_sheet_id": cfg.google_sheet_id,
        "google_sheet_name": cfg.google_sheet_name,
        "thread": cfg.thread,
        "headless": cfg.headless,
        "pending_accounts": len(account_repo.list_accounts_with_credentials()),
        "service_account_email": sa_email,
    }


class ConfigBody(BaseModel):
    client_id: Optional[str] = None
    google_sheet_id: Optional[str] = None
    google_sheet_name: Optional[str] = None
    thread: Optional[int] = None
    headless: Optional[bool] = None

class ImportBody(BaseModel):
    sheet_id: Optional[str] = None
    sheet_name: Optional[str] = None




@router.post("/config")
def save_config(body: ConfigBody):
    mapping = {
        "client_id": body.client_id,
        "google_sheet_id": body.google_sheet_id,
        "google_sheet_name": body.google_sheet_name,
        "thread": None if body.thread is None else str(body.thread),
        "headless": None if body.headless is None else str(body.headless).lower(),
    }
    for key, val in mapping.items():
        if val is not None:
            config_manager.update("gettoken", key, val)
    return {"ok": True, "message": "config.ini updated."}


class RunBody(BaseModel):
    batch_size: Optional[int] = None
    max_concurrent: Optional[int] = None
    limit: Optional[int] = None


@router.post("/run")
def run(body: RunBody):
    cfg = config_manager.get()
    batch = body.batch_size or cfg.thread
    concurrent = body.max_concurrent or cfg.thread
    return runner.start_job(cfg.client_id, batch, concurrent, body.limit)


@router.get("/progress")
def progress():
    return runner.get_job().snapshot()



@router.post("/import")
def run_import(body: ImportBody):
    return importer.start_import(body.sheet_id, body.sheet_name)


@router.get("/import/progress")
def import_progress():
    return importer.get_job().snapshot()