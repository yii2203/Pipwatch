// Simple localStorage wrapper. Everything lives under the browser origin
// (i.e. tied to this file/folder on this machine + this browser).
const Storage = {
  getAccounts() {
    try { return JSON.parse(localStorage.getItem('pw:accounts') || '[]'); }
    catch (e) { return []; }
  },
  saveAccounts(list) {
    try { localStorage.setItem('pw:accounts', JSON.stringify(list)); return true; }
    catch (e) { console.error('save accounts failed', e); return false; }
  },
  getTrades(accId) {
    try { return JSON.parse(localStorage.getItem('pw:trades:' + accId) || '[]'); }
    catch (e) { return []; }
  },
  saveTrades(accId, list) {
    try { localStorage.setItem('pw:trades:' + accId, JSON.stringify(list)); return true; }
    catch (e) { console.error('save trades failed', e); return false; }
  },
  deleteTrades(accId) {
    localStorage.removeItem('pw:trades:' + accId);
  },
  saveImage(tradeId, dataUrl) {
    try { localStorage.setItem('pw:img:' + tradeId, dataUrl); return true; }
    catch (e) { console.error('save image failed (storage may be full)', e); return false; }
  },
  getImage(tradeId) {
    return localStorage.getItem('pw:img:' + tradeId);
  },
  deleteImage(tradeId) {
    localStorage.removeItem('pw:img:' + tradeId);
  },

  // Bundles every account, all of their trades, and every attached chart
  // image into one plain object suitable for JSON.stringify — used for the
  // "Export backup" feature so people aren't locked into this browser/folder.
  exportAll() {
    const accounts = Storage.getAccounts();
    const data = { app: 'pipwatch', version: 1, exportedAt: new Date().toISOString(), accounts, trades: {}, images: {} };
    accounts.forEach(acc => {
      const trades = Storage.getTrades(acc.id);
      data.trades[acc.id] = trades;
      trades.forEach(t => {
        if (t.hasImage) {
          const img = Storage.getImage(t.id);
          if (img) data.images[t.id] = img;
        }
      });
    });
    return data;
  },

  // Restores a backup produced by exportAll(). Replaces whatever accounts
  // and trades currently exist in this browser's local storage.
  importAll(data) {
    if (!data || typeof data !== 'object' || !Array.isArray(data.accounts)) {
      throw new Error('That file doesn\'t look like a Pipwatch backup.');
    }
    if (!Storage.saveAccounts(data.accounts)) throw new Error('Could not write accounts to storage.');
    data.accounts.forEach(acc => {
      const trades = (data.trades && Array.isArray(data.trades[acc.id])) ? data.trades[acc.id] : [];
      Storage.saveTrades(acc.id, trades);
    });
    if (data.images && typeof data.images === 'object') {
      Object.keys(data.images).forEach(tradeId => Storage.saveImage(tradeId, data.images[tradeId]));
    }
    return true;
  },
};
