// MEUBLES & DECO showroom: browse the catalogue, see each piece big in your own room (day / night), buy into your stock.
// Drawn in a 480x270 space, like the clothes shop.
import { T } from './map.js';
import { FURNITURE, WALLS, FLOORS, CATS } from './furniture.js';
import { RARITY } from './items.js';
import { canvas, text, textW, chipSprite } from './sprites.js';
import { drawFurniture, thumbCanvas, pattern, lighting, lightsOf } from './apartment.js';
import { NPC_OUTFITS } from './items.js';
import { drawAvatar } from './avatar.js';

const SW = 480, SH = 270;
export const fshop = { open: false, tab: 0, page: 0, sel: null, hover: null, f: false, night: false, confetti: [] };
const TABS = [...CATS, ['styles', 'STYLES']];
const USES = { sleep: 'ON PEUT Y DORMIR', sit: 'ON PEUT S\'ASSEOIR', tv: 'S\'ALLUME', fridge: 'BOISSONS FRAICHES', music: 'CHANGE LA MUSIQUE' };
const LAYERS = { obj: 'AU SOL', rug: 'TAPIS (ON MARCHE DESSUS)', wall: 'S\'ACCROCHE AU MUR' };

// ---------- layout ----------
const tabRect = i => [186 + Math.floor(i * 290 / TABS.length), 6, Math.floor(290 / TABS.length) - 2, 18];
const cardRect = k => [186 + (k % 5) * 58, 46 + Math.floor(k / 5) * 94, 54, 90];
const PAGER = [[428, 30, 14, 12], [462, 30, 14, 12]];
const BTN_FLIP = [12, 177, 80, 13], BTN_NIGHT = [98, 177, 80, 13];
const inR = ([x, y, w, h], mx, my) => mx >= x && mx < x + w && my >= y && my < y + h;
const fmt = n => n.toLocaleString('fr-FR');
const short = n => (n >= 10000 ? Math.round(n / 1000) + 'K' : n + '');

const tabId = () => TABS[fshop.tab][0];
const isStyle = id => !!(WALLS[id] || FLOORS[id]);
const list = () => (tabId() === 'styles' ? [...Object.keys(WALLS), ...Object.keys(FLOORS)] : Object.keys(FURNITURE).filter(id => FURNITURE[id].cat === tabId()));
const pages = () => Math.max(1, Math.ceil(list().length / 10));
const shown = () => list().slice(fshop.page * 10, fshop.page * 10 + 10);
const rarityOf = id => (isStyle(id) ? ((WALLS[id] || FLOORS[id]).price >= 1500 ? 2 : (WALLS[id] || FLOORS[id]).price > 0 ? 1 : 0) : FURNITURE[id].rarity);
const priceOf = id => (WALLS[id] || FLOORS[id] || FURNITURE[id]).price;
const nameOf = id => (WALLS[id] || FLOORS[id] || FURNITURE[id]).name;
const ownsStyle = (apt, id) => priceOf(id) === 0 || apt?.styles?.includes(id);

