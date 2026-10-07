/* =====================================================================
 * PERFORMANCE
 * ---------------------------------------------------------------------
 * The "Performance" tab: year tabs, a month-by-month P/L table that
 * expands into weeks, which expand into the individual trades.
 * ===================================================================== */

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
