// The street in front of the casino, at night: facade, sidewalk, road, passers-by, pigeons, trash cans.
import { T, ST, BINS, BUSK, LAMPS, BENCH, HYDRANT, BOUNCER, ENTRY_MIN, nearDoorOut, nearBusk, nearBin } from './map.js';
import { canvas, text, label, plantSprite } from './sprites.js';
import { drawAvatar } from './avatar.js';
import { BY_SLOT, NPC_OUTFITS, SKINS, HAIR_COLORS } from './items.js';
import { overheads } from './world.js';

const W = ST.w * T, H = ST.h * T;
const DOOR_X = 20 * T;

// ---------- static background ----------
let bg = null;
function background() {
  if (bg) return bg;
  const [c, x] = canvas(W, H);
  const px = (col, X, Y, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(X, Y, w, h); };
  // facade: bricks, warm windows, marble base with gold pilasters
  for (let y = 0; y < 6 * T; y++) for (let X = 0; X < W; X++) {
    const row = Math.floor(y / 4), mortar = y % 4 === 3 || (X + (row % 2) * 6) % 12 === 0;
    px(mortar ? '#240c18' : (X * 7 + row * 3) % 13 ? '#3c1428' : '#46182e', X, y);
  }
  px('#c8a040', 0, 3, W, 2); px('#c8a040', 0, 52, W, 2);
  for (let X = 24; X < W - 24; X += 56) {
    if (Math.abs(X + 14 - DOOR_X) < 60) continue;
    px('#c8a040', X - 2, 14, 32, 30);
    px('#ffcf78', X, 16, 28, 26);
    px('#ffe8b0', X, 16, 28, 4);
    px('#c8a040', X + 13, 16, 2, 26); px('#c8a040', X, 28, 28, 2);
    if ((X / 56) % 3 < 1) { px('#5a3020', X + 4, 30, 5, 12); px('#5a3020', X + 5, 27, 3, 3); } // silhouettes
    if ((X / 56) % 4 > 2) { px('#5a3020', X + 18, 32, 5, 10); px('#5a3020', X + 19, 29, 3, 3); }
  }
  px('#1c1424', 0, 56, W, 40);
  for (let X = 8; X < W; X += 32) { px('#2a2234', X, 56, 6, 40); px('#c8a040', X, 56, 6, 2); px('#c8a040', X, 92, 6, 2); }
  px('#0e0a14', 0, 94, W, 2);
  // entrance: golden frame, glass doors, red canopy
  px('#c8a040', DOOR_X - 34, 44, 68, 52);
  px('#1a1420', DOOR_X - 30, 50, 60, 46);
  for (const dx of [-28, 2]) {
    px('#284060', DOOR_X + dx, 54, 26, 42);
    px('#5a88b8', DOOR_X + dx + 3, 57, 4, 30);
    px('#c8a040', DOOR_X + dx + (dx < 0 ? 22 : 2), 72, 2, 8);
  }
  px('#a01828', DOOR_X - 40, 40, 80, 8); px('#d03040', DOOR_X - 40, 40, 80, 2);
  for (let k = 0; k < 10; k++) px('#c8a040', DOOR_X - 38 + k * 8, 48, 4, 3);
  // sidewalk pavers
  for (let y = 6 * T; y < 12 * T; y++) for (let X = 0; X < W; X++) {
    const grout = y % 16 === 0 || (X + (Math.floor(y / 16) % 2) * 8) % 16 === 0;
    px(grout ? '#55555e' : (X * 13 + y * 7) % 29 === 0 ? '#6e6e78' : '#7a7a86', X, y);
  }
  for (let k = 0; k < 40; k++) px('#5a5a64', (k * 97) % W, 6 * T + (k * 53) % (6 * T), 2, 1); // gum and stains
  // red carpet from the door
  px('#9a1828', DOOR_X - 24, 6 * T, 48, 44); px('#c8a040', DOOR_X - 24, 6 * T, 2, 44); px('#c8a040', DOOR_X + 22, 6 * T, 2, 44);
  // curb and road
  px('#c8c8d0', 0, 12 * T - 2, W, 2); px('#3a3a44', 0, 12 * T, W, 2);
  for (let y = 12 * T + 2; y < 15 * T; y++) for (let X = 0; X < W; X++) px((X * 31 + y * 17) % 23 === 0 ? '#34343c' : '#26262c', X, y);
  for (let X = 0; X < W; X += 24) px('#d8d8d0', X, 13 * T + 7, 12, 2);
  for (let X = DOOR_X - 30; X < DOOR_X + 30; X += 10) px('#c8c8c8', X, 12 * T + 3, 6, 3 * T - 6); // crosswalk
  px('#c8c8d0', 0, 15 * T, W, 2);
  // far sidewalk and shops across the street
  for (let y = 15 * T + 2; y < 16 * T; y++) for (let X = 0; X < W; X++) px((X + y) % 16 ? '#5e5e68' : '#4a4a52', X, y);
  const shops = [[0, 160, '#1c3a2a', 'PRETEUR SUR GAGES', '#60ff80'], [168, 160, '#3a1414', 'PIZZA', '#ffb040'], [336, 150, '#14223a', 'HOTEL', '#80c0ff'], [494, 146, '#2a2a2a', 'LAVERIE', '#ff80d0']];
  for (const [sx, sw, col, name, neon] of shops) {
    px(col, sx, 16 * T, sw, 2 * T);
    for (let k = 0; k < sw - 8; k += 8) px(k % 16 ? '#e8e8e8' : neon, sx + 4 + k, 16 * T, 8, 5); // awning
    px('#ffd890', sx + 10, 16 * T + 9, sw - 20, 14);
    px('rgba(0,0,0,.25)', sx + 10, 16 * T + 9, sw - 20, 3);
    text(x, name, sx + sw / 2, 16 * T + 13, '#3a2010', 1, 'center');
  }
  // side walls
  px('#14080e', 0, 0, T, H); px('#14080e', W - T, 0, T, H);
  // cardboard shelter in the corner
  px('#a07840', T + 2, 6 * T + 2, 28, 22); px('#c09858', T + 2, 6 * T + 2, 28, 4); px('#5a4020', T + 12, 6 * T + 10, 10, 14);
  text(x, 'HOME', T + 16, 6 * T + 4, '#5a4020', 1, 'center');
  px('#3a5a8a', T + 4, 7 * T + 8, 20, 6); // sleeping bag
  return (bg = c);
}

