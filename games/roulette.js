import { randomInt } from 'node:crypto';
import { validBet } from './cards.js';

export const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

// Total returned for a bet {t, v, a} when the ball lands on n (stake included).
export function payout(b, n) {
  const z = n > 0;
  const hit = {
    n: b.v === n, red: z && RED.has(n), black: z && !RED.has(n), even: z && n % 2 === 0, odd: n % 2 === 1,
    low: z && n <= 18, high: n >= 19, dozen: z && Math.floor((n - 1) / 12) === b.v, col: z && (n - 1) % 3 === b.v,
  }[b.t];
  if (!hit) return 0;
  return b.a * (b.t === 'n' ? 36 : b.t === 'dozen' || b.t === 'col' ? 3 : 2);
}

const RANGE = { n: 36, dozen: 2, col: 2 };
const BET_TIME = 15000, SPIN_TIME = 7000, RESULT_TIME = 4500;

export class Roulette {
  constructor(n, notify) {
    this.seats = Array(n).fill(null);
    this.notify = notify;
    this.phase = 'betting';
    this.deadline = 0;
    this.history = [];
    this.result = null;
  }

  sit(p, i) {
    if (this.seats[i]) return false;
    this.seats[i] = { p, bets: [], gain: 0 };
    if (!this.deadline) this.cycle('betting');
    else this.notify();
    return true;
  }

  leave(p) {
    const i = this.seats.findIndex(s => s?.p === p);
    if (i < 0) return;
    if (this.phase === 'betting') for (const b of this.seats[i].bets) p.chips += b.a;
    this.seats[i] = null;
    this.notify();
  }

  act(p, m) {
    const s = this.seats.find(x => x?.p === p);
    if (!s || this.phase !== 'betting') return;
    if (m.a === 'clear') { for (const b of s.bets) p.chips += b.a; s.bets = []; return this.notify(); }
    if (m.a !== 'bet' || !(m.t in { n: 1, red: 1, black: 1, even: 1, odd: 1, low: 1, high: 1, dozen: 1, col: 1 })) return;
    const v = m.t in RANGE ? m.v : 0;
    if (!Number.isInteger(v) || v < 0 || v > (RANGE[m.t] || 0) || !validBet(p, m.amt)) return;
    p.chips -= m.amt;
    const same = s.bets.find(b => b.t === m.t && b.v === v);
    if (same) same.a += m.amt; else s.bets.push({ t: m.t, v, a: m.amt });
    this.notify();
  }

  cycle(phase) {
    clearTimeout(this.timer);
    if (phase === 'betting' && !this.seats.some(Boolean)) { this.phase = 'betting'; this.deadline = 0; return; }
    this.phase = phase;
    const time = { betting: BET_TIME, spinning: SPIN_TIME, result: RESULT_TIME }[phase];
    this.deadline = Date.now() + time;
    if (phase === 'betting') for (const s of this.seats) if (s) { s.bets = []; s.gain = 0; }
    if (phase === 'spinning') this.result = randomInt(37);
    if (phase === 'result') {
      this.history.unshift(this.result);
      this.history.length = Math.min(this.history.length, 12);
      for (const s of this.seats) if (s) {
        const back = s.bets.reduce((a, b) => a + payout(b, this.result), 0);
        s.p.chips += back;
        s.gain = back - s.bets.reduce((a, b) => a + b.a, 0);
      }
    }
    this.timer = setTimeout(() => this.cycle({ betting: 'spinning', spinning: 'result', result: 'betting' }[phase]), time);
    this.notify();
  }

  view(pid) {
    return {
      phase: this.phase,
      left: this.deadline ? this.deadline - Date.now() : 0,
      result: this.phase === 'betting' ? null : this.result,
      history: this.history,
      seats: this.seats.map(s => s && { id: s.p.id, name: s.p.name, color: s.p.color, chips: s.p.chips, me: s.p.id === pid, bets: s.bets, gain: s.gain }),
    };
  }
}
