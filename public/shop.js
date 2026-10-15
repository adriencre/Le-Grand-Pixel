// The boutique / wardrobe screen: try on, buy, wear, save outfits. Drawn in a 480x270 space.
import { ITEMS, BY_SLOT, RARITY, REMOVABLE, SKINS, HAIR_COLORS } from './items.js';
import { COLORS } from './map.js';
import { drawAvatar } from './avatar.js';
import { canvas, text, textW, grid, chipSprite } from './sprites.js';

const SW = 480, SH = 270;
export const TABS = [
  { slot: 'hat', name: 'CHAPEAUX' }, { slot: 'hair', name: 'COIFFURES' }, { slot: 'glasses', name: 'LUNETTES' },
  { slot: 'top', name: 'HAUTS' }, { slot: 'bottom', name: 'BAS' }, { slot: 'shoes', name: 'CHAUSSURES' },
  { slot: 'acc', name: 'ACCESSOIRES' }, { slot: 'fx', name: 'EFFETS' }, { slot: 'style', name: 'STYLE' }, { slot: 'wardrobe', name: 'MES TENUES' },
];
const ICONS = [
  ['...aaa...', '...aaa...', '...aaa...', '...bbb...', '.aaaaaaa.'],
  ['..aaaaa..', '.aaaaaaa.', '.aa...aa.', '.a.....a.', '.a.....a.'],
  ['.........', 'aaaaaaaaa', '.bb...bb.', '.bb...bb.', '.........'],
  ['.aa...aa.', 'aaaaaaaaa', '.aaaaaaa.', '..aaaaa..', '..aaaaa..'],
  ['..aaaaa..', '..aaaaa..', '..aa.aa..', '..aa.aa..', '..aa.aa..'],
  ['.........', '..aa.....', '..aaaa...', '..aaaaaa.', '..bbbbbb.'],
  ['.a.....a.', '..a...a..', '...a.a...', '....b....', '...bbb...'],
  ['....a....', '...aaa...', 'aaaaaaaaa', '..aa.aa..', '.a.....a.'],
  ['..aaaa...', '.abaacaa.', '.aaaaaaa.', '.adaaa...', '..aaa....'],
  ['aaaaaaaaa', 'a...a...a', 'a.b.a.b.a', 'a...a...a', 'aaaaaaaaa'],
].map(r => grid(r, { a: '#f0e0ff', b: '#ffc030', c: '#4aa8ff', d: '#ff4ab0' }));

export const shop = { open: false, tab: 3, sel: null, rot: 0, manual: 0, hover: null, confetti: [] };
const DIRS = [0, 2, 3, 1];

// ---------- layout ----------
const tabRect = i => [186 + i * 29, 6, 27, 22];
const cardRect = k => [186 + (k % 5) * 58, 50 + Math.floor(k / 5) * 92, 54, 88];
const ARROWS = [[24, 214, 16, 14], [150, 214, 16, 14]];
const swatchRect = (row, k) => [190 + k * 23, 62 + row * 56, 20, 20];
const presetRect = k => [192 + k * 94, 50, 88, 178];
const presetBtn = (k, b) => [196 + k * 94, 192 + b * 17, 80, 14];
const inR = ([x, y, w, h], mx, my) => mx >= x && mx < x + w && my >= y && my < y + h;

const tab = () => TABS[shop.tab].slot;
const items = () => BY_SLOT[tab()] || [];
const owns = (me, it) => it.price === 0 || me.owned.has(it.id);
export const preview = me => {
  const it = ITEMS[shop.sel];
  return it ? { ...me.outfit, [it.slot]: it.id } : me.outfit;
};

// ---------- drawing ----------
const [pv, pvx] = canvas(44, 44);
function avatarAt(x, o, color, dir, now, px, py, scale) {
  pvx.clearRect(0, 0, 44, 44);
  drawAvatar(pvx, 22, 36, o, color, dir, 0, now);
  x.drawImage(pv, Math.round(px - 22 * scale), Math.round(py - 36 * scale), 44 * scale, 44 * scale);
}

function room(x, w, h, now) {
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#2c1238'); g.addColorStop(1, '#14081c');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  for (let xx = 0; xx < w; xx += 24) { x.fillStyle = 'rgba(200,160,64,.12)'; x.fillRect(xx, 0, 1, h); }
  const ox = (w - SW) >> 1, oy = (h - SH) >> 1;
  for (let yy = oy + 196; yy < h; yy += 8) for (let xx = 0; xx < w; xx += 8) {
    x.fillStyle = ((xx + yy) / 8) % 2 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.15)'; x.fillRect(xx, yy, 8, 8);
  }
  return [ox, oy];
}

