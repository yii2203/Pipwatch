# Pipwatch — Forex Trading Journal (standalone)

A self-contained trading journal: dashboard with an equity curve, a P/L calendar,
year → month → week performance breakdowns, a full trade log, and multiple
live/backtest accounts. Runs entirely in your browser, entirely offline —
no server, no build step, no account.

## Opening the app

**Mac:** double-click `Launch-Mac-Linux.command`.
(First time only: right-click it → Open, since it's an unsigned script — macOS
will ask you to confirm once.)

**Windows:** double-click `Launch-Windows.bat`.

**Any OS, manually:** just open `index.html` directly in Chrome, Firefox, or Edge.

No installation, no internet connection required after you've unzipped the folder
(the chart library is bundled locally in `vendor/`, and the Inter/JetBrains Mono
fonts will fall back to your system fonts if you're offline).

### "Standalone app" window

If Chrome, Edge, or Brave is installed, the launch scripts now open Pipwatch
in **app mode**: its own window with no address bar, tabs, or browser chrome,
so it behaves like a regular desktop app rather than a browser tab. It uses a
small dedicated browser profile stored next to the app (a hidden
`.pipwatch-app-profile` folder), so it reliably reopens the same window and
data every time, independent of whatever your everyday default-browser
profile is doing.

This is genuinely a browser window under the hood, not a compiled desktop
binary — a true native `.app`/`.exe` would require packaging the app with
something like Electron and a full build step, which isn't something this
folder can produce on its own. App mode is the closest practical equivalent
without that build process: no visible browser UI, its own taskbar/dock icon
and window, launched with a double-click.

If none of those browsers are found, the scripts fall back to opening
`index.html` in whatever your normal default browser is, exactly as before.

## Where your data lives

Everything — accounts, trades, and chart-screenshot uploads — is saved in your
browser's **local storage**, scoped to this exact folder location on this
computer, in this browser.

That means:
- Your data stays entirely on your machine. Nothing is uploaded anywhere.
- If you move or rename this folder, or open it in a different browser, you'll
  start with an empty journal (the old data is still sitting in the old
  browser profile, just not linked to the new location).
- Clearing your browser's site data/cookies for local files will erase it.

Because of this, treat this folder as the "installation" — keep it in one
stable place once you start logging real trades, and back up your data
regularly (see below).

## Backing up your data (export / import)

Go to the **Accounts** tab:

- **Export backup** downloads a single `.json` file containing every account,
  every trade, and every attached chart screenshot. Keep this file somewhere
  outside the browser (cloud drive, external disk, etc.) — it's your real
  backup, since local storage can be wiped by clearing browser data.
- **Import backup** lets you pick a previously exported `.json` file and
  restores it. This **replaces** whatever accounts/trades currently exist in
  this browser, so export a fresh backup first if you want to keep the
  current data too. You'll get a confirmation prompt before anything is
  overwritten.
- If you haven't created an account yet, the first-run screen also has an
  "Or import a backup file" option, so you can restore straight into a fresh
  install/folder/browser.

This is also how you move your journal to a new computer, a new browser, or
after renaming/moving this folder: export from the old location, import into
the new one.

## P/L auto-calculation

For pairs where the math is unambiguous (majors quoted directly in USD, USD-base
pairs like USDJPY/USDCHF/USDCAD, and XAUUSD/XAGUSD/BTCUSD), entering entry price,
exit price, and lot size will auto-fill the profit/loss field using standard
lot sizes (100,000 units for forex, 100 oz for gold, 5,000 oz for silver, 1 BTC
for Bitcoin). You can always override the number by editing it directly.

For cross pairs that don't involve USD at all (EURGBP, EURJPY, GBPJPY) or any
custom instrument, the app can't calculate this without a live conversion rate,
so you'll enter the $ P/L yourself.

This is a standard-lot approximation — always cross-check against your broker's
actual statement, especially for swap/rollover fees, commissions, and
non-standard contract sizes, none of which are factored in here.

## Folder structure

```
pipwatch/
├── index.html              — app shell
├── css/styles.css          — all styling
├── js/
│   ├── storage.js          — localStorage read/write helpers
│   ├── pnl.js               — pip/lot P&L calculation logic
│   └── app.js               — application state, rendering, event handling
├── vendor/chart.umd.min.js — bundled Chart.js (offline, no CDN)
├── Launch-Mac-Linux.command
├── Launch-Windows.bat
└── README.md
```

No React, no npm, no bundler — plain HTML/CSS/JS, so you (or anyone) can open
and edit any file directly in a text editor.
