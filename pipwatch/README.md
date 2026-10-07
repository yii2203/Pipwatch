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

## Multiple take-profit levels

If you scale out of a trade in parts, the trade form has an optional
"Take-profit levels" section — add one row per level and set its outcome
(target hit, stopped out, breakeven, etc.) independently.

For win-rate purposes: **if any one level hit its target, the whole trade
counts as a win** — even if a later level only broke even, or the overall
$ P/L ends up flat/negative after costs. You still got paid on part of it,
so it counts. Breakeven trades (no level hit target, net P/L is exactly
$0) still don't count toward win rate's denominator at all — see below.
Trades that don't use this section are scored the old way: win if the
overall $ P/L is positive, loss if it's negative.

## Win rate

Win rate only counts decided trades — wins ÷ (wins + losses). Breakeven
trades aren't a win or a loss, so they're left out of both sides of that
fraction entirely rather than counting against you. The stat card under
Dashboard shows the breakeven count alongside wins/losses so it's visible
they're being excluded.

## Folder structure

```
pipwatch/
├── index.html                  — app shell + the <script> tags that load everything below, in order
├── css/styles.css              — all styling
├── js/
│   ├── README.md               — a map of what's in each file + how the code fits together
│   ├── storage.js               — localStorage read/write helpers
│   ├── pnl.js                   — pair list + pip/lot P&L calculation logic
│   ├── 01-helpers.js            — formatting, stats (win rate/profit factor), misc utilities
│   ├── 02-state.js              — the State object (single source of truth for the UI)
│   ├── 03-backup.js             — export/import backup .json
│   ├── 04-accounts.js           — accounts: create/switch/delete, Accounts tab, "new account" popup
│   ├── 05-trades.js             — saving/deleting a trade in State
│   ├── 06-layout.js             — sidebar, topbar, tab switching, renderAll()
│   ├── 07-dashboard.js          — Dashboard tab (stats, equity curve)
│   ├── 08-calendar.js           — Calendar tab
│   ├── 09-performance.js        — Performance tab (year/month/week breakdown)
│   ├── 10-log.js                — Trade Log tab
│   ├── 11-trade-modal.js        — the "Log trade" / "Edit trade" form, incl. multiple TP levels
│   └── 12-main.js               — draws the first screen (loaded last)
├── vendor/chart.umd.min.js     — bundled Chart.js (offline, no CDN)
├── Launch-Mac-Linux.command
├── Launch-Windows.bat
├── .gitignore                  — keeps exported backups / OS junk out of git, if you put this in a repo
└── README.md
```

No React, no npm, no bundler — plain HTML/CSS/JS, so you (or anyone) can open
and edit any file directly in a text editor. **New to the code?** Start with
`js/README.md` — it walks through how the pieces fit together before you dive
into any one file.