// ---------- passers-by, pigeons, cars ----------
function seeded(k) { const s = Math.sin(k * 91.17) * 10000; return s - Math.floor(s); }
const WALKERS = Array.from({ length: 6 }, (_, i) => {
  const pick = (slot, j) => { const l = BY_SLOT[slot].filter(it => it.price >= 0); return l[Math.floor(seeded(i * 10 + j) * l.length)].id; };
  return {
    outfit: { hair: pick('hair', 1), top: pick('top', 2), bottom: pick('bottom', 3), shoes: pick('shoes', 4), hat: seeded(i + 50) < 0.4 ? pick('hat', 5) : null, glasses: seeded(i + 60) < 0.3 ? pick('glasses', 6) : null, skin: Math.floor(seeded(i + 70) * SKINS.length), hairColor: Math.floor(seeded(i + 80) * HAIR_COLORS.length) },
    color: ['#e04050', '#3a7bd5', '#2fb36b', '#f2b233', '#9b51e0', '#ff7a2f'][i],
    speed: 18 + seeded(i + 90) * 14, dir: i % 2 ? -1 : 1, off: seeded(i + 100) * W, y: (9.6 + (i % 3) * 0.7) * T,
  };
});
function walkerPos(w, now) {
  const span = W + 60, d = ((now / 1000 * w.speed + w.off) % span + span) % span;
  return { x: w.dir > 0 ? d - 30 : W + 30 - d, y: w.y };
}

