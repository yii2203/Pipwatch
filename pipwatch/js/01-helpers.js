/* =====================================================================
 * HELPERS
 * ---------------------------------------------------------------------
 * Small, stateless utility functions used all over the app: formatting
 * money/dates, computing win-rate/profit-factor stats from a list of
 * trades, escaping text before it goes into HTML, resizing an uploaded
 * chart screenshot, and showing a toast notification. Nothing in this
 * file reads or writes State — it's pure helpers other files call.
 * ===================================================================== */

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

// A trade can have multiple take-profit levels (t.tps = [{outcome}, ...]),
// e.g. scaling out in parts. If ANY level hit its target, the trade counts
// as a win — even if a later level only broke even or the net $ P/L ends up
// flat/negative after costs, because you still got paid on part of it.
// Trades with no tps (or an empty list) fall back to the old rule: win/loss
// is decided purely by the sign of the overall $ P/L.
function tradeHitAnyTarget(t) {
  return Array.isArray(t.tps) && t.tps.some(tp => tp.outcome === 'target');
}
function isWinningTrade(t) { return tradeHitAnyTarget(t) || Number(t.pnl) > 0; }
function isLosingTrade(t) { return !isWinningTrade(t) && Number(t.pnl) < 0; }
// Neither a win nor a loss (flat P/L and no TP level hit target).
function isBreakevenTrade(t) { return !isWinningTrade(t) && !isLosingTrade(t); }

function computeStats(trades) {
  const total = trades.length;
  const pnl = trades.reduce((s, t) => s + Number(t.pnl || 0), 0);
  const wins = trades.filter(isWinningTrade);
  const losses = trades.filter(isLosingTrade);
  const breakevens = trades.filter(isBreakevenTrade);
  const decided = wins.length + losses.length; // excludes breakevens — they're neither a win nor a loss
  const winRate = decided ? (wins.length / decided) * 100 : 0;
  const grossWin = wins.reduce((s, t) => s + Number(t.pnl), 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + Number(t.pnl), 0));
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : (grossWin > 0 ? Infinity : 0);
  return { total, pnl, winRate, profitFactor, wins: wins.length, losses: losses.length, breakevens: breakevens.length };
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

// Rewriting a container's innerHTML while the user is mid-keystroke inside it
// destroys and recreates the input node, which drops focus (so only one
// character ever lands before the field unfocuses). This helper remembers
// which field had focus (and the cursor position) before the rewrite, then
// restores both afterwards, so forms that re-render on every keystroke
// (needed here for live validation / auto-calculated fields) stay usable.
function setInnerHTMLPreserveFocus(containerId, html) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const active = document.activeElement;
  let saved = null;
  if (active && active.id && container.contains(active)) {
    let start = null, end = null;
    try { start = active.selectionStart; end = active.selectionEnd; } catch (e) { /* not all input types support selection */ }
    saved = { id: active.id, start, end };
  }
  container.innerHTML = html;
  if (saved) {
    const el = document.getElementById(saved.id);
    if (el) {
      el.focus();
      if (saved.start != null) { try { el.setSelectionRange(saved.start, saved.end); } catch (e) { /* ignore */ } }
    }
  }
}
