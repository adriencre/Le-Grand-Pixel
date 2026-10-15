// In-game phone: home screen, Bank, Map, Camera and Stock exchange apps.
// Drawn over the world in buffer pixels; the screen is 96x150.
import { ITEMS } from './items.js';
import { T, MW, MH, ST, VW, VH, TABLES } from './map.js';
import { canvas, text as pixelText, chipSprite } from './sprites.js';

// The phone is drawn on the full-resolution canvas, so its text uses a real pixel font
// (Press Start 2P, loaded by index.html) instead of the tiny 3x5 world font.
const FONT = '"Press Start 2P", monospace';
function text(x, s, X, Y, color, sc = 1, align = 'left', shadow = null) {
  s = String(s);
  x.font = `${4 * sc}px ${FONT}`; x.textBaseline = 'top'; x.textAlign = align;
  if (shadow) { x.fillStyle = shadow; x.fillText(s, X + sc * 0.5, Y + sc * 0.5); }
  x.fillStyle = color; x.fillText(s, X, Y);
}
import { drawAvatar } from './avatar.js';
import { sfx } from './sfx.js';
import { STOCKS, SECTORS, indexValue, fmtPrice } from './market.js';

const SW = 96, SH = 150;
export const phone = { open: false, at: 0, app: 'home', notif: null, scroll: 0, filter: 0, selfie: false, flash: 0, view: -1, zone: 'casino', stock: null, sv: 'market', sector: 0, sort: 0, sendTo: null };
const FILTERS = ['NORMAL', 'SEPIA', 'NEON', 'N&B'];
const FRAMES = { // padding around the screen and colors per model
  basic: { l: 5, t: 14, b: 18, body: '#2a2a34', edge: '#14141a' },
  nokia: { l: 7, t: 12, b: 50, body: '#5a6a7a', edge: '#2a3440' },
  clapet: { l: 6, t: 22, b: 16, body: '#8a1830', edge: '#3a0812' },
  smart: { l: 3, t: 9, b: 9, body: '#101014', edge: '#000000' },
  gold: { l: 5, t: 14, b: 18, body: '#e8b830', edge: '#8a6010' },
};
let scr = { x: 0, y: 0 }; // screen origin, for clicks
const inR = (mx, my, x, y, w, h) => mx >= scr.x + x && mx < scr.x + x + w && my >= scr.y + y && my < scr.y + y + h;
const fmt = n => Math.round(n).toLocaleString('fr-FR');
const short = n => (Math.abs(n) >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : Math.abs(n) >= 1e4 ? Math.round(n / 1000) + 'K' : Math.round(n) + '');

export function openPhone(now) { Object.assign(phone, { open: true, at: now, app: 'home', scroll: 0 }); }
export function notify(text, now) { phone.notif = { text, at: now }; }

// ---------- wallpapers ----------
const seeded = k => { const s = Math.sin(k * 51.7) * 10000; return s - Math.floor(s); };
export function wallpaper(x, style, X, Y, w, h, now) {
  if (style === 'neon') {
    x.fillStyle = '#0a0418'; x.fillRect(X, Y, w, h);
    x.fillStyle = '#ff4ab0'; x.fillRect(X + w / 2 - 12, Y + h * 0.35, 24, 12);
    x.fillStyle = '#0a0418'; for (let k = 0; k < 4; k++) x.fillRect(X + w / 2 - 12, Y + h * 0.35 + 3 + k * 3, 24, 1);
    x.fillStyle = 'rgba(64,208,255,.7)';
    for (let k = 0; k < 6; k++) x.fillRect(X, Y + h * 0.5 + k * k * 2, w, 1);
    for (let k = -5; k <= 5; k++) for (let j = 0; j < h * 0.5; j++) x.fillRect(Math.round(X + w / 2 + k * (2 + j * 0.25)), Y + h * 0.5 + j, 1, 1);
  } else if (style === 'beach') {
    const g = x.createLinearGradient(0, Y, 0, Y + h); g.addColorStop(0, '#60b0ff'); g.addColorStop(0.55, '#ffd0a0'); g.addColorStop(0.56, '#2a8ac8'); g.addColorStop(0.75, '#40b0e0'); g.addColorStop(0.76, '#f0d890'); g.addColorStop(1, '#e0c070');
    x.fillStyle = g; x.fillRect(X, Y, w, h);
    x.fillStyle = '#fff6a0'; x.fillRect(X + w - 30, Y + 20, 12, 12);
    x.fillStyle = 'rgba(255,255,255,.6)'; for (let k = 0; k < 5; k++) x.fillRect(X + ((k * 23 + now / 80) % w), Y + h * 0.6 + (k % 3) * 4, 8, 1);
    x.fillStyle = '#6a3a18'; x.fillRect(X + 14, Y + h * 0.5, 3, h * 0.3); x.fillStyle = '#2fb36b'; x.fillRect(X + 6, Y + h * 0.5 - 3, 20, 4);
  } else if (style === 'galaxy') {
    x.fillStyle = '#05030e'; x.fillRect(X, Y, w, h);
    for (let k = 0; k < 6; k++) { const g = x.createRadialGradient(X + seeded(k) * w, Y + seeded(k + 9) * h, 0, X + seeded(k) * w, Y + seeded(k + 9) * h, 30); g.addColorStop(0, ['rgba(160,60,255,.35)', 'rgba(255,60,160,.3)', 'rgba(60,160,255,.3)'][k % 3]); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(X, Y, w, h); }
    for (let k = 0; k < 50; k++) { x.fillStyle = Math.floor(now / 300 + k) % 7 ? '#c8c8ff' : '#fff'; x.fillRect(X + Math.floor(seeded(k + 30) * w), Y + Math.floor(seeded(k + 60) * h), 1, 1); }
  } else {
    const g = x.createLinearGradient(0, Y, 0, Y + h); g.addColorStop(0, '#3a1858'); g.addColorStop(1, '#14284a');
    x.fillStyle = g; x.fillRect(X, Y, w, h);
  }
}