const PIGEONS = [[5, 9.4], [7, 10.6], [13.5, 8.5], [16, 10.2], [24.5, 9], [26, 8.2], [31, 10.4], [37, 9.3]].map(([x, y]) => ({ x: x * T, y: y * T, scared: -1e9, dx: 1 }));
function drawPigeon(x, p, now, players) {
  if (now - p.scared > 7000 && players.some(q => Math.hypot(q.x - p.x, q.y - p.y) < 26)) { p.scared = now; p.dx = Math.random() < 0.5 ? -1 : 1; }
  const el = now - p.scared;
  if (el < 4000) { // flying away
    if (el > 2500) return;
    const k = el / 2500, X = Math.round(p.x + p.dx * k * 120), Y = Math.round(p.y - k * 90 - Math.sin(k * 9) * 3), flap = Math.floor(now / 70) % 2;
    x.globalAlpha = 1 - k;
    x.fillStyle = '#6a6a78'; x.fillRect(X - 2, Y, 5, 2);
    x.fillStyle = '#8a8a98'; x.fillRect(X - 4, Y - (flap ? 2 : -1), 3, 1); x.fillRect(X + 2, Y - (flap ? 2 : -1), 3, 1);
    x.globalAlpha = 1;
    return;
  }
  if (el < 7000) { x.globalAlpha = (el - 4000) / 3000; }
  const peck = Math.floor(now / 700 + p.x) % 3 === 0, X = Math.round(p.x), Y = Math.round(p.y);
  x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(X - 3, Y, 6, 1);
  x.fillStyle = '#6a6a78'; x.fillRect(X - 3, Y - 4, 5, 3);
  x.fillStyle = '#4a4a58'; x.fillRect(X - 3, Y - 4, 2, 2);
  x.fillStyle = '#7a8a9a'; x.fillRect(X + (p.dx > 0 ? 1 : -3), Y - (peck ? 2 : 5), 2, 2);
  x.fillStyle = '#e0a040'; x.fillRect(X + (p.dx > 0 ? 3 : -4), Y - (peck ? 1 : 4), 1, 1);
  x.fillStyle = '#c06040'; x.fillRect(X - 1, Y - 1, 1, 1); x.fillRect(X + 1, Y - 1, 1, 1);
  x.globalAlpha = 1;
}

const CARS = Array.from({ length: 5 }, (_, i) => ({ lane: i % 2, speed: 70 + seeded(i + 200) * 50, off: seeded(i + 210) * 2000, col: ['#d02030', '#2a6ad0', '#f0c020', '#e8e8e8', '#202028'][i] }));
function drawCars(x, now) {
  for (const c of CARS) {
    const span = W + 200, d = ((now / 1000 * c.speed + c.off) % span + span) % span;
    const X = Math.round(c.lane ? W + 100 - d : d - 100), Y = c.lane ? 14 * T - 8 : 12 * T + 10, dir = c.lane ? -1 : 1;
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(X - 15, Y + 9, 32, 3);
    x.fillStyle = c.col; x.fillRect(X - 15, Y, 30, 10);
    x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(X - 15, Y + 7, 30, 3);
    x.fillStyle = '#9ac8f0'; x.fillRect(X - 7, Y + 1, 14, 4);
    x.fillStyle = c.col; x.fillRect(X - 1, Y + 1, 2, 4);
    x.fillStyle = '#101014'; x.fillRect(X - 12, Y + 9, 5, 3); x.fillRect(X + 7, Y + 9, 5, 3);
    x.fillStyle = '#fff6a0'; x.fillRect(dir > 0 ? X + 14 : X - 15, Y + 2, 1, 3);
    x.fillStyle = '#ff3030'; x.fillRect(dir > 0 ? X - 15 : X + 14, Y + 2, 1, 3);
  }
}

// ---------- coins flying into the guitar case ----------
const coins = [];
export function tipFx(to, amt, from, players, now) {
  const busker = players.find(p => p.id === to);
  if (!busker) return;
  let src = players.find(p => p.id === from);
  if (!src) { // nearest passer-by drops it
    src = WALKERS.map(w => walkerPos(w, now)).sort((a, b) => Math.abs(a.x - busker.x) - Math.abs(b.x - busker.x))[0];
  }
  for (let k = 0; k < Math.min(6, 1 + Math.floor(amt / 3)); k++) coins.push({ x0: src.x, y0: src.y - 14, x1: BUSK.x - 12 + k, y1: BUSK.y + 2, t0: now + k * 80 });
  coins.push({ text: '+' + amt, x: BUSK.x - 10, y: BUSK.y - 6, t0: now + 500 });
}
function drawCoins(x, now) {
  for (let i = coins.length - 1; i >= 0; i--) {
    const c = coins[i], k = (now - c.t0) / 600;
    if (k < 0) continue;
    if (c.text) {
      if (k > 3) { coins.splice(i, 1); continue; }
      x.globalAlpha = Math.min(1, 3 - k);
      text(x, c.text, c.x, c.y - k * 12, '#ffe680', 1, 'center', '#000');
      x.globalAlpha = 1;
      continue;
    }
    if (k > 1) { coins.splice(i, 1); continue; }
    const X = c.x0 + (c.x1 - c.x0) * k, Y = c.y0 + (c.y1 - c.y0) * k - Math.sin(k * Math.PI) * 26;
    x.fillStyle = Math.floor(now / 60) % 2 ? '#ffe060' : '#c8a040'; x.fillRect(Math.round(X) - 1, Math.round(Y) - 1, 3, 3);
  }
}

