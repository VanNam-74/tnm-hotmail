# Build tool gộp trên Windows.
# Yêu cầu: Node.js, Python 3.12, đã `pip install -r backend/requirements.txt`.

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent

Write-Host "==> Build React UI" -ForegroundColor Cyan
Push-Location "$root/frontend"
npm install
npm run build
Pop-Location

Write-Host "==> Copy dist -> backend/webui" -ForegroundColor Cyan
$webui = "$root/backend/webui"
if (Test-Path $webui) { Remove-Item $webui -Recurse -Force }
Copy-Item "$root/frontend/dist" $webui -Recurse

Write-Host "==> PyInstaller" -ForegroundColor Cyan
Push-Location "$root/backend"
# Playwright: nhớ `playwright install chromium` nếu Get Token dùng Chromium thường.
pyinstaller "$root/build/tnm_hotmail.spec" --noconfirm
Pop-Location

Write-Host "==> Xong. File: backend/dist/TNM-Hotmail-Tool.exe" -ForegroundColor Green