// ---------- frame ----------
function frame(x, model, fx, fy, fw, fh, now, homeless) {
  const f = FRAMES[model];
  x.fillStyle = '#000'; x.fillRect(fx - 1, fy, fw + 2, fh); x.fillRect(fx, fy - 1, fw, fh + 2);
  x.fillStyle = f.body; x.fillRect(fx, fy, fw, fh);
  x.fillStyle = f.edge; x.fillRect(fx + fw - 2, fy, 2, fh); x.fillRect(fx, fy + fh - 2, fw, 2);
  x.fillStyle = 'rgba(255,255,255,.15)'; x.fillRect(fx + 1, fy + 1, 2, fh - 4);
  if (model === 'gold') { // shine
    const s = (now / 8) % (fw + 60) - 30;
    x.save(); x.beginPath(); x.rect(fx, fy, fw, fh); x.clip();
    x.fillStyle = 'rgba(255,255,220,.45)'; for (let i = 0; i < 20; i++) x.fillRect(fx + s + i, fy + i * 12, 6, 12);
    x.restore();
  }
  if (model === 'nokia') { // keypad
    const ky = fy + f.t + SH + 6;
    x.fillStyle = '#3a4a5a'; x.fillRect(fx + 30, ky, fw - 60, 8);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { x.fillStyle = '#c8d0d8'; x.fillRect(fx + 22 + c * 22, ky + 12 + r * 10, 16, 7); x.fillStyle = '#6a7a8a'; x.fillRect(fx + 22 + c * 22, ky + 18 + r * 10, 16, 1); }
  } else if (model === 'clapet') { // hinge + outer lid
    x.fillStyle = f.edge; x.fillRect(fx + 4, fy + 4, fw - 8, 12);
    x.fillStyle = '#c0c0c8'; x.fillRect(fx + fw / 2 - 10, fy + 7, 20, 4);
  } else if (model === 'smart') {
    x.fillStyle = '#000'; x.fillRect(fx + fw / 2 - 12, fy + f.t, 24, 4); // notch
  } else {
    x.fillStyle = f.edge; x.fillRect(fx + fw / 2 - 10, fy + 6, 20, 2); // speaker
    x.fillStyle = f.edge; x.fillRect(fx + fw / 2 - 5, fy + fh - 13, 10, 8); // home button
  }
  if (homeless) { x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(fx + 2, fy + 2, fw - 4, fh - 4); }
}

function cracks(x, X, Y) {
  x.fillStyle = 'rgba(255,255,255,.75)';
  let px = X + 70, py = Y + 20;
  for (let k = 0; k < 40; k++) { x.fillRect(px, py, 1, 1); px += (k % 3 ? -1 : 1); py += 2; }
  px = X + 70; py = Y + 20;
  for (let k = 0; k < 30; k++) { x.fillRect(px, py, 1, 1); px += 2; py += (k % 2); }
  for (let k = 0; k < 25; k++) x.fillRect(X + 40 - k, Y + 100 + Math.round(Math.sin(k) * 2), 1, 1);
}

// ---------- apps ----------
const APPS = [['bank', 'BANQUE', '#e8b830'], ['map', 'PLAN', '#2fb36b'], ['photo', 'PHOTO', '#3a7bd5'], ['stocks', 'BOURSE', '#ff4ab0']];
const ICON_GRIDS = {
  bank: ['....aa....', '..aaaaaa..', 'aaaaaaaaaa', '.a.a.a.a..', '.a.a.a.a..', '.a.a.a.a..', 'aaaaaaaaaa'],
  map: ['aa..aa..aa', 'a.aa.aa.aa', 'a.aa.aa.aa', 'aa.a.aaa.a', 'a.aa.aa.aa', 'aa..aa..aa', '..........'],
  photo: ['...aaa....', 'aaaaaaaaaa', 'a...aa...a', 'a..a..a..a', 'a..a..a..a', 'a...aa...a', 'aaaaaaaaaa'],
  stocks: ['.........a', '........aa', '.....a.a..', '....a.a...', '.a.a......', 'a.a.......', 'aaaaaaaaaa'],
};
function appIcon(x, id, col, X, Y) {
  x.fillStyle = col; x.fillRect(X + 1, Y, 26, 28); x.fillRect(X, Y + 1, 28, 26);
  x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(X + 1, Y + 1, 26, 4);
  ICON_GRIDS[id].forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === 'a') { x.fillStyle = '#fff'; x.fillRect(X + 4 + i * 2, Y + 7 + j * 2, 2, 2); } });
}

function header(x, X, Y, title) {
  x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(X, Y + 9, SW, 13);
  text(x, '<', X + 4, Y + 13, '#fff');
  text(x, title, X + SW / 2, Y + 13, '#fff', 1, 'center');
}

function statusBar(x, X, Y, homeless, now) {
  x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(X, Y, SW, 9);
  const d = new Date(), hh = String(d.getHours()).padStart(2, '0'), mm = String(d.getMinutes()).padStart(2, '0');
  text(x, hh + ':' + mm, X + 3, Y + 2, '#fff');
  for (let k = 0; k < 4; k++) { x.fillStyle = homeless && k > 0 ? '#555' : '#fff'; x.fillRect(X + 60 + k * 3, Y + 6 - k, 2, k + 1); }
  x.fillStyle = '#fff'; x.fillRect(X + 76, Y + 2, 14, 6); x.fillRect(X + 90, Y + 4, 1, 2);
  x.fillStyle = '#000'; x.fillRect(X + 77, Y + 3, 12, 4);
  x.fillStyle = homeless ? (Math.floor(now / 400) % 2 ? '#ff3030' : '#600') : '#60ff80'; x.fillRect(X + 77, Y + 3, homeless ? 1 : 10, 4);
  if (homeless) text(x, '3%', X + 58, Y + 2, '#ff5050', 1, 'right');
}

