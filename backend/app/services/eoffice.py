import httpx

from app.core.config import config_manager


async def login(username: str, password: str) -> tuple[int, dict]:
    cfg = config_manager.get()
    if not cfg.eoffice_host:
        return 500, {"message": "eoffice host is not configured in Settings."}
    url = f"{cfg.eoffice_host}/public_api/user/login"
    headers = {"Content-Type": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=cfg.eoffice_timeout) as client:
            resp = await client.get(url, auth=(username, password), headers=headers)
            data = (
                resp.json()
                if resp.headers.get("Content-Type", "").startswith("application/json")
                else {}
            )
        return resp.status_code, data
    except Exception as e:
        return 500, {"message": str(e)}
