/* ---------------------------------- helpers ---------------------------------- */

function uid() { return 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2); }

function fmtMoney(n) {
  const v = Number(n) || 0;
  const sign = v < 0 ? '-' : '';
  return sign + '$' + Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d) {
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
function dayOfWeek(d) {
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString(undefined, { weekday: 'long' });
}
function ymd(y, m, d) { return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`; }
function weekOfMonth(day) { return Math.min(5, Math.ceil(day / 7)); }

function computeStats(trades) {
  const total = trades.length;
  const pnl = trades.reduce((s, t) => s + Number(t.pnl || 0), 0);
  const wins = trades.filter(t => Number(t.pnl) > 0);
  const losses = trades.filter(t => Number(t.pnl) < 0);
  const winRate = total ? (wins.length / total) * 100 : 0;
  const grossWin = wins.reduce((s, t) => s + Number(t.pnl), 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + Number(t.pnl), 0));
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : (grossWin > 0 ? Infinity : 0);
  return { total, pnl, winRate, profitFactor, wins: wins.length, losses: losses.length };
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function processImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 900;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale); height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.onerror = () => reject(new Error('Could not load image'));
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function outcomeLabel(id) { const o = OUTCOMES.find(x => x.id === id); return o ? o.label : ''; }
function outcomeColor(id) { return id === 'target' ? 'var(--profit)' : id === 'stoploss' ? 'var(--loss)' : 'var(--dim)'; }
function starString(v) {
  if (!v) return '<span style="color:var(--dim2);font-size:12px;">–</span>';
  let s = ''; for (let i = 1; i <= 5; i++) s += `<span style="color:${i <= v ? 'var(--accent)' : 'var(--dim2)'};">★</span>`;
  return s;
}

function showToast(msg) {
  document.getElementById('toastRoot').innerHTML = `<div class="toast" onclick="this.remove()">${escapeHtml(msg)}</div>`;
  setTimeout(() => { const t = document.querySelector('.toast'); if (t) t.remove(); }, 5000);
}

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
    <nav class="nav">${navItems.map(([id, icon, label]) => `<button class="nav-item ${State.tab === id ? 'active' : ''}" onclick="setTab('${id}')">${icon} ${label}</button>`).join('')}</nav>
    <div class="sidebar-footer">${State.accounts.length} account${State.accounts.length !== 1 ? 's' : ''}</div>
  `;
}

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

/* ---------------------------------- dashboard ---------------------------------- */

let chartInstance = null;

function renderDashboard() {
  const stats = computeStats(State.trades);
  if (!State.trades.length) return `<div class="empty-state">No trades logged yet for this account. Click "Log trade" to add your first one.</div>`;
  const sorted = [...State.trades].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const maxWindow = sorted.length;
  if (!State.chartWindow || State.chartWindow > maxWindow) State.chartWindow = Math.min(30, maxWindow);
  const recent = [...State.trades].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  return `
    <div class="grid-stats">
      <div class="card"><div class="stat-label">Net P/L</div><div class="stat-value ${stats.pnl >= 0 ? 'profit' : 'loss'}">${fmtMoney(stats.pnl)}</div></div>
      <div class="card"><div class="stat-label">Win rate</div><div class="stat-value">${stats.winRate.toFixed(1)}%</div><div class="stat-sub">${stats.wins}W / ${stats.losses}L</div></div>
      <div class="card"><div class="stat-label">Total trades</div><div class="stat-value">${stats.total}</div></div>
      <div class="card"><div class="stat-label">Profit factor</div><div class="stat-value">${stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}</div></div>
    </div>
    <div class="panel">
      <div class="chart-controls">
        <div class="panel-title" style="margin-bottom:0;">Equity curve</div>
        <div class="chart-slider-wrap">
          <span>Last</span>
          <input type="range" min="${Math.min(5, maxWindow)}" max="${maxWindow}" value="${State.chartWindow}" oninput="updateChartWindow(this.value)">
          <span class="mono" style="color:var(--accent);" id="chartWindowLabel">${State.chartWindow}</span>
          <span>trades</span>
        </div>
      </div>
      <div class="chart-wrap"><canvas id="equityChart"></canvas></div>
    </div>
    <div class="panel">
      <div class="panel-title">Recent trades</div>
      ${recent.map(t => `
        <div class="trade-line" style="border-bottom:1px solid var(--border);padding:6px 0;">
          <span><span class="mono" style="color:var(--dim);font-size:11px;">${fmtDate(t.date)}</span> &nbsp; <b>${escapeHtml(t.pair)}</b> <span style="font-size:11px;color:var(--dim);text-transform:uppercase;">${t.direction}</span></span>
          <span class="mono ${Number(t.pnl) >= 0 ? 'profit' : 'loss'}" style="font-weight:600;">${fmtMoney(t.pnl)}</span>
        </div>`).join('')}
    </div>
  `;
}

function computeChartData() {
  const sorted = [...State.trades].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const windowSize = State.chartWindow;
  const before = sorted.slice(0, Math.max(0, sorted.length - windowSize));
  let running = before.reduce((s, t) => s + Number(t.pnl || 0), 0);
  const slice = sorted.slice(Math.max(0, sorted.length - windowSize));
  const labels = [], data = [];
  slice.forEach((t, i) => { running += Number(t.pnl || 0); labels.push(String(sorted.length - windowSize + i + 1)); data.push(Number(running.toFixed(2))); });
  return { labels, data };
}

function initChart() {
  const canvas = document.getElementById('equityChart');
  if (!canvas) return;
  const { labels, data } = computeChartData();
  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: { labels, datasets: [{ label: 'Cumulative P/L', data, borderColor: '#FFB300', backgroundColor: 'rgba(255,179,0,0.08)', fill: true, tension: 0.25, pointRadius: 0, pointHoverRadius: 4, borderWidth: 2 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ' ' + fmtMoney(ctx.parsed.y) } } },
      scales: {
        x: { title: { display: true, text: 'Trade #', color: '#82879A' }, ticks: { color: '#82879A', font: { size: 10 } }, grid: { color: '#20232C' } },
        y: { ticks: { color: '#82879A', font: { size: 10 }, callback: (v) => '$' + v }, grid: { color: '#20232C' } },
      },
    },
  });
}
function updateChartWindow(v) {
  State.chartWindow = Number(v);
  const label = document.getElementById('chartWindowLabel'); if (label) label.textContent = v;
  initChart();
}

