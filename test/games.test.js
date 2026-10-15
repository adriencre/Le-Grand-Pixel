import test from 'node:test';
import assert from 'node:assert/strict';
import { score, settle } from '../games/blackjack.js';
import { best, cmp, distribute, eval5, Poker } from '../games/poker.js';
import { payout } from '../games/roulette.js';
import { slotPay, WEIGHTS, PAY3 } from '../games/slots.js';

test('blackjack score and payouts', () => {
  assert.equal(score(['As', 'Kd']), 21);
  assert.equal(score(['As', 'Ad', '9c']), 21);
  assert.equal(score(['As', '9d', '5c']), 15);
  assert.equal(settle(['As', 'Kd'], ['9s', '9d'], 100), 250);
  assert.equal(settle(['Ts', '8d'], ['9s', '9d'], 100), 100);
  assert.equal(settle(['Ts', '8d', '5c'], ['9s', 'Kd', '5d'], 100), 0); // player busts first
  assert.equal(settle(['Ts', '8d'], ['9s', '7d', '8c'], 100), 200);
});

test('poker hand ranking', () => {
  const r = cs => eval5(cs.split(' '))[0];
  assert.equal(r('As Ks Qs Js Ts'), 8);
  assert.equal(r('5d 4c 3h 2s Ad'), 4); // wheel
  assert.equal(r('9d 9c 9h 4s 4d'), 6);
  assert.equal(r('9d 9c 4h 4s Ad'), 2);
  assert.ok(cmp(eval5('Ad Ac 9h 4s 2d'.split(' ')), eval5('Kd Kc Qh Js 2d'.split(' '))) > 0);
  assert.ok(cmp(eval5('6d 5c 4h 3s 2d'.split(' ')), eval5('5d 4c 3h 2s Ad'.split(' '))) > 0);
  assert.equal(best('2s 3s 4s 5s 9s Kd Kh'.split(' '))[0], 5);
});

test('side pots', () => {
  // A all-in 50 with the best hand, B and C put 200, C beats B.
  const w = distribute([
    { total: 50, live: true, score: [8, 14] },
    { total: 200, live: true, score: [1, 3] },
    { total: 200, live: true, score: [2, 9] },
    { total: 30, live: false, score: [0] },
  ]);
  assert.deepEqual(w, [180, 0, 300, 0]);
  assert.deepEqual(distribute([{ total: 40, live: true, score: [1] }, { total: 40, live: true, score: [1] }]), [40, 40]);
});

test('poker hand plays to the end and chips are conserved', async () => {
  const ps = [0, 1, 2].map(i => ({ id: 'p' + i, name: 'P' + i, color: '#fff', chips: 1000 }));
  let g;
  const done = new Promise(res => { g = new Poker(6, () => { if (g?.phase === 'showdown') res(); }); });
  ps.forEach((p, i) => g.sit(p, i));
  clearTimeout(g.pending); g.pending = null; g.startHand();
  for (let k = 0; k < 50 && g.running; k++) {
    const s = g.seats[g.toAct];
    g.act(s.p, { a: g.currentBet > s.bet ? 'call' : 'check' });
  }
  await done;
  clearTimeout(g.timer);
  assert.equal(ps.reduce((a, p) => a + p.chips, 0), 3000);
  assert.equal(g.board.length, 5);
});

test('roulette payouts', () => {
  assert.equal(payout({ t: 'n', v: 17, a: 10 }, 17), 360);
  assert.equal(payout({ t: 'red', a: 10 }, 0), 0);
  assert.equal(payout({ t: 'red', a: 10 }, 1), 20);
  assert.equal(payout({ t: 'dozen', v: 2, a: 10 }, 36), 30);
  assert.equal(payout({ t: 'col', v: 0, a: 10 }, 34), 30);
  assert.equal(payout({ t: 'odd', a: 10 }, 0), 0);
});

test('slots return to player is just under 100%', () => {
  const tot = WEIGHTS.reduce((a, b) => a + b);
  let rtp = 0;
  for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) for (let c = 0; c < 6; c++)
    rtp += (WEIGHTS[a] * WEIGHTS[b] * WEIGHTS[c] / tot ** 3) * slotPay([a, b, c], 1);
  assert.ok(rtp > 0.9 && rtp < 1, 'rtp ' + rtp);
  assert.equal(slotPay([5, 5, 5], 10), 10 * PAY3[5]);
});

test('horse race odds keep a house edge and order is a full permutation', async () => {
  const { makeOdds, drawOrder } = await import('../games/race.js');
  for (let k = 0; k < 200; k++) {
    const w = Array.from({ length: 6 }, () => 1 + Math.floor(Math.random() * 6));
    const odds = makeOdds(w), tot = w.reduce((a, b) => a + b);
    w.forEach((x, i) => assert.ok(x / tot * odds[i] < 1, 'ev ' + x / tot * odds[i]));
    assert.deepEqual(drawOrder(w).sort(), [0, 1, 2, 3, 4, 5]);
  }
});

