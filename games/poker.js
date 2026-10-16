import { deck, stakes } from './cards.js';

const RV = { T: 10, J: 11, Q: 12, K: 13, A: 14 };
const val = c => RV[c[0]] || +c[0];
export const HAND_NAMES = ['Hauteur', 'Paire', 'Double paire', 'Brelan', 'Quinte', 'Couleur', 'Full', 'Carré', 'Quinte flush'];

// Score of 5 cards as [category, ...tiebreak values]; compare with cmp().
export function eval5(cs) {
  const vs = cs.map(val).sort((a, b) => b - a);
  const flush = cs.every(c => c[1] === cs[0][1]);
  const uniq = [...new Set(vs)];
  let top = 0;
  if (uniq.length === 5) {
    if (vs[0] - vs[4] === 4) top = vs[0];
    else if (vs.join() === '14,5,4,3,2') top = 5; // wheel
  }
  if (top && flush) return [8, top];
  const groups = uniq.map(v => [vs.filter(x => x === v).length, v]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  const shape = groups.map(g => g[0]).join('');
  const ordered = groups.map(g => g[1]);
  if (shape === '41') return [7, ...ordered];
  if (shape === '32') return [6, ...ordered];
  if (flush) return [5, ...vs];
  if (top) return [4, top];
  if (shape === '311') return [3, ...ordered];
  if (shape === '221') return [2, ...ordered];
  if (shape === '2111') return [1, ...ordered];
  return [0, ...vs];
}

export function cmp(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) - (b[i] || 0);
  return 0;
}

export function best(cards) {
  let b = null;
  const n = cards.length;
  for (let a = 0; a < n; a++) for (let c = a + 1; c < n; c++) {
    const five = cards.filter((_, k) => k !== a && k !== c);
    if (five.length !== 5) continue;
    const s = eval5(five);
    if (!b || cmp(s, b) > 0) b = s;
  }
  return b || eval5(cards);
}

// players: [{ total, live, score }] -> chips won per player, side pots included.
export function distribute(players) {
  const win = players.map(() => 0);
  const levels = [...new Set(players.filter(p => p.live).map(p => p.total))].sort((a, b) => a - b);
  let prev = 0, lastWinners = [];
  for (const lv of levels) {
    let pot = 0;
    for (const p of players) pot += Math.max(0, Math.min(p.total, lv) - prev);
    const elig = players.map((p, i) => i).filter(i => players[i].live && players[i].total >= lv);
    let top = null;
    for (const i of elig) if (!top || cmp(players[i].score, top) > 0) top = players[i].score;
    const ws = elig.filter(i => cmp(players[i].score, top) === 0);
    const share = Math.floor(pot / ws.length);
    ws.forEach((w, k) => { win[w] += share + (k === 0 ? pot - share * ws.length : 0); });
    lastWinners = ws;
    prev = lv;
  }
  // chips folded above the highest live contribution go to the last pot's winner
  const rest = players.reduce((a, p) => a + p.total, 0) - win.reduce((a, b) => a + b, 0);
  if (rest > 0 && lastWinners.length) win[lastWinners[0]] += rest;
  return win;
}

const TURN_TIME = 30000;

export class Poker {
  constructor(n, notify, limits = {}) {
    this.sb = limits.sb || 10;
    this.bb = limits.bb || 20;
    this.seats = Array(n).fill(null);
    this.notify = notify;
    this.phase = 'waiting';
    this.board = [];
    this.button = -1;
    this.toAct = -1;
    this.currentBet = 0;
    this.minRaise = this.bb;
    this.deadline = 0;
  }

  get running() { return ['preflop', 'flop', 'turn', 'river'].includes(this.phase); }

  sit(p, i) {
    if (this.seats[i]) return false;
    this.seats[i] = { p, cards: [], bet: 0, total: 0, folded: true, allIn: false, acted: false, inHand: false };
    this.notify();
    this.maybeStart();
    return true;
  }

  leave(p) {
    const i = this.seats.findIndex(s => s?.p === p), s = this.seats[i];
    if (!s) return;
    if (this.running && s.inHand && !s.folded) {
      s.folded = true; s.left = true;
      if (this.toAct === i) this.advance(); else if (this.live().length < 2) this.advance();
    } else if (s.inHand && (this.running || this.phase === 'showdown')) s.left = true;
    else this.seats[i] = null;
    this.notify();
  }

  live() { return this.seats.filter(s => s?.inHand && !s.folded); }

  next(i) {
    const n = this.seats.length;
    for (let k = 1; k <= n; k++) {
      const j = (i + k) % n, s = this.seats[j];
      if (s?.inHand && !s.folded && !s.allIn) return j;
    }
    return -1;
  }

  maybeStart() {
    if (this.running || this.phase === 'showdown' || this.pending) return;
    if (this.seats.filter(s => s && !s.left && s.p.chips > 0).length < 2) { this.phase = 'waiting'; return; }
    this.pending = setTimeout(() => { this.pending = null; this.startHand(); }, 2500);
  }

