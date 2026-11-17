import requests

from app.repositories import account_repo, share_repo
from app.services import netutil


def test_peer(url: str, key: str) -> dict:
    url = url.rstrip("/")
    try:
        info = requests.get(f"{url}/share/info", timeout=4)
    except requests.RequestException as e:
        return {"ok": False, "reason": "unreachable",
                "message": f"Cannot reach {url} ({e.__class__.__name__})."}
    if info.status_code != 200:
        return {"ok": False, "reason": "bad_response", "message": f"Provider returned {info.status_code}."}

    peer_mac = info.json().get("gateway_mac")
    same = netutil.same_network_as(peer_mac)
    if same is False:
        return {"ok": False, "reason": "network_mismatch",
                "message": "Networks do not match - sharing only works on the same LAN."}
    try:
        probe = requests.get(f"{url}/share/pull",
                             headers={"Authorization": f"Bearer {key}"},
                             params={"probe": "1"}, timeout=5)
    except requests.RequestException as e:
        return {"ok": False, "reason": "unreachable", "message": f"Cannot reach ({e.__class__.__name__})."}
    if probe.status_code == 401:
        return {"ok": False, "reason": "bad_key", "message": "Invalid or revoked key."}
    if probe.status_code != 200:
        return {"ok": False, "reason": "bad_response", "message": f"Provider returned {probe.status_code}."}
    return {"ok": True, "gateway_mac": peer_mac, "same_network": bool(same),
            "message": "Connection valid, same LAN." if same else "Connection valid."}


def pull_peer(peer_id: int) -> dict:
    peer = share_repo.get_peer(peer_id)
    if not peer:
        return {"ok": False, "message": "Source not found."}
    url = peer["Url"].rstrip("/")
    check = test_peer(url, peer["Key"])
    if not check["ok"]:
        return {"ok": False, "message": check["message"], "reason": check.get("reason")}
    try:
        resp = requests.get(f"{url}/share/pull",
                            headers={"Authorization": f"Bearer {peer['Key']}"}, timeout=30)
    except requests.RequestException as e:
        return {"ok": False, "message": f"Pull error: {e.__class__.__name__}"}
    if resp.status_code != 200:
        return {"ok": False, "message": f"Provider returned {resp.status_code}"}
    body = resp.json()
    items = body.get("data", [])
    origin = body.get("origin", url)
    imported = skipped = 0
    for item in items:
        if not item.get("email"):
            skipped += 1
            continue
        account_repo.upsert_shared(item, origin_machine=origin)
        imported += 1
    share_repo.touch_peer(peer_id)
    return {"ok": True, "imported": imported, "skipped": skipped,
            "message": f"Received {imported} accounts from {origin}."}


def build_pull_payload(key: str):
    ticket = share_repo.resolve_key(key)
    if ticket is None:
        return None
    allowed = ticket["allowed_emails"] or None
    data = account_repo.list_for_share(allowed)
    return {"origin": netutil.local_ip() or "unknown", "count": len(data), "data": data}
