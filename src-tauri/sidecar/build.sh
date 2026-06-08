#!/bin/bash
set -e

echo "Building MarkItDown sidecar..."

cd "$(dirname "$0")"

pip install -r requirements.txt
pip install pyinstaller

ARCH=$(uname -m)
OS=$(uname -s | tr '[:upper:]' '[:lower:]')

if [ "$OS" = "darwin" ]; then
    if [ "$ARCH" = "arm64" ]; then
        TARGET="aarch64-apple-darwin"
    else
        TARGET="x86_64-apple-darwin"
    fi
elif [ "$OS" = "linux" ]; then
    TARGET="x86_64-unknown-linux-gnu"
fi

pyinstaller \
    --onefile \
    --name "markitdown-sidecar" \
    --distpath "../binaries" \
    markitdown_convert.py

mv "../binaries/markitdown-sidecar" "../binaries/markitdown-sidecar-${TARGET}"

echo "Built: src-tauri/binaries/markitdown-sidecar-${TARGET}"
