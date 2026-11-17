from fastapi import APIRouter, Header, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional

from app.core.config import config_manager
from app.repositories import account_repo, share_repo
from app.services import netutil, share_service

router = APIRouter(tags=["share"])
public_router = APIRouter(tags=["share-public"])


@public_router.get("/share/info")
def share_info():
    return {"gateway_mac": netutil.gateway_mac(), "ip": netutil.local_ip()}


@public_router.get("/share/pull")
def share_pull(authorization: Optional[str] = Header(None), probe: Optional[str] = Query(None)):
    key = ""
    if authorization and authorization.lower().startswith("bearer "):
        key = authorization[7:].strip()
    payload = share_service.build_pull_payload(key)
    if payload is None:
        return JSONResponse(status_code=401, content={"message": "Invalid or revoked key"})
    if probe:
        return {"ok": True, "count": payload["count"]}
    return payload


class CreateShareBody(BaseModel):
    label: str
    allowed_emails: list[str] = []


@router.post("/api/share/create")
def create_share(body: CreateShareBody):
    share = share_repo.create_share(body.label, body.allowed_emails)
    return {
        "key": share["key"],
        "label": share["label"],
        "allowed_emails": share["allowed_emails"],
        "url": f"http://{netutil.local_ip()}:{config_manager.get().share_port}",
        "gateway_mac": netutil.gateway_mac(),
    }


@router.get("/api/share/status")
def status_share():
    return { 
        "running": True, 
        "url": "http://192.168.1.30:8750", 
        "port": 8750,
        "active_keys": 2, 
        "last_pull_at": 
        "2026-11-17T09:20:11", 
        "error": None 
    }
    
    
@router.get("/api/share/list")
def list_shares():
    return {"data": share_repo.list_shares()}


@router.post("/api/share/revoke")
def revoke_share(payload: dict):
    share_repo.revoke_share(payload["key"])
    return {"ok": True}


@router.get("/api/share/accounts")
def shareable_accounts():
    return {"data": account_repo.list_emails()}


class AddPeerBody(BaseModel):
    name: str
    url: str
    key: str
    gateway_mac: Optional[str] = None


@router.post("/api/share/peers/add")
def add_peer(body: AddPeerBody):
    peer = share_repo.add_peer(body.name, body.url, body.key, body.gateway_mac)
    return {"ok": True, "peer": {k: v for k, v in peer.items() if k != "Key"}}


@router.get("/api/share/peers")
def list_peers():
    return {"data": share_repo.list_peers()}


@router.post("/api/share/peers/test")
def test_peer(payload: dict):
    return share_service.test_peer(payload["url"], payload["key"])


@router.post("/api/share/peers/{peer_id}/pull")
def pull_peer(peer_id: int):
    return share_service.pull_peer(peer_id)


@router.delete("/api/share/peers/{peer_id}")
def delete_peer(peer_id: int):
    share_repo.delete_peer(peer_id)
    return {"ok": True}