function home(x, X, Y, S, now) {
  const d = new Date();
  text(x, String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'), X + SW / 2, Y + 18, '#fff', 3, 'center', 'rgba(0,0,0,.5)');
  text(x, 'LE GRAND PIXEL', X + SW / 2, Y + 38, 'rgba(255,255,255,.8)', 1, 'center');
  APPS.forEach(([id, name, col], i) => {
    const ix = X + 14 + (i % 2) * 40, iy = Y + 56 + Math.floor(i / 2) * 44;
    appIcon(x, id, col, ix, iy);
    text(x, name, ix + 14, iy + 31, '#fff', 1, 'center', 'rgba(0,0,0,.6)');
  });
}

function chart(x, pts, X, Y, w, h, col) {
  x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(X, Y, w, h);
  if (!pts?.length) return;
  const lo = Math.min(...pts), hi = Math.max(...pts), span = hi - lo || 1;
  let prev = null;
  pts.forEach((v, i) => {
    const px = X + Math.round(i / Math.max(1, pts.length - 1) * (w - 1)), py = Y + h - 1 - Math.round((v - lo) / span * (h - 2));
    x.fillStyle = col;
    if (prev) { const n = Math.max(Math.abs(px - prev[0]), Math.abs(py - prev[1])) || 1; for (let k = 0; k <= n; k++) x.fillRect(Math.round(prev[0] + (px - prev[0]) * k / n), Math.round(prev[1] + (py - prev[1]) * k / n), 1, 1); }
    prev = [px, py];
  });
}

function bank(x, X, Y, S) {
  header(x, X, Y, 'BANQUE');
  text(x, 'SOLDE', X + 5, Y + 26, '#a8a0c0');
  x.drawImage(chipSprite('#e2b02c', '#fff6c8'), X + 4, Y + 33);
  text(x, short(S.me.chips), X + 16, Y + 34, '#ffe680', 2);
  text(x, 'MA FORTUNE', X + 5, Y + 48, '#8a80a0');
  chart(x, [...(S.bank.curve || []), S.me.chips], X + 4, Y + 55, SW - 8, 26, '#ffd040');
  x.fillStyle = '#1f8a44'; x.fillRect(X + 8, Y + 85, SW - 16, 11);
  text(x, 'FAIRE UN VIREMENT', X + SW / 2, Y + 88, '#fff', 1, 'center');
  text(x, 'OPERATIONS', X + 5, Y + 100, '#a8a0c0');
  const list = S.bank.history || [];
  x.save(); x.beginPath(); x.rect(X, Y + 107, SW, SH - 108); x.clip();
  list.forEach((h, i) => {
    const yy = Y + 108 + i * 8 - phone.scroll;
    text(x, h.text.slice(0, 13), X + 3, yy, '#d8d0e8');
    text(x, (h.amount > 0 ? '+' : '') + short(h.amount), X + SW - 3, yy, h.amount >= 0 ? '#60ff80' : '#ff6060', 1, 'right');
  });
  if (!list.length) text(x, 'AUCUNE OPERATION', X + SW / 2, Y + 115, '#6a6080', 1, 'center');
  x.restore();
}

function send(x, X, Y, S) {
  header(x, X, Y, 'VIREMENT');
  text(x, 'A QUI ?', X + 5, Y + 26, '#a8a0c0');
  const others = S.players.filter(p => p.id !== S.meId);
  others.forEach((p, i) => {
    const yy = Y + 34 + i * 13, sel = phone.sendTo === p.id;
    x.fillStyle = sel ? '#3a7bd5' : 'rgba(255,255,255,.08)'; x.fillRect(X + 4, yy, SW - 8, 11);
    x.fillStyle = p.color; x.fillRect(X + 6, yy + 3, 5, 5);
    text(x, p.name, X + 14, yy + 3, '#fff');
  });
  if (!others.length) text(x, 'PERSONNE EN LIGNE', X + SW / 2, Y + 50, '#6a6080', 1, 'center');
  if (phone.sendTo) text(x, 'CHOISIS LE MONTANT', X + SW / 2, Y + SH - 10, '#ffe680', 1, 'center');
}

const ZONES = [['casino', 'CASINO', MW, MH], ['vip', 'VIP', VW, VH], ['street', 'RUE', ST.w, ST.h]];
export function activity(p) {
  if (p.seat) return TABLES.find(t => t.id === p.seat.t)?.name || 'A UNE TABLE';
  if (p.busking) return 'FAIT LA MANCHE';
  return { casino: 'CASINO', vip: 'ETAGE VIP', street: p.homeless ? 'SDF DANS LA RUE' : 'DANS LA RUE' }[p.zone || 'casino'];
}
function map(x, X, Y, S, now) {
  header(x, X, Y, 'PLAN');
  ZONES.forEach(([id, name], i) => {
    const on = phone.zone === id;
    x.fillStyle = on ? '#2fb36b' : 'rgba(255,255,255,.1)'; x.fillRect(X + 3 + i * 31, Y + 24, 29, 10);
    text(x, name, X + 3 + i * 31 + 15, Y + 27, '#fff', 1, 'center');
  });
  const [, , zw, zh] = ZONES.find(z => z[0] === phone.zone), sc = Math.min((SW - 8) / zw, 50 / zh);
  const mx = X + 4, my = Y + 38, mw = Math.round(zw * sc), mh = Math.round(zh * sc);
  x.fillStyle = { casino: '#3a1024', vip: '#16121e', street: '#3a3a44' }[phone.zone]; x.fillRect(mx, my, mw, mh);
  x.strokeStyle = '#c8a040'; x.strokeRect(mx + 0.5, my + 0.5, mw - 1, mh - 1);
  if (phone.zone === 'street') { x.fillStyle = '#26262c'; x.fillRect(mx, my + Math.round(12 * sc), mw, Math.round(3 * sc)); x.fillStyle = '#3c1428'; x.fillRect(mx, my, mw, Math.round(6 * sc)); }
  for (const t of TABLES.filter(t => (t.zone || 'casino') === phone.zone)) {
    x.fillStyle = t.type === 'slots' ? '#a82848' : t.felt || (t.type === 'poker' ? '#2a6a9a' : '#1f7a3a');
    x.fillRect(mx + Math.round(t.x * sc), my + Math.round(t.y * sc), Math.max(1, Math.round(t.w * sc)), Math.max(1, Math.round(t.h * sc)));
  }
  for (const p of S.players.filter(p => (p.zone || 'casino') === phone.zone)) {
    const me = p.id === S.meId;
    if (me && Math.floor(now / 300) % 2) continue;
    x.fillStyle = me ? '#fff' : p.color;
    x.fillRect(mx + Math.round(p.x / T * sc) - 1, my + Math.round(p.y / T * sc) - 1, 3, 3);
  }
  x.save(); x.beginPath(); x.rect(X, Y + 92, SW, SH - 92); x.clip();
  S.players.forEach((p, i) => {
    const yy = Y + 94 + i * 14 - phone.scroll;
    x.fillStyle = p.color; x.fillRect(X + 4, yy + 1, 4, 4);
    text(x, p.name, X + 11, yy, p.id === S.meId ? '#ffe680' : '#fff');
    text(x, activity(p).slice(0, 21), X + 11, yy + 7, '#9a90b0');
  });
  x.restore();
}

// Filters work on ImageData in place.
function filterPixels(d, f) {
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2], l = r * 0.3 + g * 0.59 + b * 0.11;
    if (f === 1) { d[i] = Math.min(255, l * 1.07 + 30); d[i + 1] = Math.min(255, l * 0.95 + 12); d[i + 2] = l * 0.75; }
    else if (f === 2) { d[i] = Math.min(255, r * 1.25 + 25); d[i + 1] = g * 0.8; d[i + 2] = Math.min(255, b * 1.5 + 45); }
    else if (f === 3) { const v = l > 100 ? Math.min(255, l * 1.15) : l * 0.7; d[i] = d[i + 1] = d[i + 2] = v; }
  }
}

