// Pair reference lists
const PAIRS = [
  "EURUSD","GBPUSD","USDJPY","USDCHF","AUDUSD","USDCAD","NZDUSD",
  "EURGBP","EURJPY","GBPJPY","XAUUSD","XAGUSD","BTCUSD","Custom"
];

// contract size per 1.0 standard lot, for instruments quoted directly in USD
const USD_QUOTE_CONTRACT = { EURUSD: 100000, GBPUSD: 100000, AUDUSD: 100000, NZDUSD: 100000, XAUUSD: 100, XAGUSD: 5000, BTCUSD: 1 };
// USD is the base currency; profit accrues in the quote currency, converted back to USD using the exit price
const USD_BASE_CONTRACT = { USDJPY: 100000, USDCHF: 100000, USDCAD: 100000 };

const OUTCOMES = [
  { id: "target", label: "Target hit" },
  { id: "stoploss", label: "Stopped out" },
  { id: "breakeven", label: "Breakeven" },
  { id: "trailing", label: "Trailing stop" },
  { id: "manual", label: "Manual close" },
];
const TIMEFRAMES = ["M1","M5","M15","M30","H1","H4","D1","W1"];

function pnlSupport(pair) {
  if (USD_QUOTE_CONTRACT[pair]) return "usd-quote";
  if (USD_BASE_CONTRACT[pair]) return "usd-base";
  return "manual"; // crosses (EURGBP, EURJPY, GBPJPY) and custom instruments need a cross rate we don't have
}

function autoPnL(pair, direction, entry, exit, lots) {
  if (entry == null || exit == null || lots == null || isNaN(entry) || isNaN(exit) || isNaN(lots)) return null;
  const dirMult = direction === "sell" ? -1 : 1;
  const diff = (exit - entry) * dirMult;
  const support = pnlSupport(pair);
  if (support === "usd-quote") return diff * USD_QUOTE_CONTRACT[pair] * lots;
  if (support === "usd-base") return (diff * USD_BASE_CONTRACT[pair] * lots) / exit;
  return null;
}
