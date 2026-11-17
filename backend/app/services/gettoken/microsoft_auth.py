import logging
import os
import urllib.parse
from typing import Optional

from app.core.paths import profile_dir
from app.services.gettoken.anti_bot import AntiBot
from app.services.gettoken.automation import auto_get_code_microsoft
from app.services.gettoken.graph import GraphApiMicrosoft
from app.services.gettoken.schemas import AccountWithCredentials, TokenResult

logger = logging.getLogger(__name__)

_AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
_MESSAGES_URL = "https://graph.microsoft.com/v1.0/me/messages"
_REDIRECT_URI = "https://localhost"
_SCOPES = "https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/User.Read offline_access"
_DEFAULT_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36"


class MicrosoftAuthClient:
    def __init__(self, client_id: str, headless: bool = False):
        self.anti_bot = AntiBot()
        self.client_id = client_id
        self.headless = headless

    def _build_auth_url(self) -> str:
        params = {
            "client_id": self.client_id,
            "response_type": "code",
            "redirect_uri": _REDIRECT_URI,
            "scope": _SCOPES,
            "response_mode": "query",
        }
        return _AUTH_URL + "?" + urllib.parse.urlencode(params)

    def _build_user_data_dir(self, profile_id: int) -> str:
        return os.path.join(str(profile_dir()), f"{profile_id}")

    def _build_proxy(self, acc: AccountWithCredentials) -> Optional[dict]:
        if not acc.proxy_ip or not acc.proxy_port:
            return None
        scheme = (acc.proxy_type or "http").lower()
        proxy = {"server": f"{scheme}://{acc.proxy_ip}:{acc.proxy_port}"}
        if acc.proxy_username:
            proxy["username"] = acc.proxy_username
        if acc.proxy_password:
            proxy["password"] = acc.proxy_password
        return proxy

    async def login_and_get_code(self, acc: AccountWithCredentials, progress_queue):
        from playwright.async_api import async_playwright, TimeoutError as PWTimeout

        self.fp = self.anti_bot.generate_fingerprint(acc)
        self.inject_js = self.anti_bot.build_js_injection(self.fp)
        auth_url = self._build_auth_url()
        proxy_cfg = self._build_proxy(acc)
        user_data_dir = self._build_user_data_dir(acc.id)

        auth_code = None
        list_mail = None

        async with async_playwright() as pw:
            browser = await pw.chromium.launch_persistent_context(
                user_data_dir=user_data_dir,
                headless=self.headless,
                proxy=proxy_cfg,
                args=[
                    "--proxy-bypass-list=127.0.0.1;localhost",
                    *self.anti_bot.get_browser_argument(),
                ],
                user_agent=acc.user_agent or _DEFAULT_UA,
                locale="en-US",
                java_script_enabled=True,
                accept_downloads=True,
                ignore_https_errors=True,
                bypass_csp=True,
            )
            await browser.add_init_script(self.inject_js)
            page = await browser.new_page()
            await page.route(f"{_REDIRECT_URI}**", _abort_redirect)

            try:
                await page.goto(auth_url, timeout=30_000)
                auth_code = await auto_get_code_microsoft(acc, page, progress_queue)
                if not auth_code:
                    return None, None

                auth_code_clean = urllib.parse.unquote(auth_code)
                async with GraphApiMicrosoft(self.client_id) as graph:
                    _, token_resp = await graph.get_token_by_code(page, _TOKEN_URL, auth_code_clean)
                    access_token = refresh_token = None
                    if isinstance(token_resp, dict):
                        access_token = token_resp.get("access_token")
                        refresh_token = token_resp.get("refresh_token")
                        if access_token:
                            _, list_mail = await graph.get_list_mail_microsoft(
                                page, _MESSAGES_URL, access_token
                            )
                return {"code": auth_code, "list_mail": list_mail,
                        "access_token": access_token, "refresh_token": refresh_token}, None
            except PWTimeout:
                await progress_queue.put(TokenResult(acc.id, acc.email, error="Proxy issue"))
                return None, None
            except Exception as e:
                await progress_queue.put(TokenResult(acc.id, acc.email, error="Unexpected error"))
                logger.error("login error %s: %s", acc.email, e)
                return None, None
            finally:
                await browser.close()


async def _abort_redirect(route, request):
    await route.abort()
