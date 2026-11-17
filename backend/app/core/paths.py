import json
import os
import sys
from pathlib import Path

ROOT_DIR_NAME = "tnmhotmail"
PROFILE_DIR_NAME = "profile"
EXTENSION_DIR_NAME = "extension"
CONFIG_FILE_NAME = "app.ini"
DB_FILE_NAME = "tnm_tool.db"


def _base_data_dir() -> Path:
    if sys.platform.startswith("win"):
        base = os.environ.get("LOCALAPPDATA")
        if base:
            return Path(base)
        return Path.home() / "AppData" / "Local"
    xdg = os.environ.get("XDG_DATA_HOME")
    if xdg:
        return Path(xdg)
    return Path.home() / ".local" / "share"


def app_root() -> Path:
    root = _base_data_dir() / ROOT_DIR_NAME
    root.mkdir(parents=True, exist_ok=True)
    return root


def profile_dir() -> Path:
    p = app_root() / PROFILE_DIR_NAME
    p.mkdir(parents=True, exist_ok=True)
    return p


def extension_dir() -> Path:
    p = app_root() / EXTENSION_DIR_NAME
    p.mkdir(parents=True, exist_ok=True)
    return p


def config_path() -> Path:
    return app_root() / CONFIG_FILE_NAME


def db_path() -> Path:
    return app_root() / DB_FILE_NAME


def resource_base() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys._MEIPASS)
    return Path(__file__).resolve().parents[2]


def service_account_path() -> Path:
    return app_root() / "service_account.json"



def get_client_email():
    path = service_account_path()
    if not path.exists():
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data.get("client_email")
    except Exception:
        return None
    