// ---------- preview: a corner of YOUR room with the piece in it ----------
const PW = 84, PH = 70, WALL_H = 26;
const [pv, px] = canvas(PW, PH);
const cache = new Map(); // backdrops and swatches, drawn pixel by pixel once
const cached = (key, w, h, draw) => { if (!cache.has(key)) { const [c, x] = canvas(w, h); draw(x); cache.set(key, c); } return cache.get(key); };
function preview(now, apt) {
  const id = fshop.hover || fshop.sel, style = id && isStyle(id);
  const wall = style && WALLS[id] ? id : apt?.wall || 'w_creme', floor = style && FLOORS[id] ? id : apt?.floor || 'f_parquet';
  px.clearRect(0, 0, PW, PH);
  px.drawImage(cached(wall + floor, PW, PH, b => {
    pattern(b, FLOORS[floor], 0, WALL_H, PW, PH - WALL_H, false);
    pattern(b, WALLS[wall], 0, 0, PW, WALL_H, true);
    b.fillStyle = '#3a2418'; b.fillRect(0, WALL_H - 4, PW, 4); b.fillStyle = 'rgba(0,0,0,.25)'; b.fillRect(0, WALL_H, PW, 3);
  }), 0, 0);
  const lights = [[PW / 2, PH / 2, 70, '255,230,190']];
  const night = fshop.night, items = !id || style ? [['canape', 18, WALL_H + 6], ['plante', 66, WALL_H + 6], ['poster', 36, 6]] : null;
  const place = (fid, X, Y, it = {}) => {
    const d = FURNITURE[fid], full = { id: fid, x: X / T, y: Y / T, on: true, night, ...it };
    if (d.layer === 'obj') { px.fillStyle = 'rgba(0,0,0,.25)'; px.fillRect(X + 2, Y + d.h * T - 3, d.w * T - 4, 4); }
    drawFurniture(px, fid, X, Y, full, now);
    lights.push(...lightsOf(full));
  };
  if (items) for (const [fid, X, Y] of items) place(fid, X, Y);
  else {
    const d = FURNITURE[id], X = Math.round((PW - d.w * T) / 2);
    const Y = d.layer === 'wall' ? Math.max(2, Math.round((WALL_H - 4 - d.h * T) / 2)) : d.layer === 'rug' ? Math.round(WALL_H + (PH - WALL_H - d.h * T) / 2) : PH - 6 - d.h * T;
    place(id, X, Y, { f: fshop.f });
  }
  if (night) lighting(px, PW, PH, 1, lights);
  return pv;
}

function card(x, me, id, k, now) {
  const [cx, cy, cw, ch] = cardRect(k), r = RARITY[rarityOf(id)], sel = fshop.sel === id, hov = fshop.hover === id, y0 = cy - (hov ? 1 : 0);
  if (sel && Math.floor(now / 300) % 2) { x.fillStyle = '#fff'; x.fillRect(cx - 2, cy - 2, cw + 4, ch + 4); }
  x.fillStyle = r.color; x.fillRect(cx - 1, y0 - 1, cw + 2, ch + 2);
  const g = x.createLinearGradient(0, y0, 0, y0 + ch);
  g.addColorStop(0, hov ? '#4a3420' : '#2e2016'); g.addColorStop(1, '#120c08');
  x.fillStyle = g; x.fillRect(cx, y0, cw, ch);
  if (rarityOf(id) === 3) { // legendary shimmer
    x.save(); x.beginPath(); x.rect(cx, y0, cw, ch); x.clip();
    const s = (now / 6 + k * 40) % 260 - 80; x.fillStyle = 'rgba(255,220,120,.18)';
    for (let i = 0; i < 12; i++) x.fillRect(cx + s + i, y0 + i * 8, 10, 8);
    x.restore();
  }
  // picture
  x.save(); x.beginPath(); x.rect(cx + 2, y0 + 2, cw - 4, 54); x.clip();
  if (isStyle(id)) x.drawImage(cached('sw' + id, 46, 46, b => pattern(b, WALLS[id] || FLOORS[id], 0, 0, 46, 46, !!WALLS[id])), cx + 4, y0 + 5);
  else {
    const c = thumbCanvas(id, hov || sel ? now : 0), s = Math.max(1, Math.min(2, Math.floor(Math.min(48 / c.width, 52 / c.height))));
    x.drawImage(c, Math.round(cx + cw / 2 - c.width * s / 2), Math.round(y0 + 55 - c.height * s), c.width * s, c.height * s);
  }
  x.restore();
  const words = nameOf(id).split(' '), lines = [''];
  for (const wd of words) { if ((lines.at(-1) + ' ' + wd).trim().length > 13) lines.push(wd); else lines[lines.length - 1] = (lines.at(-1) + ' ' + wd).trim(); }
  lines.slice(0, 2).forEach((l, i) => text(x, l, cx + cw / 2, y0 + 60 + i * 7, '#fff', 1, 'center'));
  const stock = !isStyle(id) && me.apt?.stock?.[id];
  if (isStyle(id) && ownsStyle(me.apt, id)) text(x, priceOf(id) ? 'A TOI' : 'GRATUIT', cx + cw / 2, y0 + 80, '#60ff80', 1, 'center');
  else {
    const p = short(priceOf(id));
    x.drawImage(chipSprite('#e2b02c', '#fff6c8'), cx + cw / 2 - textW(p) / 2 - 7, y0 + 78);
    text(x, p, cx + cw / 2 + 4, y0 + 80, me.chips >= priceOf(id) ? '#ffe680' : '#ff6060', 1, 'center');
  }
  if (stock) { x.fillStyle = '#2f8a3c'; x.fillRect(cx + cw - 17, y0 + 3, 15, 9); text(x, 'x' + stock, cx + cw - 9, y0 + 5, '#fff', 1, 'center'); }
  x.fillStyle = r.color; x.fillRect(cx + 3, y0 + 3, 3, 3);
}

