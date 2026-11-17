#!/usr/bin/env bash
# Build cho dev/Linux (chỉ test Filter/Share; Get Token cần Windows+GPMLogin).
set -e
root="$(cd "$(dirname "$0")/.." && pwd)"
( cd "$root/frontend" && npm install && npm run build )
rm -rf "$root/backend/webui" && cp -r "$root/frontend/dist" "$root/backend/webui"
( cd "$root/backend" && pyinstaller "$root/build/tnm_hotmail.spec" --noconfirm )
echo "Xong: backend/dist/TNM-Hotmail-Tool"
