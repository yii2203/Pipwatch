<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>Pipwatch — Forex Trading Journal</title>

<!-- Makes the app installable on a phone (Add to Home Screen) -->
<link rel="manifest" href="manifest.json">
<meta name="theme-color" content="#08090C">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Pipwatch">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="32x32" href="icons/favicon-32.png">
<link rel="stylesheet" href="css/styles.css">
</head>
<body>
  <div id="app">
    <div class="shell">
      <aside class="sidebar" id="sidebar"></aside>
      <main class="main">
        <header class="topbar" id="topbar"></header>
        <div class="content" id="content"></div>
      </main>
    </div>
  </div>
  <div id="modalRoot"></div>
  <div id="toastRoot"></div>

  <script src="vendor/chart.umd.min.js"></script>
  <script src="js/storage.js"></script>
  <script src="js/pnl.js"></script>

  <!--
    app.js used to be one ~930-line file. It's now split into one file per
    part of the app — see js/README.md for a map of what's where. They're
    just plain <script> tags (no build step), so load order matters a
    little: 01-helpers and 02-state define things the rest rely on, and
    12-main (which draws the very first screen) has to load last, after
    everything else has defined its functions.
  -->
  <script src="js/01-helpers.js"></script>
  <script src="js/02-state.js"></script>
  <script src="js/03-backup.js"></script>
  <script src="js/04-accounts.js"></script>
  <script src="js/05-trades.js"></script>
  <script src="js/06-layout.js"></script>
  <script src="js/07-dashboard.js"></script>
  <script src="js/08-calendar.js"></script>
  <script src="js/09-performance.js"></script>
  <script src="js/10-log.js"></script>
  <script src="js/11-trade-modal.js"></script>
  <script src="js/12-main.js"></script>
</body>
</html>
