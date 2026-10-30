/* =====================================================================
 * TRADES
 * ---------------------------------------------------------------------
 * Adding/updating a trade and deleting one (with a confirm step).
 * The form used to create/edit a trade's fields lives in
 * trade-modal.js — this file is just the plumbing that saves a
 * finished trade object into State and persists it.
 * ===================================================================== */

/* ---------------------------------- trade actions ---------------------------------- */

function addOrUpdateTrade(trade) {
  if (!State.currentAccountId) return;
  if (trade.id && State.trades.some(t => t.id === trade.id)) {
    State.trades = State.trades.map(t => t.id === trade.id ? trade : t);
  } else {
    trade.id = trade.id || uid();
    State.trades.push(trade);
  }
  State.trades.sort((a, b) => a.date.localeCompare(b.date));
  persistTrades();
  closeModal();
  renderAll();
}
function askDeleteTrade(id) { State.log.confirmId = id; renderAll(); }
function cancelDeleteTrade() { State.log.confirmId = null; renderAll(); }
function confirmDeleteTrade(id) {
  const t = State.trades.find(x => x.id === id);
  State.trades = State.trades.filter(x => x.id !== id);
  persistTrades();
  if (t && t.hasImage) Storage.deleteImage(t.id);
  State.log.confirmId = null;
  renderAll();
}
