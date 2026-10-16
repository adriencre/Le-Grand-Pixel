import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { Server } from 'socket.io';
import { TABLES, SPAWN, COLORS, T, MW, MH, ST, ST_SPAWN, BUSK, BROKE, ENTRY_MIN, seatPos, standPos, nearBar, nearShop, nearDoorIn, nearDoorOut, nearBusk, nearBin, nearShark, nearResDoor, RES_DOOR,
  LW, LH, LOBBY_SPAWN, LOBBY_ELEV, nearLobbyExit, nearElevatorApt, nearConcierge, nearFurnShop,
  VW, VH, VIP_SPAWN, VIP_ELEVATOR, TIERS, upgradeCost, nearElevatorIn, nearElevatorOut, nearReception, nearVipBar, nearJobBoard, nearStreetBouncer, nearCorner, nearMotel, nearPimp, MOTEL_DOOR } from './public/map.js';
import { JOBS, STREET_JOBS, makeTask, check, capLeft } from './games/jobs.js';
import { rollLoot, npcTip, LOAN, loanDue } from './games/street.js';
import { ARCHS, SCENE_MS, CAP as NIGHT_CAP, FINE, PIMP_AT, charm, inLight, spawnClient, interestRate, negotiate, newCop, copStep, copSees, sceneResult, cleanNight } from './games/night.js';
import { ACHIEVEMENTS } from './public/achievements.js';
import { FURNITURE, WALLS, FLOORS, APT_SIZES, MAX_ITEMS, fits, cleanApt, aptDims, aptDoor } from './public/furniture.js';
import { STOCKS, step, trade } from './games/stocks.js';
import { fmtPrice } from './public/market.js';
import { ITEMS, SLOTS, REMOVABLE, SKINS, HAIR_COLORS, RARITY, defaultOutfit } from './public/items.js';
import { Blackjack } from './games/blackjack.js';
import { Poker } from './games/poker.js';
import { Roulette } from './games/roulette.js';
import { Slots, jackpot } from './games/slots.js';
import { Race } from './games/race.js';
import { DRINKS, SOBER_PER_SEC, drunkAmount } from './public/drinks.js';
import { openDb, checkPassword } from './db.js';
import { claimDaily } from './games/daily.js';
import { RPS_ICON, beats } from './public/rps.js';
import { stakes } from './games/cards.js';
import { MAX, stakeXp, PVP_CAP, DAY_BONUS, XP, TRACK, JACKPOTS, rewardsOf, levelOf } from './public/levels.js';

const PORT = process.env.PORT || 4321;
const ROOT = path.resolve('public');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };

const server = http.createServer((req, res) => {
  let url;
  try { url = decodeURIComponent(req.url.split('?')[0]); } catch { res.writeHead(400); return res.end(); }
  const file = path.join(ROOT, path.normalize(url));
  const target = file === ROOT || file.endsWith(path.sep) ? path.join(ROOT, 'index.html') : file;
  if (!target.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(target, (err, data) => {
    if (err) { res.writeHead(404); return res.end('404'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(target)] || 'application/octet-stream' });
    res.end(data);
  });
});
const io = new Server(server);

// Everything is saved in SQLite (data/casino.db); the old JSON saves are imported once.
fs.mkdirSync(path.resolve('data'), { recursive: true });
const db = openDb(path.resolve('data/casino.db'));
const imported = db.importJson(path.resolve('data/chips.json'), path.resolve('data/market.json'));
if (imported) console.log(`  ${imported} joueurs importes depuis l'ancienne sauvegarde.`);
const savedPot = db.getMeta('jackpot');
if (Number.isInteger(savedPot) && savedPot > 0) jackpot.pot = savedPot;
function persist() {
  db.savePlayers([...players.values()]);
  db.saveMarket(market);
  db.setMeta('jackpot', jackpot.pot);
}
setInterval(persist, 3000);
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { for (const p of players.values()) if (p.rps) p.chips += p.rps.amount; persist(); db.close(); process.exit(0); });

const players = new Map();
const CLASSES = { blackjack: Blackjack, poker: Poker, roulette: Roulette, slots: Slots, race: Race };
const games = {};
for (const t of TABLES) games[t.id] = new CLASSES[t.type](t.seats, () => push(t.id), t.limits);

function push(tid) {
  for (const p of players.values()) if (p.seat?.t === tid) io.to(p.id).emit('table', { id: tid, ...games[tid].view(p.id) });
  if (tid === 'race') io.emit('race', games.race.view(null)); // the big screen in the room
}

function stand(p) {
  if (!p.seat) return;
  const t = TABLES.find(x => x.id === p.seat.t);
  Object.assign(p, standPos(t, p.seat.i));
  const tid = p.seat.t;
  p.seat = null;
  games[tid].leave(p);
  io.to(p.id).emit('pos', { x: p.x, y: p.y, seat: null });
}

// Moving between the casino and the street.
function goZone(p, zone, at) {
  stand(p);
  endJob(p);
  endShift(p);
  p.busking = false;
  p.zone = zone;
  if (!zone.startsWith('apt:')) p.aptName = null;
  const spawn = at || { street: { x: ST_SPAWN.x + (Math.random() * 30 - 15) | 0, y: ST_SPAWN.y }, vip: VIP_SPAWN, casino: SPAWN }[zone];
  Object.assign(p, spawn, { moving: false, dir: zone === 'street' ? 0 : 3 });
  io.to(p.id).emit('pos', { x: p.x, y: p.y, seat: null, zone });
}

function kickOut(p) {
  p.homeless = true;
  award(p, 'ruine');
  goZone(p, 'street');
  io.to(p.id).emit('kicked');
  io.emit('say', `💸 ${p.name} est ruiné... le videur le jette dehors !`);
}

