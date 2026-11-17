# Get Token module

Ported from AutoGetTokenHotmail. Fully automated token capture — plain Playwright
Chromium (no GPMLogin), so it runs on Windows and Linux.

- `anti_bot.py`, `bypass.py`, `automation.py` — fake IP/proxy, fingerprint and
  bypass logic, kept as in the source tool.
- `microsoft_auth.py` — launches the persistent Chromium context with proxy +
  fingerprint injection, runs the automated login, exchanges the code and reads mail.
- `graph.py` — Microsoft token exchange + Graph mail read.
- `runner.py` — background job: reads accounts with credentials from the local DB,
  runs batches (thread/concurrency from config.ini), classifies status locally and
  writes account + mail + tokens to the local DB. Progress is polled by the UI.

## Flow difference vs the source tool

The source posted results to a server. Here the runner writes straight to the local
SQLite via `account_repo.save_capture_result`, and status comes from the local
`classify` keyword pass. Tokens are stored on the account row.

## Remaining feeder (not wired yet)

Accounts + credentials must exist in the local DB before `Run auto get token` has
anything to process. In the source tool this came from `import_data` (Google Sheet
-> DB). That importer (google_sheets + import_service) is not ported yet; the config
fields (sheet id/name) are in place for it. Until then, seed the `account`,
`browser` and `fingerprint` tables directly.
