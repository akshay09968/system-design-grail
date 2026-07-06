#!/usr/bin/env bash
# Serve the System Design Grail locally with live reload.
# Usage: ./serve.sh          → http://127.0.0.1:8137
#        ./serve.sh 9000     → custom port
cd "$(dirname "$0")"
PORT="${1:-8137}"
exec .venv/bin/mkdocs serve --dev-addr "127.0.0.1:${PORT}"