// Small jobs: one task at a time, paid when the answer is right. Earnings are capped per hour, per name
// shortcut: the cap lives in memory and resets when the server restarts, move it to the db if people abuse it
const jobCaps = new Map();
const capOf = p => jobCaps.get(p.name.toLowerCase()) || jobCaps.set(p.name.toLowerCase(), { since: Date.now(), earned: 0 }).get(p.name.toLowerCase());
function nextTask(p, wait, res = {}) {
  const now = Date.now(), j = p.job, { name, time } = JOBS[j.kind], t = makeTask(j.kind, j.zone);
  Object.assign(j, { task: t, from: now + wait, until: now + wait + time });
  io.to(p.id).emit('job', { kind: j.kind, name, task: t.pub, wait, time, earned: j.earned, left: capLeft(capOf(p), now), ...res });
}
// ---------- La Nuit: street work at night, rules in games/night.js ----------
// p.night is saved (reputation, regulars, the pimp's deal); p.shift only lives while you work.
const cop = newCop();
const nightCaps = new Map(); // shortcut: in memory like the job caps
const nightCapOf = p => nightCaps.get(p.name.toLowerCase()) || nightCaps.set(p.name.toLowerCase(), { since: Date.now(), earned: 0 }).get(p.name.toLowerCase());
function nightLeft(p, now) {
  const r = nightCapOf(p);
  if (now - r.since > 3600000) Object.assign(r, { since: now, earned: 0 });
  return NIGHT_CAP - r.earned;
}
let clientSeq = 0;
function endShift(p, msg) {
  const s = p.shift;
  if (!s) return;
  if (s.earned) log(p, 'Nuit sur le trottoir', s.earned);
  p.shift = null; p.scene = false;
  io.to(p.id).emit('night', { end: msg || '' });
}
function sendShift(p, extra = {}) {
  const s = p.shift, now = Date.now(), c = s.talk;
  io.to(p.id).emit('night', {
    mode: s.mode, earned: s.earned, rep: p.night.rep, pimp: p.night.pimp, pimpOpen: p.night.total >= PIMP_AT, warn: s.warn, left: Math.max(0, nightLeft(p, now)),
    clients: s.clients.map(c => ({ id: c.id, arch: c.arch, name: c.name, regular: c.regular, x: Math.round(c.x), y: c.y, dir: c.dir, state: c.state, interest: Math.round(c.interest * 100) / 100 })),
    talk: c && { id: c.id, who: ARCHS[c.arch][0], name: c.name, regular: c.regular, mood: Math.round(c.mood), patience: c.patience, counter: c.counter, range: [ARCHS[c.arch][2], ARCHS[c.arch][3]], reply: s.reply },
    deal: s.deal, busted: s.mode === 'busted' ? s.until - now : 0, scene: s.mode === 'scene' ? s.until - now : 0, ...extra,
  });
}
function flee(s, c) { if (c) { c.state = 'leave'; c.dir = c.x < ST.w * T / 2 ? -1 : 1; } if (s.talk === c) s.talk = null; if (s.follower === c) { s.follower = null; s.deal = 0; } }
function caught(p) {
  const s = p.shift, fine = Math.min(p.chips, FINE + Math.round(s.earned * 0.1));
  p.chips -= fine; log(p, 'Amende de police', -fine);
  p.night.rep = Math.max(0, p.night.rep - 5);
  flee(s, s.talk); flee(s, s.follower);
  s.mode = 'free';
  sendShift(p, { result: { fine } });
}
function finishScene(p) {
  const s = p.shift, c = s.follower, score = s.notes ? Math.min(1, s.score / (2 * s.notes)) : 0;
  const r = sceneResult(s.deal, score, p.night.pimp, Math.random), now = Date.now();
  const paid = Math.min(r.pay, Math.max(0, nightLeft(p, now)));
  p.chips += paid; s.earned += paid; nightCapOf(p).earned += paid; p.night.total += paid;
  gainXp(p, paid * XP.night);
  let robbed = 0;
  if (r.robbed) { robbed = Math.min(p.chips, Math.round(s.earned * 0.3)); p.chips -= robbed; s.earned -= robbed; }
  p.night.rep = Math.max(0, Math.min(100, p.night.rep + r.rep));
  let visits = 0;
  if (r.regular && c) {
    const old = p.night.regulars.find(g => g.name === c.name && g.arch === c.arch);
    if (old) visits = ++old.visits; else { p.night.regulars.unshift({ name: c.name, arch: c.arch, visits: (visits = 1) }); p.night.regulars.length = Math.min(12, p.night.regulars.length); }
    award(p, 'habitue');
  }
  award(p, 'nuit');
  if (p.night.rep >= 60) award(p, 'star');
  s.clients = s.clients.filter(x => x !== c);
  Object.assign(s, { mode: 'free', follower: null, deal: 0 });
  p.scene = false;
  Object.assign(p, { x: MOTEL_DOOR.x, y: MOTEL_DOOR.y + 8, dir: 0 });
  io.to(p.id).emit('pos', { x: p.x, y: p.y, seat: null });
  sendShift(p, { result: { ...r, paid, robbed, score: Math.round(score * 100), name: c?.name, visits, capped: paid < r.pay } });
}
function nightStep(p, dt, now) {
  const s = p.shift, light = inLight(p.x, p.y), ch = charm(p.outfit);
  if (s.mode === 'scene') return now >= s.until ? finishScene(p) : sendShift(p);
  if (s.mode === 'free' && now >= s.next && s.clients.filter(c => c.state !== 'leave').length < 2) {
    s.clients.push(spawnClient(p.night, Math.random, ch, ++clientSeq));
    s.next = now + 8000 + Math.random() * 7000;
  }
  for (const c of s.clients) {
    if (c.state === 'walk' || c.state === 'leave') {
      c.x += c.dir * c.speed * (c.state === 'leave' ? 1.6 : 1) * dt;
      if (c.state === 'walk' && s.mode === 'free' && Math.hypot(c.x - p.x, c.y - p.y) < 60) {
        c.interest = Math.min(1, c.interest + interestRate(ch, p.night.rep, light) * dt);
        if (c.interest >= 1) Object.assign(c, { state: 'wait', until: now + 12000, dir: p.x > c.x ? 1 : -1 });
      }
    } else if (c.state === 'wait' && now > c.until) c.state = 'leave';
    else if (c.state === 'follow') { // walks behind you to the motel
      const d = Math.hypot(p.x - c.x, p.y - c.y);
      if (d > 18) { const k = Math.min(1, 75 * dt / d); c.x += (p.x - c.x) * k; c.y += (p.y - c.y) * k; c.dir = p.x > c.x ? 1 : -1; }
    }
  }
  s.clients = s.clients.filter(c => c.x > 0 && c.x < ST.w * T);
  if (s.mode === 'busted') {
    if (!copSees(cop, p, light)) { s.mode = s.follower ? 'walk' : 'free'; award(p, 'insaisissable'); return sendShift(p, { escaped: true }); }
    if (now > s.until) return caught(p);
  } else if ((s.mode === 'talk' || s.mode === 'walk') && copSees(cop, p, light)) {
    if (s.mode === 'talk') flee(s, s.talk); // the client runs, you have 3 s to get out of sight
    Object.assign(s, { mode: 'busted', until: now + 3000 });
    Object.assign(cop, { pause: 3.5, dir: p.x > cop.x ? 1 : -1 }); // he stares at you longer than your 3 s to run
  }
  s.warn = p.night.pimp === 'yes' && Math.abs(cop.x - p.x) < 140 && (p.x - cop.x) * cop.dir > 0;
  sendShift(p);
}
setInterval(() => {
  const now = Date.now();
  copStep(cop, 0.1, Math.random);
  for (const p of players.values()) if (p.zone === 'street') {
    io.to(p.id).emit('cop', { x: Math.round(cop.x), y: cop.y, dir: cop.dir });
    if (p.shift) nightStep(p, 0.1, now);
  }
}, 100);

function endJob(p, msg) {
  if (!p.job) return;
  if (p.job.earned) log(p, 'Service de ' + JOBS[p.job.kind].name.toLowerCase(), p.job.earned);
  p.job = null;
  io.to(p.id).emit('job', msg ? { end: msg } : null);
}

// Trash cans: empty until this time after someone searched them.
const binEmptyUntil = [0, 0, 0, 0, 0];
const binsLeft = () => binEmptyUntil.map(t => Math.max(0, t - Date.now()));

const pub = p => ({ id: p.id, name: p.name, color: p.color, x: p.x, y: p.y, dir: p.dir, moving: p.moving, chips: p.chips, seat: p.seat, outfit: p.outfit, drunk: Math.round(p.drunk * 100) / 100,
  zone: p.zone, aptName: p.aptName || null, vip: p.vip || 0, lvl: p.level || 1, shark: !!p.loan && Date.now() > p.loan.due, phone: !!p.phone, homeless: !!p.homeless, busking: !!p.busking, scene: !!p.scene, hype: Math.round((p.hype || 0) * 100) / 100 });

