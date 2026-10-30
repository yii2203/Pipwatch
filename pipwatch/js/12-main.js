/* =====================================================================
 * MAIN
 * ---------------------------------------------------------------------
 * Entry point — loaded last, after every other file has defined its
 * functions and State exists, so this just draws the initial page, and
 * registers the service worker that makes the app installable/offline
 * when it's served from a web address (it can't run from a file:// path,
 * so it's skipped when you open index.html straight from the folder).
 * ===================================================================== */

/* ---------------------------------- init ---------------------------------- */

renderAll();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(err => console.warn('Service worker not registered:', err));
  });
}
