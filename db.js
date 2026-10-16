// SQLite storage (built into Node): accounts, sessions, players' progress and the stock market.
import { DatabaseSync } from 'node:sqlite';
import { scryptSync, randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import fs from 'node:fs';

const SESSION_MS = 30 * 24 * 3600 * 1000;
const sha = t => createHash('sha256').update(String(t)).digest('hex');

// shortcut: scryptSync blocks the event loop ~50 ms per login; switch to async scrypt if many people log in at once.
export function hashPassword(pass, salt = randomBytes(16).toString('hex')) {
  return { salt, hash: scryptSync(pass, salt, 64).toString('hex') };
}
export function checkPassword(pass, hash, salt) {
  if (!hash || !salt) return false;
  const got = scryptSync(pass, salt, 64), want = Buffer.from(hash, 'hex');
  return got.length === want.length && timingSafeEqual(got, want);
}

// Fields kept as JSON in the `data` column (everything that is nested).
const DATA = ['owned', 'outfit', 'presets', 'stocks', 'history', 'daily', 'achievements', 'loan', 'apt', 'night', 'xp', 'xpDay'];

export function openDb(file) {
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE COLLATE NOCASE, pass_hash TEXT, salt TEXT,
      created_at INTEGER NOT NULL, chips INTEGER NOT NULL DEFAULT 1000, vip INTEGER NOT NULL DEFAULT 0,
      color TEXT, data TEXT NOT NULL DEFAULT '{}');
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, player_id INTEGER NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS market (id TEXT PRIMARY KEY, price REAL NOT NULL, hist TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY, from_id INTEGER NOT NULL, to_id INTEGER NOT NULL,
      text TEXT NOT NULL, at INTEGER NOT NULL, read INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS messages_pair ON messages (from_id, to_id, at);
  `);
  const st = {
    byName: db.prepare('SELECT * FROM players WHERE name = ?'),
    byId: db.prepare('SELECT * FROM players WHERE id = ?'),
    insert: db.prepare('INSERT INTO players (name, pass_hash, salt, created_at, chips, vip, color, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'),
    setPass: db.prepare('UPDATE players SET pass_hash = ?, salt = ? WHERE id = ?'),
    save: db.prepare('UPDATE players SET chips = ?, vip = ?, color = ?, data = ? WHERE id = ?'),
    openApts: db.prepare("SELECT id, name FROM players WHERE json_extract(data, '$.apt.open') = 1 ORDER BY name LIMIT ?"),
    top: db.prepare('SELECT name, chips FROM players ORDER BY chips DESC LIMIT 5'),
    count: db.prepare('SELECT COUNT(*) AS n FROM players'),
    newSession: db.prepare('INSERT INTO sessions (token_hash, player_id, expires) VALUES (?, ?, ?)'),
    session: db.prepare('SELECT player_id FROM sessions WHERE token_hash = ? AND expires > ?'),
    dropSession: db.prepare('DELETE FROM sessions WHERE token_hash = ?'),
    purge: db.prepare('DELETE FROM sessions WHERE expires <= ?'),
    market: db.prepare('SELECT * FROM market'),
    sendMsg: db.prepare('INSERT INTO messages (from_id, to_id, text, at) VALUES (?, ?, ?, ?)'),
    convo: db.prepare(`SELECT m.text, m.at, m.from_id = ? AS mine FROM messages m
      WHERE (m.from_id = ? AND m.to_id = ?) OR (m.from_id = ? AND m.to_id = ?) ORDER BY m.at DESC, m.id DESC LIMIT 50`),
    markRead: db.prepare('UPDATE messages SET read = 1 WHERE to_id = ? AND from_id = ?'),
    contacts: db.prepare(`SELECT p.name, x.text, x.at, (SELECT COUNT(*) FROM messages u WHERE u.to_id = ? AND u.from_id = p.id AND u.read = 0) AS unread
      FROM (SELECT CASE WHEN from_id = ? THEN to_id ELSE from_id END AS other, text, at, id FROM messages WHERE from_id = ? OR to_id = ?) x
      JOIN players p ON p.id = x.other
      WHERE x.id = (SELECT MAX(id) FROM messages y WHERE (y.from_id = ? AND y.to_id = x.other) OR (y.from_id = x.other AND y.to_id = ?))
      ORDER BY x.at DESC, x.id DESC`),
    getMeta: db.prepare('SELECT v FROM meta WHERE k = ?'),
    setMeta: db.prepare('INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v'),
    saveMarket: db.prepare('INSERT INTO market (id, price, hist) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET price = excluded.price, hist = excluded.hist'),
  };
  const toPlayer = r => {
    if (!r) return null;
    let data = {};
    try { data = JSON.parse(r.data); } catch { /* corrupted JSON: start this player's extras fresh */ }
    return { id: r.id, name: r.name, passHash: r.pass_hash, salt: r.salt, chips: r.chips, vip: r.vip, color: r.color, ...data };
  };
  const tx = fn => { db.exec('BEGIN'); try { fn(); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; } };

  const api = {
    getPlayer: name => toPlayer(st.byName.get(name)),
    getPlayerById: id => toPlayer(st.byId.get(id)),
    createPlayer(name, pass, color) {
      const { hash, salt } = hashPassword(pass);
      st.insert.run(name, hash, salt, Date.now(), 1000, 0, color, '{}');
      return api.getPlayer(name);
    },
    setPassword(id, pass) { const { hash, salt } = hashPassword(pass); st.setPass.run(hash, salt, id); },
    savePlayers(list) {
      tx(() => { for (const p of list) st.save.run(p.chips, p.vip || 0, p.color, JSON.stringify(Object.fromEntries(DATA.map(k => [k, p[k]]))), p.dbId ?? p.id); });
    },
    openApts: n => st.openApts.all(n).map(r => ({ id: r.id, name: r.name })),
    top5: () => st.top.all().map(r => ({ name: r.name, chips: r.chips })),
    createSession(playerId) {
      const token = randomBytes(32).toString('hex');
      st.newSession.run(sha(token), playerId, Date.now() + SESSION_MS);
      return token;
    },
    playerBySession(token) {
      if (typeof token !== 'string' || token.length !== 64) return null;
      st.purge.run(Date.now());
      const r = st.session.get(sha(token), Date.now());
      return r ? api.getPlayerById(r.player_id) : null;
    },
    deleteSession: token => { if (typeof token === 'string') st.dropSession.run(sha(token)); },
    loadMarket: () => Object.fromEntries(st.market.all().map(r => [r.id, { price: r.price, hist: JSON.parse(r.hist) }])),
    saveMarket(m) { tx(() => { for (const id in m.prices) st.saveMarket.run(id, m.prices[id], JSON.stringify(m.hist[id] || [m.prices[id]])); }); },

    // One-time import of the old JSON saves. Imported accounts have no password: the first login claims them.
    importJson(chipsFile, marketFile) {
      let n = 0;
      if (st.count.get().n === 0 && fs.existsSync(chipsFile)) {
        const old = JSON.parse(fs.readFileSync(chipsFile, 'utf8'));
        tx(() => {
          for (const v of Object.values(old)) {
            if (!v?.name || api.getPlayer(v.name)) continue;
            const data = Object.fromEntries(DATA.filter(k => v[k] !== undefined).map(k => [k, v[k]]));
            st.insert.run(String(v.name).slice(0, 12), null, null, Date.now(), Number.isInteger(v.chips) ? v.chips : 1000, [1, 2, 3].includes(v.vip) ? v.vip : 0, v.color || null, JSON.stringify(data));
            n++;
          }
        });
        fs.renameSync(chipsFile, chipsFile + '.bak');
      }
      if (!st.market.all().length && fs.existsSync(marketFile)) {
        const m = JSON.parse(fs.readFileSync(marketFile, 'utf8'));
        if (m.prices) api.saveMarket({ prices: m.prices, hist: m.hist || {} });
        fs.renameSync(marketFile, marketFile + '.bak');
      }
      return n;
    },
    // Private messages (kept for offline players too).
    sendMessage: (fromId, toId, text) => st.sendMsg.run(fromId, toId, text, Date.now()),
    conversation(meId, otherId) {
      st.markRead.run(meId, otherId);
      return st.convo.all(meId, meId, otherId, otherId, meId).reverse().map(r => ({ text: r.text, at: r.at, mine: !!r.mine }));
    },
    contacts: meId => st.contacts.all(meId, meId, meId, meId, meId, meId).map(r => ({ name: r.name, text: r.text, at: r.at, unread: r.unread })),
    // Small server-wide values (the slots jackpot), stored as JSON.
    getMeta(k) { try { return JSON.parse(st.getMeta.get(k)?.v); } catch { return undefined; } },
    setMeta: (k, v) => st.setMeta.run(k, JSON.stringify(v)),
    close: () => db.close(),
  };
  return api;
}