// Bank: last operations and a balance sample every minute, shown in the phone.
function log(p, text, amount) {
  p.history.unshift({ text, amount, at: Date.now() });
  p.history.length = Math.min(p.history.length, 20);
  sendBank(p);
}
function sendBank(p) { io.to(p.id).emit('bank', { history: p.history, curve: p.curve, stocks: p.stocks }); }
// Levels 1-1000 (public/levels.js): XP from everything you do, chips each level, a chest every 10, exclusive cosmetics.
// pvp: poker, duels and player tips are capped per hour so friends can't farm XP off each other.
stakes.on = (p, amt, pvp) => gainXp(p, stakeXp(amt), pvp);
const meMsg = p => ({ owned: p.owned, outfit: p.outfit, presets: p.presets, color: p.color, vip: p.vip });
const today = () => new Date().toDateString();
const xpMsg = p => ({ ...levelOf(p.xp), bonus: p.xpDay.day === today() ? DAY_BONUS - p.xpDay.got : DAY_BONUS });
function gainXp(p, n, pvp = false) {
  n = Math.floor(n);
  if (pvp) {
    if (Date.now() - p.pvpXp.since > 3600000) p.pvpXp = { since: Date.now(), got: 0 };
    n = Math.min(n, PVP_CAP - p.pvpXp.got);
    if (n > 0) p.pvpXp.got += n;
  }
  if (!(n > 0)) return;
  if (p.xpDay.day !== today()) p.xpDay = { day: today(), got: 0 };
  const bonus = Math.min(n, DAY_BONUS - p.xpDay.got); // the first XP of the day count double
  p.xpDay.got += bonus;
  const from = p.level;
  p.xp += n + bonus;
  p.level = levelOf(p.xp).level;
  for (let l = from + 1; l <= p.level; l++) {
    const r = rewardsOf(l);
    p.chips += r.chips;
    log(p, (r.chest ? 'Coffre du niveau ' : 'Niveau ') + l, r.chips);
    if (r.item && !p.owned.includes(r.item)) { p.owned.push(r.item); io.to(p.id).emit('me', meMsg(p)); }
    io.to(p.id).emit('levelup', { level: l, ...r });
    if (r.rank) io.emit('say', `👑 ${p.name} atteint le rang ${r.rank} (niveau ${l}) !`);
    else if (JACKPOTS[l] || (r.item && l >= 100)) io.emit('say', `⭐ ${p.name} passe niveau ${l} et gagne ${r.item ? ITEMS[r.item].name : r.chips.toLocaleString('fr-FR') + ' jetons'} !`);
    if (l >= 10) award(p, 'niveau10');
    if (l >= 100) award(p, 'niveau100');
    if (l === MAX) award(p, 'legende');
  }
  io.to(p.id).emit('xp', xpMsg(p));
}

// Achievements: unlocked once, announced to everyone.
function award(p, id) {
  if (p.achievements.includes(id)) return;
  p.achievements.push(id);
  io.to(p.id).emit('achievements', { list: p.achievements, id });
  io.emit('say', `🏆 ${p.name} débloque le succès « ${ACHIEVEMENTS[id][0]} » !`);
  gainXp(p, XP.achievement);
}
jackpot.onWin = (p, amt) => {
  log(p, 'JACKPOT !', amt);
  io.emit('say', `🎰💰 JACKPOT ! ${p.name} rafle ${amt.toLocaleString('fr-FR')} jetons aux machines à sous !`);
  io.emit('jackpot', { pot: jackpot.pot, by: p.name });
  award(p, 'jackpot');
};
// Loan shark: what the player owes now, sent to their HUD.
const sendLoan = p => io.to(p.id).emit('loan', p.loan && { owe: loanDue(p.loan, Date.now()), left: p.loan.due - Date.now() });

// Apartments: the owner's p.apt when online, otherwise read from the database once (visitors can't edit it).
const offlineApts = new Map();
function getApt(ownerId) {
  const o = [...players.values()].find(x => x.dbId === ownerId);
  if (o) return { name: o.name, apt: o.apt, owner: o };
  if (!offlineApts.has(ownerId)) {
    const acc = db.getPlayerById(ownerId);
    if (!acc) return null;
    offlineApts.set(ownerId, { name: acc.name, apt: cleanApt(acc.apt) });
  }
  return offlineApts.get(ownerId);
}
const inApt = ownerId => [...players.values()].filter(x => x.zone === 'apt:' + ownerId);
function sendApt(ownerId) {
  const r = getApt(ownerId);
  if (!r) return;
  for (const v of inApt(ownerId)) io.to(v.id).emit('apt', { owner: ownerId, name: r.name, mine: v.dbId === ownerId, ...r.apt });
  if (r.owner) io.to(r.owner.id).emit('myapt', r.apt); // the showroom shows your own stock and styles
}
const ownedKinds = apt => new Set([...apt.items.map(i => i.id), ...Object.keys(apt.stock).filter(id => apt.stock[id] > 0)]).size;
const LOBBY_BY_ELEVATOR = { x: LOBBY_ELEV.x, y: 4 * T + 2 };

const ring = p => io.emit('ring', { id: p.id, tone: ITEMS[p.outfit.ringtone]?.style || 'basic' });

// Stock exchange: cryptos move every 5 s, stocks every 20 s; prices survive restarts (data/market.json).
const market = { prices: {}, open: {}, hist: {} };
const savedMarket = db.loadMarket();
for (const s of STOCKS) {
  const v = savedMarket[s.id]?.price, price = Number.isFinite(v) && v > 0 ? v : s.base;
  market.prices[s.id] = price;
  market.open[s.id] = price;
  market.hist[s.id] = (savedMarket[s.id]?.hist || []).filter(x => Number.isFinite(x) && x > 0).slice(-119).concat(price);
}
let marketTick = 0;
setInterval(() => {
  marketTick++;
  for (const s of STOCKS) {
    if (marketTick % s.every) continue;
    const [price, event] = step(market.prices[s.id], s);
    const old = market.prices[s.id];
    market.prices[s.id] = price;
    market.hist[s.id].push(price);
    if (market.hist[s.id].length > 120) market.hist[s.id].shift();
    if (event) {
      io.emit('say', event === 'krach' ? `📉 KRACH ! ${s.name} s'effondre (${fmtPrice(old)} -> ${fmtPrice(price)})` : `📈 ENVOLEE ! ${s.name} explose (${fmtPrice(old)} -> ${fmtPrice(price)})`);
      for (const p of players.values()) if (p.stocks[s.id]) ring(p);
    }
  }
  io.emit('market', market);
}, 5000);

const has = (p, id) => ITEMS[id] && (ITEMS[id].price === 0 || p.owned.includes(id));
// Keeps only items the player is allowed to wear, in the right slot.
function cleanOutfit(p, o) {
  const out = defaultOutfit(p.name);
  for (const slot of SLOTS) if (o?.[slot] === null && REMOVABLE.includes(slot)) out[slot] = null; else if (has(p, o?.[slot]) && ITEMS[o[slot]].slot === slot) out[slot] = o[slot];
  if (Number.isInteger(o?.skin) && SKINS[o.skin]) out.skin = o.skin;
  if (Number.isInteger(o?.hairColor) && HAIR_COLORS[o.hairColor]) out.hairColor = o.hairColor;
  return out;
}

// Login attempts: 5 failures for a pseudo or a connection lock it for a minute.
const fails = new Map();
const blocked = key => (fails.get(key)?.until || 0) > Date.now();
function fail(key) {
  const f = fails.get(key) || { n: 0, until: 0 };
  if (++f.n >= 5) { f.until = Date.now() + 60000; f.n = 0; }
  fails.set(key, f);
}
const cleanName = n => String(n || '').replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, 12);
const validPass = s => typeof s === 'string' && s.length >= 4 && s.length <= 64;

