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
  if (State.tab === 'calendar') { el.innerHTML = renderCalendar(); initDayChart(); }
  if (State.tab === 'performance') { el.innerHTML = renderPerformance(); initPerfChart(); }
  if (State.tab === 'log') { el.innerHTML = renderLog(); attachLogImageLoads(); }
  if (State.tab === 'accounts') el.innerHTML = renderAccounts();
}

function renderSidebar() {
  const el = document.getElementById('sidebar');
  const acc = State.accounts.find(a => a.id === State.currentAccountId);
  const navItems = [
    ['dashboard', '▦', 'Dashboard'], ['calendar', '📅', 'Calendar'], ['performance', '📈', 'Performance'],
    ['log', '📓', 'Trade Log'], ['accounts', '💼', 'Accounts'],
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
    <nav class="nav">${navItems.map(([id, icon, label]) => `<button class="nav-item ${State.tab === id ? 'active' : ''}" onclick="setTab('${id}')"><span class="nav-icon">${icon}</span><span class="nav-label">${label}</span></button>`).join('')}</nav>
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

/* ---------------------------------- image viewer (lightbox) ---------------------------------- */

// Click a screenshot to see it enlarged. Works for any array of image
// sources, so both the Trade Log and the trade form use it. It has its own
// overlay element (not #modalRoot) so opening it from inside the trade form
// doesn't wipe the form. Close with the X, a click outside the image, or Esc;
// arrow keys / buttons move between screenshots.
let viewerImages = [];
let viewerIndex = 0;

function openImageViewer(images, startIndex) {
  if (!images || !images.length) return;
  viewerImages = images.slice();
  viewerIndex = startIndex || 0;
  let box = document.getElementById('imageViewer');
  if (!box) {
    box = document.createElement('div');
    box.id = 'imageViewer';
    box.className = 'viewer-backdrop';
    box.onclick = (e) => { if (e.target === box) closeImageViewer(); };
    document.body.appendChild(box);
    document.addEventListener('keydown', viewerKeyHandler);
  }
  renderImageViewer();
}
function renderImageViewer() {
  const box = document.getElementById('imageViewer');
  if (!box) return;
  const multi = viewerImages.length > 1;
  box.innerHTML = `
    <button class="viewer-btn viewer-close" onclick="closeImageViewer()" title="Close (Esc)">×</button>
    ${multi ? `<button class="viewer-btn viewer-prev" onclick="stepImageViewer(-1)" title="Previous">‹</button>
               <button class="viewer-btn viewer-next" onclick="stepImageViewer(1)" title="Next">›</button>` : ''}
    <img class="viewer-img" src="${viewerImages[viewerIndex]}" alt="Screenshot ${viewerIndex + 1}">
    ${multi ? `<div class="viewer-count">${viewerIndex + 1} / ${viewerImages.length}</div>` : ''}
  `;
}
function stepImageViewer(delta) {
  viewerIndex = (viewerIndex + delta + viewerImages.length) % viewerImages.length;
  renderImageViewer();
}
function closeImageViewer() {
  const box = document.getElementById('imageViewer');
  if (box) box.remove();
  document.removeEventListener('keydown', viewerKeyHandler);
}
function viewerKeyHandler(e) {
  if (e.key === 'Escape') closeImageViewer();
  else if (e.key === 'ArrowLeft' && viewerImages.length > 1) stepImageViewer(-1);
  else if (e.key === 'ArrowRight' && viewerImages.length > 1) stepImageViewer(1);
}
