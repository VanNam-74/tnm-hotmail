from datetime import datetime
from typing import Tuple

import pytz

_VN_TZ = pytz.timezone("Asia/Ho_Chi_Minh")
_DEFAULT_COLOR = "#8a8f98"
_PAIR_COLORS = {"KR": "#9E9E9E", "MT": "#B8C5FF", "MA": "#87CEFA", "KP": "#9E9E9E"}


def _convert_utc_to_vn(utc_datetime: str) -> str:
    try:
        t = datetime.strptime(utc_datetime, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=pytz.UTC)
        return t.astimezone(_VN_TZ).strftime("%d/%m/%Y")
    except Exception:
        return ""


def _initials_and_color(name: str) -> Tuple[str, str]:
    if not name or not name.strip():
        return "", _DEFAULT_COLOR
    words = name.strip().split()
    first = words[0][0].upper()
    last = words[-1][0].upper() if len(words) > 1 else ""
    initials = first + last
    if len(initials) == 2 and initials in _PAIR_COLORS:
        color = _PAIR_COLORS[initials]
    elif "A" in initials:
        color = "#b56b6b"
    else:
        color = _DEFAULT_COLOR
    return initials, color


def build_detail_emails(listmail: dict) -> list[dict]:
    values = listmail.get("value", []) if isinstance(listmail, dict) else []
    emails = []
    for mail in values:
        try:
            from_info = mail.get("from", {}) or {}
            addr = from_info.get("emailAddress", {}) if isinstance(from_info, dict) else {}
            body = mail.get("body", "")
            if isinstance(body, dict):
                body = body.get("content", "")
            name = addr.get("name", "Unknown")
            initials, color = _initials_and_color(name)
            emails.append({
                "name": name,
                "email": addr.get("address", "unknown@example.com"),
                "content": body,
                "initials": initials,
                "color": color,
                "receivedDateTime": _convert_utc_to_vn(mail.get("receivedDateTime", "")),
                "subject": mail.get("subject", "No Subject"),
                "preview": mail.get("bodyPreview", ""),
            })
        except Exception:
            emails.append({
                "name": "Unknown", "email": "unknown@example.com",
                "content": "Error processing email", "initials": "", "color": _DEFAULT_COLOR,
                "receivedDateTime": "", "subject": "Error", "preview": "",
            })
    return emails
