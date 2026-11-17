# TNM Hotmail Tool

One desktop tool merging **Get Token + Filter + Share**. FastAPI backend, React
(Tailwind) UI, PyWebview window, packaged with PyInstaller. Local SQLite per machine.

Get Token is the automated flow (proxy, fingerprint, bypass, auto login + 2FA) ported
from AutoGetTokenHotmail. It uses plain Playwright Chromium (no GPMLogin), so it runs
on Windows and Linux.

## Flow

```
Sign in (eoffice)
        |
   Overview (hub) -> Get Token | Filter | Share | Settings
        |
 Get Token: config (config.ini: sheet id/name, thread, client_id)
            run -> automated browser -> read mail -> classify -> write local DB
 Filter:    read local DB, search, inspect mail
 Share:     LAN P2P, provider issues key per machine, consumer pulls + upserts
            guard "same network" via gateway MAC, read mail only (no tokens/proxies)
```

No separate server, Celery or Redis. KDP status is classified locally.

## Structure

```
backend/
  main.py
  app/
    core/  paths.py, config.py
    db/    schema.py, connection.py
    repositories/ account_repo.py, share_repo.py
    services/
      classify.py, keywords.py, detail.py, eoffice.py, netutil.py, share_service.py
      gettoken/ anti_bot.py, bypass.py, automation.py, graph.py,
                microsoft_auth.py, runner.py, schemas.py
    api/   auth.py, filter.py, share.py, settings.py, gettoken.py
    server.py
frontend/  React + Vite + Tailwind (frosted palette, box UI, iOS spinner, toast)
build/     tnm_hotmail.spec, build.ps1, build.sh
```

## Run (dev)

```
cd backend && pip install -r requirements.txt && python main.py
cd frontend && npm install && npm run dev
```

## Build .exe (Windows)

```
pip install -r backend/requirements.txt
playwright install chromium
./build/build.ps1
```

PyInstaller + Playwright: the Chromium build must be available at runtime. Either run
`playwright install` on the target machine, or bundle the browser and set
`PLAYWRIGHT_BROWSERS_PATH`.

## Notes

- Config, hosts and secrets live in `app.ini` (LOCALAPPDATA), not hardcoded.
- Get Token needs accounts with credentials in the local DB first. The Google Sheet
  importer is not ported yet; see `app/services/gettoken/README.md`.
- Share runs over HTTP on the LAN with a bearer key; key travels in cleartext, so use
  it only on a trusted network. Shared payload never includes tokens, proxies or
  fingerprints.
