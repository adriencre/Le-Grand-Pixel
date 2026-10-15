import { randomInt } from 'node:crypto';

export const SYMS = ['cherry', 'lemon', 'bell', 'bar', 'seven', 'diamond'];
export const WEIGHTS = [6, 5, 4, 3, 2, 1];
export const PAY3 = [10, 15, 20, 40, 100, 250];
export const BETS = [10, 25, 50, 100];

export function slotPay(r, bet) {
  if (r[0] === r[1] && r[1] === r[2]) return bet * PAY3[r[0]];
  return r.filter(x => x === 0).length === 2 ? bet : 0; // two cherries: bet back
}

function roll() {
  let k = randomInt(WEIGHTS.reduce((a, b) => a + b));
  return WEIGHTS.findIndex(w => (k -= w) < 0);
}

export class Slots {
  constructor(n, notify) {
    this.seats = [null];
    this.notify = notify;
    this.reels = [4, 4, 4];
    this.spinId = 0;
  }

  sit(p) {
    if (this.seats[0]) return false;
    this.seats[0] = { p };
    this.notify();
    return true;
  }

  leave(p) {
    if (this.seats[0]?.p !== p) return;
    this.seats[0] = null; // a spin in flight still pays (timer below holds p)
  }

  act(p, m) {
    if (this.seats[0]?.p !== p || this.spinning || m.a !== 'spin' || !BETS.includes(m.bet) || p.chips < m.bet) return;
    p.chips -= m.bet;
    this.reels = [roll(), roll(), roll()];
    this.spinning = true;
    this.spinId++;
    this.win = 0;
    this.notify();
    setTimeout(() => {
      this.win = slotPay(this.reels, m.bet);
      p.chips += this.win;
      this.spinning = false;
      this.notify();
    }, 2200);
  }

  view() {
    const s = this.seats[0];
    return { reels: this.reels, spinId: this.spinId, spinning: !!this.spinning, win: this.win || 0, seats: [s && { id: s.p.id, name: s.p.name, color: s.p.color, chips: s.p.chips, me: true }] };
  }
}
