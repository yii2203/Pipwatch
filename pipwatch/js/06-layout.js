/* =====================================================================
 * LAYOUT
 * ---------------------------------------------------------------------
 * The app's outer shell: which tab is active, the sidebar (account
 * picker + nav), the topbar, and renderAll() — the one function that
 * redraws the whole page from State after any change. Every other
 * render*() function (dashboard, calendar, performance, log, accounts)
 * gets called from here. closeModal() lives here too since both the
 * account modal and the trade modal use it.
 * ===================================================================== */

/* ---------------------------------- top-level render ---------------------------------- */

function setTab(id) { State.tab = id; State.accountPickerOpen = false; renderAll(); }
function toggleAccountPicker() { State.accountPickerOpen = !State.accountPickerOpen; renderSidebar(); }

function renderAll() {
  if (!State.accounts.length) {
    document.getElementById('sidebar').innerHTML = '';
    document.getElementById('topbar').innerHTML = '';
    document.getElementById('content').innerHTML = `
      <div style="min-height:70vh;display:flex;align-items:center;justify-content:center;">
        <div style="text-align:center;max-width:360px;margin:0 auto;">
          <div class="brand-name" style="margin-bottom:8px;">PIPWATCH</div>
          <h1 style="font-size:18px;font-weight:600;margin-bottom:8px;">Set up your first account</h1>
          <p style="font-size:14px;color:var(--dim);margin-bottom:20px;">Create a live or backtesting account to start logging trades. Each account keeps its own trade history, calendar, and stats.</p>
          <button class="btn btn-accent" onclick="openAccountModal()">Create account</button>
          <div style="margin-top:12px;">
            <button class="btn btn-ghost" onclick="triggerImportBackup()">⭱ Or import a backup file</button>
          </div>
        </div>
      </div>`;
    return;
  }
  renderSidebar();
  renderTopbar();
  const el = document.getElementById('content');
  if (State.tab === 'dashboard') { el.innerHTML = renderDashboard(); initChart(); }
  if (State.tab === 'calendar') el.innerHTML = renderCalendar();
  if (State.tab === 'performance') el.innerHTML = renderPerformance();
  if (State.tab === 'log') { el.innerHTML = renderLog(); attachLogImageLoads(); }
  if (State.tab === 'accounts') el.innerHTML = renderAccounts();
}

function renderSidebar() {
  const el = document.getElementById('sidebar');
  const acc = State.accounts.find(a => a.id === State.currentAccountId);
  const navItems = [
    ['dashboard', 'Dashboard'], ['calendar', 'Calendar'], ['performance', 'Performance'],
    ['log', 'Trade Log'], ['accounts', 'Accounts'],
  ];
  el.innerHTML = `
    <div class="brand"><span class="brand-dot"></span><span class="brand-name">PIPWATCH</span></div>
    <div class="account-picker">
      <button class="account-btn" onclick="toggleAccountPicker()">
        <div style="min-width:0;">
          <div class="account-name">${escapeHtml(acc?.name || '')}</div>
          <div class="account-type">${acc?.type === 'live' ? '● Live' : '⚗ Backtest'}</div>
        </div>
        <span>▾</span>
      </button>
      ${State.accountPickerOpen ? `
        <div class="account-dropdown">
          ${State.accounts.map(a => `<button onclick="selectAccount('${a.id}')"><span>${escapeHtml(a.name)}</span><span>${a.type === 'live' ? '●' : '⚗'}</span></button>`).join('')}
          <button class="new-account" onclick="openAccountModal()">+ New account</button>
        </div>` : ''}
    </div>
    <nav class="nav">${navItems.map(([id, label]) => `<button class="nav-item ${State.tab === id ? 'active' : ''}" onclick="setTab('${id}')">${label}</button>`).join('')}</nav>
    <div class="sidebar-footer">${State.accounts.length} account${State.accounts.length !== 1 ? 's' : ''}</div>
  `;
}

function closeModal() { document.getElementById('modalRoot').innerHTML = ''; }

function renderTopbar() {
  const el = document.getElementById('topbar');
  const acc = State.accounts.find(a => a.id === State.currentAccountId);
  if (!acc) { el.innerHTML = ''; return; }
  el.innerHTML = `
    <div>
      <div class="topbar-title">${escapeHtml(acc.name)}</div>
      <div class="topbar-sub">${acc.type === 'live' ? 'Live account' : 'Backtest account'}${acc.strategy ? ' · ' + escapeHtml(acc.strategy) : ''}</div>
    </div>
    <button class="btn btn-accent" onclick="openTradeModal()">+ Log trade</button>
  `;
}
