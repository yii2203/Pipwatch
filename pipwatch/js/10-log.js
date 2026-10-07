/* =====================================================================
 * TRADE LOG
 * ---------------------------------------------------------------------
 * The "Trade Log" tab: the full sortable list of trades, each
 * expandable into a detail view (entry/exit, risk, confidence,
 * outcome, notes, screenshot) with edit/delete actions.
 * ===================================================================== */

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
                    <div><div class="detail-label">Entry / Exit</div><div class="mono">${(t.tps && t.tps.length) ? 'Multiple TPs ↓' : (t.entry ?? '–') + ' / ' + (t.exit ?? '–')}</div></div>
                    <div><div class="detail-label">Lot size</div><div class="mono">${t.lots ?? '–'}${(t.tps && t.tps.length) ? ' (total)' : ''}</div></div>
                    <div><div class="detail-label">Risk %</div><div class="mono">${t.riskPercent != null ? t.riskPercent + '%' : '–'}</div></div>
                    <div><div class="detail-label">R multiple</div><div class="mono">${t.rewardMultiple != null ? '1 : ' + t.rewardMultiple : '–'}</div></div>
                    <div><div class="detail-label">Confidence</div><div class="stars">${starString(t.confidence)}</div></div>
                    <div><div class="detail-label">Outcome</div><div>${t.outcome ? `<span class="badge" style="color:${outcomeColor(t.outcome)};border-color:${outcomeColor(t.outcome)};">${outcomeLabel(t.outcome)}</span>` : '–'}</div></div>
                  </div>
                  ${(t.tps && t.tps.length) ? `
                    <div style="font-size:12.5px;margin-bottom:10px;">
                      <div class="detail-label" style="margin-bottom:4px;">Take-profit levels${tradeHitAnyTarget(t) ? ' · counted as a win' : ''}</div>
                      <div style="display:flex;flex-direction:column;gap:4px;">
                        ${t.tps.map((tp, i) => `
                          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                            <span class="badge" style="color:${outcomeColor(tp.outcome)};border-color:${outcomeColor(tp.outcome)};">TP${i + 1}${tp.outcome ? ': ' + outcomeLabel(tp.outcome) : ''}</span>
                            <span class="mono" style="color:var(--dim);font-size:11.5px;">${tp.entry ?? '–'} → ${tp.exit ?? '–'} · ${tp.lots ?? '–'} lots</span>
                          </div>
                        `).join('')}
                      </div>
                    </div>
                  ` : ''}
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