// ---------- props ----------
function bin(x, i, now, st) {
  const [bx, by] = [BINS[i][0] * T, BINS[i][1] * T], shake = st.shakeUntil > now ? Math.round(Math.sin(now / 30) * 1.5) : 0, empty = st.until > now;
  x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(bx - 7, by - 1, 14, 3);
  x.fillStyle = '#2a4a34'; x.fillRect(bx - 6 + shake, by - 15, 12, 15);
  x.fillStyle = '#3a6a48'; for (let k = 0; k < 4; k++) x.fillRect(bx - 5 + k * 3 + shake, by - 14, 1, 13);
  x.fillStyle = '#1a2a20'; x.fillRect(bx - 6 + shake, by - 15, 12, 1);
  if (empty) { // lid knocked on the ground
    x.fillStyle = '#4a7a58'; x.fillRect(bx + 7, by - 2, 9, 2);
  } else {
    x.fillStyle = '#4a7a58'; x.fillRect(bx - 7 + shake, by - 18 - (shake ? 2 : 0), 14, 3);
    x.fillStyle = '#1a2a20'; x.fillRect(bx - 1 + shake, by - 19 - (shake ? 2 : 0), 3, 1);
    x.fillStyle = '#c8c8a0'; x.fillRect(bx - 4, by - 17, 3, 2); x.fillStyle = '#e8d040'; x.fillRect(bx + 2, by - 17, 3, 1);
    x.fillStyle = '#101010'; // flies on a full bin
    for (let k = 0; k < 2; k++) { const a = now / 150 + k * 3 + i; x.fillRect(Math.round(bx + Math.cos(a) * 6), Math.round(by - 22 + Math.sin(a * 1.4) * 3), 1, 1); }
  }
  if (st.shakeUntil > now) { // trash flying out
    for (let k = 0; k < 4; k++) {
      const ph = ((now / 400) + k / 4) % 1;
      x.fillStyle = ['#e8d040', '#d0d0c0', '#a06030', '#80c060'][k];
      x.fillRect(Math.round(bx + (k - 1.5) * 6 * ph), Math.round(by - 18 - Math.sin(ph * Math.PI) * 14), 2, 2);
    }
  }
}
function lamp(x, lx, ly) {
  x.fillStyle = '#1a1a22'; x.fillRect(lx - 1, ly - 44, 3, 44);
  x.fillStyle = '#2a2a34'; x.fillRect(lx - 3, ly - 2, 7, 2);
  x.fillStyle = '#1a1a22'; x.fillRect(lx - 4, ly - 47, 9, 4);
  x.fillStyle = '#fff0b0'; x.fillRect(lx - 3, ly - 43, 7, 2);
}
function ropes(x) {
  for (const sx of [DOOR_X - 30, DOOR_X + 28]) for (const sy of [6 * T + 8, 8 * T + 4]) { x.fillStyle = '#c8a040'; x.fillRect(sx, sy - 10, 2, 10); x.fillRect(sx - 1, sy - 11, 4, 2); }
  for (const sx of [DOOR_X - 29, DOOR_X + 29]) { x.fillStyle = '#b01828'; for (let k = 0; k < 26; k++) x.fillRect(sx, 6 * T + 1 + k, 1, 1 + (Math.abs(k - 13) < 6 ? 1 : 0)); }
}

// ---------- the scene ----------
export const streetState = { bins: BINS.map(() => ({ until: 0, shakeUntil: 0 })), bouncerSay: null };
export function floatAt(x, y, text) { coins.push({ text, x, y, t0: performance.now() }); }