function selfieInto(x, S, X, Y, w, h, now, scale) {
  x.drawImage(S.scene, (S.scene.width - w) / 2, (S.scene.height - h) / 2, w, h, X, Y, w, h);
  x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(X, Y, w, h);
  const [pv, pvx] = canvas(30, 34);
  drawAvatar(pvx, 15, 31, S.me.outfit, S.me.color, 0, 0, now, { homeless: S.me.homeless });
  x.drawImage(pv, Math.round(X + w / 2 - 15 * scale), Math.round(Y + h - 31 * scale + 4), 30 * scale, 34 * scale);
}

const [vf, vfx] = canvas(SW, 112); // viewfinder, filtered off-screen
function photo(x, X, Y, S, now) {
  if (S.me.homeless) return lowBattery(x, X, Y, 'PHOTO');
  const vw = SW, vh = 112;
  vfx.clearRect(0, 0, vw, vh);
  if (phone.selfie) selfieInto(vfx, S, 0, 0, vw, vh, now, 3);
  else vfx.drawImage(S.scene, (S.scene.width - vw * 2) / 2, (S.scene.height - vh * 2) / 2, vw * 2, vh * 2, 0, 0, vw, vh);
  if (phone.filter) { const img = vfx.getImageData(0, 0, vw, vh); filterPixels(img.data, phone.filter); vfx.putImageData(img, 0, 0); }
  x.drawImage(vf, X, Y + 9);
  x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(X, Y + 9, 14, 13); text(x, '<', X + 4, Y + 13, '#fff'); // back
  x.fillStyle = 'rgba(255,255,255,.6)'; // viewfinder corners
  for (const [cx, cy, dx, dy] of [[X + 4, Y + 13, 1, 1], [X + vw - 5, Y + 13, -1, 1], [X + 4, Y + 9 + vh - 5, 1, -1], [X + vw - 5, Y + 9 + vh - 5, -1, -1]]) { x.fillRect(cx, cy, 6 * dx || 1, 1); x.fillRect(cx, cy, 1, 6 * dy || 1); }
  x.fillStyle = '#000'; x.fillRect(X, Y + 121, SW, SH - 121);
  text(x, '<', X + 4, Y + 125, '#fff');
  text(x, FILTERS[phone.filter], X + 26, Y + 125, '#ffe680', 1, 'center');
  text(x, '>', X + 46, Y + 125, '#fff', 1, 'right');
  x.fillStyle = '#fff'; x.fillRect(X + 60, Y + 124, 14, 14); x.fillStyle = '#d02030'; x.fillRect(X + 62, Y + 126, 10, 10);
  text(x, phone.selfie ? 'DOS' : 'SELFIE', X + 4, Y + 139, '#80f0ff');
  text(x, 'GALERIE', X + SW - 3, Y + 139, '#80f0ff', 1, 'right');
  if (phone.flash && now - phone.flash < 250) { x.fillStyle = `rgba(255,255,255,${1 - (now - phone.flash) / 250})`; x.fillRect(X, Y, SW, SH); }
}

