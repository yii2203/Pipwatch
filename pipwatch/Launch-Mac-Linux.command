#!/bin/bash
# Double-click this file (or run it) to open Pipwatch.
#
# If Chrome, Edge, Brave, or Chromium is installed, this opens Pipwatch in
# "app mode" -- its own window with no address bar, tabs, or browser chrome,
# so it looks and feels like a standalone desktop app. It uses a small
# dedicated browser profile stored right next to this script (in
# .pipwatch-app-profile) so it always opens the same window/data regardless
# of whatever your regular default browser profile is doing.
#
# If none of those browsers are found, it falls back to opening index.html
# in your normal default browser tab, same as before.

cd "$(dirname "$0")"
DIR="$(pwd)"
URL="file://$DIR/index.html"
PROFILE="$DIR/.pipwatch-app-profile"

CANDIDATES=(
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
  "/Applications/Chromium.app/Contents/MacOS/Chromium"
)
CMD_NAMES=(google-chrome google-chrome-stable microsoft-edge microsoft-edge-stable brave-browser chromium chromium-browser)

launch_bin() {
  "$1" --app="$URL" --window-size=1400,900 --user-data-dir="$PROFILE" >/dev/null 2>&1 &
}

launched=false
for p in "${CANDIDATES[@]}"; do
  if [ -x "$p" ]; then
    launch_bin "$p"
    launched=true
    break
  fi
done

if [ "$launched" = false ]; then
  for c in "${CMD_NAMES[@]}"; do
    if command -v "$c" >/dev/null 2>&1; then
      launch_bin "$(command -v "$c")"
      launched=true
      break
    fi
  done
fi

if [ "$launched" = false ]; then
  echo "No Chrome/Edge/Brave/Chromium found -- opening in your default browser instead."
  if command -v open >/dev/null 2>&1; then
    open "$URL"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$URL"
  else
    echo "Could not auto-open a browser. Please open index.html manually."
  fi
fi
