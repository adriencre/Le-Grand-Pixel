import { T, MW, MH, COLORS, SPAWN, TABLES } from './map.js';
import { drawWorld, move, nearby } from './world.js';
import { drawTable, tableBar, onView, rouletteHit, raceHit, sceneBackdrop, emotes, outfits, SW, SH } from './tables.js';
import { shop, drawShop, shopClick, shopHover, shopBar, celebrate } from './shop.js';
import { ITEMS } from './items.js';
import { initAudio, sfx, toggleMusic } from './sfx.js';
import { canvas, text, chipSprite } from './sprites.js';

const socket = io();
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const [buf, bx] = canvas(SW, SH);
const $ = id => document.getElementById(id);
const bar = $('bar'), log = $('log'), chat = $('chat');

let scale = 1, dpr = 1, mode = 'world';
// The room is shown more zoomed in than the table close-ups, which need the full 480x270.
function fit(m) {
  mode = m;
  const [w, h] = m === 'table' ? [SW, SH] : [400, 225];
  scale = Math.max(1, Math.floor(Math.min(cv.width / w, cv.height / h)));
  buf.width = Math.ceil(cv.width / scale); buf.height = Math.ceil(cv.height / scale);
  bx.imageSmoothingEnabled = false; ctx.imageSmoothingEnabled = false;
}
function resize() {
  dpr = devicePixelRatio || 1;
  cv.width = innerWidth * dpr | 0; cv.height = innerHeight * dpr | 0;
  fit(mode);
}
addEventListener('resize', resize);
resize();

// ---------- state ----------
let meId = null, me = { x: SPAWN.x, y: SPAWN.y, dir: 3, moving: false, chips: 0 }, seated = null;
let players = [];
const disp = new Map(), bubbles = new Map();
let race = null, top = [];
const wardrobe = { owned: new Set(), outfit: null, presets: [null, null, null], color: null };
const meData = () => ({ ...wardrobe, chips: me.chips });
let table = null; // { id, type, view }
const ui = { mx: -1, my: -1, chip: 10, slotBet: 10, tid: null, ox: 0, oy: 0 };
const keys = {};

// ---------- login ----------
let color = COLORS[Math.floor(Math.random() * COLORS.length)];
for (const c of COLORS) {
  const b = document.createElement('button');
  b.type = 'button'; b.style.background = c; b.setAttribute('aria-label', 'Couleur ' + c);
  if (c === color) b.classList.add('sel');
  b.onclick = () => { color = c; for (const o of $('colors').children) o.classList.toggle('sel', o === b); };
  $('colors').append(b);
}
$('name').value = localStorageGet('name');
$('name').focus();
$('login').querySelector('form').onsubmit = e => {
  e.preventDefault();
  const name = $('name').value.trim();
  if (!name) return;
  try { localStorage.setItem('name', name); } catch {}
  initAudio(); // browsers only allow sound after a click
  socket.emit('join', { name, color });
};
function localStorageGet(k) { try { return localStorage.getItem(k) || ''; } catch { return ''; } }

// ---------- network ----------
let joinedAt = 0;
socket.on('welcome', m => { meId = m.id; joinedAt = performance.now(); me.x = m.x; me.y = m.y; $('login').remove(); sys('Bienvenue au Grand Pixel ! Approche-toi d\'une table et appuie sur E.'); });
socket.on('players', list => {
  players = list;
  for (const p of list) {
    const d = disp.get(p.id);
    if (!d || Math.hypot(d.x - p.x, d.y - p.y) > 64) disp.set(p.id, { x: p.x, y: p.y });
    if (p.id === meId) me.chips = p.chips;
    outfits.set(p.id, p.outfit);
  }
});
socket.on('pos', m => {
  me.x = m.x; me.y = m.y; seated = m.seat;
  if (!seated) { table = null; ui.tid = null; bar.style.display = 'none'; document.body.classList.remove('seated'); }
});
socket.on('table', v => {
  if (!seated || v.id !== seated.t) return;
  const type = TABLES.find(t => t.id === v.id).type;
  v.until = performance.now() + v.left;
  table = { id: v.id, type, view: v };
  ui.tid = v.id;
  document.body.classList.add('seated');
  onView(v.id, v);
  refreshBar();
});
socket.on('chat', m => {
  bubbles.set(m.id, { text: m.text, at: performance.now() });
  sfx.blip();
  line(`<b style="color:${m.color}">${esc(m.name)}</b> ${esc(m.text)}`);
});
socket.on('say', sys);
socket.on('joinError', msg => alert(msg));
socket.on('race', v => { v.until = performance.now() + v.left; race = v; });
socket.on('top', t => { top = t; });
socket.on('me', m => { Object.assign(wardrobe, m, { owned: new Set(m.owned) }); });
socket.on('bought', id => { celebrate(); sfx.win(ITEMS[id].price); sys('Acheté : ' + ITEMS[id].name + ' !'); });
socket.on('emote', m => { emotes.set(m.id, { k: m.k, at: performance.now() }); sfx.pop(); });
socket.on('disconnect', () => sys('Connexion perdue… recharge la page quand le serveur est relancé.'));