function card(x, me, it, k, now) {
  const [cx, cy, cw, chh] = cardRect(k), r = RARITY[it.rarity], sel = shop.sel === it.id, hov = shop.hover === it.id;
  const worn = me.outfit[it.slot] === it.id;
  if (sel && Math.floor(now / 300) % 2) { x.fillStyle = '#fff'; x.fillRect(cx - 2, cy - 2, cw + 4, chh + 4); }
  x.fillStyle = r.color; x.fillRect(cx - 1, cy - 1 - (hov ? 1 : 0), cw + 2, chh + 2);
  const g = x.createLinearGradient(0, cy, 0, cy + chh);
  g.addColorStop(0, hov ? '#3a2450' : '#24142e'); g.addColorStop(1, '#0e0814');
  x.fillStyle = g; x.fillRect(cx, cy - (hov ? 1 : 0), cw, chh);
  const y0 = cy - (hov ? 1 : 0);
  if (it.rarity === 3) { // legendary shimmer
    x.save(); x.beginPath(); x.rect(cx, y0, cw, chh); x.clip();
    const s = (now / 6 + k * 40) % 260 - 80;
    x.fillStyle = 'rgba(255,220,120,.18)';
    for (let i = 0; i < 12; i++) x.fillRect(cx + s + i, y0 + i * 8, 10, 8);
    x.restore();
  } else if (it.rarity === 2) { x.fillStyle = `rgba(176,96,255,${0.06 + 0.05 * Math.sin(now / 250 + k)})`; x.fillRect(cx, y0, cw, chh); }
  const dir = hov ? DIRS[Math.floor(now / 500) % 4] : it.slot === 'acc' && it.style === 'wings' ? 3 : 0;
  x.save(); x.beginPath(); x.rect(cx, y0, cw, chh); x.clip();
  avatarAt(x, { ...me.outfit, [it.slot]: it.id }, me.color, dir, now, cx + cw / 2, y0 + 58, 2);
  x.restore();
  const words = it.name.split(' '), lines = [''];
  for (const wd of words) { if ((lines.at(-1) + ' ' + wd).trim().length > 13) lines.push(wd); else lines[lines.length - 1] = (lines.at(-1) + ' ' + wd).trim(); }
  lines.slice(0, 2).forEach((l, i) => text(x, l, cx + cw / 2, y0 + 63 + i * 7, '#fff', 1, 'center'));
  const st = worn ? ['PORTE', '#60ff80'] : owns(me, it) ? [it.price ? 'POSSEDE' : 'GRATUIT', '#c8c0d8'] : null;
  if (st) text(x, st[0], cx + cw / 2, y0 + 79, st[1], 1, 'center');
  else {
    const p = it.price >= 10000 ? Math.round(it.price / 1000) + 'K' : it.price + '';
    x.drawImage(chipSprite('#e2b02c', '#fff6c8'), cx + cw / 2 - textW(p) / 2 - 7, y0 + 77);
    text(x, p, cx + cw / 2 + 4, y0 + 79, me.chips >= it.price ? '#ffe680' : '#ff6060', 1, 'center');
  }
  x.fillStyle = r.color; x.fillRect(cx + 3, y0 + 3, 3, 3);
}

