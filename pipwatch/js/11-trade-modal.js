/* =====================================================================
 * TRADE MODAL (add / edit a trade)
 * ---------------------------------------------------------------------
 * The "Log trade" / "Edit trade" form. This is the most fiddly file
 * in the app because of one UX requirement: typing in a field must
 * never rebuild that field's own input element (doing so drops focus
 * and resets the cursor position). So most handlers here update
 * State and then patch ONLY the specific bit of the page that depends
 * on what changed (the auto-calculated P/L value, an error message,
 * the submit button) directly via the DOM, instead of calling
 * renderTradeModal() again. Fields set via a click/select (pair,
 * direction, outcome, timeframe) are fine to fully re-render, since
 * there's no cursor position to lose there.
 *
 * Simple vs. multi-TP trades: a trade either has ONE entry/exit/lot size
 * (the plain row-3 fields), or -- once you add a take-profit level -- it's
 * made of several legs, each with its own entry/exit/lot size (you
 * scaled out in parts at different prices). A trade only ever uses one
 * mode at a time: f.tps.length === 0 is simple mode, f.tps.length > 0 is
 * multi-TP mode. addTp()/removeTp() carry values across when you switch
 * between the two, so nothing you've typed gets lost.
 * ===================================================================== */

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
    // Optional multiple take-profit levels, e.g. scaling out in parts.
    // Each is its own leg with its own entry/exit/lot size -- see
    // tradeHitAnyTarget() in helpers.js for how the "outcome" affects
    // win/loss classification.
    tps: Array.isArray(initial?.tps)
      ? initial.tps.map(tp => ({ outcome: tp.outcome || '', entry: tp.entry ?? '', exit: tp.exit ?? '', lots: tp.lots ?? '' }))
      : [],
  };
  renderTradeModal();
  if (initial?.hasImage) {
    const data = Storage.getImage(initial.id);
    if (data) { window._tradeForm.imagePreview = data; renderTradeModal(); }
  }
}

function tradeFormResolvedPair(f) { return f.pair === 'Custom' ? (f.customPair.trim() || 'Custom') : f.pair; }

// Shared lot-size validation, used for both the single lot-size field
// (simple mode) and each TP leg's own lot-size field (multi-TP mode).
function singleLotsErrorMsg(val) {
  if (val === '' || val == null) return '';
  const n = Number(val);
  if (isNaN(n) || n <= 0) return 'Lot size must be a number greater than 0';
  if (n > 500) return "That's a very large lot size -- double-check it";
  return '';
}
function tradeFormLotsError(f) { return singleLotsErrorMsg(f.lots); } // simple-mode only
function tradeFormHasAnyLotsError(f) {
  return f.tps.length > 0 ? f.tps.some(tp => !!singleLotsErrorMsg(tp.lots)) : !!tradeFormLotsError(f);
}

