from dataclasses import dataclass
from typing import Optional


@dataclass
class AccountWithCredentials:
    id: int
    email: str
    password: str
    recovery: Optional[str] = None
    two_fa: Optional[str] = None
    proxy_type: Optional[str] = None
    proxy_ip: Optional[str] = None
    proxy_port: Optional[int] = None
    proxy_username: Optional[str] = None
    proxy_password: Optional[str] = None
    user_agent: Optional[str] = None
    device_memory: Optional[str] = None
    group1: Optional[str] = None
    group2: Optional[str] = None
    device1: Optional[str] = None
    device2: Optional[str] = None
    device3: Optional[str] = None
    gpu: Optional[str] = None
    r6408: Optional[str] = None
    r35661: Optional[str] = None
    r36342: Optional[str] = None
    random: Optional[str] = None


@dataclass
class TokenResult:
    account_id: int
    email: str
    success: Optional[str] = None
    error: Optional[str] = None


@dataclass
class Google2FAResult:
    account_id: int
    email: str
    success: Optional[str] = None
    error: Optional[str] = None


@dataclass
class SheetAccount:
    id: int
    email: Optional[str]
    password: Optional[str]
    recovery: Optional[str]
    two_fa: Optional[str]
