# How this code is organized

There's no framework, no build step, no bundler — just plain HTML/CSS/JS
files loaded with `<script>` tags, in the order listed in `index.html`.
Every file just adds its functions to the same global scope, so a function
in one file can freely call a function or use data defined in another —
there's no import/export to worry about.

## The core idea, in one paragraph

There's one big object called **`State`** (in `02-state.js`) that holds
*everything currently on screen*: which account is selected, that
account's trades, which tab is open, which calendar day is picked, etc.
Every `render___()` function (one per tab, roughly) reads `State` and
returns a big string of HTML. `renderAll()` (in `06-layout.js`) takes
whichever `render___()` matches the current tab and drops that HTML
straight into the page. Every button, dropdown, or form in the app calls a
small function that changes something in `State` and then calls
`renderAll()` again — so the whole page is really just "turn `State` into
HTML" running over and over.

```
you click something  →  a handler function runs
                            → it updates State
                            → it (usually) calls renderAll()
                                → renderAll() calls the render___() for
                                  the current tab, which reads State and
                                  builds a new HTML string
                                → that string replaces what's on screen
```

The one place this gets more careful is the "Log trade" form
(`11-trade-modal.js`): rebuilding a text field's HTML while you're
mid-keystroke would make you lose your cursor position, so typing in most
fields there updates `State` and patches just the one small bit of the
page that depends on it (like the auto-calculated P/L), instead of
re-building the whole form.

## What's in each file (load order = this order)

| File | What it's responsible for |
|---|---|
| `storage.js` | Reading/writing accounts, trades, and chart images to the browser's localStorage. The only file that touches `localStorage` directly. |
| `pnl.js` | The list of currency pairs/outcomes/timeframes, and the math for auto-calculating a trade's $ P/L from entry/exit/lot size. |
| `01-helpers.js` | Little stateless utilities used everywhere: money/date formatting, win-rate & profit-factor math, HTML-escaping, resizing an uploaded screenshot. |
| `02-state.js` | The `State` object itself, plus loading/saving it to `storage.js`. |
| `03-backup.js` | The "Export backup" / "Import backup" buttons on the Accounts tab — turns everything into one `.json` file and back. |
| `04-accounts.js` | Creating/switching/deleting accounts; the Accounts tab; the "New account" popup. |
| `05-trades.js` | Saving a finished trade into `State` (adding/updating/deleting). The *form* for entering a trade is in `11-trade-modal.js` — this file is just "take a finished trade object and persist it." |
| `06-layout.js` | The outer shell: sidebar, topbar, tab switching, and `renderAll()` — the function that redraws the page. |
| `07-dashboard.js` | The Dashboard tab: stat cards, the equity curve chart, the "Last N trades" slider. |
| `08-calendar.js` | The Calendar tab: the month grid colored by daily P/L. |
| `09-performance.js` | The Performance tab: year → month → week → trade breakdown. |
| `10-log.js` | The Trade Log tab: the sortable list and each trade's expandable detail view. |
| `11-trade-modal.js` | The "Log trade" / "Edit trade" popup form — all its fields, validation, and the multi take-profit section. |
| `12-main.js` | Just one line — draws the very first screen. Loaded last on purpose. |

## If you want to change something

- **Change how something looks / what a tab shows** → find its
  `render___()` function (the table above tells you which file) and edit
  the HTML string it returns. CSS classes used there are defined in
  `css/styles.css`.
- **Change what happens on a click/input** → find the `onclick="..."` or
  `oninput="..."` in that HTML string, then find the matching function in
  the same file.
- **Change what's stored about a trade/account** → `02-state.js` (the
  shape of `State`) and `storage.js` (how it's saved) are the two places
  that matter; everywhere else just reads whatever fields already exist.
- **Add a brand new tab** → add a `render<YourTab>()` function in a new
  file, add a case for it in `renderAll()` and the sidebar nav in
  `06-layout.js`, and add a `<script>` tag for your new file in
  `index.html` (anywhere before `12-main.js`).
