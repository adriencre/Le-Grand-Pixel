import { deck, validBet } from './cards.js';

export function score(cards) {
  let t = 0, aces = 0;
  for (const c of cards) {
    const r = c[0];
    if (r === 'A') { t += 11; aces++; } else if ('TJQK'.includes(r)) t += 10; else t += +r;
  }
  while (t > 21 && aces) { t -= 10; aces--; }
  return t;
}
const isBJ = c => c.length === 2 && score(c) === 21;

// Total returned to the player (stake included).
export function settle(player, dealer, bet) {
  const p = score(player), d = score(dealer);
  if (p > 21) return 0;
  if (isBJ(player) && !isBJ(dealer)) return Math.floor(bet * 5 / 2);
  if (isBJ(dealer) && !isBJ(player)) return 0;
  if (d > 21 || p > d) return bet * 2;
  return p === d ? bet : 0;
}

const BET_TIME = 12000, TURN_TIME = 20000;

export class Blackjack {
  constructor(n, notify) {
    this.seats = Array(n).fill(null);
    this.notify = notify;
    this.shoe = deck(6);
    this.phase = 'betting';
    this.dealer = [];
    this.hole = true;
    this.turn = -1;
    this.deadline = 0;
  }

  sit(p, i) {
    if (this.seats[i]) return false;
    this.seats[i] = { p, bet: 0, cards: [], done: false, result: '' };
    this.notify();
    return true;
  }

  leave(p) {
    const i = this.seats.findIndex(s => s?.p === p);
    if (i < 0) return;
    if (this.phase === 'betting') p.chips += this.seats[i].bet; // not dealt yet: refund
    this.seats[i] = null;
    if (this.phase === 'playing' && this.turn === i) this.nextTurn();
    else if (this.phase === 'betting' && !this.seats.some(s => s?.bet)) { clearTimeout(this.timer); this.deadline = 0; }
    this.notify();
  }

  act(p, m) {
    const i = this.seats.findIndex(s => s?.p === p), s = this.seats[i];
    if (!s) return;
    if (this.phase === 'betting') {
      if (m.a === 'bet' && validBet(p, m.amt) && s.bet + m.amt <= 5000) {
        p.chips -= m.amt; s.bet += m.amt;
        this.armTimer();
      } else if (m.a === 'clear') { p.chips += s.bet; s.bet = 0; }
      else if (m.a === 'ready' && s.bet) s.ready = true;
      const seated = this.seats.filter(Boolean);
      if (seated.every(x => x.ready || !x.bet) && seated.some(x => x.ready)) return this.deal();
      return this.notify();
    }
    if (this.phase !== 'playing' || this.turn !== i) return;
    if (m.a === 'hit') {
      s.cards.push(this.draw());
      if (score(s.cards) >= 21) s.done = true;
    } else if (m.a === 'stand') s.done = true;
    else if (m.a === 'double' && s.cards.length === 2 && p.chips >= s.bet) {
      p.chips -= s.bet; s.bet *= 2;
      s.cards.push(this.draw());
      s.done = true;
    } else return;
    if (s.done) this.nextTurn(); else { this.armTurn(); this.notify(); }
  }

  draw() {
    if (this.shoe.length < 20) this.shoe = deck(6);
    return this.shoe.pop();
  }

  armTimer() {
    if (this.deadline) return;
    this.deadline = Date.now() + BET_TIME;
    this.timer = setTimeout(() => this.deal(), BET_TIME);
  }

  armTurn() {
    clearTimeout(this.timer);
    this.deadline = Date.now() + TURN_TIME;
    const i = this.turn;
    this.timer = setTimeout(() => { if (this.turn === i && this.seats[i]) { this.seats[i].done = true; this.nextTurn(); } }, TURN_TIME);
  }

  deal() {
    clearTimeout(this.timer);
    this.deadline = 0;
    const playing = this.seats.filter(s => s?.bet);
    if (!playing.length) { this.phase = 'betting'; return this.notify(); }
    if (this.shoe.length < 60) this.shoe = deck(6);
    for (const s of playing) { s.cards = [this.draw(), this.draw()]; s.done = isBJ(s.cards); s.result = ''; }
    this.dealer = [this.draw(), this.draw()];
    this.hole = true;
    this.phase = 'playing';
    if (isBJ(this.dealer)) return this.dealerPlay();
    this.turn = -1;
    this.nextTurn();
  }

  nextTurn() {
    clearTimeout(this.timer);
    const n = this.seats.length;
    for (let k = this.turn + 1; k < n; k++) {
      const s = this.seats[k];
      if (s?.bet && s.cards.length && !s.done) { this.turn = k; this.armTurn(); return this.notify(); }
    }
    this.dealerPlay();
  }

  dealerPlay() {
    this.phase = 'dealer';
    this.turn = -1;
    this.deadline = 0;
    this.hole = false;
    this.notify();
    const alive = this.seats.some(s => s?.cards.length && score(s.cards) <= 21);
    const step = () => {
      if (alive && score(this.dealer) < 17) {
        this.dealer.push(this.draw());
        this.notify();
        this.timer = setTimeout(step, 750);
      } else this.timer = setTimeout(() => this.payout(), 600);
    };
    this.timer = setTimeout(step, 800);
  }

  payout() {
    for (const s of this.seats) {
      if (!s?.bet || !s.cards.length) continue;
      const win = settle(s.cards, this.dealer, s.bet);
      s.p.chips += win;
      s.result = win > s.bet ? 'win' : win === s.bet ? 'push' : 'lose';
      s.gain = win - s.bet;
    }
    this.phase = 'result';
    this.notify();
    this.timer = setTimeout(() => {
      for (const s of this.seats) if (s) Object.assign(s, { bet: 0, cards: [], done: false, result: '', ready: false });
      this.dealer = [];
      this.phase = 'betting';
      this.notify();
    }, 5000);
  }

  view(pid) {
    return {
      phase: this.phase,
      left: this.deadline ? this.deadline - Date.now() : 0,
      turn: this.turn,
      dealer: this.hole && this.dealer.length ? [this.dealer[0], '??'] : this.dealer,
      dealerScore: this.hole ? (this.dealer.length ? score([this.dealer[0]]) : 0) : score(this.dealer),
      seats: this.seats.map(s => s && {
        id: s.p.id, name: s.p.name, color: s.p.color, chips: s.p.chips, me: s.p.id === pid,
        bet: s.bet, cards: s.cards, score: score(s.cards), result: s.result, gain: s.gain, ready: !!s.ready,
      }),
    };
  }
}