const [seller, sellerX] = canvas(30, 30);
export function drawFurnShop(x, w, h, now, me) {
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#3a2414'); g.addColorStop(1, '#140a06');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  for (let xx = 0; xx < w; xx += 20) { x.fillStyle = 'rgba(255,220,160,.05)'; x.fillRect(xx, 0, 1, h); }
  const ox = (w - SW) >> 1, oy = (h - SH) >> 1;
  for (let yy = oy + 214; yy < h; yy += 6) for (let xx = 0; xx < w; xx += 24) { x.fillStyle = (yy / 6 + xx / 24) % 2 ? 'rgba(200,150,90,.10)' : 'rgba(0,0,0,.18)'; x.fillRect(xx + (yy / 6 % 2) * 12, yy, 24, 6); }
  x.save(); x.translate(ox, oy);
  // header: neon + chips + the seller waving
  const glow = 0.4 + 0.15 * Math.sin(now / 300);
  x.globalAlpha = glow; for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) text(x, 'MEUBLES ET DECO', 95 + dx, 6 + dy, '#ff2090', 2, 'center');
  x.globalAlpha = 1; text(x, 'MEUBLES ET DECO', 95, 6, '#ffb0e0', 2, 'center');
  x.drawImage(chipSprite('#e2b02c', '#fff6c8'), 95 - textW(fmt(me.chips)) / 2 - 8, 21);
  text(x, fmt(me.chips), 95 + 4, 23, '#ffe680', 1, 'center');
  sellerX.clearRect(0, 0, 30, 30); drawAvatar(sellerX, 15, 28, NPC_OUTFITS.seller, '#222', 0, 0, now);
  x.drawImage(seller, 158, 0, 30, 30);
  // preview in a gold frame
  x.fillStyle = '#c8a040'; x.fillRect(9, 31, PW * 2 + 6, PH * 2 + 6);
  x.fillStyle = '#5a4010'; x.fillRect(11, 33, PW * 2 + 2, PH * 2 + 2);
  x.drawImage(preview(now, me.apt), 12, 34, PW * 2, PH * 2);
  for (const [r, lab] of [[BTN_FLIP, '< RETOURNER >'], [BTN_NIGHT, fshop.night ? 'VOIR DE JOUR' : 'VOIR DE NUIT']]) {
    x.fillStyle = '#4a3420'; x.fillRect(...r); x.fillStyle = '#c8a040'; x.fillRect(r[0], r[1], r[2], 1);
    text(x, lab, r[0] + r[2] / 2, r[1] + 4, '#ffe680', 1, 'center');
  }
  // info on the hovered / selected piece
  const id = fshop.hover || fshop.sel;
  if (id) {
    const r = RARITY[rarityOf(id)];
    text(x, nameOf(id).toUpperCase(), 95, 194, r.color, 1, 'center', '#000');
    if (isStyle(id)) text(x, (WALLS[id] ? 'PAPIER PEINT' : 'REVETEMENT DE SOL') + ' - ' + r.name, 95, 202, '#c8c0d8', 1, 'center');
    else {
      const d = FURNITURE[id];
      text(x, `${r.name} - ${d.w}X${d.h} CASES - ${LAYERS[d.layer]}`, 95, 202, '#c8c0d8', 1, 'center');
      if (d.use) text(x, USES[d.use], 95, 210, '#80f0ff', 1, 'center');
      const n = me.apt?.stock?.[id] || 0, placed = me.apt?.items?.filter(it => it.id === id).length || 0;
      if (n || placed) { // badge in the corner of the preview
        const s = `CHEZ TOI : ${placed} POSE - ${n} STOCK`;
        x.fillStyle = 'rgba(20,60,30,.9)'; x.fillRect(14, 36, textW(s) + 6, 9); text(x, s, 17, 38, '#60ff80');
      }
    }
  } else text(x, 'CHOISIS UN MEUBLE POUR LE VOIR CHEZ TOI', 95, 198, '#c8c0d8', 1, 'center');
  // tabs, pager, cards
  TABS.forEach(([, name], i) => {
    const [tx, ty, tw, th] = tabRect(i), on = i === fshop.tab;
    x.fillStyle = on ? '#c8a040' : '#3a2418'; x.fillRect(tx, ty, tw, th);
    x.fillStyle = on ? '#5a3a10' : '#1e120a'; x.fillRect(tx + 1, ty + 1, tw - 2, th - 2);
    text(x, name, tx + tw / 2, ty + 7, on ? '#ffe680' : '#c8b8a0', 1, 'center');
  });
  text(x, TABS[fshop.tab][1] + ' - ' + list().length + ' ARTICLES', 186, 32, '#ffe680', 1, 'left', '#000');
  if (pages() > 1) {
    PAGER.forEach(([ax, ay, aw, ah], i) => { x.fillStyle = '#4a3420'; x.fillRect(ax, ay, aw, ah); text(x, i ? '>' : '<', ax + aw / 2, ay + 3, '#fff', 1, 'center'); });
    text(x, `${fshop.page + 1}/${pages()}`, 452, 33, '#c8b8a0', 1, 'center');
  }
  shown().forEach((cid, k) => card(x, me, cid, k, now));
  for (let i = fshop.confetti.length - 1; i >= 0; i--) {
    const c = fshop.confetti[i];
    c.vy += 0.15; c.x += c.vx; c.y += c.vy; c.life--;
    if (c.life <= 0) { fshop.confetti.splice(i, 1); continue; }
    x.fillStyle = c.c; x.fillRect(Math.round(c.x), Math.round(c.y), 2, 2);
  }
  x.restore();
}

