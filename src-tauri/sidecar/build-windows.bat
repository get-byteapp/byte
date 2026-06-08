@echo off
cd /d "%~dp0"
pip install -r requirements.txt
pip install pyinstaller
pyinstaller --onefile --name "markitdown-sidecar" --distpath "..\binaries" markitdown_convert.py
ren "..\binaries\markitdown-sidecar.exe" "markitdown-sidecar-x86_64-pc-windows-msvc.exe"
echo Built: src-tauri\binaries\markitdown-sidecar-x86_64-pc-windows-msvc.exe
