import base64
from dataclasses import dataclass
from typing import Any, Optional
import httpx

from app.config import settings



class BaseApiClient:

    async def request(self, _http,method: str, path: str, **kwargs) -> Optional[dict]:
        try:
            resp = await _http.request(method, path, **kwargs)
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            raise ApiError(e.response.status_code, str(e)) from e
        except httpx.RequestError as e:
            raise ApiError(0, str(e)) from e

    


class ApiError(Exception):
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message
        super().__init__(f"[{status_code}] {message}")
