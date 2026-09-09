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
};
