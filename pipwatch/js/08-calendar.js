/* =====================================================================
 * CALENDAR
 * ---------------------------------------------------------------------
 * The "Calendar" tab: a month grid colored by that day's P/L, with a
 * day's trades shown below when you click a day.
 * ===================================================================== */

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
