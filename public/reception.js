// VIP reception: pick a card (Or, Platine, Diamant), buy or upgrade. Drawn in a 480x270 space.
import { TIERS, upgradeCost } from './map.js';
import { NPC_OUTFITS } from './items.js';
import { drawAvatar } from './avatar.js';
import { canvas, text } from './sprites.js';

const SW = 480, SH = 270;
export const rec = { open: false, sel: 1, hover: 0, won: null };
const PERKS = [null,
  ['SALLE VIP', 'BJ - ROULETTE - POKER', 'MISES 500 A 25K', 'CHAMPAGNE OFFERT'],
  ['+ MEZZANINE PLATINE', 'BJ ET POKER', 'MISES JUSQU\'A 100K', 'ETOILE PLATINE'],
  ['+ SALON DIAMANT PRIVE', 'BJ - ROULETTE - POKER', 'MISES JUSQU\'A 500K', 'ETOILE SCINTILLANTE']];
const cardRect = k => [28 + (k - 1) * 146, 74, 128, 80];
const inR = ([x, y, w, h], mx, my) => mx >= x && mx < x + w && my >= y && my < y + h;
const fmt = n => n.toLocaleString('fr-FR');

// One card, drawn at (x, y). w scales the width for the flip animation.
export function drawCard(x, tier, cx, cy, now, name, wScale = 1) {
  const t = TIERS[tier], w = Math.max(2, Math.round(128 * Math.abs(wScale))), h = 80, X = Math.round(cx - w / 2), Y = Math.round(cy - h / 2);
  x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(X + 3, Y + 4, w, h);
  const g = x.createLinearGradient(X, Y, X + w, Y + h);
  g.addColorStop(0, t.color); g.addColorStop(1, t.dark);
  x.fillStyle = g; x.fillRect(X + 1, Y, w - 2, h); x.fillRect(X, Y + 1, w, h - 2);
  if (wScale < 0.3) return;
  x.save(); x.beginPath(); x.rect(X, Y, w, h); x.clip();
  x.fillStyle = 'rgba(255,255,255,.12)';
  for (let k = 0; k < 6; k++) x.fillRect(X, Y + 8 + k * 12, w, 1);
  const s = (now / 7 + tier * 60) % 260 - 60; // moving shine
  x.fillStyle = 'rgba(255,255,255,.35)';
  for (let i = 0; i < 14; i++) x.fillRect(X + s + i * 2, Y + i * 6, 12, 6);
  if (tier === 3) for (let k = 0; k < 6; k++) { const tw = Math.floor(now / 200 + k * 3) % 4 === 0; if (tw) { x.fillStyle = '#fff'; x.fillRect(X + 10 + k * 19, Y + 12 + (k * 23) % 50, 1, 1); x.fillRect(X + 9 + k * 19, Y + 13 + (k * 23) % 50, 3, 1); } }
  x.restore();
  text(x, 'LE GRAND PIXEL', X + 8, Y + 7, 'rgba(0,0,0,.55)');
  x.fillStyle = '#e8c860'; x.fillRect(X + 10, Y + 30, 16, 12); // chip
  x.fillStyle = '#a08030'; x.fillRect(X + 10, Y + 35, 16, 1); x.fillRect(X + 17, Y + 30, 1, 12);
  for (let k = 0; k < 4; k++) { x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(X + 34 + k * 20, Y + 36, 14, 3); }
  text(x, (name || 'MEMBRE').slice(0, 12), X + 8, Y + h - 12, 'rgba(0,0,0,.6)');
  text(x, t.name.replace('CARTE ', ''), X + w - 8, Y + h - 12, 'rgba(0,0,0,.7)', 1, 'right');
}

