/* =====================================================================
 * CALENDAR
 * ---------------------------------------------------------------------
 * The "Calendar" tab: a Monday-first month grid colored by each day's P/L
 * (to the cent), a total + "% vs previous week" at the end of each week,
 * the month's total + % vs the previous month, and a Mon–Fri P/L chart.
 * Click a day to list that day's trades below.
 * ===================================================================== */

/* ---------------------------------- calendar ---------------------------------- */

let dayChartInstance = null;

// Total P/L per weekday (Mon–Fri) for the month currently shown on the
// calendar. Weekend trades aren't included. Also returns which weekday made
// the most so the heading can call it out.
function computeWeekdayTotals() {
  const { year, month } = State.cal;
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const totals = [0, 0, 0, 0, 0]; // Mon..Fri
  State.trades.forEach(t => {
    if (!t.date.startsWith(prefix)) return;
    const dow = new Date(Number(t.date.slice(0, 4)), Number(t.date.slice(5, 7)) - 1, Number(t.date.slice(8, 10))).getDay(); // 0=Sun
    if (dow >= 1 && dow <= 5) totals[dow - 1] += Number(t.pnl || 0);
  });
  return totals.map(v => Number(v.toFixed(2)));
}

function initDayChart() {
  dayChartInstance = drawPnlBarChart('dayOfWeekChart', ["Mon","Tue","Wed","Thu","Fri"], computeWeekdayTotals(), dayChartInstance);
}

function renderCalendar() {
  const { year, month } = State.cal;
  const byDate = {};
  State.trades.forEach(t => { (byDate[t.date] = byDate[t.date] || []).push(t); });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Weeks run Monday → Sunday. The grid starts on the Monday on/before the
  // 1st and ends on the Sunday on/after the last day, so the days just
  // outside this month are shown dimmed (their P/L still counts in the week).
  const lead = (new Date(year, month, 1).getDay() + 6) % 7;
  const totalCells = Math.ceil((lead + daysInMonth) / 7) * 7;
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthTotal = periodPnl(monthPrefix) || 0;
  const pm = month === 0 ? 11 : month - 1, py = month === 0 ? year - 1 : year;
  const prevMonthTotal = periodPnl(`${py}-${String(pm + 1).padStart(2, '0')}`);
  const monthPct = pctChange(periodPnl(monthPrefix), prevMonthTotal);
  const weekMap = weeklyPnlMap();
  const todayStr = ymd(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const dowNames = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const sel = State.cal.selected;
  const selTrades = sel ? (byDate[sel] || []) : [];
  const weekdayTotals = computeWeekdayTotals();
  const weekdayNames = ["Monday","Tuesday","Wednesday","Thursday","Friday"];
  const hasWeekdayTrades = weekdayTotals.some(v => v !== 0);
  const bestIdx = weekdayTotals.indexOf(Math.max(...weekdayTotals));
  const bestDayNote = hasWeekdayTrades && weekdayTotals[bestIdx] > 0
    ? `<span class="profit">${weekdayNames[bestIdx]}</span> earned the most this month (${fmtMoney(weekdayTotals[bestIdx])})`
    : 'No profitable weekday this month yet';

  return `
    <div class="cal-header">
      <div class="cal-nav">
        <button class="icon-btn" onclick="shiftMonth(-1)">‹</button>
        <div class="cal-month-label">${monthNames[month]} ${year}</div>
        <button class="icon-btn" onclick="shiftMonth(1)">›</button>
      </div>
      <div class="cal-total"><span class="${monthTotal >= 0 ? 'profit' : 'loss'}">${fmtMoney(monthTotal)} this month</span> <span style="font-size:12px;font-weight:400;color:var(--dim);">· ${fmtPctChange(monthPct)} vs ${monthNames[pm]}</span></div>
    </div>
    <div class="panel">
      <div class="cal-grid with-week" style="margin-bottom:6px;">${dowNames.map(d => `<div class="cal-dow">${d}</div>`).join('')}<div class="cal-dow">Week</div></div>
      <div class="cal-grid with-week">
        ${Array.from({ length: totalCells / 7 }, (_, w) => {
          const days = Array.from({ length: 7 }, (_, i) => new Date(year, month, 1 - lead + w * 7 + i));
          const dayHtml = days.map(dt => {
            const dateStr = ymd(dt.getFullYear(), dt.getMonth(), dt.getDate());
            const inMonth = dt.getMonth() === month;
            const dayTrades = byDate[dateStr] || [];
            const total = dayTrades.reduce((s, t) => s + Number(t.pnl), 0);
            const has = dayTrades.length > 0;
            const pnlHtml = has ? `<span class="day-pnl ${total >= 0 ? 'profit' : 'loss'}">${fmtAmtResponsive(total)}</span>` : '';
            if (!inMonth) return `<div class="cal-cell other-month"><span class="day-num">${dt.getDate()}</span>${pnlHtml}</div>`;
            const cls = ['cal-cell'];
            if (has) cls.push('has-trades', total >= 0 ? 'profit-day' : 'loss-day');
            if (sel === dateStr) cls.push('selected');
            if (dateStr === todayStr) cls.push('today');
            return `<button class="${cls.join(' ')}" onclick="selectCalDate('${dateStr}')"><span class="day-num">${dt.getDate()}</span>${pnlHtml}</button>`;
          }).join('');
          const mon = days[0], prevMon = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() - 7);
          const key = ymd(mon.getFullYear(), mon.getMonth(), mon.getDate());
          const prevKey = ymd(prevMon.getFullYear(), prevMon.getMonth(), prevMon.getDate());
          const wTotal = weekMap[key], hasWeek = wTotal !== undefined;
          const wPct = pctChange(wTotal, weekMap[prevKey]);
          return dayHtml + `<div class="cal-cell cal-week ${hasWeek ? (wTotal >= 0 ? 'profit-day' : 'loss-day') : ''}">
            <span class="day-num">Week total</span>
            ${hasWeek ? `<span class="day-pnl ${wTotal >= 0 ? 'profit' : 'loss'}">${fmtAmtResponsive(wTotal)}</span><span class="day-pct">${fmtPctChange(wPct)} <span class="hide-mobile" style="color:var(--dim2);">vs prev</span></span>` : '<span class="day-pnl" style="color:var(--dim2);">–</span>'}
          </div>`;
        }).join('')}
      </div>
    </div>
    <div class="panel">
      <div class="panel-title">P/L by weekday · ${monthNames[month]} ${year}</div>
      <div style="font-size:12px;color:var(--dim);margin-bottom:6px;">${hasWeekdayTrades ? bestDayNote : 'No Mon–Fri trades logged this month.'}</div>
      <div class="chart-wrap"><canvas id="dayOfWeekChart"></canvas></div>
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