const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
function line(html, cls = '') {
  const d = document.createElement('div');
  d.innerHTML = html; if (cls) d.className = cls;
  log.append(d);
  while (log.children.length > 6) log.firstChild.remove();
  setTimeout(() => { d.style.opacity = 0; }, 12000);
}
function sys(s) { line(esc(s), 'sys'); }

// ---------- action bar ----------
let barSig = '';
function refreshBar() {
  if (!table) return;
  const { sig, html } = tableBar(table.type, table.view, ui);
  const mine = table.view.seats.find(s => s?.me);
  bar.style.display = 'flex';
  if (sig !== barSig) {
    barSig = sig;
    bar.innerHTML = html + `<span class="chips"></span><button data-stand>Se lever</button>`;
  }
  bar.querySelector('.chips').textContent = (mine ? mine.chips : me.chips) + ' jetons';
}
bar.addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  const d = b.dataset;
  if (d.act?.includes('"bet"')) sfx.chip(); else sfx.click();
  if (d.act) socket.emit('act', JSON.parse(d.act));
  else if ('raise' in d) socket.emit('act', { a: 'raise', to: +$('raise').value });
  else if (d.chip) { ui.chip = +d.chip; refreshBar(); }
  else if (d.sbet) { ui.slotBet = +d.sbet; refreshBar(); }
  else if ('spin' in d) spin();
  else if ('stand' in d) socket.emit('stand');
  else if (d.shop) socket.emit('shop', JSON.parse(d.shop));
  else if ('close' in d) closeShop();
  b.blur();
});
bar.addEventListener('input', e => { if (e.target.id === 'raise') $('raiseV').textContent = e.target.value; });
function openShop() {
  shop.open = true; shop.sel = null;
  for (const k in keys) keys[k] = false;
  me.moving = false;
}
function closeShop() { shop.open = false; bar.style.display = 'none'; barSig = ''; }
function refreshShopBar() {
  const { sig, html } = shopBar(meData());
  bar.style.display = 'flex';
  if (sig !== barSig) { barSig = sig; bar.innerHTML = html; }
}
function spin() { socket.emit('act', { a: 'spin', bet: ui.slotBet }); }

