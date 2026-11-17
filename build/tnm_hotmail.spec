import os
from PyInstaller.utils.hooks import collect_submodules

block_cipher = None
BACKEND = os.path.abspath(os.getcwd())

datas = [
    (os.path.join(BACKEND, "webui"), "webui"),
]

hiddenimports = (
    collect_submodules("uvicorn")
    + collect_submodules("app")
    + ["webview", "pytz", "pyotp", "playwright"]
)

a = Analysis(
    [os.path.join(BACKEND, "main.py")],
    pathex=[BACKEND],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    runtime_hooks=[],
    excludes=[],
    cipher=block_cipher,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="TNM-Hotmail-Tool",
    debug=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    icon=None,
)
