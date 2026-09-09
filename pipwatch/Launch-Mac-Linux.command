#!/bin/bash
# Double-click this file (or run it) to open Pipwatch in your default browser.
cd "$(dirname "$0")"
DIR="$(pwd)"
if command -v open >/dev/null 2>&1; then
  open "$DIR/index.html"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$DIR/index.html"
else
  echo "Could not auto-open a browser. Please open index.html manually."
fi
