import threading
import time

import uvicorn
import webview

from app.core.config import config_manager
from app.db.schema import init_db
from app.server import build_ui_app, build_share_app


def _run(app, host: str, port: int) -> None:
    uvicorn.run(app, host=host, port=port, log_level="warning")


def main() -> None:
    init_db()
    cfg = config_manager.get()

    ui_app = build_ui_app()
    threading.Thread(target=_run, args=(ui_app, "127.0.0.1", cfg.ui_port), daemon=True).start()

    if cfg.share_enabled:
        share_app = build_share_app()
        threading.Thread(target=_run, args=(share_app, "0.0.0.0", cfg.share_port), daemon=True).start()

    time.sleep(1)
    webview.create_window("TNM Hotmail Tool", f"http://127.0.0.1:{cfg.ui_port}", width=1630, height=950)
    webview.start()


if __name__ == "__main__":
    main()