/* ---------------------------------- calendar ---------------------------------- */

function renderCalendar() {
  const { year, month } = State.cal;
  const byDate = {};
  State.trades.forEach(t => { (byDate[t.date] = byDate[t.date] || []).push(t); });
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const monthTotal = Object.entries(byDate).filter(([date]) => date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).reduce((s, [, ts]) => s + ts.reduce((a, t) => a + Number(t.pnl), 0), 0);
  const todayStr = ymd(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const dowNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const sel = State.cal.selected;
  const selTrades = sel ? (byDate[sel] || []) : [];

  return `
    <div class="cal-header">
      <div class="cal-nav">
        <button class="icon-btn" onclick="shiftMonth(-1)">‹</button>
        <div class="cal-month-label">${monthNames[month]} ${year}</div>
        <button class="icon-btn" onclick="shiftMonth(1)">›</button>
      </div>
      <div class="cal-total ${monthTotal >= 0 ? 'profit' : 'loss'}">${fmtMoney(monthTotal)} this month</div>
    </div>
    <div class="panel">
      <div class="cal-grid" style="margin-bottom:6px;">${dowNames.map(d => `<div class="cal-dow">${d}</div>`).join('')}</div>
      <div class="cal-grid">
        ${cells.map(d => {
          if (d === null) return `<div></div>`;
          const dateStr = ymd(year, month, d);
          const dayTrades = byDate[dateStr] || [];
          const total = dayTrades.reduce((s, t) => s + Number(t.pnl), 0);
          const has = dayTrades.length > 0;
          const cls = ['cal-cell'];
          if (has) cls.push('has-trades', total >= 0 ? 'profit-day' : 'loss-day');
          if (sel === dateStr) cls.push('selected');
          if (dateStr === todayStr) cls.push('today');
          return `<button class="${cls.join(' ')}" onclick="selectCalDate('${dateStr}')">
            <span class="day-num">${d}</span>
            ${has ? `<span class="day-pnl ${total >= 0 ? 'profit' : 'loss'}">${total >= 0 ? '+' : ''}${Math.abs(total) >= 1000 ? (total / 1000).toFixed(1) + 'k' : total.toFixed(0)}</span>` : ''}
          </button>`;
        }).join('')}
      </div>
    </div>
    ${sel ? `
      <div class="panel">
        <div class="panel-title">${fmtDate(sel)} · ${dayOfWeek(sel)}</div>
        ${selTrades.length === 0 ? `<p style="font-size:13px;color:var(--dim);">No trades logged this day.</p>` :
          selTrades.map(t => `
            <div class="trade-line" style="border-bottom:1px solid var(--border);padding:6px 0;">
              <span><b>${escapeHtml(t.pair)}</b> <span style="font-size:11px;color:var(--dim);text-transform:uppercase;">${t.direction}</span> ${t.notes ? `<span style="font-size:11px;color:var(--dim2);">${escapeHtml(t.notes)}</span>` : ''}</span>
              <span class="mono ${Number(t.pnl) >= 0 ? 'profit' : 'loss'}" style="font-weight:600;">${fmtMoney(t.pnl)}</span>
            </div>`).join('')}
      </div>` : ''}
  `;
}
function shiftMonth(delta) {
  let m = State.cal.month + delta, y = State.cal.year;
  if (m < 0) { m = 11; y -= 1; } if (m > 11) { m = 0; y += 1; }
  State.cal.month = m; State.cal.year = y; State.cal.selected = null;
  renderAll();
}
function selectCalDate(dateStr) { State.cal.selected = State.cal.selected === dateStr ? null : dateStr; renderAll(); }

/* ---------------------------------- performance ---------------------------------- */

function renderPerformance() {
  const years = Array.from(new Set(State.trades.map(t => t.date.slice(0, 4))));
  if (!years.length) years.push(String(new Date().getFullYear()));
  years.sort((a, b) => b - a);
  if (!State.perf.year || !years.includes(State.perf.year)) State.perf.year = years[0];
  const year = State.perf.year;
  const yearTrades = State.trades.filter(t => t.date.startsWith(year));
  const yearStats = computeStats(yearTrades);
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const monthRows = monthNames.map((name, idx) => {
    const mm = String(idx + 1).padStart(2, '0');
    const mTrades = yearTrades.filter(t => t.date.slice(5, 7) === mm);
    return { idx, name, trades: mTrades, stats: computeStats(mTrades) };
  });
  function weeksFor(monthTrades) {
    const map = {};
    monthTrades.forEach(t => { const w = weekOfMonth(Number(t.date.slice(8, 10))); (map[w] = map[w] || []).push(t); });
    return Object.entries(map).sort((a, b) => a[0] - b[0]).map(([w, ts]) => ({ week: Number(w), trades: ts, stats: computeStats(ts) }));
  }

  return `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
      <div class="year-tabs">${years.map(y => `<button class="year-tab ${y === year ? 'active' : ''}" onclick="setPerfYear('${y}')">${y}</button>`).join('')}</div>
      <div class="cal-total ${yearStats.pnl >= 0 ? 'profit' : 'loss'}">${fmtMoney(yearStats.pnl)} in ${year}</div>
    </div>
    <div class="month-table">
      <div class="month-row-head"><span>Month</span><span class="right">Trades</span><span class="right">Win%</span><span class="right">P/L</span></div>
      ${monthRows.map(row => {
        const empty = row.trades.length === 0;
        const isOpen = State.perf.expMonth === row.idx;
        return `
          <button class="month-row ${empty ? 'empty' : ''}" onclick="${empty ? '' : `toggleMonth(${row.idx})`}">
            <span>${empty ? '' : `<span class="chev ${isOpen ? '' : 'closed'}">▾</span>`} ${row.name}</span>
            <span class="right mono" style="color:var(--dim);">${row.trades.length || '–'}</span>
            <span class="right mono" style="color:var(--dim);">${row.trades.length ? row.stats.winRate.toFixed(0) + '%' : '–'}</span>
            <span class="right mono" style="font-weight:600;color:${empty ? 'var(--dim2)' : (row.stats.pnl >= 0 ? 'var(--profit)' : 'var(--loss)')};">${row.trades.length ? fmtMoney(row.stats.pnl) : '–'}</span>
          </button>
          ${isOpen ? `<div class="month-detail">
            ${weeksFor(row.trades).map(w => {
              const wKey = row.idx + '-' + w.week;
              const wOpen = State.perf.expWeek === wKey;
              return `<div class="week-row">
                <button class="week-toggle" onclick="toggleWeek('${wKey}')">
                  <span><span class="chev ${wOpen ? '' : 'closed'}">▾</span> Week ${w.week} <span style="color:var(--dim);">· ${w.trades.length} trade${w.trades.length !== 1 ? 's' : ''}</span></span>
                  <span class="mono" style="font-weight:600;color:${w.stats.pnl >= 0 ? 'var(--profit)' : 'var(--loss)'};">${fmtMoney(w.stats.pnl)}</span>
                </button>
                ${wOpen ? `<div class="week-trades">
                  ${w.trades.sort((a, b) => a.date.localeCompare(b.date)).map(t => `
                    <div class="trade-line">
                      <span><span class="mono" style="color:var(--dim2);font-size:10.5px;">${fmtDate(t.date)}</span> ${escapeHtml(t.pair)} <span style="color:var(--dim);text-transform:uppercase;font-size:10.5px;">${t.direction}</span></span>
                      <span class="mono ${Number(t.pnl) >= 0 ? 'profit' : 'loss'}">${fmtMoney(t.pnl)}</span>
                    </div>`).join('')}
                </div>` : ''}
              </div>`;
            }).join('')}
          </div>` : ''}
        `;
      }).join('')}
    </div>
  `;
}
function setPerfYear(y) { State.perf.year = y; State.perf.expMonth = null; State.perf.expWeek = null; renderAll(); }
function toggleMonth(idx) { State.perf.expMonth = State.perf.expMonth === idx ? null : idx; State.perf.expWeek = null; renderAll(); }
function toggleWeek(key) { State.perf.expWeek = State.perf.expWeek === key ? null : key; renderAll(); }

/* ---------------------------------- trade log ---------------------------------- */

function renderLog() {
  if (!State.trades.length) return `<div class="empty-state">No trades yet. Log your first trade to see it here.</div>`;
  const sorted = [...State.trades].sort((a, b) => State.log.sortDesc ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date));
  return `
    <div class="log-table">
      <div class="log-head">
        <button onclick="toggleLogSort()">Date <span class="chev" style="transform:${State.log.sortDesc ? 'rotate(180deg)' : 'none'};display:inline-block;">▾</span></button>
        <span>Pair</span><span>Dir</span><span>Outcome</span><span class="right">P/L</span><span></span>
      </div>
      <div class="log-body">
        ${sorted.map(t => {
          const isOpen = State.log.expandedId === t.id;
          const confirming = State.log.confirmId === t.id;
          return `
            <div>
              <div class="log-row" onclick="toggleLogRow('${t.id}')">
                <span class="mono" style="color:var(--dim);font-size:11px;">${fmtDate(t.date)}</span>
                <span style="font-weight:500;">${escapeHtml(t.pair)} ${t.hasImage ? '🖼' : ''}</span>
                <span style="font-size:11px;color:var(--dim);text-transform:uppercase;">${t.direction}</span>
                <span>${t.outcome ? `<span class="badge" style="color:${outcomeColor(t.outcome)};border-color:${outcomeColor(t.outcome)};">${outcomeLabel(t.outcome)}</span>` : ''}</span>
                <span class="right mono" style="font-weight:600;color:${Number(t.pnl) >= 0 ? 'var(--profit)' : 'var(--loss)'};">${fmtMoney(t.pnl)}</span>
                <span style="display:flex;justify-content:flex-end;gap:4px;" onclick="event.stopPropagation()">
                  <button class="icon-btn" onclick="openTradeModal('${t.id}')">✎</button>
                  ${confirming ? `
                    <button class="icon-btn" style="color:var(--loss);" onclick="confirmDeleteTrade('${t.id}')">✓</button>
                    <button class="icon-btn" onclick="cancelDeleteTrade()">×</button>
                  ` : `<button class="icon-btn" onclick="askDeleteTrade('${t.id}')">🗑</button>`}
                </span>
              </div>
              ${isOpen ? `
                <div class="log-detail">
                  <div class="detail-grid">
                    <div><div class="detail-label">Day</div><div>${dayOfWeek(t.date)}</div></div>
                    <div><div class="detail-label">Timeframe</div><div>${t.timeframe || '–'}</div></div>
                    <div><div class="detail-label">Entry / Exit</div><div class="mono">${t.entry ?? '–'} / ${t.exit ?? '–'}</div></div>
                    <div><div class="detail-label">Lot size</div><div class="mono">${t.lots ?? '–'}</div></div>
                    <div><div class="detail-label">Risk %</div><div class="mono">${t.riskPercent != null ? t.riskPercent + '%' : '–'}</div></div>
                    <div><div class="detail-label">R multiple</div><div class="mono">${t.rewardMultiple != null ? '1 : ' + t.rewardMultiple : '–'}</div></div>
                    <div><div class="detail-label">Confidence</div><div class="stars">${starString(t.confidence)}</div></div>
                    <div><div class="detail-label">Outcome</div><div>${t.outcome ? `<span class="badge" style="color:${outcomeColor(t.outcome)};border-color:${outcomeColor(t.outcome)};">${outcomeLabel(t.outcome)}</span>` : '–'}</div></div>
                  </div>
                  ${t.notes ? `<div style="font-size:12.5px;margin-bottom:10px;"><div class="detail-label" style="margin-bottom:2px;">Notes</div>${escapeHtml(t.notes)}</div>` : ''}
                  ${t.hasImage ? `<div><div class="detail-label" style="margin-bottom:4px;">Chart</div><img class="detail-img" id="img-${t.id}" src=""></div>` : ''}
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}
function toggleLogSort() { State.log.sortDesc = !State.log.sortDesc; renderAll(); }
function toggleLogRow(id) { State.log.expandedId = State.log.expandedId === id ? null : id; renderAll(); }
function attachLogImageLoads() {
  State.trades.forEach(t => {
    if (t.hasImage && State.log.expandedId === t.id) {
      const img = document.getElementById('img-' + t.id);
      if (img) { const data = Storage.getImage(t.id); if (data) img.src = data; }
    }
  });
}

/* ---------------------------------- accounts ---------------------------------- */

function renderAccounts() {
  return `
    <div style="display:flex;justify-content:flex-end;margin-bottom:14px;">
      <button class="btn btn-accent" onclick="openAccountModal()">+ New account</button>
    </div>
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

function closeModal() { document.getElementById('modalRoot').innerHTML = ''; }

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

/* ---------------------------------- modal: trade ---------------------------------- */

function openTradeModal(editId) {
  const initial = editId ? State.trades.find(t => t.id === editId) : null;
  window._tradeForm = {
    id: initial?.id || null,
    pair: initial ? (PAIRS.includes(initial.pair) ? initial.pair : 'Custom') : 'EURUSD',
    customPair: initial && !PAIRS.includes(initial.pair) ? initial.pair : '',
    direction: initial?.direction || 'buy',
    date: initial?.date || new Date().toISOString().slice(0, 10),
    entry: initial?.entry ?? '', exit: initial?.exit ?? '', lots: initial?.lots ?? '',
    pnl: initial?.pnl ?? '', pnlTouched: !!initial,
    notes: initial?.notes || '',
    riskPercent: initial?.riskPercent ?? '', rewardMultiple: initial?.rewardMultiple ?? '',
    outcome: initial?.outcome || '', confidence: initial?.confidence || 0, timeframe: initial?.timeframe || '',
    hasImage: initial?.hasImage || false, imageData: null, imagePreview: null,
  };
  renderTradeModal();
  if (initial?.hasImage) {
    const data = Storage.getImage(initial.id);
    if (data) { window._tradeForm.imagePreview = data; renderTradeModal(); }
  }
}

function renderTradeModal() {
  const f = window._tradeForm;
  const resolvedPair = f.pair === 'Custom' ? (f.customPair.trim() || 'Custom') : f.pair;
  const support = pnlSupport(resolvedPair);
  const lotsNum = f.lots === '' ? null : Number(f.lots);
  const lotsError = f.lots !== '' && (isNaN(lotsNum) || lotsNum <= 0) ? 'Lot size must be a number greater than 0'
    : f.lots !== '' && lotsNum > 500 ? "That's a very large lot size — double-check it" : '';

  document.getElementById('modalRoot').innerHTML = `
    <div class="modal-backdrop" onclick="if(event.target===this) closeModal()">
      <div class="modal wide">
        <div class="modal-head"><div class="modal-title">${f.id ? 'Edit trade' : 'Log trade'}</div><button class="icon-btn" onclick="closeModal()">×</button></div>

        <div class="row-2">
          <div class="field"><label>Date</label><input type="date" value="${f.date}" oninput="updateTradeField('date',this.value)">
            <div class="field-hint">${dayOfWeek(f.date)}</div>
          </div>
          <div class="field"><label>Pair / instrument</label>
            <select onchange="updateTradeField('pair',this.value)">${PAIRS.map(p => `<option value="${p}" ${f.pair === p ? 'selected' : ''}>${p}</option>`).join('')}</select>
          </div>
        </div>
        ${f.pair === 'Custom' ? `<div class="field"><label>Custom pair name</label><input value="${escapeHtml(f.customPair)}" oninput="updateTradeField('customPair',this.value)" placeholder="e.g. USDMXN"></div>` : ''}

        <div class="field"><label>Direction</label>
          <div class="toggle-group">
            <button type="button" class="toggle-btn" style="${f.direction === 'buy' ? 'border-color:var(--profit);color:var(--profit);' : ''}" onclick="updateTradeField('direction','buy')">↑ Buy / Long</button>
            <button type="button" class="toggle-btn" style="${f.direction === 'sell' ? 'border-color:var(--loss);color:var(--loss);' : ''}" onclick="updateTradeField('direction','sell')">↓ Sell / Short</button>
          </div>
        </div>

        <div class="row-3">
          <div class="field"><label>Entry price</label><input type="number" step="any" value="${f.entry}" oninput="updateTradeField('entry',this.value)"></div>
          <div class="field"><label>Exit price</label><input type="number" step="any" value="${f.exit}" oninput="updateTradeField('exit',this.value)"></div>
          <div class="field"><label>Lot size</label><input type="number" step="0.01" min="0.01" class="${lotsError ? 'field-error' : ''}" value="${f.lots}" oninput="updateTradeField('lots',this.value)">
            ${lotsError ? `<div class="field-error-text">${lotsError}</div>` : ''}
          </div>
        </div>

        <div class="field">
          <label>Profit / loss ($)${support !== 'manual' && !f.pnlTouched ? ' · auto-calculated' : ''}</label>
          <input type="number" step="any" value="${f.pnl}" oninput="updateTradePnl(this.value)" placeholder="e.g. 145.50 or -80">
          ${support === 'manual' ? `<div class="field-hint">Cross-currency pairs need a live conversion rate we don't have — enter P/L manually.</div>` : ''}
          ${support !== 'manual' && f.pnlTouched ? `<div class="field-hint"><a href="#" onclick="recalcPnl();return false;">Recalculate from entry/exit/lots</a></div>` : ''}
        </div>

        <div class="row-2">
          <div class="field"><label>Risk % of account (optional)</label><input type="number" step="any" value="${f.riskPercent}" oninput="updateTradeField('riskPercent',this.value)" placeholder="e.g. 1"></div>
          <div class="field"><label>Reward multiple, R (optional)</label><input type="number" step="any" value="${f.rewardMultiple}" oninput="updateTradeField('rewardMultiple',this.value)" placeholder="e.g. 2 = 1:2"></div>
        </div>

        <div class="row-2">
          <div class="field"><label>Outcome (optional)</label>
            <select onchange="updateTradeField('outcome',this.value)"><option value="">–</option>${OUTCOMES.map(o => `<option value="${o.id}" ${f.outcome === o.id ? 'selected' : ''}>${o.label}</option>`).join('')}</select>
          </div>
          <div class="field"><label>Timeframe (optional)</label>
            <select onchange="updateTradeField('timeframe',this.value)"><option value="">–</option>${TIMEFRAMES.map(tf => `<option value="${tf}" ${f.timeframe === tf ? 'selected' : ''}>${tf}</option>`).join('')}</select>
          </div>
        </div>

        <div class="field"><label>Confidence (optional)</label>
          <div class="star-picker">${[1,2,3,4,5].map(n => `<button type="button" class="star-btn" onclick="setConfidence(${n})" style="color:${n <= f.confidence ? 'var(--accent)' : 'var(--dim2)'};font-size:20px;">★</button>`).join('')}</div>
        </div>

        <div class="field"><label>Chart image (optional)</label>
          ${f.imagePreview ? `<div class="img-preview-wrap"><img src="${f.imagePreview}"><button class="img-remove-btn" onclick="removeTradeImage()">×</button></div>`
            : `<label class="img-upload-label">🖼 <span id="imgUploadLabel">Upload chart screenshot</span><input type="file" accept="image/*" style="display:none;" onchange="handleTradeImage(this.files[0])"></label>`}
        </div>

        <div class="field"><label>Notes (optional)</label><textarea rows="2" oninput="updateTradeField('notes',this.value)" placeholder="Setup, mistakes, what you'd do differently…">${escapeHtml(f.notes)}</textarea></div>

        <button class="btn btn-accent" style="width:100%;justify-content:center;" ${(!f.date || f.pnl === '' || lotsError) ? 'disabled' : ''} onclick="submitTradeForm()">${f.id ? 'Save changes' : 'Add trade'}</button>
      </div>
    </div>
  `;
}

function updateTradeField(key, val) {
  window._tradeForm[key] = val;
  if (['entry', 'exit', 'lots', 'direction', 'pair', 'customPair'].includes(key)) maybeRecalcPnl();
  renderTradeModal();
}
function updateTradePnl(val) { window._tradeForm.pnl = val; window._tradeForm.pnlTouched = true; renderTradeModal(); }
function recalcPnl() { window._tradeForm.pnlTouched = false; maybeRecalcPnl(); renderTradeModal(); }
function maybeRecalcPnl() {
  const f = window._tradeForm;
  if (f.pnlTouched) return;
  const pair = f.pair === 'Custom' ? (f.customPair.trim() || 'Custom') : f.pair;
  const entry = f.entry === '' ? null : Number(f.entry);
  const exit = f.exit === '' ? null : Number(f.exit);
  const lots = f.lots === '' ? null : Number(f.lots);
  const calc = autoPnL(pair, f.direction, entry, exit, lots);
  if (calc != null) f.pnl = Number(calc.toFixed(2));
}
function setConfidence(n) { window._tradeForm.confidence = window._tradeForm.confidence === n ? 0 : n; renderTradeModal(); }

function handleTradeImage(file) {
  if (!file) return;
  const label = document.getElementById('imgUploadLabel'); if (label) label.textContent = 'Processing…';
  processImageFile(file).then(dataUrl => {
    window._tradeForm.imageData = dataUrl;
    window._tradeForm.imagePreview = dataUrl;
    renderTradeModal();
  }).catch(() => { showToast("Couldn't read that image."); renderTradeModal(); });
}
function removeTradeImage() {
  window._tradeForm.imageData = 'REMOVE';
  window._tradeForm.imagePreview = null;
  window._tradeForm.hasImage = false;
  renderTradeModal();
}

function submitTradeForm() {
  const f = window._tradeForm;
  const pair = f.pair === 'Custom' ? (f.customPair.trim() || 'Custom') : f.pair;
  const lotsNum = f.lots === '' ? null : Number(f.lots);
  if (!f.date || f.pnl === '' || (f.lots !== '' && (isNaN(lotsNum) || lotsNum <= 0))) return;

  const id = f.id || uid();
  let hasImage = f.hasImage;
  if (f.imageData === 'REMOVE') { hasImage = false; Storage.deleteImage(id); }
  else if (f.imageData) { hasImage = Storage.saveImage(id, f.imageData); if (!hasImage) showToast("Couldn't save the image — it may be too large."); }

  addOrUpdateTrade({
    id, date: f.date, pair, direction: f.direction,
    entry: f.entry === '' ? null : Number(f.entry),
    exit: f.exit === '' ? null : Number(f.exit),
    lots: lotsNum, pnl: Number(f.pnl), notes: f.notes.trim(),
    riskPercent: f.riskPercent === '' ? null : Number(f.riskPercent),
    rewardMultiple: f.rewardMultiple === '' ? null : Number(f.rewardMultiple),
    outcome: f.outcome || null, confidence: f.confidence || null, timeframe: f.timeframe || null,
    dayOfWeek: dayOfWeek(f.date), hasImage,
  });
}

/* ---------------------------------- init ---------------------------------- */

renderAll();
