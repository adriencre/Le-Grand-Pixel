// Pixel stock exchange: fictional companies whose prices wander every tick.
import { STOCKS, roundPrice } from '../public/market.js';
export { STOCKS };
export const FEE = 0.01;

// Next price, pulled gently back toward the base; rare crashes and booms. Returns [price, event].
export function step(price, s, rnd = Math.random) {
  const r = rnd();
  if (r < s.jump / 2) return [roundPrice(price * 0.55), 'krach'];
  if (r < s.jump) return [roundPrice(price * 1.6), 'boom'];
  const noise = (rnd() + rnd() + rnd() - 1.5) * s.vol * 1.4, pull = (s.base - price) / s.base * 0.03;
  return [roundPrice(price * (1 + noise + pull)), null];
}

// Buy (qty > 0) or sell (qty < 0) at price. holdings: { [id]: { n, cost } }. Returns chips delta, or null if refused.
export function trade(p, id, qty, price) {
  if (!Number.isInteger(qty) || qty === 0 || Math.abs(qty) > 100000) return null;
  const h = p.stocks[id] || { n: 0, cost: 0 };
  if (qty > 0) {
    const cost = Math.ceil(qty * price * (1 + FEE));
    if (cost > p.chips) return null;
    p.chips -= cost;
    p.stocks[id] = { n: h.n + qty, cost: h.cost + cost };
    return -cost;
  }
  const n = -qty;
  if (n > h.n) return null;
  const gain = Math.floor(n * price * (1 - FEE));
  p.chips += gain;
  const left = h.n - n;
  if (left) p.stocks[id] = { n: left, cost: Math.round(h.cost * left / h.n) }; else delete p.stocks[id];
  return gain;
}
