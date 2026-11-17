from fastapi import APIRouter
from pydantic import BaseModel
import httpx


from app.core.config import config_manager
from app.services import netutil

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("")
def get_settings():
    cfg = config_manager.get()
    return {
        "config": cfg.public_dict(),
        "network": {"ip": netutil.local_ip(), 
        "gateway_mac": netutil.gateway_mac()},
    }


class UpdateBody(BaseModel):
    section: str
    key: str
    value: str

class EofficeHost(BaseModel):
    host: str | None=None
    timeout: float |None = None

_ALLOWED = {
    ("eoffice", "host"), ("eoffice", "timeout"),
    ("share", "port"), ("share", "enabled"),
    ("server", "ui_port"),
    ("gettoken", "client_id"), ("gettoken", "google_sheet_id"),
    ("gettoken", "google_sheet_name"), ("gettoken", "thread"), ("gettoken", "headless"),
}


@router.post("/update")
def update_setting(body: UpdateBody):
    if (body.section, body.key) not in _ALLOWED:
        return {"ok": False, "message": "Field not allowed"}
    config_manager.update(body.section, body.key, body.value)
    return {"ok": True, "message": "Saved. Some changes need a restart."}


@router.post("/test-eoffice")
async def test_eoffice(body: EofficeHost):
    cfg = config_manager.get()
    
    if not body.host:
        return 500, {"message": "eoffice host is not configured in Settings."}
    url = f"{body.host}/public_api/user/login"
    headers = {"Content-Type": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=body.timeout) as client:
            resp = await client.get(url, auth=(cfg.app_username, cfg.app_password), headers=headers)
            if not resp:
                return {"ok": False, "message": "Failed"}
        return {"ok": True, "message": "Connected"}
    except Exception as e:
        return {"ok": False, "message": "Failed"}
    
    
    
    
    
    