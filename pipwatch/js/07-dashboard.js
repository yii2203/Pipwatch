/* =====================================================================
 * DASHBOARD
 * ---------------------------------------------------------------------
 * The "Dashboard" tab: the four stat cards (net P/L, win rate, total
 * trades, profit factor), the equity curve chart (built with Chart.js)
 * and its "Last N trades" slider, and the recent-trades list.
 * ===================================================================== */

/* ---------------------------------- dashboard ---------------------------------- */

let chartInstance = null;

function renderDashboard() {
  const stats = computeStats(State.trades);
  if (!State.trades.length) return `<div class="empty-state">No trades logged yet for this account. Click "Log trade" to add your first one.</div>`;
  const sorted = [...State.trades].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const maxWindow = sorted.length;
  const minWindow = Math.min(5, maxWindow);
  // Keep the stored window in sync with the slider's actual [min, max] range.
  // Switching accounts changes maxWindow (and sometimes minWindow) without
  // resetting State.chartWindow, so a value that was valid for the last
  // account can end up below the new slider's min — the slider then visually
  // snaps to its min while the chart keeps using the old, smaller window,
  // so the two disagree and the curve looks wrong/too short.
  if (!State.chartWindow || State.chartWindow > maxWindow || State.chartWindow < minWindow) {
    State.chartWindow = Math.min(30, maxWindow);
  }
  const recent = [...State.trades].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  return `
    <div class="grid-stats">
      <div class="card"><div class="stat-label">Net P/L</div><div class="stat-value ${stats.pnl >= 0 ? 'profit' : 'loss'}">${fmtMoney(stats.pnl)}</div></div>
      <div class="card"><div class="stat-label">Win rate</div><div class="stat-value">${stats.winRate.toFixed(1)}%</div><div class="stat-sub">${stats.wins}W / ${stats.losses}L${stats.breakevens ? ' / ' + stats.breakevens + ' BE' : ''}</div></div>
      <div class="card"><div class="stat-label">Total trades</div><div class="stat-value">${stats.total}</div></div>
      <div class="card"><div class="stat-label">Profit factor</div><div class="stat-value">${stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}</div></div>
    </div>
    <div class="panel">
      <div class="chart-controls">
        <div class="panel-title" style="margin-bottom:0;">Equity curve</div>
        <div class="chart-slider-wrap">
          <span>Last</span>
          ${maxWindow > minWindow
            ? `<input type="range" min="${minWindow}" max="${maxWindow}" value="${State.chartWindow}" oninput="updateChartWindow(this.value)">`
            : ''}
          <span class="mono" style="color:var(--accent);" id="chartWindowLabel">${State.chartWindow}</span>
          <span>trades${maxWindow <= minWindow ? ' (all trades shown)' : ''}</span>
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
        y: { ticks: { color: '#82879A', font: { size: 10 }, callback: (v) => (v < 0 ? '-$' + Math.abs(v) : '$' + v) }, grid: { color: '#20232C' } },
      },
    },
  });
}
function updateChartWindow(v) {
  State.chartWindow = Number(v);
  const label = document.getElementById('chartWindowLabel'); if (label) label.textContent = v;
  // Dragging the slider fires this on every pixel of movement. Rebuilding
  // the whole Chart.js instance (destroy + new Chart) on every tick made the
  // slider feel broken — flickering/stuttering, sometimes going blank
  // mid-drag. Instead, just push new data into the existing chart and
  // update it with no animation, which is instant and stays smooth while
  // dragging.
  if (chartInstance) {
    const { labels, data } = computeChartData();
    chartInstance.data.labels = labels;
    chartInstance.data.datasets[0].data = data;
    chartInstance.update('none');
  } else {
    initChart();
  }
}