// ---------- gallery (stored in this browser only) ----------
const imgs = new Map();
function loadPhotos() { try { return JSON.parse(localStorage.getItem('gp_photos') || '[]'); } catch { return []; } }
function savePhotos(list) {
  for (let n = list.length; n >= 0; n--) { // drop the oldest until it fits
    try { localStorage.setItem('gp_photos', JSON.stringify(list.slice(0, n))); return; } catch {}
  }
}
const img = url => { if (!imgs.has(url)) { const i = new Image(); i.src = url; imgs.set(url, i); } return imgs.get(url); };

export function takePhoto(S, now) {
  let c;
  if (phone.selfie) { c = canvas(160, 200)[0]; selfieInto(c.getContext('2d'), S, 0, 0, 160, 200, now, 5); }
  else { c = canvas(S.scene.width, S.scene.height)[0]; c.getContext('2d').drawImage(S.scene, 0, 0); }
  if (phone.filter) { const x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height); filterPixels(d.data, phone.filter); x.putImageData(d, 0, 0); }
  savePhotos([c.toDataURL('image/png'), ...loadPhotos()].slice(0, 12));
  phone.flash = now;
  sfx.shutter();
}

function gallery(x, X, Y) {
  header(x, X, Y, 'GALERIE');
  const list = loadPhotos();
  if (phone.view >= 0 && list[phone.view]) {
    const im = img(list[phone.view]);
    if (im.complete && im.width) { const s = Math.min(SW / im.width, 120 / im.height); x.drawImage(im, X + (SW - im.width * s) / 2, Y + 24, im.width * s, im.height * s); }
    return;
  }
  list.forEach((url, i) => {
    const im = img(url), tx = X + 3 + (i % 3) * 31, ty = Y + 25 + Math.floor(i / 3) * 31;
    x.fillStyle = '#222'; x.fillRect(tx, ty, 29, 29);
    if (im.complete && im.width) { const s = Math.min(29 / im.width, 29 / im.height); x.drawImage(im, tx + (29 - im.width * s) / 2, ty + (29 - im.height * s) / 2, im.width * s, im.height * s); }
  });
  if (!list.length) text(x, 'AUCUNE PHOTO', X + SW / 2, Y + 60, '#6a6080', 1, 'center');
}

function download(i) {
  const url = loadPhotos()[i];
  if (!url) return;
  const im = img(url), [c, x] = canvas(im.width * 4, im.height * 4);
  x.imageSmoothingEnabled = false;
  x.drawImage(im, 0, 0, c.width, c.height);
  const a = document.createElement('a');
  a.href = c.toDataURL('image/png'); a.download = `grand-pixel-${Date.now()}.png`;
  document.body.append(a); a.click(); a.remove();
}

// ---------- stock exchange: markets, one listing, my portfolio ----------
const SORTS = ['NOM', 'HAUSSE', 'BAISSE'];
const stockOf = id => STOCKS.find(s => s.id === id);
const change = (m, id) => (m.prices[id] - m.open[id]) / m.open[id] * 100;
const pct = v => (v >= 0 ? '+' : '') + v.toFixed(1) + '%';
const green = v => (v >= 0 ? '#60ff80' : '#ff6060');
function listed(m) {
  const sec = SECTORS[phone.sector || 0];
  const l = STOCKS.filter(s => sec === 'TOUT' || s.sector === sec);
  if (phone.sort === 1) l.sort((a, b) => change(m, b.id) - change(m, a.id));
  if (phone.sort === 2) l.sort((a, b) => change(m, a.id) - change(m, b.id));
  return l;
}
function logo(x, s, X, Y) {
  x.fillStyle = s.color; x.fillRect(X, Y, 9, 9);
  x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(X, Y + 7, 9, 2);
  text(x, s.name[0], X + 5, Y + 2, '#101014', 1, 'center');
}
function indexSeries(m) {
  const st = STOCKS.filter(s => !s.crypto), n = Math.min(...st.map(s => m.hist[s.id].length));
  return Array.from({ length: n }, (_, k) => indexValue(Object.fromEntries(st.map(s => [s.id, m.hist[s.id][m.hist[s.id].length - n + k]]))));
}

function stocks(x, X, Y, S) {
  if (S.me.homeless) return lowBattery(x, X, Y, 'BOURSE');
  const m = S.market;
  if (!m?.open) return header(x, X, Y, 'BOURSE');
  if (phone.stock) return stockDetail(x, X, Y, S, m);
  if (phone.sv === 'portfolio') return portfolio(x, X, Y, S, m);
  header(x, X, Y, 'MARCHES');
  const idx = indexValue(m.prices), idx0 = indexValue(m.open), ich = (idx - idx0) / idx0 * 100;
  x.fillStyle = 'rgba(255,255,255,.07)'; x.fillRect(X + 2, Y + 23, SW - 4, 17);
  text(x, 'PIXEL 40', X + 5, Y + 25, '#a8a0c0');
  text(x, fmt(idx), X + 5, Y + 32, '#fff');
  text(x, pct(ich), X + 34, Y + 32, green(ich));
  chart(x, indexSeries(m), X + 64, Y + 26, 28, 12, green(ich));
  text(x, '<', X + 4, Y + 43, '#fff');
  text(x, SECTORS[phone.sector || 0], X + SW / 2, Y + 43, '#ffe680', 1, 'center');
  text(x, '>', X + SW - 4, Y + 43, '#fff', 1, 'right');
  x.fillStyle = 'rgba(255,255,255,.1)'; x.fillRect(X + 2, Y + 51, 44, 9); x.fillRect(X + 48, Y + 51, 46, 9);
  text(x, 'TRI:' + SORTS[phone.sort || 0], X + 24, Y + 53, '#80f0ff', 1, 'center');
  text(x, 'MON PORTEF.', X + 71, Y + 53, '#ffe680', 1, 'center');
  x.save(); x.beginPath(); x.rect(X, Y + 62, SW, SH - 62); x.clip();
  listed(m).forEach((s, i) => {
    const yy = Y + 63 + i * 17 - phone.scroll, ch = change(m, s.id);
    x.fillStyle = i % 2 ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.08)'; x.fillRect(X + 2, yy, SW - 4, 16);
    logo(x, s, X + 4, yy + 3);
    if (S.bank.stocks?.[s.id]) { x.fillStyle = '#80f0ff'; x.fillRect(X + 2, yy + 1, 1, 14); }
    text(x, s.name.slice(0, 12), X + 15, yy + 2, '#fff');
    text(x, fmtPrice(m.prices[s.id]), X + 15, yy + 9, '#ffe680');
    text(x, pct(ch), X + SW - 4, yy + 2, green(ch), 1, 'right');
    chart(x, m.hist[s.id].slice(-30), X + 62, yy + 9, 30, 6, green(ch));
  });
  x.restore();
}

