import os

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from app.core.config import config_manager
from app.core.paths import resource_base
from app.api import auth, filter as filter_api, share, settings as settings_api, gettoken
from app.db.schema import init_db

def _webui_dir() -> str:
    candidates = [
        os.path.join(str(resource_base()), "webui"),
        os.path.join(str(resource_base()), "frontend", "dist"),
    ]
    for c in candidates:
        if os.path.isdir(c):
            return c
    return candidates[0]


def build_ui_app() -> FastAPI:
    init_db()
    cfg = config_manager.get()
    app = FastAPI(title="TNM Hotmail Tool", version="2.0.0")
    app.add_middleware(SessionMiddleware, secret_key=cfg.secret_key)

    @app.exception_handler(Exception)
    async def _err(request: Request, exc: Exception):
        return JSONResponse(status_code=500, content={"message": str(exc)})

    app.include_router(auth.router)
    app.include_router(filter_api.router)
    app.include_router(share.router)
    app.include_router(share.public_router)
    app.include_router(settings_api.router)
    app.include_router(gettoken.router)

    webui = _webui_dir()
    if os.path.isdir(webui):
        assets = os.path.join(webui, "assets")
        if os.path.isdir(assets):
            app.mount("/assets", StaticFiles(directory=assets), name="assets")

        @app.get("/{full_path:path}")
        async def spa(full_path: str):
            target = os.path.join(webui, full_path)
            if full_path and os.path.isfile(target):
                return FileResponse(target)
            return FileResponse(os.path.join(webui, "index.html"))

    return app


def build_share_app() -> FastAPI:
    app = FastAPI(title="TNM Hotmail Share", version="2.0.0")
    app.include_router(share.public_router)
    return app
