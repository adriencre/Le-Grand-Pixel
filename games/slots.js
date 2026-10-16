import { randomInt } from 'node:crypto';
import { stakes } from './cards.js';

export const SYMS = ['cherry', 'lemon', 'bell', 'bar', 'seven', 'diamond'];
export const WEIGHTS = [6, 5, 4, 3, 2, 1];
export const PAY3 = [10, 15, 20, 40, 100, 250];
export const BETS = [10, 25, 50, 100];
// Progressive pot shared by every machine: 1% of each bet feeds it, three diamonds with a bet of JACKPOT_MIN+ win it.
// The 1% comes from the house (payouts are unchanged), which keeps the machines just under 100% return.
export const JACKPOT_SEED = 2000, JACKPOT_MIN = 50;
export const jackpot = { pot: JACKPOT_SEED, onWin: null }; // onWin(p, amount) is set by the server

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
    if (this.seats[0]?.p !== p || this.spinning || m.a !== 'spin' || !Number.isInteger(m.bet) || m.bet < BETS[0] || m.bet > BETS.at(-1) * 3 || p.chips < m.bet) return;
    p.chips -= m.bet;
    stakes.on?.(p, m.bet);
    jackpot.pot += Math.ceil(m.bet / 100);
    this.bet = m.bet;
    this.reels = [roll(), roll(), roll()];
    this.spinning = true;
    this.spinId++;
    this.win = 0;
    this.notify();
    setTimeout(() => {
      this.win = slotPay(this.reels, m.bet);
      if (m.bet >= JACKPOT_MIN && this.reels.every(r => r === 5)) {
        const pot = jackpot.pot;
        jackpot.pot = JACKPOT_SEED;
        this.win += pot;
        jackpot.onWin?.(p, pot);
      }
      p.chips += this.win;
      this.spinning = false;
      this.notify();
    }, 2200);
  }

  view() {
    const s = this.seats[0];
    return { reels: this.reels, bet: this.bet, spinId: this.spinId, spinning: !!this.spinning, win: this.win || 0, pot: jackpot.pot, seats: [s && { id: s.p.id, name: s.p.name, color: s.p.color, chips: s.p.chips, me: true }] };
  }
}