function stockDetail(x, X, Y, S, m) {
  const s = stockOf(phone.stock), price = m.prices[s.id], ch = change(m, s.id), h = m.hist[s.id], own = S.bank.stocks?.[s.id];
  header(x, X, Y, s.name);
  logo(x, s, X + 4, Y + 24);
  text(x, s.sector, X + 16, Y + 26, '#a8a0c0');
  if (s.crypto) { x.fillStyle = '#a01828'; x.fillRect(X + 50, Y + 24, 44, 9); text(x, 'VOLATIL !', X + 72, Y + 26, '#fff', 1, 'center'); }
  text(x, fmtPrice(price), X + 4, Y + 36, '#fff', 2);
  text(x, pct(ch), X + SW - 4, Y + 38, green(ch), 1, 'right');
  chart(x, h, X + 4, Y + 47, SW - 8, 36, s.color);
  text(x, 'HAUT ' + fmtPrice(Math.max(...h)), X + 5, Y + 48, 'rgba(255,255,255,.6)');
  text(x, 'BAS ' + fmtPrice(Math.min(...h)), X + 5, Y + 77, 'rgba(255,255,255,.6)');
  const words = s.desc.split(' '), lines = [''];
  for (const w of words) { if ((lines.at(-1) + ' ' + w).length > 23) lines.push(w); else lines[lines.length - 1] = (lines.at(-1) + ' ' + w).trim(); }
  lines.slice(0, 2).forEach((l, i) => text(x, l, X + 4, Y + 87 + i * 7, '#c8c0d8'));
  x.fillStyle = 'rgba(255,255,255,.07)'; x.fillRect(X + 2, Y + 103, SW - 4, 33);
  text(x, 'TES PARTS', X + 5, Y + 106, '#a8a0c0'); text(x, fmt(own?.n || 0), X + SW - 5, Y + 106, '#fff', 1, 'right');
  if (own) {
    const pv = own.n * price - own.cost;
    text(x, 'VALEUR', X + 5, Y + 115, '#a8a0c0'); text(x, short(own.n * price), X + SW - 5, Y + 115, '#fff', 1, 'right');
    text(x, 'PLUS-VALUE', X + 5, Y + 124, '#a8a0c0'); text(x, (pv >= 0 ? '+' : '') + short(pv), X + SW - 5, Y + 124, green(pv), 1, 'right');
  }
  text(x, 'FRAIS 1% PAR ORDRE', X + SW / 2, Y + 140, '#6a6080', 1, 'center');
}

function portfolio(x, X, Y, S, m) {
  header(x, X, Y, 'PORTEFEUILLE');
  const pos = Object.entries(S.bank.stocks || {}).map(([id, h]) => ({ s: stockOf(id), h, value: h.n * m.prices[id] })).filter(p => p.s);
  const total = pos.reduce((a, p) => a + p.value, 0), cost = pos.reduce((a, p) => a + p.h.cost, 0), pv = total - cost;
  text(x, 'VALEUR TOTALE', X + 5, Y + 25, '#a8a0c0');
  text(x, short(total), X + 5, Y + 33, '#ffe680', 2);
  text(x, 'INVESTI ' + short(cost), X + 5, Y + 45, '#c8c0d8');
  text(x, (pv >= 0 ? '+' : '') + short(pv) + ' (' + (cost ? pct(pv / cost * 100) : '0%') + ')', X + 5, Y + 53, green(pv));
  let bx = X + 4;
  x.fillStyle = '#222'; x.fillRect(X + 4, Y + 62, SW - 8, 6);
  for (const p of pos) { const w = total ? Math.max(1, Math.round(p.value / total * (SW - 8))) : 0; x.fillStyle = p.s.color; x.fillRect(bx, Y + 62, w, 6); bx += w; }
  x.save(); x.beginPath(); x.rect(X, Y + 71, SW, SH - 71); x.clip();
  pos.forEach((p, i) => {
    const yy = Y + 72 + i * 16 - phone.scroll, g = p.value - p.h.cost;
    x.fillStyle = i % 2 ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.08)'; x.fillRect(X + 2, yy, SW - 4, 15);
    logo(x, p.s, X + 4, yy + 3);
    text(x, p.s.name.slice(0, 12), X + 15, yy + 2, '#fff');
    text(x, fmt(p.h.n) + ' PARTS', X + 15, yy + 8, '#a8a0c0');
    text(x, short(p.value), X + SW - 4, yy + 2, '#ffe680', 1, 'right');
    text(x, (g >= 0 ? '+' : '') + short(g), X + SW - 4, yy + 8, green(g), 1, 'right');
  });
  if (!pos.length) text(x, 'AUCUNE POSITION', X + SW / 2, Y + 90, '#6a6080', 1, 'center');
  x.restore();
}