export function drawReception(x, w, h, now, me) {
  const ox = (w - SW) >> 1, oy = (h - SH) >> 1;
  x.fillStyle = '#08060c'; x.fillRect(0, 0, w, h);
  x.save(); x.translate(ox, oy);
  // art deco sunburst
  for (let k = 0; k < 24; k++) {
    const a = Math.PI * (k / 23), ex = 240 + Math.cos(a) * 400, ey = -20 + Math.sin(a) * 400;
    x.strokeStyle = k % 2 ? 'rgba(200,160,64,.10)' : 'rgba(200,160,64,.05)'; x.lineWidth = 1;
    x.beginPath(); x.moveTo(240, -20); x.lineTo(ex, ey); x.stroke();
  }
  x.fillStyle = '#c8a040'; x.fillRect(20, 50, 440, 1); x.fillRect(20, 250, 440, 1);
  text(x, 'RECEPTION VIP', 240 + 2, 12 + 2, '#3a2a08', 3, 'center');
  text(x, 'RECEPTION VIP', 240, 12, '#f0c040', 3, 'center');
  text(x, 'LE GRAND PIXEL - CLUB PRIVE', 240, 36, '#c8b8a0', 1, 'center');
  // hostess
  const [pv, pvx] = canvas(30, 30);
  drawAvatar(pvx, 15, 28, NPC_OUTFITS.hostess, '#222', 0, 0, now);
  x.drawImage(pv, 412, 4, 60, 60);
  for (let tier = 1; tier <= 3; tier++) {
    const [cx, cy, cw, ch] = cardRect(tier), lift = tier === rec.sel ? 6 + Math.sin(now / 300) * 2 : tier === rec.hover ? 3 : 0;
    if (tier === rec.sel) { x.fillStyle = `rgba(255,230,140,${0.18 + 0.08 * Math.sin(now / 200)})`; x.fillRect(cx - 6, cy - 6 - lift, cw + 12, ch + 12); }
    drawCard(x, tier, cx + cw / 2, cy + ch / 2 - lift, now, me.name);
    if (me.vip >= tier) {
      x.save(); x.translate(cx + cw - 30, cy + 18 - lift); x.rotate(-0.25);
      x.fillStyle = 'rgba(40,140,60,.85)'; x.fillRect(-26, -7, 52, 14);
      text(x, 'MEMBRE', 0, -2, '#fff', 1, 'center'); x.restore();
    }
    const price = me.vip >= tier ? 'OBTENUE' : fmt(upgradeCost(me.vip, tier));
    text(x, price, cx + cw / 2, cy + ch + 10, me.vip >= tier ? '#60ff80' : me.chips >= upgradeCost(me.vip, tier) ? '#ffe680' : '#ff7070', 2, 'center', '#000');
    PERKS[tier].forEach((l, i) => text(x, l, cx + cw / 2, cy + ch + 30 + i * 9, i ? '#a898b8' : TIERS[tier].color, 1, 'center'));
  }
  // celebration: the new card flips in the middle of the screen
  if (rec.won) {
    const el = now - rec.won.at;
    if (el > 4000) rec.won = null;
    else {
      x.fillStyle = `rgba(0,0,0,${Math.min(0.85, el / 400)})`; x.fillRect(-ox, -oy, w, h);
      const k = Math.min(1, el / 1400), flip = Math.cos((1 - k) * Math.PI * 4);
      x.save(); x.translate(240, 130); x.scale(1 + k * 0.6, 1 + k * 0.6);
      drawCard(x, rec.won.tier, 0, 0, now, me.name, flip);
      x.restore();
      if (el > 1400) {
        text(x, 'BIENVENUE AU CLUB', 240, 210, '#f0c040', 2, 'center', '#000');
        text(x, TIERS[rec.won.tier].name, 240, 228, TIERS[rec.won.tier].color, 1, 'center', '#000');
      }
    }
  }
  x.restore();
}

export function recHover(mx, my) { rec.hover = [1, 2, 3].find(k => inR(cardRect(k), mx, my)) || 0; }
export function recClick(mx, my) { const k = [1, 2, 3].find(t => inR(cardRect(t), mx, my)); if (k) rec.sel = k; }

export function recBar(me) {
  const t = rec.sel, cost = upgradeCost(me.vip, t);
  let html;
  if (me.vip >= t) html = `<span class="info">Tu es déjà membre ${TIERS[t].name.toLowerCase()}</span>`;
  else html = `<button class="go big" data-vip="${t}" ${me.chips >= cost ? '' : 'disabled'}>${me.vip ? 'Améliorer' : 'Obtenir'} la ${TIERS[t].name.toLowerCase()} — ${fmt(cost)} jetons</button>` +
    (me.chips >= cost ? '' : `<span class="info">Il te manque ${fmt(cost - me.chips)} jetons</span>`);
  return { sig: 'rec' + t + me.vip + (me.chips >= cost), html: html + '<button data-close>Quitter (Échap)</button>' };
}