test('cosmetic catalog is consistent', async () => {
  const { ITEMS, SLOTS, BY_SLOT, RARITY, defaultOutfit } = await import('../public/items.js');
  const all = Object.values(ITEMS);
  assert.equal(all.length, SLOTS.reduce((a, s) => a + BY_SLOT[s].length, 0));
  for (const it of all) {
    assert.ok(SLOTS.includes(it.slot) && RARITY[it.rarity] && Number.isInteger(it.price) && it.price >= -1, it.id);
    assert.ok(BY_SLOT[it.slot].length <= 10, 'a shop page holds 10 cards');
  }
  const d = defaultOutfit('x');
  for (const s of ['hair', 'top', 'bottom', 'shoes']) assert.equal(ITEMS[d[s]].price, 0, 'default ' + s + ' is free');
});

test('drunk bets stay between 100% and 300% of the asked amount', async () => {
  const { drunkAmount } = await import('../public/drinks.js');
  assert.equal(drunkAmount(100, 0, 0.9), 100);
  assert.equal(drunkAmount(100, 1, 0), 100);
  assert.equal(drunkAmount(100, 1, 1), 300);
  assert.equal(drunkAmount(100, 0.5, 1), 200);
  for (let k = 0; k < 500; k++) { const v = drunkAmount(10, Math.random()); assert.ok(v >= 10 && v <= 30, v); }
});

test('trash cans and busking pay small, rare rewards', async () => {
  const { rollLoot, npcTip, FINDS } = await import('../games/street.js');
  const { ITEMS } = await import('../public/items.js');
  for (const id of FINDS) assert.equal(ITEMS[id].price, -1, id + ' is not for sale');
  let chips = 0, items = 0;
  for (let k = 0; k < 20000; k++) { const l = rollLoot([]); chips += l.chips; if (l.item) items++; }
  assert.ok(chips / 20000 > 3 && chips / 20000 < 20, 'avg per search ' + chips / 20000);
  assert.ok(items > 50 && items < 400, 'items ' + items);
  assert.equal(rollLoot(FINDS, () => 0).chips, 150); // already owns both finds
  assert.equal(npcTip(0, () => 0.99), 0);
  let tips = 0;
  for (let k = 0; k < 600; k++) tips += npcTip(1);
  assert.ok(tips / 10 > 15 && tips / 10 < 200, 'per minute at max hype ' + tips / 10);
});

test('VIP tables enforce their limits and cards upgrade for the difference', async () => {
  const { Blackjack } = await import('../games/blackjack.js');
  const { upgradeCost, VIP_TABLES } = await import('../public/map.js');
  const p = { id: 'a', name: 'A', color: '#fff', chips: 100000 };
  const bj = new Blackjack(5, () => {}, { min: 1000, max: 25000 });
  bj.sit(p, 0);
  bj.act(p, { a: 'bet', amt: 100 });
  assert.equal(p.chips, 100000, 'under the minimum is refused');
  bj.act(p, { a: 'bet', amt: 25000 }); bj.act(p, { a: 'bet', amt: 1000 });
  assert.equal(p.chips, 75000, 'over the maximum is refused');
  clearTimeout(bj.timer);
  const pk = new Poker(6, () => {}, { sb: 250, bb: 500 });
  const a = { id: 'x', chips: 10000 }, b = { id: 'y', chips: 10000 };
  pk.sit(a, 0); pk.sit(b, 1); clearTimeout(pk.pending); pk.pending = null; pk.startHand(); clearTimeout(pk.timer);
  assert.equal(a.chips + b.chips, 20000 - 750, 'blinds 250/500 posted');
  assert.equal(upgradeCost(0, 1), 100000);
  assert.equal(upgradeCost(1, 3), 1900000);
  assert.ok(VIP_TABLES.every(t => t.tier >= 1 && t.zone === 'vip'));
});

test('stock exchange: fees, no short selling, no credit, prices stay positive', async () => {
  const { trade, step, STOCKS, FEE } = await import('../games/stocks.js');
  const p = { chips: 10000, stocks: {} };
  assert.equal(trade(p, 'pizza', 10, 100), -Math.ceil(1000 * (1 + FEE)));
  assert.equal(p.chips, 10000 - 1010);
  assert.equal(trade(p, 'pizza', -11, 100), null, 'cannot sell more than owned');
  assert.equal(trade(p, 'pizza', 1000, 100), null, 'cannot buy without the chips');
  assert.equal(trade(p, 'pizza', -10, 120), Math.floor(1200 * (1 - FEE)));
  assert.deepEqual(p.stocks, {});
  assert.equal(trade(p, 'pizza', 1.5, 100), null);
  let price = 2;
  for (let k = 0; k < 5000; k++) { price = step(price, STOCKS[4])[0]; assert.ok(price >= 1 && Number.isInteger(price)); }
});