// ---------- input ----------
let secret = '';
const KEYMAP = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right' };
addEventListener('keydown', e => {
  if (!meId) return;
  if (document.activeElement === chat) {
    if (e.key === 'Enter') { if (chat.value.trim()) socket.emit('chat', chat.value); chat.value = ''; chat.style.display = 'none'; chat.blur(); }
    else if (e.key === 'Escape') { chat.value = ''; chat.style.display = 'none'; chat.blur(); }
    return;
  }
  if (e.target.tagName === 'INPUT') return;
  if (KEYMAP[e.code]) { keys[KEYMAP[e.code]] = true; e.preventDefault(); }
  if (e.key === 'Enter') { chat.style.display = 'block'; chat.focus(); e.preventDefault(); }
  if (e.code === 'Escape' && shop.open) closeShop();
  else if (e.code === 'Escape' && seated) socket.emit('stand');
  if (e.code === 'Space' && table?.type === 'slots') { spin(); e.preventDefault(); }
  if (/^Digit[1-5]$/.test(e.code)) socket.emit('emote', +e.code[5] - 1);
  secret = (secret + e.key.toLowerCase()).slice(-3);
  if (secret === 'klm') { socket.emit('klm'); secret = ''; return; } // test code: +1M chips
  if (e.code === 'KeyM') sys(toggleMusic() ? 'Musique : on' : 'Musique : off');
  if (e.code === 'KeyE' && !seated && !shop.open) {
    const n = nearby(me, players);
    if (n?.kind === 'seat') socket.emit('sit', { t: n.t.id, i: n.i });
    else if (n?.kind === 'shop' && wardrobe.outfit) openShop();
    else if (n?.kind === 'bar') socket.emit('bank');
  }
});
addEventListener('keyup', e => { if (KEYMAP[e.code]) keys[KEYMAP[e.code]] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
cv.addEventListener('mousemove', e => {
  ui.mx = e.clientX * dpr / scale - ui.ox; ui.my = e.clientY * dpr / scale - ui.oy;
  if (shop.open) shopHover(ui.mx, ui.my);
});
cv.addEventListener('click', e => {
  const mx = e.clientX * dpr / scale - ui.ox, my = e.clientY * dpr / scale - ui.oy;
  if (shop.open) {
    const act = shopClick(mx, my, meData(), performance.now());
    sfx.click();
    if (act) socket.emit('shop', act);
  } else if (table?.type === 'roulette') {
    const c = rouletteHit(mx, my);
    if (c) { socket.emit('act', { a: 'bet', t: c.t, v: c.v, amt: ui.chip }); sfx.chip(); }
  } else if (table?.type === 'race') {
    const h = raceHit(mx, my);
    if (h >= 0) { socket.emit('act', { a: 'bet', h, amt: ui.chip }); sfx.chip(); }
  }
});

// ---------- loop ----------
let last = performance.now(), lastSend = 0, sent = '';
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (meId && !seated && !shop.open && document.activeElement !== chat) move(me, keys, dt);
  if (meId && !seated && now - lastSend > 66) {
    const m = { x: Math.round(me.x * 10) / 10, y: Math.round(me.y * 10) / 10, dir: me.dir, moving: me.moving }, s = JSON.stringify(m);
    if (s !== sent) { socket.emit('move', m); sent = s; }
    lastSend = now;
  }
  const list = players.map(p => {
    const d = disp.get(p.id) || p, k = Math.min(1, dt * 12);
    d.x += (p.x - d.x) * k; d.y += (p.y - d.y) * k;
    const q = { ...p, x: d.x, y: d.y, bubble: bubbles.get(p.id), emote: emotes.get(p.id) };
    if (p.id === meId && !seated) Object.assign(q, { x: me.x, y: me.y, dir: me.dir, moving: me.moving });
    return q;
  });

  const want = table || shop.open ? 'table' : 'world';
  if (want !== mode) fit(want);
  bx.fillStyle = '#000'; bx.fillRect(0, 0, buf.width, buf.height);
  if (shop.open) {
    ui.ox = (buf.width - SW) >> 1; ui.oy = (buf.height - SH) >> 1;
    drawShop(bx, buf.width, buf.height, now, meData());
    refreshShopBar();
  } else if (table) {
    ui.ox = (buf.width - SW) >> 1; ui.oy = (buf.height - SH) >> 1;
    sceneBackdrop(bx, buf.width, buf.height);
    bx.save(); bx.translate(ui.ox, ui.oy);
    drawTable(bx, table.type, table.view, now, ui);
    bx.restore();
    if (table.view.until > now || table.type === 'roulette' || table.type === 'race') refreshBar(); // keeps the chip count fresh
  } else {
    const focus = meId ? me : { x: SPAWN.x + Math.sin(now / 4000) * 200, y: 14 * T };
    const cam = {
      x: Math.round(MW * T > buf.width ? Math.max(0, Math.min(MW * T - buf.width, focus.x - buf.width / 2)) : (MW * T - buf.width) / 2),
      y: Math.round(MH * T > buf.height ? Math.max(0, Math.min(MH * T - buf.height, focus.y - 20 - buf.height / 2)) : (MH * T - buf.height) / 2),
    };
    const n = meId ? nearby(me, players) : null;
    drawWorld(bx, cam, now, list, meId, n ? [n] : [], race, top);
    if (meId) hud();
  }
  ctx.drawImage(buf, 0, 0, buf.width * scale, buf.height * scale);
  requestAnimationFrame(frame);
}

function hud() {
  bx.fillStyle = 'rgba(10,4,16,.8)'; bx.fillRect(6, 6, 18 + String(me.chips).length * 8, 16);
  bx.drawImage(chipSprite('#e2b02c', '#fff6c8'), 9, 9);
  text(bx, me.chips + '', 21, 9, '#ffe680', 2, 'left', '#000');
  const online = players.length + (players.length > 1 ? ' JOUEURS' : ' JOUEUR');
  text(bx, online, buf.width - 6, 9, '#80f0ff', 1, 'right', '#000');
  if (performance.now() - joinedAt < 30000) text(bx, 'ZQSD: BOUGER  E: INTERAGIR  ENTREE: CHAT  1-5: EMOTES  M: MUSIQUE', buf.width / 2, 26, 'rgba(255,255,255,.55)', 1, 'center', '#000');
}

requestAnimationFrame(frame);