export function openFurnShop(sel) {
  Object.assign(fshop, { open: true, sel: sel || null, hover: null, f: false, page: 0 });
  if (sel) { fshop.tab = TABS.findIndex(([c]) => c === FURNITURE[sel].cat); fshop.page = Math.floor(list().indexOf(sel) / 10); }
}
export function furnShopHover(mx, my) { fshop.hover = shown().find((_, k) => inR(cardRect(k), mx, my)) || null; }
export function furnShopClick(mx, my) {
  for (let i = 0; i < TABS.length; i++) if (inR(tabRect(i), mx, my)) { fshop.tab = i; fshop.page = 0; fshop.sel = null; return; }
  if (pages() > 1) for (let i = 0; i < 2; i++) if (inR(PAGER[i], mx, my)) { fshop.page = (fshop.page + (i ? 1 : pages() - 1)) % pages(); return; }
  if (inR(BTN_FLIP, mx, my)) { fshop.f = !fshop.f; return; }
  if (inR(BTN_NIGHT, mx, my)) { fshop.night = !fshop.night; return; }
  const id = shown().find((_, k) => inR(cardRect(k), mx, my));
  if (id) fshop.sel = id;
}

export function furnShopBar(me) {
  const id = fshop.sel;
  let html = '<span class="info">Clique sur un article pour le voir dans ta pièce</span>', sig = 'fshop' + id + me.chips + JSON.stringify(me.apt?.stock) + me.apt?.styles;
  if (id) {
    const price = priceOf(id), ok = me.chips >= price && !me.homeless;
    if (isStyle(id) && ownsStyle(me.apt, id)) html = '<span class="info">Déjà à toi : pose-le chez toi avec le mode déco (B)</span>';
    else html = `<button class="go big" data-fbuy="${id}" ${ok ? '' : 'disabled'}>Acheter — ${fmt(price)} jetons</button>` +
      (me.homeless ? '<span class="info">Pas d\'achat sans domicile... remonte la pente d\'abord !</span>' : ok ? '' : `<span class="info">Il te manque ${fmt(price - me.chips)} jetons</span>`);
  }
  return { sig, html: html + '<button data-close>Quitter (Échap)</button>' };
}

export function furnCelebrate() {
  const cols = ['#ffc030', '#ff4ab0', '#4aa8ff', '#60ff80', '#fff'];
  for (let i = 0; i < 80; i++) fshop.confetti.push({ x: 95, y: 110, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 5 - 1, life: 60 + Math.random() * 40, c: cols[i % cols.length] });
}