function renderTradeModal() {
  const f = window._tradeForm;
  const resolvedPair = tradeFormResolvedPair(f);
  const support = pnlSupport(resolvedPair);
  const lotsError = tradeFormLotsError(f); // only used in the f.tps.length === 0 branch below

  const html = `
    <div class="modal-backdrop" onclick="if(event.target===this) closeModal()">
      <div class="modal wide">
        <div class="modal-head"><div class="modal-title">${f.id ? 'Edit trade' : 'Log trade'}</div><button class="icon-btn" onclick="closeModal()">×</button></div>

        <div class="row-2">
          <div class="field"><label>Date</label><input id="tf-date" type="date" value="${f.date}" oninput="handleDateInput(this.value)">
            <div class="field-hint" id="tf-date-hint">${f.date ? dayOfWeek(f.date) : ''}</div>
          </div>
          <div class="field"><label>Pair / instrument</label>
            <select onchange="updateTradeField('pair',this.value)">${PAIRS.map(p => `<option value="${p}" ${f.pair === p ? 'selected' : ''}>${p}</option>`).join('')}</select>
          </div>
        </div>
        ${f.pair === 'Custom' ? `<div class="field"><label>Custom pair name</label><input id="tf-customPair" value="${escapeHtml(f.customPair)}" oninput="handleCustomPairInput(this.value)" placeholder="e.g. USDMXN"></div>` : ''}

        <div class="field"><label>Direction</label>
          <div class="toggle-group">
            <button type="button" class="toggle-btn" style="${f.direction === 'buy' ? 'border-color:var(--profit);color:var(--profit);' : ''}" onclick="updateTradeField('direction','buy')">↑ Buy / Long</button>
            <button type="button" class="toggle-btn" style="${f.direction === 'sell' ? 'border-color:var(--loss);color:var(--loss);' : ''}" onclick="updateTradeField('direction','sell')">↓ Sell / Short</button>
          </div>
        </div>

        ${f.tps.length === 0 ? `
          <div class="row-3">
            <div class="field"><label>Entry price</label><input id="tf-entry" type="number" step="any" value="${f.entry}" oninput="handlePriceInput('entry',this.value)"></div>
            <div class="field"><label>Exit price</label><input id="tf-exit" type="number" step="any" value="${f.exit}" oninput="handlePriceInput('exit',this.value)"></div>
            <div class="field"><label>Lot size</label><input id="tf-lots" type="number" step="0.01" min="0.01" class="${lotsError ? 'field-error' : ''}" value="${f.lots}" oninput="handleLotsInput(this.value)">
              <span id="tf-lots-error">${lotsError ? `<div class="field-error-text">${lotsError}</div>` : ''}</span>
            </div>
          </div>
          <div class="field"><button type="button" class="btn btn-ghost" onclick="addTp()">+ Scaled out in parts? Add take-profit levels</button></div>
        ` : `
          <div class="field">
            <label>Take-profit levels</label>
            <div class="field-hint" style="margin-bottom:8px;">Each level has its own entry, exit, and lot size. Hitting target on any one of them counts the whole trade as a win, even if a later level was only breakeven.</div>
            ${f.tps.map((tp, i) => { const tpErr = singleLotsErrorMsg(tp.lots); return `
              <div style="border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin-bottom:8px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                  <strong style="font-size:12.5px;">TP${i + 1}</strong>
                  <button type="button" class="icon-btn" onclick="removeTp(${i})" title="Remove TP${i + 1}">🗑</button>
                </div>
                <div class="row-3">
                  <div class="field"><label>Entry</label><input id="tf-tp-${i}-entry" type="number" step="any" value="${tp.entry}" oninput="handleTpField(${i},'entry',this.value)"></div>
                  <div class="field"><label>Exit</label><input id="tf-tp-${i}-exit" type="number" step="any" value="${tp.exit}" oninput="handleTpField(${i},'exit',this.value)"></div>
                  <div class="field" style="margin-bottom:0;"><label>Lots</label><input id="tf-tp-${i}-lots" type="number" step="0.01" min="0.01" class="${tpErr ? 'field-error' : ''}" value="${tp.lots}" oninput="handleTpLotsField(${i},this.value)">
                    <span id="tf-tp-${i}-lots-error">${tpErr ? `<div class="field-error-text">${tpErr}</div>` : ''}</span>
                  </div>
                </div>
                <div class="field" style="margin:8px 0 0;"><label>Outcome</label>
                  <select onchange="updateTpOutcome(${i},this.value)"><option value="">–</option>${OUTCOMES.map(o => `<option value="${o.id}" ${tp.outcome === o.id ? 'selected' : ''}>${o.label}</option>`).join('')}</select>
                </div>
              </div>
            `; }).join('')}
            <button type="button" class="btn btn-ghost" onclick="addTp()">+ Add another TP level</button>
            ${tradeHitAnyTarget({ tps: f.tps }) ? `<div class="field-hint" style="color:var(--profit);margin-top:6px;">TP${f.tps.findIndex(tp => tp.outcome === 'target') + 1} hit target — this trade will count as a win.</div>` : ''}
          </div>
        `}

        <div class="field">
          <label id="tf-pnl-label">Profit / loss ($)${support !== 'manual' && !f.pnlTouched ? ' · auto-calculated' : ''}</label>
          <input id="tf-pnl" type="number" step="any" value="${f.pnl}" oninput="handlePnlInput(this.value)" placeholder="e.g. 145.50 or -80">
          <span id="tf-pnl-hint">${support === 'manual' ? `<div class="field-hint">Cross-currency pairs need a live conversion rate we don't have — enter P/L manually.</div>`
            : (f.pnlTouched ? `<div class="field-hint"><a href="#" onclick="recalcPnl();return false;">Recalculate from entry/exit/lots</a></div>` : '')}</span>
        </div>

        <div class="row-2">
          <div class="field"><label>Risk % of account (optional)</label><input id="tf-riskPercent" type="number" step="any" value="${f.riskPercent}" oninput="handleSimpleField('riskPercent',this.value)" placeholder="e.g. 1"></div>
          <div class="field"><label>Reward multiple, R (optional)</label><input id="tf-rewardMultiple" type="number" step="any" value="${f.rewardMultiple}" oninput="handleSimpleField('rewardMultiple',this.value)" placeholder="e.g. 2 = 1:2"></div>
        </div>

        <div class="row-2">
          <div class="field"><label>${f.tps.length ? 'Overall outcome' : 'Outcome'} (optional)</label>
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

        <div class="field"><label>Notes (optional)</label><textarea id="tf-notes" rows="2" oninput="handleSimpleField('notes',this.value)" placeholder="Setup, mistakes, what you'd do differently…">${escapeHtml(f.notes)}</textarea></div>

        <button id="tf-submit-btn" class="btn btn-accent" style="width:100%;justify-content:center;" ${(!f.date || f.pnl === '' || tradeFormHasAnyLotsError(f)) ? 'disabled' : ''} onclick="submitTradeForm()">${f.id ? 'Save changes' : 'Add trade'}</button>
      </div>
    </div>
  `;
  setInnerHTMLPreserveFocus('modalRoot', html);
}

// --- Fields that change other on-screen values (auto-calculated P/L, error
// text, hints, the submit button) update ONLY those specific elements
// directly via the DOM, instead of calling renderTradeModal(). Rebuilding
// the whole modal on every keystroke destroys and recreates the input the
// person is actively typing in, which not only drops focus but -- for
// input types like number/date that don't support setSelectionRange at
// all -- snaps the cursor back to the front of the field on every character.
// Fields with no on-screen dependents (notes, risk %, reward multiple) just
// update state and don't touch the DOM at all.

function refreshSubmitButton() {
  const f = window._tradeForm;
  const btn = document.getElementById('tf-submit-btn');
  if (btn) btn.disabled = !f.date || f.pnl === '' || tradeFormHasAnyLotsError(f);
}

function refreshPnlComputed() {
  const f = window._tradeForm;
  const support = pnlSupport(tradeFormResolvedPair(f));
  const pnlInput = document.getElementById('tf-pnl');
  if (pnlInput && document.activeElement !== pnlInput) pnlInput.value = f.pnl;
  const labelEl = document.getElementById('tf-pnl-label');
  if (labelEl) labelEl.textContent = 'Profit / loss ($)' + (support !== 'manual' && !f.pnlTouched ? ' · auto-calculated' : '');
  const hintEl = document.getElementById('tf-pnl-hint');
  if (hintEl) {
    hintEl.innerHTML = support === 'manual'
      ? `<div class="field-hint">Cross-currency pairs need a live conversion rate we don't have — enter P/L manually.</div>`
      : (f.pnlTouched ? `<div class="field-hint"><a href="#" onclick="recalcPnl();return false;">Recalculate from entry/exit/lots</a></div>` : '');
  }
  refreshSubmitButton();
}