function lowBattery(x, X, Y, title) {
  header(x, X, Y, title);
  x.fillStyle = '#fff'; x.fillRect(X + 34, Y + 60, 26, 14); x.fillRect(X + 60, Y + 64, 2, 6);
  x.fillStyle = '#000'; x.fillRect(X + 35, Y + 61, 24, 12);
  x.fillStyle = '#ff3030'; x.fillRect(X + 35, Y + 61, 2, 12);
  text(x, 'BATTERIE FAIBLE', X + SW / 2, Y + 84, '#ff5050', 1, 'center');
  text(x, 'PAS ASSEZ POUR', X + SW / 2, Y + 96, '#a8a0c0', 1, 'center');
  text(x, 'CETTE APP...', X + SW / 2, Y + 104, '#a8a0c0', 1, 'center');
}

// ---------- draw everything ----------
// x is the full-resolution canvas; w, h and positions are in world-buffer pixels, `scale` maps them.
export function drawPhone(x, w, h, now, S, scale) {
  if (!phone.open) return;
  x.save(); x.scale(scale, scale); x.imageSmoothingEnabled = false;
  drawPhoneAt(x, w, h, now, S);
  x.restore();
}
function drawPhoneAt(x, w, h, now, S) {
  const model = ITEMS[S.me.outfit?.phone]?.style || 'basic', f = FRAMES[model];
  const fw = SW + f.l * 2, fh = SH + f.t + f.b;
  const k = Math.min(1, (now - phone.at) / 220), ease = 1 - (1 - k) ** 3;
  const fx = w - fw - 8, fy = Math.round(h - fh - 6 + (1 - ease) * (fh + 20));
  frame(x, model, fx, fy, fw, fh, now, S.me.homeless);
  const X = fx + f.l, Y = fy + f.t;
  scr = { x: X, y: Y };
  x.save(); x.beginPath(); x.rect(X, Y, SW, SH); x.clip();
  wallpaper(x, ITEMS[S.me.outfit?.wallpaper]?.style, X, Y, SW, SH, now);
  if (phone.app !== 'home') { x.fillStyle = 'rgba(8,4,16,.82)'; x.fillRect(X, Y, SW, SH); }
  ({ home, bank, send, map, photo, gallery, stocks })[phone.app](x, X, Y, S, now);
  statusBar(x, X, Y, S.me.homeless, now);
  if (phone.notif && now - phone.notif.at < 4000) {
    x.fillStyle = 'rgba(30,20,50,.95)'; x.fillRect(X + 2, Y + 11, SW - 4, 16);
    x.fillStyle = '#e8b830'; x.fillRect(X + 2, Y + 11, 2, 16);
    const words = phone.notif.text.split(' '), lines = [''];
    for (const wd of words) { if ((lines.at(-1) + ' ' + wd).length > 22) lines.push(wd); else lines[lines.length - 1] = (lines.at(-1) + ' ' + wd).trim(); }
    lines.slice(0, 2).forEach((l, i) => text(x, l, X + 7, Y + 13 + i * 7, '#fff'));
  }
  if (model === 'nokia') { x.globalCompositeOperation = 'color'; x.fillStyle = '#8bac0f'; x.fillRect(X, Y, SW, SH); x.globalCompositeOperation = 'source-over'; }
  if (S.me.homeless) cracks(x, X, Y);
  x.restore();
}

// Small phone for shop cards.
export function drawPhoneMini(x, o, cx, cy, now) {
  const model = ITEMS[o.phone]?.style || 'basic', f = FRAMES[model];
  x.fillStyle = '#000'; x.fillRect(cx - 12, cy - 21, 24, 42);
  x.fillStyle = f.body; x.fillRect(cx - 11, cy - 20, 22, 40);
  wallpaper(x, ITEMS[o.wallpaper]?.style, cx - 9, cy - 16, 18, model === 'nokia' ? 18 : 30, now);
  if (model === 'nokia') { x.fillStyle = 'rgba(139,172,15,.6)'; x.fillRect(cx - 9, cy - 16, 18, 18); for (let k = 0; k < 6; k++) { x.fillStyle = '#c8d0d8'; x.fillRect(cx - 8 + (k % 3) * 6, cy + 5 + Math.floor(k / 3) * 5, 4, 3); } }
  if (model === 'gold') { x.fillStyle = 'rgba(255,255,220,.5)'; x.fillRect(cx - 11 + (now / 30) % 22, cy - 20, 2, 40); }
  if (o.ringtone) pixelText(x, '*', cx + 7, cy - 26 + Math.sin(now / 200) * 2, '#ffe680');
}