export function drawShop(x, w, h, now, me) {
  const [ox, oy] = room(x, w, h, now);
  x.save(); x.translate(ox, oy);
  // header
  const glow = 0.4 + 0.15 * Math.sin(now / 300);
  x.globalAlpha = glow;
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) text(x, 'VESTIAIRE', 95 + dx, 6 + dy, '#ff2090', 2, 'center');
  x.globalAlpha = 1;
  text(x, 'VESTIAIRE', 95, 6, '#ff8ad8', 2, 'center');
  x.drawImage(chipSprite('#e2b02c', '#fff6c8'), 95 - textW(me.chips + '') / 2 - 8, 21);
  text(x, me.chips + '', 95 + 4, 23, '#ffe680', 1, 'center');
  // mirror, spotlight, podium
  for (let yy = -88; yy <= 88; yy++) {
    const half = Math.round(62 * Math.sqrt(1 - (yy / 88) ** 2));
    x.fillStyle = '#c8a040'; x.fillRect(95 - half - 3, 120 + yy, half * 2 + 6, 1);
  }
  for (let yy = -84; yy <= 84; yy++) {
    const half = Math.round(58 * Math.sqrt(1 - (yy / 84) ** 2));
    x.fillStyle = `rgb(${30 + yy / 6 | 0},${36 + yy / 5 | 0},${70 + yy / 4 | 0})`; x.fillRect(95 - half, 120 + yy, half * 2, 1);
  }
  x.fillStyle = 'rgba(255,255,255,.08)'; for (let k = 0; k < 4; k++) x.fillRect(60 + k * 6, 60 + k * 10, 4, 40);
  x.save(); x.globalCompositeOperation = 'lighter';
  x.fillStyle = 'rgba(255,240,200,.07)';
  for (let yy = 30; yy < 205; yy++) { const half = 8 + (yy - 30) * 0.32; x.fillRect(95 - half, yy, half * 2, 1); }
  x.restore();
  x.fillStyle = '#c8a040'; x.fillRect(40, 200, 110, 12); x.fillRect(36, 202, 118, 8);
  x.fillStyle = '#901828'; x.fillRect(42, 201, 106, 8);
  x.fillStyle = '#b82838'; x.fillRect(46, 202, 98, 2);
  const dir = shop.manual > now ? DIRS[shop.rot] : DIRS[Math.floor(now / 1600) % 4];
  avatarAt(x, preview(me), me.color, dir, now, 95, 204, 4);
  ARROWS.forEach(([ax, ay, aw, ah], i) => {
    x.fillStyle = '#3a2448'; x.fillRect(ax, ay, aw, ah);
    text(x, i ? '>' : '<', ax + aw / 2, ay + 4, '#fff', 1, 'center');
  });
  if (shop.sel && me.outfit[ITEMS[shop.sel].slot] !== shop.sel) text(x, 'ESSAYAGE', 95, 218, '#80f0ff', 1, 'center', '#000');
  // info about the selected / hovered item
  const info = ITEMS[shop.hover] || ITEMS[shop.sel];
  if (info) {
    text(x, info.name, 95, 230, RARITY[info.rarity].color, 1, 'center', '#000');
    text(x, RARITY[info.rarity].name, 95, 238, RARITY[info.rarity].color, 1, 'center');
    text(x, info.desc, 95, 246, '#c8c0d8', 1, 'center');
  }
  // tabs
  TABS.forEach((t, i) => {
    const [tx, ty, tw, th] = tabRect(i), on = i === shop.tab;
    x.fillStyle = on ? '#c8a040' : '#2a1838'; x.fillRect(tx, ty, tw, th);
    x.fillStyle = on ? '#4a2a10' : '#1a0e24'; x.fillRect(tx + 1, ty + 1, tw - 2, th - 2);
    x.drawImage(ICONS[i], tx + 9, ty + 8);
  });
  const t = TABS[shop.tab];
  const list = items();
  text(x, t.name, 186, 36, '#ffe680', 1, 'left', '#000');
  if (list.length) text(x, list.filter(it => owns(me, it)).length + '/' + list.length, 472, 36, '#a090b0', 1, 'right');
  if (t.slot === 'style') styleTab(x, me, now);
  else if (t.slot === 'wardrobe') wardrobeTab(x, me, now);
  else list.forEach((it, k) => card(x, me, it, k, now));
  // confetti after a purchase
  for (let i = shop.confetti.length - 1; i >= 0; i--) {
    const c = shop.confetti[i];
    c.vy += 0.15; c.x += c.vx; c.y += c.vy; c.life--;
    if (c.life <= 0) { shop.confetti.splice(i, 1); continue; }
    x.fillStyle = c.c; x.fillRect(Math.round(c.x), Math.round(c.y), 2, 2);
  }
  x.restore();
}

function styleTab(x, me, now) {
  const rows = [['PEAU', SKINS, me.outfit.skin], ['CHEVEUX', HAIR_COLORS, me.outfit.hairColor], ['T-SHIRT BASIQUE', COLORS, COLORS.indexOf(me.color)]];
  rows.forEach(([name, cols, cur], row) => {
    text(x, name, 190, 52 + row * 56, '#e8d8f0');
    cols.forEach((c, k) => {
      const [sx, sy, sw, sh] = swatchRect(row, k);
      x.fillStyle = k === cur ? (Math.floor(now / 300) % 2 ? '#fff' : '#ffc030') : '#0a0410'; x.fillRect(sx - 2, sy - 2, sw + 4, sh + 4);
      x.fillStyle = c; x.fillRect(sx, sy, sw, sh);
      x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(sx, sy, sw, 2);
    });
  });
  text(x, 'GRATUIT - CHANGE QUAND TU VEUX', 330, 232, '#a090b0', 1, 'center');
}

