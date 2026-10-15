// Small jobs: the server draws a task, keeps the right answer and checks what the client sends back.
import { score } from './blackjack.js';
import { DRINKS } from '../public/drinks.js';
import { T, MW, MH, ST, hitsIn } from '../public/map.js';

export const JOBS = {
  barman: { name: 'Barman', pay: 20, time: 5000 },
  croupier: { name: 'Croupier', pay: 20, time: 5000 },
  videur: { name: 'Videur', pay: 15, time: 4000 },
  menage: { name: 'Menage', pay: 25, time: 30000 },
};
export const STREET_JOBS = ['videur', 'menage']; // what the bouncer outside offers to anyone, broke or not
export const CAP = 1000, CAP_MS = 3600000; // max earned per hour, so jobs stay a side income

const pick = (a, rnd) => a[Math.floor(rnd() * a.length)];

// Returns { pub, answer }: pub goes to the client, answer stays on the server.
export function makeTask(kind, zone, rnd = Math.random) {
  if (kind === 'barman') { const d = pick(DRINKS, rnd); return { pub: { drink: d.id }, answer: d.id }; }
  if (kind === 'croupier') {
    const n = 2 + Math.floor(rnd() * 3), cards = Array.from({ length: n }, () => pick('23456789TJQKA', rnd) + pick('shdc', rnd));
    const s = score(cards);
    return { pub: { cards }, answer: s < 17 ? 'hit' : s <= 21 ? 'stand' : 'bust' };
  }
  if (kind === 'videur') {
    const rule = Math.floor(rnd() * 3), card = Math.floor(rnd() * 4), drunk = rnd() < 0.25;
    return { pub: { rule, card, drunk }, answer: card >= rule && !drunk ? 'in' : 'out' };
  }
  // menage: a glass or confetti somewhere you can walk to
  const [x0, x1, y0, y1] = zone === 'street' ? [T, (ST.w - 1) * T, 6 * T + 6, 12 * T - 4] : [T, (MW - 1) * T, 3 * T + 6, (MH - 1) * T];
  for (;;) {
    const x = Math.round(x0 + rnd() * (x1 - x0)), y = Math.round(y0 + rnd() * (y1 - y0));
    if (!hitsIn(zone, x, y)) return { pub: { x, y, kind: rnd() < 0.5 ? 'glass' : 'confetti' }, answer: null };
  }
}

export function check(kind, task, v, p) {
  if (kind === 'menage') return v === 'clean' && Math.hypot(p.x - task.pub.x, p.y - task.pub.y) < 18;
  return v === task.answer;
}

// Fixed one-hour window starting at the first paid task. Returns what can still be earned.
export function capLeft(rec, now) {
  if (now - rec.since > CAP_MS) Object.assign(rec, { since: now, earned: 0 });
  return CAP - rec.earned;
}
