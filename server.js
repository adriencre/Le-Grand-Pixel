import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { Server } from 'socket.io';
import { TABLES, SPAWN, COLORS, T, MW, MH, ST, ST_SPAWN, BUSK, BROKE, ENTRY_MIN, seatPos, standPos, nearBar, nearShop, nearDoorIn, nearDoorOut, nearBusk, nearBin,
  VW, VH, VIP_SPAWN, VIP_ELEVATOR, TIERS, upgradeCost, nearElevatorIn, nearElevatorOut, nearReception, nearVipBar } from './public/map.js';
import { rollLoot, npcTip } from './games/street.js';
import { STOCKS, step, trade } from './games/stocks.js';
import { ITEMS, SLOTS, REMOVABLE, SKINS, HAIR_COLORS, RARITY, defaultOutfit } from './public/items.js';
import { Blackjack } from './games/blackjack.js';
import { Poker } from './games/poker.js';
import { Roulette } from './games/roulette.js';
import { Slots } from './games/slots.js';
import { Race } from './games/race.js';
import { DRINKS, SOBER_PER_SEC, drunkAmount } from './public/drinks.js';

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

// Chips are saved per pseudo in data/chips.json.
// shortcut: no password, whoever types your pseudo gets your chips; add accounts if strangers join.
const SAVE = path.resolve('data/chips.json');
let saved = {};
try { saved = JSON.parse(fs.readFileSync(SAVE, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') console.error('chips.json illisible, on repart de zéro :', e.message); }
let lastSaved = JSON.stringify(saved);
function persist() {
  for (const p of players.values()) saved[p.name.toLowerCase()] = { name: p.name, chips: p.chips, color: p.color, vip: p.vip, stocks: p.stocks, history: p.history, owned: p.owned, outfit: p.outfit, presets: p.presets };
  const json = JSON.stringify(saved);
  if (json === lastSaved) return;
  fs.mkdirSync(path.dirname(SAVE), { recursive: true });
  fs.writeFileSync(SAVE + '.tmp', json);
  fs.renameSync(SAVE + '.tmp', SAVE); // atomic: a crash never leaves a half-written file
  lastSaved = json;
}
setInterval(persist, 3000);
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { persist(); process.exit(0); });

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
  p.busking = false;
  p.zone = zone;
  const spawn = at || { street: { x: ST_SPAWN.x + (Math.random() * 30 - 15) | 0, y: ST_SPAWN.y }, vip: VIP_SPAWN, casino: SPAWN }[zone];
  Object.assign(p, spawn, { moving: false, dir: zone === 'street' ? 0 : 3 });
  io.to(p.id).emit('pos', { x: p.x, y: p.y, seat: null, zone });
}

function kickOut(p) {
  p.homeless = true;
  goZone(p, 'street');
  io.to(p.id).emit('kicked');
  io.emit('say', `💸 ${p.name} est ruiné... le videur le jette dehors !`);
}

// Trash cans: empty until this time after someone searched them.
const binEmptyUntil = [0, 0, 0, 0, 0];
const binsLeft = () => binEmptyUntil.map(t => Math.max(0, t - Date.now()));

const pub = p => ({ id: p.id, name: p.name, color: p.color, x: p.x, y: p.y, dir: p.dir, moving: p.moving, chips: p.chips, seat: p.seat, outfit: p.outfit, drunk: Math.round(p.drunk * 100) / 100,
  zone: p.zone, vip: p.vip || 0, phone: !!p.phone, homeless: !!p.homeless, busking: !!p.busking, hype: Math.round((p.hype || 0) * 100) / 100 });

// Bank: last operations and a balance sample every minute, shown in the phone.
function log(p, text, amount) {
  p.history.unshift({ text, amount, at: Date.now() });
  p.history.length = Math.min(p.history.length, 20);
  sendBank(p);
}
function sendBank(p) { io.to(p.id).emit('bank', { history: p.history, curve: p.curve, stocks: p.stocks }); }
const ring = p => io.emit('ring', { id: p.id, tone: ITEMS[p.outfit.ringtone]?.style || 'basic' });

// Stock exchange (prices reset when the server restarts).
// shortcut: prices are not saved; persist them if players start timing restarts.
const market = { prices: Object.fromEntries(STOCKS.map(s => [s.id, s.base])), hist: Object.fromEntries(STOCKS.map(s => [s.id, [s.base]])) };
setInterval(() => {
  for (const s of STOCKS) {
    const [price, event] = step(market.prices[s.id], s);
    const old = market.prices[s.id];
    market.prices[s.id] = price;
    market.hist[s.id].push(price);
    if (market.hist[s.id].length > 40) market.hist[s.id].shift();
    if (event) {
      io.emit('say', event === 'krach' ? `📉 KRACH ! ${s.name} s'effondre (${old} -> ${price})` : `📈 ENVOLEE ! ${s.name} explose (${old} -> ${price})`);
      for (const p of players.values()) if (p.stocks[s.id]) ring(p);
    }
  }
  io.emit('market', market);
}, 20000);

const has = (p, id) => ITEMS[id] && (ITEMS[id].price === 0 || p.owned.includes(id));
// Keeps only items the player is allowed to wear, in the right slot.
function cleanOutfit(p, o) {
  const out = defaultOutfit(p.name);
  for (const slot of SLOTS) if (o?.[slot] === null && REMOVABLE.includes(slot)) out[slot] = null; else if (has(p, o?.[slot]) && ITEMS[o[slot]].slot === slot) out[slot] = o[slot];
  if (Number.isInteger(o?.skin) && SKINS[o.skin]) out.skin = o.skin;
  if (Number.isInteger(o?.hairColor) && HAIR_COLORS[o.hairColor]) out.hairColor = o.hairColor;
  return out;
}

io.on('connection', socket => {
  let p = null;

  socket.on('join', m => {
    if (p || !m || typeof m !== 'object') return;
    const name = String(m.name || '').replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, 12) || 'Joueur';
    const color = COLORS.includes(m.color) ? m.color : COLORS[0];
    if ([...players.values()].some(o => o.name.toLowerCase() === name.toLowerCase())) return socket.emit('joinError', 'Ce pseudo est déjà dans le casino.');
    const sv = saved[name.toLowerCase()] || {};
    p = { id: socket.id, name, color, x: SPAWN.x + (Math.random() * 40 - 20) | 0, y: SPAWN.y, dir: 3, moving: false, chips: sv.chips ?? 1000, seat: null, drunk: 0, zone: 'casino', vip: [1, 2, 3].includes(sv.vip) ? sv.vip : 0 };
    if (p.chips < BROKE) Object.assign(p, { zone: 'street', homeless: true, x: ST_SPAWN.x, y: ST_SPAWN.y, dir: 0 });
    p.owned = Array.isArray(sv.owned) ? sv.owned.filter(id => ITEMS[id]) : [];
    p.outfit = cleanOutfit(p, sv.outfit);
    p.presets = [0, 1, 2].map(k => (sv.presets?.[k] ? cleanOutfit(p, sv.presets[k]) : null));
    p.stocks = {};
    for (const s of STOCKS) { const h = sv.stocks?.[s.id]; if (Number.isInteger(h?.n) && h.n > 0) p.stocks[s.id] = { n: h.n, cost: Math.max(0, h.cost | 0) }; }
    p.history = Array.isArray(sv.history) ? sv.history.slice(0, 20) : [];
    p.curve = [p.chips];
    players.set(p.id, p);
    socket.emit('welcome', { id: p.id, x: p.x, y: p.y, zone: p.zone });
    socket.emit('bins', binsLeft());
    socket.emit('market', market);
    sendBank(p);
    socket.emit('race', games.race.view(null));
    socket.emit('top', top());
    sendMe();
  });

  const sendMe = () => socket.emit('me', { owned: p.owned, outfit: p.outfit, presets: p.presets, color: p.color, vip: p.vip });

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
    if (!p || p.seat || p.busking || !m || !Number.isFinite(m.x) || !Number.isFinite(m.y)) return;
    const [w, h] = p.zone === 'street' ? [ST.w, ST.h] : p.zone === 'vip' ? [VW, VH] : [MW, MH];
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
    if (p.zone !== 'street' || !nearDoorOut(p)) return;
    if (p.homeless && p.chips < ENTRY_MIN) return socket.emit('bouncer', `Pas de jetons, pas d'entree ! Reviens avec ${ENTRY_MIN}.`);
    if (p.homeless) { p.homeless = false; io.emit('say', `🎉 ${p.name} a remonté la pente et revient au casino !`); }
    goZone(p, 'casino');
  });

  // Busking: the client plays a rhythm game and reports each note; good playing raises the hype.
  let noteTimes = [];
  socket.on('busk', m => {
    if (!p || p.zone !== 'street' || !m) return;
    if (m.a === 'start') {
      if (p.busking || !nearBusk(p) || [...players.values()].some(o => o.busking)) return socket.emit('busk', false);
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

  socket.on('tip', to => {
    const b = players.get(to);
    if (!p || !b || b === p || !b.busking || p.zone !== 'street' || p.chips < 10 || Math.hypot(b.x - p.x, b.y - p.y) > 40) return;
    p.chips -= 10; b.chips += 10;
    log(p, 'Pourboire a ' + b.name, -10); log(b, 'Pourboire de ' + p.name, 10);
    io.emit('tip', { to: b.id, amt: 10, from: p.id, by: p.name });
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
      if (loot.chips) log(p, 'Trouve dans une poubelle', loot.chips);
      if (loot.item) { p.owned.push(loot.item); sendMe(); io.emit('say', `🗑️ ${p.name} a trouvé ${ITEMS[loot.item].name} dans une poubelle !`); }
      socket.emit('loot', loot);
      io.emit('bins', binsLeft());
    }, 2000);
  });

  socket.on('chat', txt => {
    if (!p || typeof txt !== 'string') return;
    const text = txt.trim().slice(0, 80);
    if (text) io.emit('chat', { id: p.id, name: p.name, color: p.color, text });
  });

  // shortcut: test cheat, anyone who types "klm" gets 1M; delete this handler before playing for real.
  socket.on('klm', () => {
    if (!p) return;
    p.chips += 1000000;
    log(p, 'Code secret', 1000000);
    socket.emit('say', '💰 Code secret : +1 000 000 jetons !');
  });

  socket.on('bank:send', m => {
    const b = players.get(m?.to), amt = m?.amount;
    if (!p || !b || b === p || !Number.isInteger(amt) || amt <= 0 || amt > p.chips) return;
    p.chips -= amt; b.chips += amt;
    log(p, 'Virement a ' + b.name, -amt);
    log(b, 'Virement de ' + p.name, amt);
    io.to(b.id).emit('bankMsg', `${p.name} t'a envoye ${amt.toLocaleString('fr-FR')} jetons !`);
    ring(b);
  });

  socket.on('stock', m => {
    const s = STOCKS.find(x => x.id === m?.id);
    if (!p || !s || p.homeless) return;
    const delta = trade(p, s.id, m.qty, market.prices[s.id]);
    if (delta === null) return;
    log(p, `Bourse : ${m.qty > 0 ? 'achat' : 'vente'} ${Math.abs(m.qty)} ${s.name}`, delta);
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
    stand(p);
    persist();
    players.delete(p.id);
  });
});