export function drawStreet(x, cam, now, players, meId, prompts) {
  const t = now / 1000;
  x.drawImage(background(), -cam.x, -cam.y);
  x.save(); x.translate(-cam.x, -cam.y);
  // neon sign + canopy bulbs
  const flick = Math.sin(t * 9) > 0.96 ? 0.3 : 1;
  x.globalAlpha = 0.35 * flick;
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) text(x, 'LE GRAND PIXEL', DOOR_X + dx, 20 + dy, '#ff2090', 2, 'center');
  x.globalAlpha = flick; text(x, 'LE GRAND PIXEL', DOOR_X, 20, '#ff8ad8', 2, 'center'); x.globalAlpha = 1;
  for (let k = 0; k < 10; k++) { x.fillStyle = (k + Math.floor(t * 6)) % 3 === 0 ? '#fff6a0' : '#806020'; x.fillRect(DOOR_X - 38 + k * 8, 48, 4, 3); }
  ropes(x);
  // busking spot
  x.fillStyle = '#b08850'; x.fillRect(BUSK.x - 14, BUSK.y - 6, 28, 12);
  x.fillStyle = '#8a6838'; x.fillRect(BUSK.x - 14, BUSK.y + 4, 28, 2);
  const busker = players.find(p => p.busking);
  if (!busker) text(x, 'MUSIQUE SVP', BUSK.x, BUSK.y - 4, '#5a4020', 1, 'center');

  const objs = [];
  BINS.forEach((b, i) => objs.push([b[1] * T, () => bin(x, i, now, streetState.bins[i])]));
  for (const [lx, ly] of LAMPS) objs.push([ly * T, () => lamp(x, lx * T, ly * T)]);
  objs.push([BENCH[1] * T, () => {
    const bx = BENCH[0] * T, by = BENCH[1] * T;
    x.fillStyle = '#2a1a10'; x.fillRect(bx + 2, by - 4, 2, 5); x.fillRect(bx + 28, by - 4, 2, 5);
    x.fillStyle = '#7a4a24'; x.fillRect(bx, by - 10, 32, 3); x.fillRect(bx, by - 5, 32, 3);
  }]);
  objs.push([HYDRANT[1] * T, () => { const hx = HYDRANT[0] * T, hy = HYDRANT[1] * T; x.fillStyle = '#c02020'; x.fillRect(hx - 3, hy - 9, 6, 9); x.fillRect(hx - 4, hy - 6, 8, 2); x.fillStyle = '#e04040'; x.fillRect(hx - 2, hy - 10, 4, 2); }]);
  for (const sx of [DOOR_X - 46, DOOR_X + 32]) objs.push([6 * T + 4, () => x.drawImage(plantSprite(), sx, 6 * T - 13)]);
  objs.push([BOUNCER.y, () => drawAvatar(x, BOUNCER.x, BOUNCER.y, NPC_OUTFITS.bouncer, '#222', 0, 0, now)]);
  for (const w of WALKERS) {
    const p = walkerPos(w, now);
    objs.push([p.y, () => drawAvatar(x, p.x, p.y, w.outfit, w.color, w.dir > 0 ? 2 : 1, 1 + Math.floor(now / 160 + w.off) % 2, now)]);
  }
  for (const pg of PIGEONS) objs.push([pg.y, () => drawPigeon(x, pg, now, players)]);
  for (const p of players) objs.push([p.y, () => {
    const frame = p.moving ? 1 + (Math.floor(t * 8) % 2) : 0;
    if (p.busking) { // open guitar case in front
      x.fillStyle = '#3a2010'; x.fillRect(BUSK.x - 20, BUSK.y - 2, 14, 7);
      x.fillStyle = '#901828'; x.fillRect(BUSK.x - 19, BUSK.y - 1, 12, 5);
      for (let k = 0; k < Math.round(p.hype * 8); k++) { x.fillStyle = (k + Math.floor(now / 200)) % 3 ? '#e8c050' : '#fff6a0'; x.fillRect(BUSK.x - 18 + (k * 5) % 10, BUSK.y + (k % 2) * 2, 2, 1); }
    }
    const sway = p.drunk ? Math.round(Math.sin(now / 300 + p.x) * p.drunk * 2.5) : 0;
    drawAvatar(x, p.x + sway, p.y, p.outfit, p.color, p.dir, frame, now, { homeless: p.homeless });
    if (p.busking) { // guitar held across the body + notes
      const gx = p.x - 7, gy = p.y - 10, strum = Math.floor(now / 140) % 2;
      x.fillStyle = '#3a2010'; x.fillRect(gx + 7, gy - 1 + strum, 9, 2);
      x.fillStyle = '#b06a2a'; x.fillRect(gx, gy - 2, 8, 6); x.fillStyle = '#d08a4a'; x.fillRect(gx + 1, gy - 2, 6, 1);
      x.fillStyle = '#1a1008'; x.fillRect(gx + 3, gy, 2, 2);
      if (p.hype > 0.1) for (let k = 0; k < 2; k++) {
        const ph = (now / 1400 + k / 2) % 1;
        x.globalAlpha = 1 - ph; text(x, '*', p.x + (k ? 8 : -12) + Math.sin(ph * 6) * 3, p.y - 26 - ph * 14, k ? '#ffe060' : '#80f0ff'); x.globalAlpha = 1;
      }
    }
  }]);
  objs.sort((a, b) => a[0] - b[0]);
  for (const [, f] of objs) f();
  drawCars(x, now);
  drawCoins(x, now);
  nightLights(x, t);
  overheads(x, players, now, meId);
  if (streetState.bouncerSay && now - streetState.bouncerSay.at < 4000) label(x, streetState.bouncerSay.text, BOUNCER.x, BOUNCER.y - 40, '#ff8080', 'rgba(20,0,0,.9)');
  for (const pr of prompts) label(x, pr.text, pr.x, pr.y, '#ffe680', 'rgba(30,10,40,.9)');
  x.restore();
}

