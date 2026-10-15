// The bar screen: order drinks from the menu board. Drawn in a 480x270 space.
import { DRINKS, drunkLevel } from './drinks.js';
import { NPC_OUTFITS } from './items.js';
import { drawAvatar } from './avatar.js';
import { canvas, text, textW, grid, chipSprite } from './sprites.js';

const SW = 480, SH = 270;
export const barUi = { open: false, hover: -1, served: null };

const PAL = { g: 'rgba(200,225,245,.85)', y: '#f0b020', w: '#fff', r: '#901830', l: '#80e040', s: '#e8e8e8', a: '#d08020', o: '#fff8c0', b: '#60b0ff', k: '#4a2810' };
const ICONS = Object.fromEntries(Object.entries({
  beer: ['..wwwww...', '.wwwwwww..', '.gyyyyyg..', '.gyyyyyggg', '.gyyyyyg.g', '.gyyyyyg.g', '.gyyyyyggg', '.gyyyyyg..', '.ggggggg..'],
  wine: ['..g...g...', '..g...g...', '..grrrg...', '..grrrg...', '...grg....', '....g.....', '....g.....', '....g.....', '..ggggg...'],
  mojito: ['......s...', '.....s....', '..glllg...', '..glwlg...', '..glllg...', '..gwllg...', '..glllg...', '..glllg...', '..ggggg...'],
  whisky: ['..........', '..........', '..........', '.g.....g..', '.gwwaaag..', '.gwaaaag..', '.gaaaaag..', '.gaaaaag..', '.ggggggg..'],
  shot: ['..........', '..........', '....ll....', '...llll...', '..g...g...', '..gyyyg...', '..gyyyg...', '..gyyyg...', '..ggggg...'],
  champagne: ['...o.o....', '..g.o.g...', '..gyyyg...', '..gyoyg...', '..gyyyg...', '...gyg....', '....g.....', '....g.....', '..ggggg...'],
  water: ['..........', '..........', '..........', '.g.....g..', '.gwwbbbg..', '.gbbbbbg..', '.gbbbbbg..', '.gbbbbbg..', '.ggggggg..'],
  coffee: ['...s.s....', '....s.....', '...s......', '.wwwwww...', '.wkkkkw...', '.wwwwwwww.', '.wwwwww.w.', '.wwwwwww..', '..wwww....'],
}).map(([k, rows]) => [k, grid(rows, PAL)]));

const ROW = i => [272, 32 + i * 14, 196, 13];
const inR = ([x, y, w, h], mx, my) => mx >= x && mx < x + w && my >= y && my < y + h;

// Bottles on the back shelves, fixed pseudo-random so they do not flicker.
const BOTTLES = Array.from({ length: 60 }, (_, k) => ({
  shelf: k % 3, x: 8 + Math.floor(k / 3) * 12 + (k % 3) * 3,
  h: 14 + (k * 7) % 9, col: ['#3a8040', '#a02828', '#d8b040', '#4060c0', '#e8e8f0', '#8a3a10', '#40a0a0', '#c040a0'][(k * 5) % 8],
}));

const priceOf = (d, me) => (me.zone === 'vip' && d.id === 'champagne' ? 0 : d.price); // champagne on the house upstairs

