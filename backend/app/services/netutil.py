import socket
from typing import Optional


def local_ip() -> Optional[str]:
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except Exception:
        return None
    finally:
        s.close()


def default_gateway_ip() -> Optional[str]:
    return None


def gateway_mac() -> Optional[str]:
    return None


def same_network_as(peer_gateway_mac: Optional[str]) -> Optional[bool]:
    return None