// ---------- input ----------
// Returns an action for the server, or null.
export function phoneClick(mx, my, S, now) {
  if (!inR(mx, my, 0, 0, SW, SH)) return null;
  if (phone.app !== 'home' && inR(mx, my, 0, 9, 22, 13)) { // back
    phone.app = phone.app === 'send' ? 'bank' : phone.app === 'gallery' && phone.view >= 0 ? (phone.view = -1, 'gallery') : phone.app === 'gallery' ? 'photo' : phone.app === 'stocks' && phone.stock ? (phone.stock = null, 'stocks') : phone.app === 'stocks' && phone.sv === 'portfolio' ? (phone.sv = 'market', 'stocks') : 'home';
    phone.scroll = 0; sfx.click(); return null;
  }
  if (phone.app === 'home') {
    APPS.forEach(([id], i) => { if (inR(mx, my, 14 + (i % 2) * 40, 56 + Math.floor(i / 2) * 44, 28, 28)) { phone.app = id; phone.scroll = 0; sfx.click(); } });
  } else if (phone.app === 'bank') {
    if (inR(mx, my, 8, 85, SW - 16, 11)) { phone.app = 'send'; phone.sendTo = null; sfx.click(); }
  } else if (phone.app === 'send') {
    S.players.filter(p => p.id !== S.meId).forEach((p, i) => { if (inR(mx, my, 4, 34 + i * 13, SW - 8, 11)) { phone.sendTo = p.id; sfx.click(); } });
  } else if (phone.app === 'map') {
    ZONES.forEach(([id], i) => { if (inR(mx, my, 3 + i * 31, 24, 29, 10)) { phone.zone = id; sfx.click(); } });
  } else if (phone.app === 'photo' && !S.me.homeless) {
    if (inR(mx, my, 0, 121, 14, 12)) phone.filter = (phone.filter + 3) % 4;
    else if (inR(mx, my, 38, 121, 14, 12)) phone.filter = (phone.filter + 1) % 4;
    else if (inR(mx, my, 58, 122, 18, 18)) takePhoto(S, now);
    else if (inR(mx, my, 0, 136, 40, 12)) phone.selfie = !phone.selfie;
    else if (inR(mx, my, 56, 136, 40, 12)) { phone.app = 'gallery'; phone.view = -1; }
  } else if (phone.app === 'gallery' && phone.view < 0) {
    loadPhotos().forEach((_, i) => { if (inR(mx, my, 3 + (i % 3) * 31, 25 + Math.floor(i / 3) * 31, 29, 29)) phone.view = i; });
  } else if (phone.app === 'stocks' && !phone.stock && !S.me.homeless && S.market?.open) {
    const pick = id => { phone.stock = id; phone.scroll = 0; sfx.click(); };
    if (phone.sv === 'portfolio') {
      Object.keys(S.bank.stocks || {}).forEach((id, i) => { if (my >= scr.y + 71 && inR(mx, my + phone.scroll, 2, 72 + i * 16, SW - 4, 15)) pick(id); });
    } else if (inR(mx, my, 0, 40, 16, 10)) { phone.sector = ((phone.sector || 0) + SECTORS.length - 1) % SECTORS.length; phone.scroll = 0; sfx.click(); }
    else if (inR(mx, my, SW - 16, 40, 16, 10)) { phone.sector = ((phone.sector || 0) + 1) % SECTORS.length; phone.scroll = 0; sfx.click(); }
    else if (inR(mx, my, 2, 51, 44, 9)) { phone.sort = ((phone.sort || 0) + 1) % 3; sfx.click(); }
    else if (inR(mx, my, 48, 51, 46, 9)) { phone.sv = 'portfolio'; phone.scroll = 0; sfx.click(); }
    else listed(S.market).forEach((s, i) => { if (my >= scr.y + 62 && inR(mx, my + phone.scroll, 2, 63 + i * 17, SW - 4, 16)) pick(s.id); });
  }
  return null;
}
export const insidePhone = (mx, my) => phone.open && inR(mx, my, -12, -30, SW + 24, SH + 70);
export function phoneScroll(dy) { phone.scroll = Math.max(0, phone.scroll + Math.sign(dy) * 8); }

// HTML bar under the phone when an app needs buttons or a number.
export function phoneBar(S) {
  if (!phone.open) return null;
  if (phone.app === 'send' && phone.sendTo) {
    const to = S.players.find(p => p.id === phone.sendTo);
    if (!to) return null;
    return {
      sig: 'ph-send' + phone.sendTo,
      html: `<span class="info">Envoyer à ${to.name} :</span>` + [100, 1000, 10000].map(a => `<button data-ph='{"a":"send","amt":${a}}'>${a.toLocaleString('fr-FR')}</button>`).join('') +
        '<input id="phAmt" type="number" min="1" placeholder="Montant" style="width:110px;padding:8px;background:#0a0410;color:#fff;border:0;box-shadow:0 0 0 2px #6a4a7a"><button class="go" data-ph=\'{"a":"sendInput"}\'>Envoyer</button>',
    };
  }
  if (phone.app === 'stocks' && phone.stock && !S.me.homeless) {
    const price = S.market.prices[phone.stock], held = S.bank.stocks?.[phone.stock]?.n || 0;
    const max = Math.floor(S.me.chips / (price * 1.01)); // what the chips can pay, fee included
    const btn = (q, label, cls = '') => `<button class="${cls}" data-ph='{"a":"stock","qty":${q}}' ${q ? '' : 'disabled'}>${label}</button>`;
    return {
      sig: 'ph-stock' + phone.stock + max + held,
      html: [1, 10, 100, 1000].map(q => btn(q, 'Acheter ' + q.toLocaleString('fr-FR'), 'go')).join('') + btn(max, `MAX (${max.toLocaleString('fr-FR')})`, 'go') +
        [1, 10, 100].map(q => btn(-q, 'Vendre ' + q)).join('') + btn(-held, `TOUT (${held.toLocaleString('fr-FR')})`),
    };
  }
  if (phone.app === 'gallery' && phone.view >= 0) {
    return { sig: 'ph-view' + phone.view, html: '<button class="go" data-ph=\'{"a":"dl"}\'>Télécharger en PNG</button><button data-ph=\'{"a":"del"}\'>Supprimer</button>' };
  }
  return null;
}

// A button of that bar was clicked: returns [event, payload] for the server, or null.
export function phoneBarClick(d) {
  if (d.a === 'send' || d.a === 'sendInput') {
    const amt = d.a === 'send' ? d.amt : parseInt(document.getElementById('phAmt')?.value, 10);
    if (!Number.isInteger(amt) || amt <= 0) return null;
    return ['bank:send', { to: phone.sendTo, amount: amt }];
  }
  if (d.a === 'stock') return ['stock', { id: phone.stock, qty: d.qty }];
  if (d.a === 'dl') download(phone.view);
  if (d.a === 'del') { const l = loadPhotos(); l.splice(phone.view, 1); savePhotos(l); phone.view = -1; }
  return null;
}
