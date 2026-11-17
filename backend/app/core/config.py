import configparser
import secrets
from dataclasses import dataclass, asdict

from app.core.paths import config_path


DEFAULTS = {
    "server": {"ui_port": "8750"},
    "share": {"port": "8790", "enabled": "true"},
    "eoffice": {"host": "", "timeout": "30"},
    "security": {"secret_key": ""},
    "gettoken": {
        "client_id": "",
        "google_sheet_id": "",
        "google_sheet_name": "",
        "thread": "5",
        "headless": "false",
        "import_host": "http://192.168.1.91",
        "app_username": "saledownload@newmoon.team",
        "app_password": "04Ahx^ah14B@Z88",
    },
}


@dataclass
class AppConfig:
    ui_port: int
    share_port: int
    share_enabled: bool
    eoffice_host: str
    eoffice_timeout: int
    secret_key: str
    client_id: str
    google_sheet_id: str
    google_sheet_name: str
    thread: int
    headless: bool
    import_host: str
    app_username: str
    app_password: str

    def public_dict(self) -> dict:
        d = asdict(self)
        d["secret_key"] = "***" if self.secret_key else ""
        d["app_password"] = "***" if self.app_password else ""
        return d


class ConfigManager:
    def __init__(self) -> None:
        self.path = config_path()
        self.parser = configparser.ConfigParser()
        self._load()

    def _load(self) -> None:
        if self.path.exists():
            self.parser.read(self.path, encoding="utf-8")
        changed = self._ensure_defaults()
        if not self.parser.get("security", "secret_key", fallback=""):
            self.parser.set("security", "secret_key", secrets.token_hex(32))
            changed = True
        if changed:
            self._save()

    def _ensure_defaults(self) -> bool:
        changed = False
        for section, values in DEFAULTS.items():
            if not self.parser.has_section(section):
                self.parser.add_section(section)
                changed = True
            for key, val in values.items():
                if not self.parser.has_option(section, key):
                    self.parser.set(section, key, val)
                    changed = True
        return changed

    def _save(self) -> None:
        with open(self.path, "w", encoding="utf-8") as f:
            self.parser.write(f)

    def get(self) -> AppConfig:
        p = self.parser
        return AppConfig(
            ui_port=p.getint("server", "ui_port"),
            share_port=p.getint("share", "port"),
            share_enabled=p.getboolean("share", "enabled"),
            eoffice_host=p.get("eoffice", "host", fallback="").rstrip("/"),
            eoffice_timeout=p.getint("eoffice", "timeout", fallback=30),
            secret_key=p.get("security", "secret_key", fallback=""),
            client_id=p.get("gettoken", "client_id", fallback=""),
            google_sheet_id=p.get("gettoken", "google_sheet_id", fallback=""),
            google_sheet_name=p.get("gettoken", "google_sheet_name", fallback=""),
            thread=p.getint("gettoken", "thread", fallback=5),
            headless=p.getboolean("gettoken", "headless", fallback=False),
            import_host=p.get("gettoken", "import_host", fallback="").rstrip("/"),
            app_username=p.get("gettoken", "app_username", fallback=""),
            app_password=p.get("gettoken", "app_password", fallback=""),
        )

    def update(self, section: str, key: str, value: str) -> None:
        if not self.parser.has_section(section):
            self.parser.add_section(section)
        self.parser.set(section, key, value)
        self._save()


config_manager = ConfigManager()