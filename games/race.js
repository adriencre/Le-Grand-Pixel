import { randomInt } from 'node:crypto';
import { validBet } from './cards.js';
import { HORSES } from '../public/map.js';

export const RUN_TIME = 12000;
const BET_TIME = 20000, RESULT_TIME = 6000, N = HORSES.length;

// Payout multiplier per horse from its strength: ~92% of the fair price.
export function makeOdds(w) {
  const tot = w.reduce((a, b) => a + b);
  return w.map(x => Math.max(1.5, Math.floor(0.92 * tot / x * 10) / 10));
}

// Finishing order: weighted draw without replacement (strong horses tend to win).
export function drawOrder(w, rnd = n => randomInt(n)) {
  const left = w.map((x, i) => [x, i]), order = [];
  while (left.length) {
    let k = rnd(left.reduce((a, [x]) => a + x, 0));
    const j = left.findIndex(([x]) => (k -= x) < 0);
    order.push(left.splice(j, 1)[0][1]);
  }
  return order;
}

export class Race {
  constructor(n, notify) {
    this.seats = Array(n).fill(null);
    this.notify = notify;
    this.history = [];
    this.newRace();
    this.phase = 'betting';
    this.deadline = 0;
  }

  newRace() {
    this.w = HORSES.map(() => 1 + randomInt(6));
    this.odds = makeOdds(this.w);
    this.order = null;
    this.seed = randomInt(1e9);
  }

  sit(p, i) {
    if (this.seats[i]) return false;
    this.seats[i] = { p, bets: Array(N).fill(0), gain: 0 };
    if (!this.deadline) this.cycle('betting'); else this.notify();
    return true;
  }

  leave(p) {
    const i = this.seats.findIndex(s => s?.p === p);
    if (i < 0) return;
    if (this.phase === 'betting') p.chips += this.seats[i].bets.reduce((a, b) => a + b, 0);
    this.seats[i] = null;
    this.notify();
  }

  act(p, m) {
    const s = this.seats.find(x => x?.p === p);
    if (!s || this.phase !== 'betting') return;
    if (m.a === 'clear') { p.chips += s.bets.reduce((a, b) => a + b, 0); s.bets.fill(0); }
    else if (m.a === 'bet' && Number.isInteger(m.h) && m.h >= 0 && m.h < N && validBet(p, m.amt)) { p.chips -= m.amt; s.bets[m.h] += m.amt; }
    else return;
    this.notify();
  }

  cycle(phase) {
    clearTimeout(this.timer);
    if (phase === 'betting' && !this.seats.some(Boolean)) { this.phase = 'betting'; this.deadline = 0; return this.notify(); }
    this.phase = phase;
    const time = { betting: BET_TIME, running: RUN_TIME, result: RESULT_TIME }[phase];
    this.deadline = Date.now() + time;
    if (phase === 'betting') { this.newRace(); for (const s of this.seats) if (s) { s.bets.fill(0); s.gain = 0; } }
    if (phase === 'running') this.order = drawOrder(this.w);
    if (phase === 'result') {
      const win = this.order[0];
      this.history.unshift(win);
      this.history.length = Math.min(this.history.length, 8);
      for (const s of this.seats) if (s) {
        const back = Math.floor(s.bets[win] * this.odds[win]);
        s.p.chips += back;
        s.gain = back - s.bets.reduce((a, b) => a + b, 0);
      }
    }
    this.timer = setTimeout(() => this.cycle({ betting: 'running', running: 'result', result: 'betting' }[phase]), time);
    this.notify();
  }

  view(pid) {
    return {
      phase: this.phase,
      left: this.deadline ? this.deadline - Date.now() : 0,
      odds: this.odds, seed: this.seed, history: this.history,
      order: this.phase === 'betting' ? null : this.order,
      seats: this.seats.map(s => s && { id: s.p.id, name: s.p.name, color: s.p.color, chips: s.p.chips, me: s.p.id === pid, bets: s.bets, gain: s.gain }),
    };
  }
}