let lightBuf = null;
function nightLights(x, t) {
  if (!lightBuf) lightBuf = canvas(W / 4, H / 4);
  const [lc, l] = lightBuf;
  l.globalCompositeOperation = 'source-over';
  l.fillStyle = 'rgba(6,8,30,.62)'; l.fillRect(0, 0, W / 4, H / 4);
  l.globalCompositeOperation = 'destination-out';
  const spot = (sx, sy, r, a) => {
    const g = l.createRadialGradient(sx / 4, sy / 4, 0, sx / 4, sy / 4, r / 4);
    g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    l.fillStyle = g; l.fillRect(sx / 4 - r / 4, sy / 4 - r / 4, r / 2, r / 2);
  };
  for (const [lx, ly] of LAMPS) spot(lx * T, ly * T - 20, 80, 0.9);
  spot(DOOR_X, 5 * T, 110, 0.95);
  spot(BUSK.x, BUSK.y, 40, 0.5);
  for (let X = 24; X < W; X += 56) spot(X + 14, 30, 40, 0.5);
  spot(W / 2, 17 * T, W, 0.3);
  x.save(); x.imageSmoothingEnabled = true; x.drawImage(lc, 0, 0, W, H); x.restore();
  x.save(); x.globalCompositeOperation = 'lighter';
  const glow = (gx, gy, r, col) => { const g = x.createRadialGradient(gx, gy, 0, gx, gy, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(gx - r, gy - r, r * 2, r * 2); };
  glow(DOOR_X, 26, 80, `rgba(255,40,160,${0.18 + 0.04 * Math.sin(t * 3)})`);
  for (const [lx, ly] of LAMPS) glow(lx * T, ly * T - 30, 50, 'rgba(255,200,100,.16)');
  x.restore();
}

export function nearbyStreet(me, players) {
  if (me.busking) return null;
  if (nearDoorOut(me)) return { kind: 'door', x: me.x, y: me.y - 44, text: me.homeless && me.chips < ENTRY_MIN ? `VIDEUR : ${ENTRY_MIN} JETONS MIN.` : 'E : ENTRER AU CASINO' };
  const busker = players.find(p => p.busking && p.id !== me.id && Math.hypot(p.x - me.x, p.y - me.y) < 40);
  if (busker) return { kind: 'tip', to: busker.id, x: busker.x, y: busker.y - 52, text: 'E : DONNER 10 A ' + busker.name };
  if (nearBusk(me) && !players.some(p => p.busking)) return { kind: 'busk', x: BUSK.x, y: BUSK.y - 40, text: 'E : JOUER DE LA GUITARE' };
  const b = nearBin(me);
  if (b >= 0) {
    const st = streetState.bins[b];
    return { kind: 'bin', i: b, x: BINS[b][0] * T, y: BINS[b][1] * T - 34, text: st.until > performance.now() ? 'POUBELLE VIDE...' : 'E : FOUILLER LA POUBELLE' };
  }
  return null;
}
