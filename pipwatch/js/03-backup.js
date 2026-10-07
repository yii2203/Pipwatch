/* =====================================================================
 * BACKUP: EXPORT / IMPORT
 * ---------------------------------------------------------------------
 * Lets someone download everything (accounts + trades + chart images)
 * as one .json file, and load that file back in later — the only way
 * data leaves/enters this app, since everything normally just lives in
 * this browser's localStorage. See the Accounts tab for the buttons
 * that call these.
 * ===================================================================== */

/* ---------------------------------- backup: export / import ---------------------------------- */

function exportBackup() {
  let data;
  try { data = Storage.exportAll(); }
  catch (e) { showToast("Couldn't build a backup."); return; }
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `pipwatch-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  showToast('Backup downloaded.');
}

function triggerImportBackup() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.style.display = 'none';
  input.onchange = () => {
    const file = input.files && input.files[0];
    input.remove();
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let data;
      try { data = JSON.parse(reader.result); }
      catch (e) { showToast("That file isn't valid JSON."); return; }
      if (!data || !Array.isArray(data.accounts)) { showToast("That doesn't look like a Pipwatch backup file."); return; }
      const n = data.accounts.length;
      const ok = confirm(
        `Import ${n} account${n !== 1 ? 's' : ''} from this backup?\n\n` +
        `This will REPLACE all accounts and trades currently stored in this browser. ` +
        `This can't be undone — export a backup of your current data first if you want to keep it.`
      );
      if (!ok) return;
      try { Storage.importAll(data); }
      catch (e) { showToast('Import failed: ' + e.message); return; }
      State.accounts = Storage.getAccounts();
      State.currentAccountId = State.accounts[0]?.id || null;
      State.accountPickerOpen = false;
      loadTradesForCurrent();
      renderAll();
      showToast('Backup imported.');
    };
    reader.onerror = () => showToast("Couldn't read that file.");
    reader.readAsText(file);
  };
  document.body.appendChild(input);
  input.click();
}
