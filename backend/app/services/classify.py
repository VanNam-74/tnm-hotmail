from typing import Tuple

from app.services.keywords import KEYWORDS


def classify_listmail_old(listmail: dict) -> Tuple[str, dict]:
    for mail_item in (listmail or {}).get("value", []):
        body = mail_item.get("bodyPreview", "") or ""
        for status_key, matchers in KEYWORDS.items():
            if status_key in body:
                for matcher in matchers:
                    for label, phrase in matcher.items():
                        if phrase in body:
                            return label, mail_item
    return "Active", {}


def classify_listmail(listmail: dict) -> Tuple[str, dict]:
    for mail_item in (listmail or {}).get("value", []):
        subject = mail_item.get("subject") or ""
        preview = mail_item.get("bodyPreview") or ""
        body_content = (mail_item.get("body") or {}).get("content") or ""
        haystack = f"{subject}\n{preview}\n{body_content}".lower()
        for status_key, matchers in KEYWORDS.items():
            if status_key.lower() in haystack:
                for matcher in matchers:
                    for label, phrase in matcher.items():
                        if phrase.lower() in haystack:
                            return label, mail_item
    return "Active", {}