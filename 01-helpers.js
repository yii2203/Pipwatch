/* =====================================================================
 * STATE
 * ---------------------------------------------------------------------
 * The single source of truth for everything on screen: which accounts
 * exist, which one is selected, that account's trades, which tab is
 * open, and the little bits of UI state (calendar month, expanded rows,
 * etc). Every render*() function in the other files reads from this
 * object; every user action updates it and then calls renderAll().
 *
 * persistAccounts()/persistTrades() are the only two places State gets
 * written back to localStorage (via storage.js) — call them after any
 * change you want to survive a page reload.
 * ===================================================================== */

/* ---------------------------------- state ---------------------------------- */

const State = {
  accounts: Storage.getAccounts(),
  currentAccountId: null,
  trades: [],
  tab: 'dashboard',
  accountPickerOpen: false,
  chartWindow: 30,
  cal: { year: new Date().getFullYear(), month: new Date().getMonth(), selected: null },
  perf: { year: null, expMonth: null, expWeek: null },
  log: { sortDesc: true, expandedId: null, confirmId: null },
};
if (State.accounts.length) State.currentAccountId = State.accounts[0].id;

function loadTradesForCurrent() {
  State.trades = State.currentAccountId ? Storage.getTrades(State.currentAccountId) : [];
}
loadTradesForCurrent();

function persistAccounts() { if (!Storage.saveAccounts(State.accounts)) showToast("Couldn't save accounts — your browser storage may be full."); }
function persistTrades() { if (!Storage.saveTrades(State.currentAccountId, State.trades)) showToast("Couldn't save trade — your browser storage may be full."); }
