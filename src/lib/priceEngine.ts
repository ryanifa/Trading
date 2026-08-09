import { Instrument, PricePoint, Quote } from "../types";

export const INSTRUMENTS: Instrument[] = [
  { symbol: "ASML", name: "ASML Holding", startPrice: 812.4, volatility: 0.32, drift: 0.08 },
  { symbol: "ADYEN", name: "Adyen", startPrice: 1490.2, volatility: 0.38, drift: 0.06 },
  { symbol: "SHELL", name: "Shell", startPrice: 33.85, volatility: 0.22, drift: 0.04 },
  { symbol: "INGA", name: "ING Groep", startPrice: 16.42, volatility: 0.26, drift: 0.05 },
  { symbol: "PHIA", name: "Philips", startPrice: 26.9, volatility: 0.3, drift: 0.03 },
  { symbol: "HEIA", name: "Heineken", startPrice: 78.55, volatility: 0.2, drift: 0.04 },
  { symbol: "BESI", name: "BE Semiconductor", startPrice: 128.7, volatility: 0.45, drift: 0.09 },
  { symbol: "BTC", name: "Bitcoin", startPrice: 61250, volatility: 0.6, drift: 0.1 },
  { symbol: "ETH", name: "Ethereum", startPrice: 2985, volatility: 0.7, drift: 0.1 },
];

const YEAR_MS = 365 * 24 * 3600 * 1000;
const HISTORY_POINTS = 720; // 6 uur aan ticks van 30s
export const TICK_MS = 2000;
const HISTORY_STEP_MS = 30_000;

function gaussian(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function nextPrice(price: number, inst: Instrument, dtMs: number): number {
  const dt = dtMs / YEAR_MS;
  const step = Math.exp(
    (inst.drift - 0.5 * inst.volatility ** 2) * dt +
      inst.volatility * Math.sqrt(dt) * gaussian()
  );
  return price * step;
}

function seedHistory(inst: Instrument, now: number): PricePoint[] {
  const points: PricePoint[] = [];
  let p = inst.startPrice;
  for (let i = HISTORY_POINTS; i >= 0; i--) {
    points.push({ t: now - i * HISTORY_STEP_MS, p });
    p = nextPrice(p, inst, HISTORY_STEP_MS);
  }
  // De laatste berekende prijs hoort bij het laatste punt; corrigeer zodat
  // history eindigt op de actuele prijs.
  points[points.length - 1].p = p;
  return points;
}

export function createQuotes(): Map<string, Quote> {
  const now = Date.now();
  const quotes = new Map<string, Quote>();
  for (const inst of INSTRUMENTS) {
    const history = seedHistory(inst, now);
    quotes.set(inst.symbol, {
      symbol: inst.symbol,
      price: history[history.length - 1].p,
      prevClose: history[0].p,
      history,
    });
  }
  return quotes;
}

export function tickQuotes(quotes: Map<string, Quote>): Map<string, Quote> {
  const now = Date.now();
  const next = new Map<string, Quote>();
  for (const inst of INSTRUMENTS) {
    const q = quotes.get(inst.symbol);
    if (!q) continue;
    const price = nextPrice(q.price, inst, TICK_MS);
    const history = [...q.history, { t: now, p: price }];
    if (history.length > HISTORY_POINTS * 2) history.shift();
    next.set(inst.symbol, { ...q, price, history });
  }
  return next;
}