io.on('connection', socket => {
  let p = null;

  // ---------- accounts ----------
  const authError = (msg, expired = false) => socket.emit('auth:error', { msg, expired });
  socket.on('register', m => {
    if (p || !m) return;
    const name = cleanName(m.name), pass = m.pass;
    if (blocked(socket.id)) return authError('Trop d\'essais, reessaie dans une minute.');
    if (name.length < 2) return authError('Pseudo : 2 a 12 lettres ou chiffres.');
    if (!validPass(pass)) return authError('Mot de passe : 4 a 64 caracteres.');
    if (db.getPlayer(name)) { fail(socket.id); return authError('Ce pseudo est deja pris. Si c\'est le tien, utilise Connexion.'); }
    const color = COLORS.includes(m.color) ? m.color : COLORS[0];
    const acc = db.createPlayer(name, pass, color);
    enter(acc, m.remember ? db.createSession(acc.id) : null);
  });
  socket.on('login', m => {
    if (p || !m) return;
    const name = cleanName(m.name), pass = m.pass, key = 'name:' + name.toLowerCase();
    if (blocked(key) || blocked(socket.id)) return authError('Trop d\'essais, reessaie dans une minute.');
    if (!validPass(pass)) return authError('Mot de passe : 4 a 64 caracteres.');
    const acc = db.getPlayer(name);
    if (!acc) { fail(socket.id); return authError('Compte introuvable. Cree-le dans « Creer un compte ».'); }
    if (!acc.passHash) { // account imported from the old saves: the first login sets its password
      db.setPassword(acc.id, pass);
      socket.emit('say', 'Compte existant retrouve : ton mot de passe est enregistre.');
    } else if (!checkPassword(pass, acc.passHash, acc.salt)) { fail(key); fail(socket.id); return authError('Mot de passe incorrect.'); }
    enter(acc, m.remember ? db.createSession(acc.id) : null);
  });
  socket.on('resume', token => {
    if (p) return;
    const acc = db.playerBySession(token);
    if (!acc) return authError('Session expiree, reconnecte-toi.', true);
    enter(acc, null);
  });
  socket.on('logout', token => db.deleteSession(token));

  function enter(sv, token) {
    if ([...players.values()].some(o => o.name.toLowerCase() === sv.name.toLowerCase())) return authError('Ce compte est deja connecte.');
    const name = sv.name, color = COLORS.includes(sv.color) ? sv.color : COLORS[0];
    p = { id: socket.id, dbId: sv.id, name, color, x: SPAWN.x + (Math.random() * 40 - 20) | 0, y: SPAWN.y, dir: 3, moving: false, chips: sv.chips ?? 1000, seat: null, drunk: 0, zone: 'casino', vip: [1, 2, 3].includes(sv.vip) ? sv.vip : 0 };
    if (p.chips < BROKE) Object.assign(p, { zone: 'street', homeless: true, x: ST_SPAWN.x, y: ST_SPAWN.y, dir: 0 });
    p.owned = Array.isArray(sv.owned) ? sv.owned.filter(id => ITEMS[id]) : [];
    p.xp = Number.isInteger(sv.xp) && sv.xp > 0 ? sv.xp : 0;
    p.level = levelOf(p.xp).level;
    p.xpDay = typeof sv.xpDay?.day === 'string' && Number.isInteger(sv.xpDay.got) ? { day: sv.xpDay.day, got: Math.max(0, Math.min(DAY_BONUS, sv.xpDay.got)) } : { day: '', got: 0 };
    p.pvpXp = { since: 0, got: 0 };
    for (const [l, id] of Object.entries(TRACK)) if (+l <= p.level && !p.owned.includes(id)) p.owned.push(id); // level pass items already earned
    p.outfit = cleanOutfit(p, sv.outfit);
    p.presets = [0, 1, 2].map(k => (sv.presets?.[k] ? cleanOutfit(p, sv.presets[k]) : null));
    p.stocks = {};
    for (const s of STOCKS) { const h = sv.stocks?.[s.id]; if (Number.isInteger(h?.n) && h.n > 0) p.stocks[s.id] = { n: h.n, cost: Math.max(0, h.cost | 0) }; }
    p.history = Array.isArray(sv.history) ? sv.history.slice(0, 20) : [];
    p.curve = [p.chips];
    p.apt = cleanApt(sv.apt);
    offlineApts.delete(sv.id);
    p.achievements = Array.isArray(sv.achievements) ? sv.achievements.filter(id => ACHIEVEMENTS[id]) : [];
    p.night = cleanNight(sv.night);
    p.loan = Number.isInteger(sv.loan?.owe) && Number.isFinite(sv.loan?.due) ? { owe: sv.loan.owe, due: sv.loan.due } : null;
    // Daily reward (common/rare cosmetics the player doesn't own can come out of the day-7 chest).
    const chest = Object.values(ITEMS).filter(it => it.price > 0 && it.rarity <= 1 && !p.owned.includes(it.id)).map(it => it.id);
    const daily = claimDaily(sv.daily, Date.now(), chest);
    p.daily = daily ? daily.daily : sv.daily;
    players.set(p.id, p);
    socket.emit('auth:ok', { token });
    socket.emit('welcome', { id: p.id, x: p.x, y: p.y, zone: p.zone });
    socket.emit('bins', binsLeft());
    socket.emit('market', market);
    sendBank(p);
    socket.emit('race', games.race.view(null));
    socket.emit('top', top());
    sendMe();
    socket.emit('msg:list', db.contacts(p.dbId));
    socket.emit('achievements', { list: p.achievements });
    socket.emit('myapt', p.apt);
    socket.emit('jackpot', { pot: jackpot.pot });
    socket.emit('xp', xpMsg(p));
    sendLoan(p);
    if (daily) {
      const r = daily.reward;
      p.chips += r.chips;
      if (r.item) { p.owned.push(r.item); sendMe(); }
      log(p, `Bonus du jour ${r.day}/7`, r.chips);
      gainXp(p, XP.daily * r.day);
      socket.emit('daily', { ...r, streak: daily.daily.streak });
      if (r.day === 7) award(p, 'serie7');
    }
  }

  const sendMe = () => socket.emit('me', meMsg(p));

  socket.on('vip', tier => {
    if (!p || p.zone !== 'casino' || p.seat || !nearReception(p) || ![1, 2, 3].includes(tier) || tier <= p.vip) return;
    const cost = upgradeCost(p.vip, tier);
    if (p.chips < cost) return;
    p.chips -= cost;
    p.vip = tier;
    sendMe();
    socket.emit('vipCard', tier);
    log(p, TIERS[tier].name, -cost);
    io.emit('say', `💳 ${p.name} devient membre ${TIERS[tier].name} !`);
    if (tier === 3) award(p, 'diamant');
  });

  socket.on('shop', m => {
    if (!p || !m || typeof m !== 'object') return;
    const it = ITEMS[m.id];
    if (m.a === 'buy') {
      if (!it || it.price <= 0 || p.owned.includes(it.id) || p.chips < it.price || p.seat || p.zone !== 'casino' || !nearShop(p)) return;
      p.chips -= it.price;
      p.owned.push(it.id);
      p.outfit[it.slot] = it.id;
      socket.emit('bought', it.id);
      log(p, 'Boutique : ' + it.name, -it.price);
      if (it.rarity >= 2) io.emit('say', `✨ ${p.name} s'offre ${it.name} (${RARITY[it.rarity].name.toLowerCase()}) !`);
      if (p.owned.length >= 20) award(p, 'fashion');
    } else if (m.a === 'equip') {
      if (!has(p, m.id)) return;
      p.outfit[it.slot] = it.id;
    } else if (m.a === 'remove') {
      if (!REMOVABLE.includes(m.slot)) return;
      p.outfit[m.slot] = null;
    } else if (m.a === 'style') {
      if (Number.isInteger(m.skin) && SKINS[m.skin]) p.outfit.skin = m.skin;
      if (Number.isInteger(m.hairColor) && HAIR_COLORS[m.hairColor]) p.outfit.hairColor = m.hairColor;
      if (COLORS.includes(m.color)) p.color = m.color;
    } else if (m.a === 'save' && [0, 1, 2].includes(m.k)) p.presets[m.k] = { ...p.outfit };
    else if (m.a === 'load' && p.presets[m.k]) p.outfit = cleanOutfit(p, p.presets[m.k]);
    else return;
    sendMe();
  });

  socket.on('move', m => {
    if (!p || p.seat || p.busking || (p.job && p.job.kind !== 'menage') || ['talk', 'scene'].includes(p.shift?.mode) || !m || !Number.isFinite(m.x) || !Number.isFinite(m.y)) return;
    const big = APT_SIZES.at(-1);
    const [w, h] = p.zone === 'street' ? [ST.w, ST.h] : p.zone === 'vip' ? [VW, VH] : p.zone === 'lobby' ? [LW, LH] : p.zone.startsWith('apt:') ? [big.w, big.h] : [MW, MH];
    p.x = Math.max(0, Math.min(w * T, m.x));
    p.y = Math.max(0, Math.min(h * T, m.y));
    p.dir = [0, 1, 2, 3].includes(m.dir) ? m.dir : 0;
    p.moving = !!m.moving;
  });

  socket.on('sit', m => {
    const t = TABLES.find(x => x.id === m?.t);
    if (!p || p.seat || !t || p.zone !== (t.zone || 'casino') || !Number.isInteger(m.i) || m.i < 0 || m.i >= t.seats) return;
    if ((t.tier || 0) > p.vip) return socket.emit('say', `Il faut la ${TIERS[t.tier].name} pour cette table.`);
    const s = seatPos(t, m.i);
    if (Math.hypot(s.x - p.x, s.y - p.y) > T * 2) return;
    if ([...players.values()].some(o => o.seat?.t === t.id && o.seat.i === m.i)) return;
    p.seat = { t: t.id, i: m.i };
    if (!games[t.id].sit(p, m.i)) { p.seat = null; return; }
    Object.assign(p, { x: s.x, y: s.y, dir: s.dir, moving: false });
    socket.emit('pos', { x: p.x, y: p.y, seat: p.seat });
    push(t.id);
    if (t.tier === 3) io.emit('say', `💎 ${p.name} s'installe au Salon Diamant.`);
  });

  socket.on('stand', () => p && stand(p));

  socket.on('act', m => {
    if (!p?.seat || !m || typeof m !== 'object') return;
    // Drunk players don't control their bets: the server picks 100%..300% of the asked amount.
    const key = m.a === 'bet' ? 'amt' : m.a === 'spin' ? 'bet' : m.a === 'raise' ? 'to' : null;
    const asked = m[key];
    if (key && p.drunk > 0 && Number.isInteger(asked) && asked > 0) m = { ...m, [key]: Math.min(drunkAmount(asked, p.drunk), Math.max(asked, p.chips)) };
    const before = p.chips;
    games[p.seat.t].act(p, m);
    if (key && m[key] !== asked && p.chips < before) socket.emit('say', `🍺 Hic ! Tu voulais miser ${asked}... tu as mis ${m[key]} !`);
  });

  socket.on('drink', id => {
    const d = DRINKS.find(x => x.id === id);
    const vipBar = p?.zone === 'vip' && nearVipBar(p);
    if (!p || !d || p.seat || !(vipBar || (p.zone === 'casino' && nearBar(p)))) return;
    const price = vipBar && d.id === 'champagne' ? 0 : d.price; // champagne is on the house upstairs
    if (p.chips < price) return;
    p.chips -= price;
    if (price) log(p, 'Bar : ' + d.name, -price);
    p.drunk = Math.max(0, Math.min(1, p.drunk + d.strength));
    if (p.drunk >= 1) award(p, 'ivre');
    socket.emit('drank', d.id);
  });

  socket.on('door', () => {
    if (!p || p.seat) return;
    if (p.zone === 'casino' && nearDoorIn(p)) return goZone(p, 'street');
    if (p.zone === 'casino' && nearElevatorIn(p)) {
      if (!p.vip) return socket.emit('bouncer', 'Carte VIP obligatoire. Passe a la reception !');
      return goZone(p, 'vip');
    }
    if (p.zone === 'vip' && nearElevatorOut(p)) return goZone(p, 'casino', { x: VIP_ELEVATOR.x, y: VIP_ELEVATOR.y + 22 });
    if (p.zone === 'street' && nearResDoor(p) && !p.busking) return goZone(p, 'lobby', LOBBY_SPAWN);
    if (p.zone === 'lobby' && nearLobbyExit(p)) return goZone(p, 'street', { x: RES_DOOR.x, y: RES_DOOR.y + 8 });
    if (p.zone !== 'street' || !nearDoorOut(p)) return;
    if (p.loan && Date.now() > p.loan.due) return socket.emit('shark', `Tu vas ou ? Tu me dois ${loanDue(p.loan, Date.now())} !`);
    if (p.homeless && p.chips < ENTRY_MIN) return socket.emit('bouncer', `Pas de jetons, pas d'entree ! Reviens avec ${ENTRY_MIN}.`);
    if (p.homeless) { p.homeless = false; io.emit('say', `🎉 ${p.name} a remonté la pente et revient au casino !`); award(p, 'remontee'); }
    goZone(p, 'casino');
  });

  // Busking: the client plays a rhythm game and reports each note; good playing raises the hype.
  let noteTimes = [];
  socket.on('busk', m => {
    if (!p || p.zone !== 'street' || !m) return;
    if (m.a === 'start') {
      if (p.busking || p.shift || !nearBusk(p) || [...players.values()].some(o => o.busking)) return socket.emit('busk', false);
      Object.assign(p, { busking: true, hype: 0, x: BUSK.x, y: BUSK.y, dir: 0, moving: false });
      socket.emit('pos', { x: p.x, y: p.y, seat: null });
      socket.emit('busk', true);
    } else if (m.a === 'stop') { p.busking = false; socket.emit('busk', false); }
    else if (m.a === 'note' && p.busking && [0, 1, 2].includes(m.q)) {
      const now = Date.now();
      noteTimes = noteTimes.filter(t => now - t < 1000);
      if (noteTimes.length >= 8) return; // nobody plays faster than this
      noteTimes.push(now);
      p.hype = Math.max(0, Math.min(1, p.hype + [-0.08, 0.025, 0.05][m.q]));
    }
  });

  socket.on('job', m => {
    if (!p || !m) return;
    if (m.a === 'start') {
      const here = p.zone === 'casino' && nearJobBoard(p) ? Object.keys(JOBS) : p.zone === 'street' && nearStreetBouncer(p) ? STREET_JOBS : [];
      if (p.job || p.shift || p.seat || p.busking || !here.includes(m.kind)) return;
      if (capLeft(capOf(p), Date.now()) <= 0) return socket.emit('job', { end: `Plafond atteint : reviens dans ${Math.ceil((capOf(p).since + 3600000 - Date.now()) / 60000)} min.` });
      p.job = { kind: m.kind, zone: p.zone, earned: 0 };
      p.moving = false;
      nextTask(p, 1200);
    } else if (m.a === 'stop') endJob(p);
    else if (m.a === 'answer' && p.job) {
      const j = p.job, now = Date.now(), rec = capOf(p);
      if (now < j.from) return; // the next task is not shown yet
      const ok = now <= j.until && p.zone === j.zone && check(j.kind, j.task, m.v, p);
      const paid = ok ? Math.min(JOBS[j.kind].pay, capLeft(rec, now)) : 0;
      p.chips += paid; rec.earned += paid; j.earned += paid;
      gainXp(p, paid * XP.job);
      if (capLeft(rec, now) <= 0) { award(p, 'bosseur'); return endJob(p, `+${paid} — plafond atteint (${rec.earned} jetons cette heure) : bravo, reviens plus tard !`); }
      nextTask(p, ok ? 400 : 2000, { ok, paid });
    }
  });

  socket.on('night', m => {
    if (!p || !m || p.zone !== 'street') return;
    const s = p.shift, now = Date.now();
    if (m.a === 'start') {
      if (s || p.job || p.seat || p.busking || !nearCorner(p)) return;
      // shortcut: night is only checked by the browser (the server clock may not be the player's), check it here if people cheat
      if (nightLeft(p, now) <= 0) return socket.emit('night', { end: `Plafond de la nuit atteint : reviens dans ${Math.ceil((nightCapOf(p).since + 3600000 - now) / 60000)} min.` });
      p.shift = { mode: 'free', clients: [], earned: 0, next: now + 1500, talk: null, follower: null, deal: 0, reply: '' };
      return sendShift(p);
    }
    if (!s) return;
    if (m.a === 'stop') return endShift(p);
    if (m.a === 'talk' && s.mode === 'free') {
      const c = s.clients.find(c => c.id === m.id && c.state === 'wait' && Math.hypot(c.x - p.x, c.y - p.y) < 30);
      if (!c) return;
      c.state = 'talk'; c.dir = p.x > c.x ? 1 : -1;
      Object.assign(s, { mode: 'talk', talk: c, reply: c.regular ? 'TOI ! JE PENSAIS A TOI...' : ARCHS[c.arch][1] });
      p.moving = false;
    } else if (m.a === 'act' && s.mode === 'talk' && [1, 2, 3, 4].includes(m.k)) {
      const c = s.talk, r = negotiate(c, m.k, +m.v, charm(p.outfit), Math.random);
      s.reply = r.reply;
      if (r.gone) { flee(s, c); s.mode = 'free'; }
      else if (r.deal) { c.state = 'follow'; Object.assign(s, { mode: 'walk', talk: null, follower: c, deal: r.deal }); }
    } else if (m.a === 'enter' && (s.mode === 'walk' || s.mode === 'busted') && s.follower && nearMotel(p) && Math.hypot(s.follower.x - p.x, s.follower.y - p.y) < 48) {
      Object.assign(s, { mode: 'scene', until: now + SCENE_MS + 1500, notes: 0, score: 0 });
      s.follower.state = 'scene';
      Object.assign(p, { scene: true, moving: false, x: MOTEL_DOOR.x, y: MOTEL_DOOR.y + 4 });
    } else if (m.a === 'note' && s.mode === 'scene' && [0, 1, 2].includes(m.q) && s.notes < 120) { s.notes++; s.score += m.q; return; }
    else if (m.a === 'pimp' && nearPimp(p) && p.night.total >= PIMP_AT) p.night.pimp = m.yes ? 'yes' : 'no';
    else return;
    sendShift(p);
  });

  socket.on('tip', to => {
    const b = players.get(to);
    if (!p || !b || b === p || !b.busking || p.zone !== 'street' || p.chips < 10 || Math.hypot(b.x - p.x, b.y - p.y) > 40) return;
    p.chips -= 10; b.chips += 10;
    gainXp(b, 10 * XP.tip, true);
    log(p, 'Pourboire a ' + b.name, -10); log(b, 'Pourboire de ' + p.name, 10);
    io.emit('tip', { to: b.id, amt: 10, from: p.id, by: p.name });
    award(b, 'musicien');
  });

  // Loan shark: lends to broke players, takes the money back (with interest) when they talk to him again.
  socket.on('shark', () => {
    if (!p || p.zone !== 'street' || p.busking || !nearShark(p)) return;
    const say = t => socket.emit('shark', t);
    if (!p.loan) {
      if (p.chips >= ENTRY_MIN) return say('Reviens quand t\'auras plus un rond.');
      p.chips += LOAN.amount;
      p.loan = { owe: LOAN.owe, due: Date.now() + LOAN.term };
      log(p, 'Pret du Requin', LOAN.amount);
      sendLoan(p);
      return say(`Voila ${LOAN.amount}. Tu me rends ${LOAN.owe} dans 10 minutes. Sinon...`);
    }
    const owe = loanDue(p.loan, Date.now());
    if (p.chips < owe) return say(`Tu me dois ${owe}. Reviens avec l'argent.`);
    repay(p, owe);
    award(p, 'usurier');
    say('Un plaisir de faire affaire.');
  });

  socket.on('search', i => {
    if (!p || p.zone !== 'street' || p.busking || p.searching || nearBin(p) !== i || Date.now() < binEmptyUntil[i]) return;
    p.searching = true;
    binEmptyUntil[i] = Date.now() + 2500;
    io.emit('binshake', { i, id: p.id });
    setTimeout(() => {
      p.searching = false;
      binEmptyUntil[i] = Date.now() + 45000;
      const loot = rollLoot(p.owned);
      p.chips += loot.chips;
      gainXp(p, XP.bin);
      if (loot.chips) log(p, 'Trouve dans une poubelle', loot.chips);
      if (loot.item) { p.owned.push(loot.item); sendMe(); award(p, 'trouvaille'); io.emit('say', `🗑️ ${p.name} a trouvé ${ITEMS[loot.item].name} dans une poubelle !`); }
      socket.emit('loot', loot);
      io.emit('bins', binsLeft());
    }, 2000);
  });

  socket.on('chat', txt => {
    if (!p || typeof txt !== 'string') return;
    const text = txt.trim().slice(0, 80);
    if (text) io.emit('chat', { id: p.id, name: p.name, color: p.color, text });
  });

  socket.on('bank:send', m => {
    const b = players.get(m?.to), amt = m?.amount;
    if (!p || !b || b === p || !Number.isInteger(amt) || amt <= 0 || amt > p.chips) return;
    p.chips -= amt; b.chips += amt;
    log(p, 'Virement a ' + b.name, -amt);
    log(b, 'Virement de ' + p.name, amt);
    io.to(b.id).emit('bankMsg', `${p.name} t'a envoye ${amt.toLocaleString('fr-FR')} jetons !`);
    if (amt >= 1000) award(p, 'genereux');
    ring(b);
  });

  // Rock-paper-scissors duel: ask a player next to you, they accept, both stakes are held until someone wins.
  socket.on('rps', m => {
    if (!p || !m) return;
    const o = players.get(m.to);
    if (m.a === 'ask') {
      const amt = m.amount;
      if (!o || o === p || !duelFree(p) || !duelFree(o) || !duelClose(p, o) || !Number.isInteger(amt) || amt <= 0 || amt > p.chips || amt > o.chips) return socket.emit('say', 'Duel impossible (trop loin, occupe ou pas assez de jetons).');
      o.rpsInvite = { from: p.id, amount: amt, until: Date.now() + 20000 };
      io.to(o.id).emit('rps', { invite: { from: p.id, name: p.name, amount: amt } });
      return socket.emit('say', `Defi envoye a ${o.name} pour ${amt} jetons.`);
    }
    if (m.a === 'accept') {
      const inv = p.rpsInvite;
      if (!o || !inv || inv.from !== o.id || Date.now() > inv.until) return;
      p.rpsInvite = null;
      if (!duelFree(p) || !duelFree(o) || !duelClose(p, o) || inv.amount > p.chips || inv.amount > o.chips) return socket.emit('say', 'Duel impossible (trop loin, occupe ou pas assez de jetons).');
      const until = Date.now() + DUEL_MS;
      for (const [a, b] of [[p, o], [o, p]]) {
        a.chips -= inv.amount;
        a.rps = { with: b.id, amount: inv.amount, pick: null, until };
        io.to(a.id).emit('rps', { start: { name: b.name, amount: inv.amount } });
      }
      return;
    }
    if (m.a === 'pick') {
      const d = p.rps, b = d && players.get(d.with);
      if (!b || d.pick !== null || ![0, 1, 2].includes(m.k)) return;
      d.pick = m.k;
      if (b.rps.pick !== null) resolveDuel(p, b);
    }
  });

  socket.on('stock', m => {
    const s = STOCKS.find(x => x.id === m?.id);
    if (!p || !s || p.homeless) return;
    const delta = trade(p, s.id, m.qty, market.prices[s.id]);
    if (delta === null) return;
    log(p, `Bourse : ${m.qty > 0 ? 'achat' : 'vente'} ${Math.abs(m.qty)} ${s.name}`, delta);
  });

  // ---------- apartments ----------
  const aptOwner = () => (p?.zone.startsWith('apt:') ? +p.zone.slice(4) : null);
  socket.on('apt:list', () => {
    if (!p || p.zone !== 'lobby' || !nearElevatorApt(p)) return;
    const list = [{ id: p.dbId, name: p.name, mine: true, online: true }];
    for (const o of players.values()) if (o !== p && o.apt.open) list.push({ id: o.dbId, name: o.name, online: true });
    for (const r of db.openApts(40)) if (!list.some(l => l.id === r.id)) list.push({ id: r.id, name: r.name, online: false });
    socket.emit('apt:list', list.slice(0, 30));
  });
  socket.on('apt:enter', id => {
    const r = p && Number.isInteger(id) && getApt(id);
    if (!r || p.zone !== 'lobby' || !nearElevatorApt(p)) return;
    if (!r.apt.open && id !== p.dbId) return socket.emit('say', `🔒 L'appart de ${r.name} est ferme.`);
    goZone(p, 'apt:' + id, aptDoor(r.apt));
    p.aptName = r.name;
    sendApt(id);
  });
  socket.on('apt:leave', () => {
    if (aptOwner() === null) return;
    goZone(p, 'lobby', LOBBY_BY_ELEVATOR);
  });
  socket.on('concierge', () => {
    if (!p || p.zone !== 'lobby' || !nearConcierge(p)) return;
    const home = [...players.values()].filter(o => o.zone.startsWith('apt:'));
    const open = [...players.values()].filter(o => o.apt.open).length;
    socket.emit('concierge', home.length ? `Bonjour ! En ce moment : ${home.slice(0, 3).map(o => `${o.name} chez ${o.aptName}`).join(', ')}.` : open > 1 ? `Bonjour ! ${open} appartements sont ouverts aux visites, prenez l'ascenseur.` : 'Bonjour ! L\'ascenseur est au fond, le showroom de meubles a droite.');
  });
  // Showroom: furniture goes to the stock, walls and floors to the owned styles.
  socket.on('furn:buy', id => {
    if (!p || p.zone !== 'lobby' || !nearFurnShop(p) || p.homeless || typeof id !== 'string') return;
    const d = FURNITURE[id], st = WALLS[id] || FLOORS[id];
    if (d) {
      if (p.chips < d.price) return;
      p.chips -= d.price;
      p.apt.stock[id] = Math.min(99, (p.apt.stock[id] || 0) + 1);
      log(p, 'Meuble : ' + d.name, -d.price);
      if (ownedKinds(p.apt) >= 30) award(p, 'collection');
    } else if (st && st.price > 0 && !p.apt.styles.includes(id)) {
      if (p.chips < st.price) return;
      p.chips -= st.price;
      p.apt.styles.push(id);
      log(p, 'Deco : ' + st.name, -st.price);
    } else return;
    socket.emit('furn:bought', id);
    sendApt(p.dbId);
  });
  socket.on('apt:use', i => {
    const id = aptOwner(), r = id !== null && getApt(id), it = r && r.apt.items[i];
    const d = it && FURNITURE[it.id];
    if (!d?.use || Math.hypot((it.x + d.w / 2) * T - p.x, (it.y + d.h) * T - p.y) > 2 * T + d.w * 8) return;
    if (d.use === 'sleep') { p.drunk = 0; socket.emit('slept'); }
    else if (d.use === 'fridge') { p.drunk = Math.max(0, p.drunk - 0.3); socket.emit('say', '🥤 Un soda bien frais.'); }
    else if (d.use === 'tv') { it.on = !it.on; sendApt(id); }
    else if (d.use === 'music') { r.apt.music = 1 - r.apt.music; sendApt(id); }
  });
  // Decorating: only the owner, in their own apartment. Homeless players can rearrange but not buy.
  socket.on('apt:edit', m => {
    if (!p || !m || typeof m !== 'object' || aptOwner() !== p.dbId) return;
    const apt = p.apt, pay = (price, what) => {
      if (price > 0 && (p.homeless || p.chips < price)) return false;
      if (price > 0) { p.chips -= price; log(p, what, -price); }
      return true;
    };
    const d = FURNITURE[m.id];
    if (m.a === 'place') {
      if (!d || apt.items.length >= MAX_ITEMS || !fits(apt, m.id, m.x, m.y)) return;
      if (apt.stock[m.id] > 0) apt.stock[m.id]--;
      else if (!pay(d.price, 'Meuble : ' + d.name)) return;
      apt.items.push({ id: m.id, x: m.x, y: m.y, f: !!m.f && !d.noflip, on: false });
      if (apt.items.length >= 15) award(p, 'deco');
      if (ownedKinds(apt) >= 30) award(p, 'collection');
    } else if (m.a === 'move') {
      const it = apt.items[m.i];
      if (!it || !fits(apt, it.id, m.x, m.y, m.i)) return;
      Object.assign(it, { x: m.x, y: m.y, f: !!m.f && !FURNITURE[it.id].noflip });
    } else if (m.a === 'take') {
      const [it] = Number.isInteger(m.i) ? apt.items.splice(m.i, 1) : [];
      if (!it) return;
      apt.stock[it.id] = Math.min(99, (apt.stock[it.id] || 0) + 1);
    } else if (m.a === 'style') {
      const st = WALLS[m.id] || FLOORS[m.id];
      if (!st) return;
      if (st.price > 0 && !apt.styles.includes(m.id)) { if (!pay(st.price, 'Deco : ' + st.name)) return; apt.styles.push(m.id); }
      apt[WALLS[m.id] ? 'wall' : 'floor'] = m.id;
    } else if (m.a === 'size') {
      const sz = APT_SIZES[apt.size + 1];
      if (!sz || !pay(sz.price, 'Appart : ' + sz.name)) return;
      p.apt = cleanApt({ ...apt, size: apt.size + 1 });
      if (p.apt.size === 2) award(p, 'penthouse');
    } else if (m.a === 'open') {
      apt.open = !!m.v;
      if (!apt.open) for (const v of inApt(p.dbId)) if (v !== p) { goZone(v, 'lobby', LOBBY_BY_ELEVATOR); io.to(v.id).emit('say', `🔒 ${p.name} a ferme son appart.`); }
    } else return;
    sendApt(p.dbId);
  });

  // ---------- private messages ----------
  let lastMsg = 0;
  socket.on('msg:send', m => {
    if (!p || !m || Date.now() - lastMsg < 500) return;
    const to = db.getPlayer(cleanName(m.to)), text = typeof m.text === 'string' ? m.text.trim().slice(0, 200) : '';
    if (!to || !text || to.id === p.dbId) return;
    lastMsg = Date.now();
    db.sendMessage(p.dbId, to.id, text);
    const o = [...players.values()].find(x => x.dbId === to.id);
    if (o) { io.to(o.id).emit('msg', { from: p.name, text }); ring(o); }
    socket.emit('msg:convo', { name: to.name, messages: db.conversation(p.dbId, to.id) });
  });
  socket.on('msg:list', () => p && socket.emit('msg:list', db.contacts(p.dbId)));
  socket.on('msg:open', name => {
    const o = p && db.getPlayer(cleanName(name));
    if (o && o.id !== p.dbId) socket.emit('msg:convo', { name: o.name, messages: db.conversation(p.dbId, o.id) });
  });

  socket.on('phone', open => { if (p) p.phone = !!open; });

  let lastEmote = 0;
  socket.on('emote', k => {
    if (!p || !Number.isInteger(k) || k < 0 || k > 4 || Date.now() - lastEmote < 400) return;
    lastEmote = Date.now();
    io.emit('emote', { id: p.id, k });
  });

  socket.on('disconnect', () => {
    if (!p) return;
    if (p.rps) { const b = players.get(p.rps.with); io.to(b.id).emit('rps', { end: `${p.name} est parti : mises remboursees.` }); endDuel(p, b, null); }
    stand(p);
    endJob(p);
    endShift(p);
    persist();
    players.delete(p.id);
  });
});