setInterval(() => io.emit('players', [...players.values()].map(pub)), 66);
setInterval(() => {
  const now = Date.now();
  for (const p of players.values()) {
    p.drunk = Math.max(0, p.drunk - SOBER_PER_SEC);
    // Broke in the casino: a short grace (longer if a bet is still running at a table), then the bouncer.
    if (p.zone !== 'street' && p.chips < BROKE) {
      p.brokeSince ||= now;
      if (now - p.brokeSince > (p.seat ? 20000 : 2500)) { p.brokeSince = 0; kickOut(p); }
    } else p.brokeSince = 0;
    if (p.busking) {
      p.hype = Math.max(0, p.hype - 0.04);
      const amt = npcTip(p.hype);
      if (amt) { p.chips += amt; io.emit('tip', { to: p.id, amt }); }
    }
  }
}, 1000);

function top() {
  const all = { ...saved };
  for (const p of players.values()) all[p.name.toLowerCase()] = { name: p.name, chips: p.chips };
  return Object.values(all).sort((a, b) => b.chips - a.chips).slice(0, 5);
}
setInterval(() => io.emit('top', top()), 2000);
setInterval(() => { for (const p of players.values()) { p.curve.push(p.chips); if (p.curve.length > 60) p.curve.shift(); sendBank(p); } }, 60000);

server.listen(PORT, () => {
  const ips = Object.values(os.networkInterfaces()).flat().filter(i => i?.family === 'IPv4' && !i.internal).map(i => i.address);
  console.log(`\n  LE GRAND PIXEL ouvert !\n  Toi :      http://localhost:${PORT}`);
  for (const ip of ips) console.log(`  Tes potes : http://${ip}:${PORT}`);
  console.log('');
});