export function drawBarScreen(x, w, h, now, me) {
  const title = me.zone === 'vip' ? 'BAR VIP' : 'LE BAR';
  const ox = (w - SW) >> 1, oy = (h - SH) >> 1;
  x.fillStyle = '#1a0c08'; x.fillRect(0, 0, w, h);
  x.save(); x.translate(ox, oy);
  // back wall: wood panels + glowing shelves
  for (let xx = 0; xx < SW; xx += 20) { x.fillStyle = xx % 40 ? '#2a140a' : '#24100a'; x.fillRect(xx, 0, 20, 180); }
  for (const b of BOTTLES) {
    if (b.x > 250) continue;
    const by = 52 + b.shelf * 42;
    x.fillStyle = b.col; x.fillRect(b.x, by - b.h, 6, b.h); x.fillRect(b.x + 2, by - b.h - 4, 2, 4);
    x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(b.x + 1, by - b.h + 2, 1, b.h - 4);
    x.fillStyle = '#e8e0c8'; x.fillRect(b.x + 1, by - b.h / 2, 4, 3);
  }
  for (let s = 0; s < 3; s++) {
    x.fillStyle = '#c8a040'; x.fillRect(0, 52 + s * 42, 258, 3);
    x.save(); x.globalCompositeOperation = 'lighter';
    x.fillStyle = 'rgba(255,170,60,.10)'; x.fillRect(0, 22 + s * 42, 258, 30);
    x.restore();
  }
  const a = 0.75 + 0.25 * Math.sin(now / 200);
  x.globalAlpha = a * 0.4; for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) text(x, title, 128 + dx, 4 + dy, me.zone === 'vip' ? '#c8a040' : '#20c040', 2, 'center'); x.globalAlpha = 1;
  text(x, title, 128, 4, me.zone === 'vip' ? '#ffe680' : '#80ff90', 2, 'center');
  // bartender behind the counter
  const dir = barUi.served && now - barUi.served.at < 2500 ? 0 : [0, 2, 0, 1][Math.floor(now / 2200) % 4];
  const [pv, pvx] = canvas(30, 30);
  drawAvatar(pvx, 15, 28, NPC_OUTFITS.barman, '#222230', dir, 0, now);
  x.drawImage(pv, 128 - 60, 188 - 112 + Math.round(Math.sin(now / 600)), 120, 120);
  // counter
  x.fillStyle = '#7a4424'; x.fillRect(0, 176, SW, 10);
  x.fillStyle = '#a06038'; x.fillRect(0, 176, SW, 2);
  x.fillStyle = '#c8a040'; x.fillRect(0, 186, SW, 2);
  x.fillStyle = '#2a1408'; x.fillRect(0, 188, SW, 82);
  for (let k = 0; k < 8; k++) { x.fillStyle = '#3a1c0c'; x.fillRect(8 + k * 60, 196, 50, 66); x.fillStyle = '#4a2410'; x.fillRect(10 + k * 60, 198, 46, 2); }
  // served drink slides along the counter
  if (barUi.served) {
    const el = now - barUi.served.at, d = DRINKS.find(q => q.id === barUi.served.id);
    if (el > 3000) barUi.served = null;
    else {
      const p = Math.min(1, el / 600), dx = 150 + (232 - 150) * (1 - (1 - p) ** 3);
      x.globalAlpha = el > 2400 ? (3000 - el) / 600 : 1;
      x.drawImage(ICONS[d.icon], Math.round(dx), 148, 30, 27);
      if (p >= 1) text(x, 'SANTE !', dx + 15, 136, '#ffe680', 1, 'center', '#000');
      x.globalAlpha = 1;
    }
  }
  // drunk gauge on the counter front
  const lv = drunkLevel(me.drunk);
  text(x, 'IVRESSE', 20, 204, '#e8d8c0');
  x.fillStyle = '#0a0404'; x.fillRect(20, 213, 162, 10);
  const gw = Math.round(160 * Math.min(1, me.drunk));
  for (let k = 0; k < gw; k++) { x.fillStyle = `hsl(${120 - k * 0.75},90%,55%)`; x.fillRect(21 + k, 214, 1, 8); }
  text(x, lv[1], 20, 228, lv[2], 2, 'left', '#000');
  text(x, 'TES MISES : X1 A X' + (1 + 2 * Math.min(1, me.drunk)).toFixed(1), 20, 244, '#c8b8a8');
  // menu board
  x.fillStyle = '#7a4424'; x.fillRect(264, 8, 212, 168);
  x.fillStyle = '#1a2620'; x.fillRect(268, 12, 204, 160);
  text(x, 'LA CARTE', 370, 18, '#f0f0e8', 1, 'center');
  DRINKS.forEach((d, i) => {
    const [rx, ry, rw, rh] = ROW(i), on = barUi.hover === i, pr = priceOf(d, me), ok = me.chips >= pr;
    if (on) { x.fillStyle = 'rgba(255,255,255,.1)'; x.fillRect(rx, ry - 1, rw, rh); }
    x.drawImage(ICONS[d.icon], rx + 2, ry + 1);
    text(x, d.name, rx + 16, ry + 4, on ? '#ffe680' : '#e8e8e0');
    const pips = Math.round(Math.abs(d.strength) * 10);
    for (let k = 0; k < Math.min(5, pips); k++) { x.fillStyle = d.strength > 0 ? '#ff6050' : '#60b0ff'; x.fillRect(rx + 104 + k * 4, ry + 5, 3, 3); }
    const price = pr ? pr + '' : 'OFFERT';
    if (pr) x.drawImage(chipSprite('#e2b02c', '#fff6c8'), rx + rw - textW(price) - 13, ry + 2);
    text(x, price, rx + rw - 3, ry + 4, ok ? '#ffe680' : '#ff6060', 1, 'right');
  });
  const hov = DRINKS[barUi.hover];
  if (hov) text(x, hov.desc, 370, 164, '#a8c0b0', 1, 'center');
  x.restore();
}

export function barHover(mx, my) { barUi.hover = DRINKS.findIndex((_, i) => inR(ROW(i), mx, my)); }
export function barClick(mx, my) { const i = DRINKS.findIndex((_, k) => inR(ROW(k), mx, my)); return i >= 0 ? DRINKS[i].id : null; }
export function served(id) { barUi.served = { id, at: performance.now() }; }

export function barBar(me) {
  return {
    sig: 'bar',
    html: '<span class="info">Clique sur une boisson pour la commander</span><button data-close>Quitter (Échap)</button>',
  };
}
