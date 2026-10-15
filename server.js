import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { Server } from 'socket.io';
import { TABLES, SPAWN, COLORS, T, MW, MH, seatPos, standPos, nearBar, nearShop } from './public/map.js';
import { ITEMS, SLOTS, REMOVABLE, SKINS, HAIR_COLORS, RARITY, defaultOutfit } from './public/items.js';
import { Blackjack } from './games/blackjack.js';
import { Poker } from './games/poker.js';
import { Roulette } from './games/roulette.js';
import { Slots } from './games/slots.js';
import { Race } from './games/race.js';

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
  for (const p of players.values()) saved[p.name.toLowerCase()] = { name: p.name, chips: p.chips, color: p.color, owned: p.owned, outfit: p.outfit, presets: p.presets };
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
for (const t of TABLES) games[t.id] = new CLASSES[t.type](t.seats, () => push(t.id));

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

const pub = p => ({ id: p.id, name: p.name, color: p.color, x: p.x, y: p.y, dir: p.dir, moving: p.moving, chips: p.chips, seat: p.seat, outfit: p.outfit });

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
    p = { id: socket.id, name, color, x: SPAWN.x + (Math.random() * 40 - 20) | 0, y: SPAWN.y, dir: 3, moving: false, chips: sv.chips ?? 1000, seat: null };
    p.owned = Array.isArray(sv.owned) ? sv.owned.filter(id => ITEMS[id]) : [];
    p.outfit = cleanOutfit(p, sv.outfit);
    p.presets = [0, 1, 2].map(k => (sv.presets?.[k] ? cleanOutfit(p, sv.presets[k]) : null));
    players.set(p.id, p);
    socket.emit('welcome', { id: p.id, x: p.x, y: p.y });
    socket.emit('race', games.race.view(null));
    socket.emit('top', top());
    sendMe();
  });

  const sendMe = () => socket.emit('me', { owned: p.owned, outfit: p.outfit, presets: p.presets, color: p.color });

  socket.on('shop', m => {
    if (!p || !m || typeof m !== 'object') return;
    const it = ITEMS[m.id];
    if (m.a === 'buy') {
      if (!it || it.price === 0 || p.owned.includes(it.id) || p.chips < it.price || p.seat || !nearShop(p)) return;
      p.chips -= it.price;
      p.owned.push(it.id);
      p.outfit[it.slot] = it.id;
      socket.emit('bought', it.id);
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
    if (!p || p.seat || !m || !Number.isFinite(m.x) || !Number.isFinite(m.y)) return;
    p.x = Math.max(0, Math.min(MW * T, m.x));
    p.y = Math.max(0, Math.min(MH * T, m.y));
    p.dir = [0, 1, 2, 3].includes(m.dir) ? m.dir : 0;
    p.moving = !!m.moving;
  });

  socket.on('sit', m => {
    const t = TABLES.find(x => x.id === m?.t);
    if (!p || p.seat || !t || !Number.isInteger(m.i) || m.i < 0 || m.i >= t.seats) return;
    const s = seatPos(t, m.i);
    if (Math.hypot(s.x - p.x, s.y - p.y) > T * 2) return;
    if ([...players.values()].some(o => o.seat?.t === t.id && o.seat.i === m.i)) return;
    p.seat = { t: t.id, i: m.i };
    if (!games[t.id].sit(p, m.i)) { p.seat = null; return; }
    Object.assign(p, { x: s.x, y: s.y, dir: s.dir, moving: false });
    socket.emit('pos', { x: p.x, y: p.y, seat: p.seat });
    push(t.id);
  });

  socket.on('stand', () => p && stand(p));

  socket.on('act', m => {
    if (p?.seat && m && typeof m === 'object') games[p.seat.t].act(p, m);
  });

  socket.on('bank', () => {
    if (p && !p.seat && p.chips < 100 && nearBar(p)) { p.chips += 1000; socket.emit('say', 'Le barman vous avance 1000 jetons.'); }
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
    socket.emit('say', '💰 Code secret : +1 000 000 jetons !');
  });

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

function top() {
  const all = { ...saved };
  for (const p of players.values()) all[p.name.toLowerCase()] = { name: p.name, chips: p.chips };
  return Object.values(all).sort((a, b) => b.chips - a.chips).slice(0, 5);
}
setInterval(() => io.emit('top', top()), 2000);

server.listen(PORT, () => {
  const ips = Object.values(os.networkInterfaces()).flat().filter(i => i?.family === 'IPv4' && !i.internal).map(i => i.address);
  console.log(`\n  LE GRAND PIXEL ouvert !\n  Toi :      http://localhost:${PORT}`);
  for (const ip of ips) console.log(`  Tes potes : http://${ip}:${PORT}`);
  console.log('');
});