function refreshLotsError() {
  const f = window._tradeForm;
  const lotsError = tradeFormLotsError(f);
  const input = document.getElementById('tf-lots');
  if (input) input.classList.toggle('field-error', !!lotsError);
  const errEl = document.getElementById('tf-lots-error');
  if (errEl) errEl.innerHTML = lotsError ? `<div class="field-error-text">${lotsError}</div>` : '';
  refreshSubmitButton();
}

function refreshTpLotsError(i) {
  const tp = window._tradeForm.tps[i];
  if (!tp) return;
  const err = singleLotsErrorMsg(tp.lots);
  const input = document.getElementById(`tf-tp-${i}-lots`);
  if (input) input.classList.toggle('field-error', !!err);
  const errEl = document.getElementById(`tf-tp-${i}-lots-error`);
  if (errEl) errEl.innerHTML = err ? `<div class="field-error-text">${err}</div>` : '';
  refreshSubmitButton();
}

function handleDateInput(val) {
  window._tradeForm.date = val;
  const hint = document.getElementById('tf-date-hint');
  if (hint) hint.textContent = val ? dayOfWeek(val) : '';
  refreshSubmitButton();
}
function handleCustomPairInput(val) {
  window._tradeForm.customPair = val;
  maybeRecalcPnl();
  refreshPnlComputed();
}
// Simple-mode (no TPs) entry/exit price fields.
function handlePriceInput(key, val) {
  window._tradeForm[key] = val;
  maybeRecalcPnl();
  refreshPnlComputed();
}
function handleLotsInput(val) {
  window._tradeForm.lots = val;
  maybeRecalcPnl();
  refreshPnlComputed();
  refreshLotsError();
}
// Multi-TP mode: one leg's entry/exit/lots. Same no-full-rerender approach
// as the simple-mode handlers above, just addressed at tps[i] instead of
// the top-level field.
function handleTpField(i, key, val) {
  const tp = window._tradeForm.tps[i];
  if (!tp) return;
  tp[key] = val;
  maybeRecalcPnl();
  refreshPnlComputed();
}
function handleTpLotsField(i, val) {
  const tp = window._tradeForm.tps[i];
  if (!tp) return;
  tp.lots = val;
  maybeRecalcPnl();
  refreshPnlComputed();
  refreshTpLotsError(i);
}
function handlePnlInput(val) {
  window._tradeForm.pnl = val;
  window._tradeForm.pnlTouched = true;
  refreshPnlComputed();
}
function handleSimpleField(key, val) { window._tradeForm[key] = val; }

