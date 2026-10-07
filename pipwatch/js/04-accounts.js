/* =====================================================================
 * ACCOUNTS
 * ---------------------------------------------------------------------
 * Everything about creating, switching between, deleting, and viewing
 * trading accounts (each account has its own trade history): the
 * actions (add/select/delete), the Accounts tab's grid of account
 * cards, and the "New account" modal.
 * ===================================================================== */

/* ---------------------------------- account actions ---------------------------------- */

function addAccount(acc) {
  const a = { ...acc, id: uid(), createdAt: new Date().toISOString() };
  State.accounts.push(a);
  persistAccounts();
  State.currentAccountId = a.id;
  loadTradesForCurrent();
  closeModal();
  renderAll();
}
function selectAccount(id) {
  State.currentAccountId = id; State.accountPickerOpen = false;
  loadTradesForCurrent(); renderAll();
}
function deleteAccount(id) {
  if (!confirm('Delete this account and all its trades? This cannot be undone.')) return;
  const trades = Storage.getTrades(id);
  trades.forEach(t => { if (t.hasImage) Storage.deleteImage(t.id); });
  Storage.deleteTrades(id);
  State.accounts = State.accounts.filter(a => a.id !== id);
  persistAccounts();
  if (State.currentAccountId === id) { State.currentAccountId = State.accounts[0]?.id || null; loadTradesForCurrent(); }
  renderAll();
}
/* ---------------------------------- accounts ---------------------------------- */

function renderAccounts() {
  return `
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-bottom:14px;flex-wrap:wrap;">
      <button class="btn btn-ghost" onclick="exportBackup()">⭳ Export backup</button>
      <button class="btn btn-ghost" onclick="triggerImportBackup()">⭱ Import backup</button>
      <button class="btn btn-accent" onclick="openAccountModal()">+ New account</button>
    </div>
    <p style="font-size:11.5px;color:var(--dim2);margin:-6px 0 14px;">Backups are plain JSON files (accounts, trades, and chart screenshots included) — keep a copy somewhere outside this browser.</p>
    <div class="acc-grid">
      ${State.accounts.map(a => {
        const trades = Storage.getTrades(a.id);
        const stats = computeStats(trades);
        const active = a.id === State.currentAccountId;
        return `
          <div class="acc-card ${active ? 'active' : ''}">
            <div class="acc-card-head">
              <div>
                <div style="font-weight:500;font-size:14px;display:flex;align-items:center;gap:8px;">${escapeHtml(a.name)} ${active ? `<span class="acc-badge">ACTIVE</span>` : ''}</div>
                <div style="font-size:11px;color:var(--dim);margin-top:2px;">${a.type === 'live' ? '● Live account' : '⚗ Backtest account'}</div>
              </div>
              <button class="icon-btn" onclick="deleteAccount('${a.id}')">🗑</button>
            </div>
            ${a.strategy ? `<div style="font-size:12px;color:var(--dim2);margin-bottom:4px;">Strategy: ${escapeHtml(a.strategy)}</div>` : ''}
            ${a.type === 'backtest' && a.period ? `<div style="font-size:12px;color:var(--dim2);margin-bottom:4px;">Period tested: ${escapeHtml(a.period)}</div>` : ''}
            <div class="acc-stats">
              <div><div class="detail-label">Net P/L</div><div class="mono" style="font-size:13px;font-weight:600;color:${stats.pnl >= 0 ? 'var(--profit)' : 'var(--loss)'};">${fmtMoney(stats.pnl)}</div></div>
              <div><div class="detail-label">Trades</div><div class="mono" style="font-size:13px;font-weight:600;">${stats.total}</div></div>
              <div><div class="detail-label">Win rate</div><div class="mono" style="font-size:13px;font-weight:600;">${stats.winRate.toFixed(0)}%</div></div>
            </div>
            ${!active ? `<button class="btn btn-ghost" style="width:100%;justify-content:center;margin-top:10px;" onclick="selectAccount('${a.id}')">Switch to this account</button>` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}
/* ---------------------------------- modals: account ---------------------------------- */

function openAccountModal() {
  document.getElementById('modalRoot').innerHTML = `
    <div class="modal-backdrop" onclick="if(event.target===this) closeModal()">
      <div class="modal">
        <div class="modal-head"><div class="modal-title">New account</div><button class="icon-btn" onclick="closeModal()">×</button></div>
        <div class="field"><label>Account name</label><input id="accName" placeholder="e.g. FTMO 100k, Personal MT4" autofocus></div>
        <div class="field"><label>Account type</label>
          <div class="toggle-group">
            <button type="button" class="toggle-btn" id="typeLiveBtn" onclick="setAccType('live')">● Live</button>
            <button type="button" class="toggle-btn" id="typeBacktestBtn" onclick="setAccType('backtest')">⚗ Backtest</button>
          </div>
        </div>
        <div class="field"><label>Strategy (optional)</label><input id="accStrategy" placeholder="e.g. Breakout, ICT, Mean Reversion"></div>
        <div class="field" id="accPeriodField" style="display:none;"><label>Period tested (optional)</label><input id="accPeriod" placeholder="e.g. Jan 2020 – Dec 2023"></div>
        <button class="btn btn-accent" style="width:100%;justify-content:center;" onclick="submitAccountForm()">Create account</button>
      </div>
    </div>
  `;
  setAccType('live');
  document.getElementById('accName').focus();
}
function setAccType(type) {
  window._accType = type;
  document.getElementById('typeLiveBtn').style.cssText = type === 'live' ? 'border-color:var(--accent);color:var(--accent);' : '';
  document.getElementById('typeBacktestBtn').style.cssText = type === 'backtest' ? 'border-color:var(--accent);color:var(--accent);' : '';
  document.getElementById('accPeriodField').style.display = type === 'backtest' ? 'block' : 'none';
}
function submitAccountForm() {
  const name = document.getElementById('accName').value.trim();
  if (!name) return;
  const strategy = document.getElementById('accStrategy').value.trim();
  const periodField = document.getElementById('accPeriod');
  const period = periodField ? periodField.value.trim() : '';
  addAccount({ name, type: window._accType || 'live', strategy, period });
}