// ---------- rock-paper-scissors duels ----------
const DUEL_MS = 15000;
const duelFree = p => !p.seat && !p.busking && !p.job && !p.shift && !p.searching && !p.rps;
const duelClose = (a, b) => a.zone === b.zone && Math.hypot(a.x - b.x, a.y - b.y) <= 48;
function endDuel(a, b, w) { // w: the winner, or null to give both stakes back
  const amt = a.rps.amount;
  a.rps = b.rps = null;
  if (!w) { a.chips += amt; b.chips += amt; return; }
  const l = w === a ? b : a;
  w.chips += 2 * amt;
  gainXp(w, stakeXp(amt), true); gainXp(l, stakeXp(amt), true);
  log(w, 'Duel gagne contre ' + l.name, amt);
  log(l, 'Duel perdu contre ' + w.name, -amt);
  award(w, 'duelliste');
}
function resolveDuel(a, b) {
  const r = beats(a.rps.pick, b.rps.pick), amt = a.rps.amount;
  for (const [x, y, res] of [[a, b, r], [b, a, -r]]) io.to(x.id).emit('rps', { you: x.rps.pick, them: y.rps.pick, result: res, amount: amt });
  if (!r) { a.rps.pick = b.rps.pick = null; a.rps.until = b.rps.until = Date.now() + DUEL_MS; return; } // tie: play again
  const [w, l] = r > 0 ? [a, b] : [b, a];
  io.emit('say', `${RPS_ICON[w.rps.pick]} ${w.name} bat ${l.name} a pierre-feuille-ciseaux (+${amt})`);
  endDuel(a, b, w);
}
function duelTimeout(p) { // whoever didn't pick in time loses, nobody picked: refund
  const b = players.get(p.rps.with), w = p.rps.pick !== null ? p : b.rps.pick !== null ? b : null;
  for (const x of [p, b]) io.to(x.id).emit('rps', { end: !w ? 'Temps ecoule : mises remboursees.' : w === x ? `Temps ecoule : tu gagnes ${p.rps.amount} !` : `Temps ecoule : tu perds ${p.rps.amount}.` });
  endDuel(p, b, w);
}

