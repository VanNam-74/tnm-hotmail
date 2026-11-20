import asyncio
import os
import tempfile
from playwright.async_api import async_playwright

PROXY = {
    "server": "http://103.77.208.196:20023",
    "username": "rno2sypbxd",
    "password": "alou3rizjhmhtg4w",
}

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36"
URL_IP = "https://api.ipify.org?format=text"
URL_MS = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=9e5f94bc-e8a4-4e73-b8be-63364c29d753&response_type=code&redirect_uri=https%3A%2F%2Flocalhost&scope=offline_access&response_mode=query"

ARGS = [
    "--disable-web-security",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--unsafely-treat-insecure-origin-as-secure=https://localhost",
    "--disable-blink-features=AutomationControlled",
    "--disable-background-networking",
]


async def abort_redirect(route, request):
    await route.abort()


async def test(label, url, use_args, use_route, use_ctx_opts):
    udd = os.path.join(tempfile.gettempdir(), "pw_proxy_test2")
    kw = dict(user_data_dir=udd, channel="chrome", headless=True, proxy=PROXY)
    if use_args:
        kw["args"] = ARGS
    if use_ctx_opts:
        kw.update(user_agent=UA, locale="en-US", java_script_enabled=True,
                  accept_downloads=True, ignore_https_errors=True, bypass_csp=True)
    async with async_playwright() as pw:
        ctx = await pw.chromium.launch_persistent_context(**kw)
        page = await ctx.new_page()
        if use_route:
            await page.route("https://localhost**", abort_redirect)
        try:
            await page.goto(url, timeout=30000)
            txt = ""
            if "ipify" in url:
                txt = " ip=" + await page.inner_text("body")
            print(f"{label:38} -> OK{txt}")
        except Exception as e:
            print(f"{label:38} -> ERROR: {type(e).__name__}: {str(e).splitlines()[0]}")
        finally:
            await ctx.close()


async def main():
    await test("persistent, proxy only (ipify)",      URL_IP, False, False, False)
    await test("persistent, +args +route +opts (ipify)", URL_IP, True,  True,  True)
    await test("persistent, full -> MS authorize",     URL_MS, True,  True,  True)


if __name__ == "__main__":
    asyncio.run(main())