// Fields below are set via onchange/onclick (a discrete action, not
// continuous typing), so a full re-render doesn't cause the focus/cursor
// problems described above -- and some of them (switching to "Custom" pair)
// change which fields exist on the form, which needs a full rebuild anyway.
function updateTradeField(key, val) {
  window._tradeForm[key] = val;
  if (['direction', 'pair'].includes(key)) maybeRecalcPnl();
  renderTradeModal();
}
function recalcPnl() { window._tradeForm.pnlTouched = false; maybeRecalcPnl(); refreshPnlComputed(); }

// Auto-calculates P/L from price + lot size, summing across TP legs when
// in multi-TP mode. A leg only contributes once its entry/exit/lots are
// all filled in -- an incomplete leg is simply skipped (not treated as $0),
// so the running total only reflects what's actually been entered so far.
function maybeRecalcPnl() {
  const f = window._tradeForm;
  if (f.pnlTouched) return;
  const pair = tradeFormResolvedPair(f);
  if (f.tps.length > 0) {
    let sum = 0, any = false;
    f.tps.forEach(tp => {
      const entry = tp.entry === '' || tp.entry == null ? null : Number(tp.entry);
      const exit = tp.exit === '' || tp.exit == null ? null : Number(tp.exit);
      const lots = tp.lots === '' || tp.lots == null ? null : Number(tp.lots);
      const calc = autoPnL(pair, f.direction, entry, exit, lots);
      if (calc != null) { sum += calc; any = true; }
    });
    if (any) f.pnl = Number(sum.toFixed(2));
    return;
  }
  const entry = f.entry === '' ? null : Number(f.entry);
  const exit = f.exit === '' ? null : Number(f.exit);
  const lots = f.lots === '' ? null : Number(f.lots);
  const calc = autoPnL(pair, f.direction, entry, exit, lots);
  if (calc != null) f.pnl = Number(calc.toFixed(2));
}
function setConfidence(n) { window._tradeForm.confidence = window._tradeForm.confidence === n ? 0 : n; renderTradeModal(); }