function repay(p, owe) {
  p.chips -= owe;
  p.loan = null;
  log(p, 'Remboursement Requin', -owe);
  sendLoan(p);
}

setInterval(() => io.emit('players', [...players.values()].map(pub)), 66);
setInterval(() => {
  const now = Date.now();
  for (const p of players.values()) {
    p.drunk = Math.max(0, p.drunk - SOBER_PER_SEC);
    if (p.rps && now > p.rps.until) duelTimeout(p);
    if (p.chips >= 1e6) award(p, 'million');
    if (p.loan && now > p.loan.due) { // late: he grabs the money as soon as there is enough, wherever you are
      const owe = loanDue(p.loan, now);
      if (p.chips >= owe) { repay(p, owe); io.to(p.id).emit('bankMsg', `Le Requin t'a retrouve et a pris ses ${owe} jetons.`); }
      else sendLoan(p);
    }
    // Broke in the casino: a short grace (longer if a bet is still running at a table), then the bouncer.
    if ((p.zone === 'casino' || p.zone === 'vip') && p.chips < BROKE && !p.job && !p.rps) { // your apartment is a shelter, a job keeps you inside
      p.brokeSince ||= now;
      if (now - p.brokeSince > (p.seat ? 20000 : 2500)) { p.brokeSince = 0; kickOut(p); }
    } else p.brokeSince = 0;
    if (p.busking) {
      p.hype = Math.max(0, p.hype - 0.04);
      const amt = npcTip(p.hype);
      if (amt) { p.chips += amt; io.emit('tip', { to: p.id, amt }); gainXp(p, amt * XP.tip); }
    }
  }
}, 1000);

function top() { // saved ranking + live chips of online players
  const all = new Map(db.top5().map(r => [r.name.toLowerCase(), r]));
  for (const p of players.values()) all.set(p.name.toLowerCase(), { name: p.name, chips: p.chips });
  return [...all.values()].sort((a, b) => b.chips - a.chips).slice(0, 5);
}
setInterval(() => { io.emit('top', top()); io.emit('jackpot', { pot: jackpot.pot }); }, 2000);
setInterval(() => { for (const p of players.values()) { p.curve.push(p.chips); if (p.curve.length > 60) p.curve.shift(); sendBank(p); } }, 60000);

server.listen(PORT, () => {
  const ips = Object.values(os.networkInterfaces()).flat().filter(i => i?.family === 'IPv4' && !i.internal).map(i => i.address);
  console.log(`\n  LE GRAND PIXEL ouvert !\n  Toi :      http://localhost:${PORT}`);
  for (const ip of ips) console.log(`  Tes potes : http://${ip}:${PORT}`);
  console.log('');
});
