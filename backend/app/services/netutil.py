import re
import socket
import subprocess
import sys
from typing import Optional

_MAC_RE = re.compile(r"([0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}")


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
    try:
        import netifaces

        inet = netifaces.gateways().get("default", {}).get(netifaces.AF_INET)
        if inet:
            return inet[0]
    except Exception:
        pass
    try:
        if sys.platform.startswith("win"):
            out = subprocess.run(["route", "print", "0.0.0.0"],
                                 capture_output=True, text=True, timeout=5).stdout
            for line in out.splitlines():
                parts = line.split()
                if len(parts) >= 3 and parts[0] == "0.0.0.0":
                    return parts[2]
        else:
            out = subprocess.run(["ip", "route"], capture_output=True, text=True, timeout=5).stdout
            m = re.search(r"default via (\d+\.\d+\.\d+\.\d+)", out)
            if m:
                return m.group(1)
    except Exception:
        return None
    return None


def _norm(mac: str) -> str:
    return mac.replace("-", ":").lower()


def gateway_mac() -> Optional[str]:
    gw = default_gateway_ip()
    if not gw:
        return None
    try:
        if sys.platform.startswith("win"):
            subprocess.run(["ping", "-n", "1", "-w", "500", gw], capture_output=True, timeout=3)
        else:
            subprocess.run(["ping", "-c", "1", "-W", "1", gw], capture_output=True, timeout=3)
    except Exception:
        pass
    try:
        if sys.platform.startswith("win"):
            out = subprocess.run(["arp", "-a", gw], capture_output=True, text=True, timeout=5).stdout
        else:
            out = subprocess.run(["arp", "-n", gw], capture_output=True, text=True, timeout=5).stdout
    except Exception:
        return None
    for line in out.splitlines():
        if gw in line:
            m = _MAC_RE.search(line)
            if m:
                return _norm(m.group(0))
    m = _MAC_RE.search(out)
    return _norm(m.group(0)) if m else None


def same_network_as(peer_gateway_mac: Optional[str]) -> Optional[bool]:
    if not peer_gateway_mac:
        return None
    mine = gateway_mac()
    if not mine:
        return None
    return _norm(peer_gateway_mac) == mine
