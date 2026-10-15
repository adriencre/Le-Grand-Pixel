import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb, hashPassword, checkPassword } from '../db.js';

test('passwords are salted hashes', () => {
  const a = hashPassword('secret'), b = hashPassword('secret');
  assert.notEqual(a.hash, b.hash, 'different salts');
  assert.ok(checkPassword('secret', a.hash, a.salt));
  assert.ok(!checkPassword('Secret', a.hash, a.salt));
  assert.ok(!checkPassword('secret', null, null));
});

test('players are stored with their nested data, names are case-insensitive', () => {
  const db = openDb(':memory:');
  const p = db.createPlayer('Adrien', 'pass', '#fff');
  assert.equal(p.chips, 1000);
  assert.throws(() => db.createPlayer('ADRIEN', 'x', '#fff'));
  Object.assign(p, { chips: 4321, vip: 2, owned: ['hat_cap'], outfit: { hat: 'hat_cap' }, stocks: { pizza: { n: 3, cost: 360 } }, history: [{ text: 'x', amount: 1 }] });
  db.savePlayers([p]);
  const back = db.getPlayer('adrien');
  assert.equal(back.chips, 4321);
  assert.equal(back.vip, 2);
  assert.deepEqual(back.stocks, { pizza: { n: 3, cost: 360 } });
  assert.deepEqual(back.owned, ['hat_cap']);
  assert.deepEqual(db.top5()[0], { name: 'Adrien', chips: 4321 });
});

test('sessions work until deleted, bad tokens are ignored', () => {
  const db = openDb(':memory:');
  const p = db.createPlayer('Lucas', 'pass', '#000');
  const token = db.createSession(p.id);
  assert.equal(db.playerBySession(token).name, 'Lucas');
  assert.equal(db.playerBySession('nope'), null);
  assert.equal(db.playerBySession('a'.repeat(64)), null);
  db.deleteSession(token);
  assert.equal(db.playerBySession(token), null);
});

test('old JSON saves are imported once, without passwords, and the market too', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gp-'));
  const chips = path.join(dir, 'chips.json'), market = path.join(dir, 'market.json');
  fs.writeFileSync(chips, JSON.stringify({ adrien: { name: 'Adrien', chips: 2270, vip: 1, owned: ['hat_cap'] }, lucas: { name: 'Lucas', chips: 970 } }));
  fs.writeFileSync(market, JSON.stringify({ prices: { pizza: 130 }, hist: { pizza: [120, 130] } }));
  const db = openDb(':memory:');
  assert.equal(db.importJson(chips, market), 2);
  const a = db.getPlayer('Adrien');
  assert.equal(a.chips, 2270);
  assert.equal(a.passHash, null);
  assert.deepEqual(a.owned, ['hat_cap']);
  assert.deepEqual(db.loadMarket().pizza, { price: 130, hist: [120, 130] });
  assert.ok(fs.existsSync(chips + '.bak') && !fs.existsSync(chips));
  assert.equal(db.importJson(chips, market), 0, 'nothing imported twice');
});