  startHand() {
    this.seats = this.seats.map(s => (s && !s.left ? s : null));
    for (const s of this.seats) if (s) Object.assign(s, { cards: [], bet: 0, total: 0, folded: true, allIn: false, acted: false, inHand: s.p.chips > 0, won: 0, hand: '' });
    const ins = this.seats.map((s, i) => (s?.inHand ? i : -1)).filter(i => i >= 0);
    if (ins.length < 2) { this.phase = 'waiting'; return this.notify(); }
    this.deck = deck();
    this.board = [];
    this.reveal = false;
    for (const i of ins) Object.assign(this.seats[i], { cards: [this.deck.pop(), this.deck.pop()], folded: false });
    this.button = ins.find(i => i > this.button) ?? ins[0];
    const after = i => ins[(ins.indexOf(i) + 1) % ins.length];
    const sb = ins.length === 2 ? this.button : after(this.button), bb = after(sb);
    this.post(sb, this.sb); this.post(bb, this.bb);
    this.currentBet = Math.max(...this.seats.map(s => s?.bet || 0));
    this.minRaise = this.bb;
    this.phase = 'preflop';
    this.toAct = this.next(bb);
    if (this.toAct < 0 || (this.seats.filter(s => s?.inHand && !s.allIn).length <= 1 && this.seats[this.toAct].bet >= this.currentBet)) return this.nextStreet();
    this.startTurn();
  }

  post(i, amt) {
    const s = this.seats[i], a = Math.min(amt, s.p.chips);
    s.p.chips -= a; s.bet += a; s.total += a;
    if (s.p.chips === 0) s.allIn = true;
  }

  act(p, m) {
    const i = this.seats.findIndex(s => s?.p === p), s = this.seats[i];
    if (!s || !this.running || this.toAct !== i) return;
    const toCall = this.currentBet - s.bet;
    if (m.a === 'fold') s.folded = true;
    else if (m.a === 'check') { if (toCall > 0) return; }
    else if (m.a === 'call') this.post(i, toCall);
    else if (m.a === 'raise') {
      if (!Number.isInteger(m.to)) return;
      const max = s.bet + s.p.chips, to = Math.min(m.to, max);
      if (to <= this.currentBet || (to < this.currentBet + this.minRaise && to < max)) return;
      this.minRaise = Math.max(this.minRaise, to - this.currentBet);
      this.currentBet = to;
      for (const o of this.seats) if (o && o !== s) o.acted = false;
      this.post(i, to - s.bet);
    } else return;
    s.acted = true;
    this.advance();
  }

  startTurn() {
    clearTimeout(this.timer);
    this.deadline = Date.now() + TURN_TIME;
    const i = this.toAct;
    this.timer = setTimeout(() => {
      const s = this.seats[i];
      if (this.toAct === i && s) this.act(s.p, { a: this.currentBet > s.bet ? 'fold' : 'check' });
    }, TURN_TIME);
    this.notify();
  }

  advance() {
    clearTimeout(this.timer);
    const live = this.live();
    if (live.length <= 1) return this.finish(false);
    const canAct = live.filter(s => !s.allIn);
    if (canAct.every(s => s.acted && s.bet === this.currentBet)) return this.nextStreet();
    this.toAct = this.next(this.toAct);
    this.startTurn();
  }

  nextStreet() {
    for (const s of this.seats) if (s) { s.bet = 0; s.acted = false; }
    this.currentBet = 0;
    this.minRaise = this.bb;
    this.toAct = -1;
    this.deadline = 0;
    const order = ['preflop', 'flop', 'turn', 'river', 'showdown'];
    this.phase = order[order.indexOf(this.phase) + 1];
    if (this.phase === 'flop') this.board.push(this.deck.pop(), this.deck.pop(), this.deck.pop());
    else if (this.phase !== 'showdown') this.board.push(this.deck.pop());
    if (this.phase === 'showdown') return this.finish(true);
    if (this.live().filter(s => !s.allIn).length <= 1) { // everyone all-in: run the board out
      this.notify();
      this.timer = setTimeout(() => this.nextStreet(), 1400);
      return;
    }
    this.toAct = this.next(this.button);
    this.startTurn();
  }

  finish(showdown) {
    clearTimeout(this.timer);
    this.phase = 'showdown';
    this.toAct = -1;
    this.deadline = 0;
    this.reveal = showdown;
    const ps = this.seats.map(s => s && s.inHand ? { total: s.total, live: !s.folded, score: showdown && !s.folded ? best([...s.cards, ...this.board]) : [0] } : { total: 0, live: false, score: [0] });
    const win = distribute(ps);
    this.seats.forEach((s, i) => {
      if (!s) return;
      s.won = win[i];
      s.p.chips += win[i];
      if (s.inHand) stakes.on?.(s.p, s.total, true);
      s.hand = showdown && s.inHand && !s.folded ? HAND_NAMES[ps[i].score[0]] : '';
    });
    this.notify();
    this.timer = setTimeout(() => {
      this.seats = this.seats.map(s => (s && !s.left ? s : null));
      this.phase = 'waiting';
      this.maybeStart();
      this.notify();
    }, 6000);
  }

  view(pid) {
    const pot = this.seats.reduce((a, s) => a + (s ? s.total - s.bet : 0), 0);
    const me = this.seats.find(s => s?.p.id === pid);
    return {
      phase: this.phase,
      left: this.deadline ? this.deadline - Date.now() : 0,
      board: this.board,
      pot: this.phase === 'showdown' ? 0 : pot,
      button: this.button,
      toAct: this.toAct,
      currentBet: this.currentBet,
      minTo: this.currentBet + this.minRaise,
      toCall: me ? Math.max(0, this.currentBet - me.bet) : 0,
      seats: this.seats.map(s => s && {
        id: s.p.id, name: s.p.name, color: s.p.color, chips: s.p.chips, me: s.p.id === pid, bet: s.bet,
        inHand: s.inHand, folded: s.folded, allIn: s.allIn, won: s.won || 0, hand: s.hand || '',
        cards: !s.inHand || (s.folded && s.p.id !== pid) ? [] : s.p.id === pid || (this.phase === 'showdown' && this.reveal && !s.folded) ? s.cards : ['??', '??'],
      }),
    };
  }
}
