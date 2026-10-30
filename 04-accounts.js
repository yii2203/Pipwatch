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
  // A trade can have several screenshots. They're stored together as a JSON
  // array of data URLs under one key. Older versions stored a single bare
  // data URL string there, so getImages() accepts both and always returns
  // an array.
  saveImages(tradeId, dataUrls) {
    try { localStorage.setItem('pw:img:' + tradeId, JSON.stringify(dataUrls)); return true; }
    catch (e) { console.error('save images failed (storage may be full)', e); return false; }
  },
  getImages(tradeId) {
    const raw = localStorage.getItem('pw:img:' + tradeId);
    if (!raw) return [];
    if (raw.charAt(0) === '[') {
      try { const arr = JSON.parse(raw); return Array.isArray(arr) ? arr : []; } catch (e) { return []; }
    }
    return [raw]; // legacy single screenshot
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
          const imgs = Storage.getImages(t.id);
          if (imgs.length) data.images[t.id] = imgs;
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
      Object.keys(data.images).forEach(tradeId => {
        const v = data.images[tradeId];
        Storage.saveImages(tradeId, Array.isArray(v) ? v : [v]); // older backups hold one string per trade
      });
    }
    return true;
  },
};
