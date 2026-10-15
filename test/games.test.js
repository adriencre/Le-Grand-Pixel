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
  for (let k = 0; k < 5000; k++) { price = step(price, STOCKS[4])[0]; assert.ok(price >= 0.01 && Math.abs(Math.round(price * 100) - price * 100) < 1e-6); }
});

test('market: 16 listings in known sectors, cryptos stay sane, index starts at 1000', async () => {
  const { STOCKS, SECTORS, indexValue } = await import('../public/market.js');
  const { step, trade } = await import('../games/stocks.js');
  assert.equal(new Set(STOCKS.map(s => s.id)).size, 16);
  assert.ok(STOCKS.every(s => SECTORS.includes(s.sector) && s.sector !== 'TOUT'));
  assert.equal(indexValue({}), 1000);
  for (const s of STOCKS.filter(x => x.crypto)) {
    let price = s.base;
    for (let k = 0; k < 10000; k++) { price = step(price, s)[0]; assert.ok(price >= 0.01 && Number.isFinite(price)); }
  }
  const p = { chips: 10000, stocks: {} };
  assert.equal(trade(p, 'dogepix', 4000, 2), -8080); // 8000 + 1% fee
  assert.equal(trade(p, 'dogepix', -4000, 2.5), 9900);
});

test('daily reward: streak grows day after day, resets after a gap, chest on day 7', async () => {
  const { claimDaily, DAILY } = await import('../games/daily.js');
  const day = 86400000, t0 = new Date('2026-10-01T12:00:00').getTime();
  let d, r = claimDaily(undefined, t0, []);
  assert.equal(r.reward.chips, DAILY[0]);
  assert.equal(claimDaily(r.daily, t0 + 3600000, []), null, 'once per day');
  for (let k = 1; k < 6; k++) { r = claimDaily(r.daily, t0 + k * day, []); assert.equal(r.reward.day, k + 1); }
  d = claimDaily(r.daily, t0 + 6 * day, ['hat_cap'], () => 0.1);
  assert.ok(d.reward.chest && d.reward.item === 'hat_cap');
  assert.equal(claimDaily(d.daily, t0 + 7 * day, []).reward.day, 1, 'after the chest a new week starts');
  assert.equal(claimDaily(r.daily, t0 + 9 * day, []).reward.day, 1, 'a missed day resets the streak');
});

test('loan shark: debt grows when late, capped', async () => {
  const { LOAN, loanDue } = await import('../games/street.js');
  const loan = { owe: LOAN.owe, due: 1e6 };
  assert.equal(loanDue(loan, 1e6 - 1), 750);
  assert.equal(loanDue(loan, 1e6 + 1), 825);
  assert.equal(loanDue(loan, 1e6 + 300001), 908);
  assert.equal(loanDue(loan, 1e12), Math.round(750 * 1.1 ** 10));
});

test('slots jackpot: three diamonds with a big enough bet win the pot', async t => {
  const { Slots, jackpot, JACKPOT_SEED } = await import('../games/slots.js');
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const s = new Slots(1, () => {}), p = { id: 'a', chips: 1000 };
  s.sit(p);
  jackpot.pot = 5000;
  let won = 0;
  jackpot.onWin = (_, amt) => { won = amt; };
  s.act(p, { a: 'spin', bet: 100 });
  s.reels = [5, 5, 5]; // force the outcome before the reels stop
  t.mock.timers.tick(2200);
  assert.equal(won, 5001);
  assert.equal(jackpot.pot, JACKPOT_SEED);
  assert.equal(p.chips, 1000 - 100 + 100 * 250 + 5001);
  s.act(p, { a: 'spin', bet: 10 });
  s.reels = [5, 5, 5];
  won = 0;
  t.mock.timers.tick(2200);
  assert.equal(won, 0); // bet under JACKPOT_MIN: normal payout only
});

test('apartments: furniture placement rules', async () => {
  const { fits, cleanApt } = await import('../public/furniture.js');
  const apt = cleanApt({ size: 0, items: [] }); // studio 12x9: floor rows 3..7, door at column 6
  assert.ok(fits(apt, 'canape', 1, 3));
  assert.ok(!fits(apt, 'canape', 0, 3)); // in the side wall
  assert.ok(!fits(apt, 'canape', 9, 3)); // 9 + 3 > 11
  assert.ok(!fits(apt, 'canape', 1, 2)); // on the back wall
  assert.ok(fits(apt, 'poster', 1, 0) && !fits(apt, 'poster', 1, 3)); // wall items go on the wall only
  assert.ok(!fits(apt, 'fauteuil', 6, 7)); // blocks the door
  assert.ok(fits(apt, 'tapis_rond', 5, 6)); // rugs can go in front of the door
  apt.items.push({ id: 'canape', x: 1, y: 3 });
  assert.ok(!fits(apt, 'fauteuil', 2, 3));
  assert.ok(fits(apt, 'fauteuil', 2, 3, 0)); // moving the sofa itself
  assert.ok(fits(apt, 'tapis', 1, 3)); // a rug under the sofa
});