// Take-profit levels: adding/removing a row is a click, not continuous
// typing, so a full re-render here is fine -- no cursor position to lose.
function addTp() {
  const f = window._tradeForm;
  // Converting from a simple single-exit trade: carry over whatever was
  // already typed into the Entry/Exit/Lot fields as TP1, instead of
  // discarding it.
  f.tps.push(f.tps.length === 0
    ? { outcome: '', entry: f.entry, exit: f.exit, lots: f.lots }
    : { outcome: '', entry: '', exit: '', lots: '' });
  renderTradeModal();
}
function removeTp(i) {
  const f = window._tradeForm;
  const [removed] = f.tps.splice(i, 1);
  if (f.tps.length === 0 && removed) {
    // Back to a simple single-exit trade -- restore its values into the
    // main Entry/Exit/Lot fields so nothing typed is lost.
    f.entry = removed.entry ?? '';
    f.exit = removed.exit ?? '';
    f.lots = removed.lots ?? '';
  }
  maybeRecalcPnl();
  renderTradeModal();
}
function updateTpOutcome(i, val) {
  const tp = window._tradeForm.tps[i];
  if (!tp) return;
  tp.outcome = val;
  renderTradeModal();
}

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
  if (!f.date || f.pnl === '' || tradeFormHasAnyLotsError(f)) return;

  const id = f.id || uid();
  let hasImage = f.hasImage;
  if (f.imageData === 'REMOVE') { hasImage = false; Storage.deleteImage(id); }
  else if (f.imageData) { hasImage = Storage.saveImage(id, f.imageData); if (!hasImage) showToast("Couldn't save the image — it may be too large."); }

  const usingTps = f.tps.length > 0;
  // Keep any TP row that has data at all, even without an outcome picked
  // yet -- don't silently drop prices someone already typed in.
  const tps = usingTps ? f.tps
    .filter(tp => tp.outcome || tp.entry !== '' || tp.exit !== '' || tp.lots !== '')
    .map(tp => ({
      outcome: tp.outcome || null,
      entry: tp.entry === '' ? null : Number(tp.entry),
      exit: tp.exit === '' ? null : Number(tp.exit),
      lots: tp.lots === '' ? null : Number(tp.lots),
    })) : [];

  // With multiple TP legs there's no single entry/exit price for the whole
  // trade anymore -- each leg has its own. Total lot size is just the sum
  // of whatever lot sizes were filled in across the legs.
  const totalLots = usingTps
    ? (tps.some(tp => tp.lots != null) ? tps.reduce((s, tp) => s + (tp.lots || 0), 0) : null)
    : (f.lots === '' ? null : Number(f.lots));

  addOrUpdateTrade({
    id, date: f.date, pair, direction: f.direction,
    entry: usingTps ? null : (f.entry === '' ? null : Number(f.entry)),
    exit: usingTps ? null : (f.exit === '' ? null : Number(f.exit)),
    lots: totalLots, pnl: Number(f.pnl), notes: f.notes.trim(),
    riskPercent: f.riskPercent === '' ? null : Number(f.riskPercent),
    rewardMultiple: f.rewardMultiple === '' ? null : Number(f.rewardMultiple),
    outcome: f.outcome || null, confidence: f.confidence || null, timeframe: f.timeframe || null,
    dayOfWeek: dayOfWeek(f.date), hasImage,
    tps,
  });
}