function wardrobeTab(x, me, now) {
  [0, 1, 2].forEach(k => {
    const [px, py, pw, ph] = presetRect(k), p = me.presets[k];
    x.fillStyle = '#c8a040'; x.fillRect(px - 1, py - 1, pw + 2, ph + 2);
    x.fillStyle = '#1a0e24'; x.fillRect(px, py, pw, ph);
    text(x, 'TENUE ' + (k + 1), px + pw / 2, py + 5, '#ffe680', 1, 'center');
    if (p) avatarAt(x, p, me.color, DIRS[Math.floor(now / 1600 + k) % 4], now, px + pw / 2, py + 132, 3);
    else text(x, 'VIDE', px + pw / 2, py + 80, '#5a4a6a', 2, 'center');
    ['PORTER', 'ENREGISTRER'].forEach((lab, b) => {
      const [bx, by, bw, bh] = presetBtn(k, b), dis = b === 0 && !p;
      x.fillStyle = dis ? '#2a2030' : b ? '#3a2448' : '#1f8a44'; x.fillRect(bx, by, bw, bh);
      text(x, lab, bx + bw / 2, by + 4, dis ? '#5a4a6a' : '#fff', 1, 'center');
    });
  });
  text(x, 'ENREGISTRER = GARDER TA TENUE ACTUELLE', 330, 240, '#a090b0', 1, 'center');
}

// ---------- input ----------
export function shopHover(mx, my) {
  shop.hover = null;
  if (['style', 'wardrobe'].includes(tab())) return;
  items().forEach((it, k) => { if (inR(cardRect(k), mx, my)) shop.hover = it.id; });
}

// Returns an action for the server, or null.
export function shopClick(mx, my, me, now) {
  for (let i = 0; i < TABS.length; i++) if (inR(tabRect(i), mx, my)) { shop.tab = i; shop.sel = null; return null; }
  for (let i = 0; i < 2; i++) if (inR(ARROWS[i], mx, my)) {
    const cur = shop.manual > now ? shop.rot : Math.floor(now / 1600) % 4;
    shop.rot = (cur + (i ? 1 : 3)) % 4; shop.manual = now + 6000; return null;
  }
  const t = tab();
  if (t === 'style') {
    for (let k = 0; k < SKINS.length; k++) if (inR(swatchRect(0, k), mx, my)) return { a: 'style', skin: k };
    for (let k = 0; k < HAIR_COLORS.length; k++) if (inR(swatchRect(1, k), mx, my)) return { a: 'style', hairColor: k };
    for (let k = 0; k < COLORS.length; k++) if (inR(swatchRect(2, k), mx, my)) return { a: 'style', color: COLORS[k] };
    return null;
  }
  if (t === 'wardrobe') {
    for (let k = 0; k < 3; k++) {
      if (inR(presetBtn(k, 0), mx, my) && me.presets[k]) return { a: 'load', k };
      if (inR(presetBtn(k, 1), mx, my)) return { a: 'save', k };
    }
    return null;
  }
  const list = items();
  for (let k = 0; k < list.length; k++) if (inR(cardRect(k), mx, my)) {
    const it = list[k];
    if (shop.sel === it.id && owns(me, it) && me.outfit[it.slot] !== it.id) return { a: 'equip', id: it.id }; // double click wears it
    shop.sel = it.id;
    return null;
  }
  return null;
}

export function shopBar(me) {
  const it = ITEMS[shop.sel];
  let html = '', sig = 'shop' + shop.sel + me.chips;
  if (it) {
    const worn = me.outfit[it.slot] === it.id;
    sig += worn + owns(me, it);
    if (!owns(me, it)) {
      const ok = me.chips >= it.price;
      html = `<button class="go big" data-shop='{"a":"buy","id":"${it.id}"}' ${ok ? '' : 'disabled'}>Acheter — ${it.price.toLocaleString('fr-FR')} jetons</button>` +
        (ok ? '' : `<span class="info">Il te manque ${(it.price - me.chips).toLocaleString('fr-FR')} jetons</span>`);
    } else if (!worn) html = `<button class="go big" data-shop='{"a":"equip","id":"${it.id}"}'>Porter</button>`;
    else if (REMOVABLE.includes(it.slot)) html = `<button data-shop='{"a":"remove","slot":"${it.slot}"}'>Retirer</button>`;
    else html = '<span class="info">Tu le portes</span>';
  } else html = '<span class="info">Clique sur un article pour l\'essayer</span>';
  return { sig, html: html + '<button data-close>Quitter (Échap)</button>' };
}

export function celebrate() {
  const cols = ['#ffc030', '#ff4ab0', '#4aa8ff', '#60ff80', '#fff'];
  for (let i = 0; i < 80; i++) shop.confetti.push({ x: 95, y: 120, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 5 - 1, life: 60 + Math.random() * 40, c: cols[i % cols.length] });
}