test('apartments: saved data is cleaned, misplaced furniture goes back to the stock', async () => {
  const { cleanApt } = await import('../public/furniture.js');
  const a = cleanApt({ size: 9, wall: 'w_or', styles: ['w_or', 'nope'], items: [{ id: 'lit', x: 1, y: 3 }, { id: 'lit', x: 2, y: 4 }, { id: 'hack', x: 5, y: 5 }, { id: 'chaise', x: 50, y: 1 }], stock: { lampe: 2, hack: 5, plante: -1 } });
  assert.equal(a.size, 0);
  assert.equal(a.wall, 'w_or');
  assert.deepEqual(a.styles, ['w_or']);
  assert.deepEqual(a.items.map(i => i.id), ['lit']);
  assert.deepEqual(a.stock, { lampe: 2, lit: 1, chaise: 1 });
  assert.equal(cleanApt({ wall: 'w_or' }).wall, 'w_creme'); // not bought
  assert.deepEqual(cleanApt(undefined).items.map(i => i.id), ['lit', 'tapis_rond', 'plante', 'poster']); // the starter studio
});

test('apartments: windows stay clear, every piece of furniture is in a showroom department', async () => {
  const { fits, cleanApt, FURNITURE, CATS, aptWindows } = await import('../public/furniture.js');
  const studio = cleanApt({ size: 0, items: [] }), pent = cleanApt({ size: 2, items: [] });
  assert.ok(!fits(studio, 'poster', 5, 1)); // the studio window is at columns 4-7
  assert.ok(fits(studio, 'poster', 8, 1));
  assert.ok(!fits(pent, 'tableau', 10, 0) && fits(pent, 'tableau', 2, 0)); // the penthouse bay window
  assert.equal(aptWindows(cleanApt({ size: 1 })).length, 2);
  const cats = new Set(CATS.map(c => c[0]));
  for (const [id, d] of Object.entries(FURNITURE)) {
    assert.ok(cats.has(d.cat), id + ' has a department');
    assert.ok([0, 1, 2, 3].includes(d.rarity), id + ' has a rarity');
    assert.ok(d.w >= 1 && d.h >= 1 && ['obj', 'rug', 'wall'].includes(d.layer), id);
  }
  // a saved wall item over a window goes back to the stock
  assert.deepEqual(cleanApt({ size: 0, items: [{ id: 'tableau', x: 4, y: 1 }] }).stock, { tableau: 1 });
});

test('small jobs: right answers pay, wrong ones do not, cap holds', async () => {
  const { JOBS, makeTask, check, capLeft, CAP } = await import('../games/jobs.js');
  const { hitsIn } = await import('../public/map.js');
  for (let i = 0; i < 200; i++) {
    for (const kind of ['barman', 'croupier', 'videur']) {
      const t = makeTask(kind, 'casino');
      assert.ok(check(kind, t, t.answer, {}));
      assert.ok(!check(kind, t, 'nope', {}));
    }
    for (const zone of ['casino', 'street']) {
      const t = makeTask('menage', zone);
      assert.ok(!hitsIn(zone, t.pub.x, t.pub.y));
      assert.ok(check('menage', t, 'clean', { x: t.pub.x + 5, y: t.pub.y }));
      assert.ok(!check('menage', t, 'clean', { x: t.pub.x + 40, y: t.pub.y }));
    }
  }
  const { score } = await import('../games/blackjack.js');
  for (let i = 0; i < 200; i++) {
    const t = makeTask('croupier', 'casino'), s = score(t.pub.cards);
    assert.equal(t.answer, s < 17 ? 'hit' : s <= 21 ? 'stand' : 'bust');
  }
  const v = makeTask('videur', 'casino', () => 0.9); // rule 2, Diamant card, sober
  assert.equal(v.answer, 'in');
  const rec = { since: 0, earned: CAP };
  assert.equal(capLeft(rec, 1000), 0);
  assert.equal(capLeft(rec, 3600001 + 1000), CAP); // new hour
  assert.ok(Object.values(JOBS).every(j => j.pay >= 15 && j.pay <= 25));
});
