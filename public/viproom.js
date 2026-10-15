// The VIP floor upstairs: city view, aquarium wall, champagne tower, grand piano.
import { T, VW, VH, VIP_TABLES, V_NPCS, VIP_SPAWN, VIP_BAR, PIANO } from './map.js';
import { canvas, text, label } from './sprites.js';
import { tableObjs, npcObjs, playerObjs, tableChips, overheads } from './world.js';

const W = VW * T, H = VH * T;
const seeded = k => { const s = Math.sin(k * 77.31) * 10000; return s - Math.floor(s); };

let bg = null;
function background() {
  if (bg) return bg;
  const [c, x] = canvas(W, H);
  const px = (col, X, Y, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(X, Y, w, h); };
  // black marble with gold inlay
  for (let y = 4 * T; y < H; y++) for (let X = 0; X < W; X++) {
    const vein = Math.sin(X * 0.09 + y * 0.05) + Math.sin(X * 0.023 - y * 0.11) > 1.55;
    px(vein ? '#2a2432' : (X * 5 + y * 3) % 17 === 0 ? '#181420' : '#121018', X, y);
  }
  for (let y = 12 * T; y < H; y += 32) px('rgba(200,160,64,.35)', T, y, W - 2 * T, 1);
  for (let X = 2 * T; X < W; X += 32) px('rgba(200,160,64,.35)', X, 12 * T, 1, H - 13 * T);
  // Diamant salon: burgundy carpet with gold diamonds
  for (let y = 4 * T; y < 11 * T; y++) for (let X = T; X < W - T; X++) {
    const u = (X + y) % 20, v = (X - y + 2000) % 20;
    px(u === 0 || v === 0 ? '#6a1a2c' : u === 10 && v === 10 ? '#e0b848' : '#3a0a16', X, y);
  }
  // Platine mezzanine: raised, lighter marble with a silver edge and steps
  for (let y = 12 * T; y < 23 * T; y++) for (let X = 33 * T; X < 41 * T; X++) px((X * 3 + y) % 11 ? '#26283a' : '#30344a', X, y);
  px('#c8d0dc', 33 * T - 2, 12 * T, 2, 11 * T);
  for (let k = 0; k < 3; k++) px(k % 2 ? '#3a3e52' : '#4a5066', 33 * T - 8 + k * 2, 14 * T + 8, 2, 2 * T);
  text(x, 'PLATINE', 37 * T, 22 * T + 4, '#c8d0dc', 1, 'center');
  // red carpet from the elevator
  px('#8a1424', 19 * T, 11 * T + 8, 3 * T, 12 * T - 8); px('#c8a040', 19 * T, 11 * T + 8, 2, 12 * T - 8); px('#c8a040', 22 * T - 2, 11 * T + 8, 2, 12 * T - 8);
  // panoramic windows over the city at night
  const sky = x.createLinearGradient(0, 0, 0, 52);
  sky.addColorStop(0, '#060818'); sky.addColorStop(1, '#2a1a4a');
  x.fillStyle = sky; x.fillRect(0, 0, W, 52);
  for (let k = 0; k < 80; k++) px(seeded(k) > 0.8 ? '#fff' : '#8890c0', Math.floor(seeded(k + 1) * W), Math.floor(seeded(k + 2) * 26), 1, 1);
  px('#f0f0d8', 520, 8, 10, 10); px('#060818', 523, 7, 8, 8); // moon
  for (let X = 0, k = 0; X < W; k++) { // skyline
    const bw = 14 + Math.floor(seeded(k + 10) * 26), bh = 14 + Math.floor(seeded(k + 20) * 28);
    px(seeded(k + 30) > 0.5 ? '#0c0a1a' : '#14102a', X, 52 - bh, bw, bh);
    for (let wy = 52 - bh + 3; wy < 50; wy += 4) for (let wx = X + 2; wx < X + bw - 2; wx += 4) if (seeded(wx * 3 + wy) > 0.62) px(seeded(wx + wy) > 0.85 ? '#ff80d0' : '#ffd890', wx, wy, 2, 2);
    X += bw + 2;
  }
  for (let X = 0; X < W; X += 48) px('#c8a040', X, 0, 3, 52);
  px('#c8a040', 0, 0, W, 2); px('#c8a040', 0, 50, W, 3);
  px('#2a1408', 0, 53, W, 11); px('#c8a040', 0, 62, W, 2);
  // walls
  px('#100a14', 0, 4 * T, T, H); px('#100a14', W - T, 4 * T, T, H); px('#100a14', 0, H - T, W, T);
  px('#c8a040', T - 2, 4 * T, 2, H - 5 * T); px('#c8a040', W - T, 4 * T, 2, H - 5 * T); px('#c8a040', T, H - T, W - 2 * T, 2);
  // elevator doors in the bottom wall
  px('#c8a040', VIP_SPAWN.x - 22, H - T, 44, T); px('#d8b858', VIP_SPAWN.x - 19, H - T + 3, 18, T - 3); px('#d8b858', VIP_SPAWN.x + 1, H - T + 3, 18, T - 3);
  text(x, 'RDC', VIP_SPAWN.x, H - T - 7, '#f0c040', 1, 'center');
  return (bg = c);
}

// Aquarium wall + glass panels separating the Diamant salon (y 11).
function partition(x, now, myVip) {
  const y = 11 * T - 2;
  x.fillStyle = '#c8a040'; x.fillRect(T, y - 2, 18 * T, 14);
  x.fillStyle = '#0a3a6a'; x.fillRect(T + 2, y, 18 * T - 4, 10);
  for (let k = 0; k < 40; k++) { x.fillStyle = 'rgba(160,220,255,.35)'; x.fillRect(T + 4 + ((k * 37 + Math.floor(now / 90)) % (18 * T - 8)), y + 9 - ((now / 30 + k * 13) % 9), 1, 1); }
  for (let k = 0; k < 9; k++) { // fish
    const sp = 12 + seeded(k) * 18, dir = k % 2 ? 1 : -1, span = 18 * T - 12;
    const fx = T + 6 + (((now / 1000) * sp * dir + seeded(k + 5) * span) % span + span) % span, fy = y + 2 + (k % 3) * 3;
    x.fillStyle = ['#ff7a2f', '#ffe060', '#40d0ff', '#ff4ab0'][k % 4]; x.fillRect(Math.round(fx), fy, 4, 2);
    x.fillRect(Math.round(fx) + (dir > 0 ? -2 : 4), fy, 2, 2);
  }
  x.fillStyle = '#2a8a3a'; for (let k = 0; k < 12; k++) x.fillRect(T + 8 + k * 23, y + 6 + (k % 2), 2, 4 - (k % 2));
  x.fillStyle = '#c8a040'; x.fillRect(22 * T, y - 2, 19 * T, 14);
  for (let X = 22 * T + 2; X < 41 * T - 2; X += 24) { x.fillStyle = 'rgba(140,220,255,.25)'; x.fillRect(X, y, 22, 10); x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(X + 3, y + 1, 2, 8); }
  // the door: open for Diamant members
  const open = myVip >= 3;
  x.fillStyle = '#c8a040'; x.fillRect(19 * T - 2, y - 4, 3 * T + 4, 3);
  if (!open) { x.fillStyle = 'rgba(140,220,255,.4)'; x.fillRect(19 * T, y, 3 * T, 10); x.fillStyle = '#c8a040'; x.fillRect(20.5 * T - 1, y, 2, 10); }
  text(x, 'SALON DIAMANT', 20.5 * T, y - 12, Math.floor(now / 400) % 2 ? '#60e8ff' : '#c0f8ff', 1, 'center', '#000');
}

function vipBar(x, now) {
  const X = VIP_BAR.x * T, w = VIP_BAR.w * T;
  for (let k = 0; k < 13; k++) { // bottles in front of the aquarium
    x.fillStyle = ['#2a6a3a', '#a02828', '#e8d8a0', '#203a8a', '#d8b040'][k % 5]; x.fillRect(X + 4 + k * 8, 12 * T + 2, 4, 10); x.fillRect(X + 5 + k * 8, 12 * T - 1, 2, 3);
  }
  x.fillStyle = '#c8a040'; x.fillRect(X, 14 * T, w, 3);
  x.fillStyle = '#1c1424'; x.fillRect(X, 14 * T + 3, w, 13);
  x.fillStyle = '#2e2438'; x.fillRect(X, 14 * T + 3, w, 3);
  text(x, 'BAR VIP', X + w / 2, 14 * T + 7, '#f0c040', 1, 'center');
}

function champagneTower(x, now) {
  const cx = 9 * T + 8, by = 13 * T + 8;
  for (let row = 0; row < 4; row++) for (let k = 0; k <= 3 - row; k++) {
    const gx = cx - (3 - row) * 3 + k * 6 - 2, gy = by - row * 5;
    x.fillStyle = 'rgba(220,240,255,.8)'; x.fillRect(gx, gy - 4, 5, 1); x.fillRect(gx + 2, gy - 3, 1, 3);
    x.fillStyle = '#f0d060'; x.fillRect(gx + 1, gy - 6, 3, 2);
    if (Math.floor(now / 200 + row + k) % 3 === 0) { x.fillStyle = '#fff8c0'; x.fillRect(gx + 2, gy - 7, 1, 1); }
  }
}

function piano(x, now) {
  const X = PIANO.x, Y = PIANO.y;
  x.fillStyle = '#08080c'; x.fillRect(X, Y - 4, 44, 16); x.fillRect(X + 8, Y - 8, 28, 4);
  x.fillStyle = '#26262e'; x.fillRect(X + 2, Y - 3, 40, 2);
  x.fillStyle = '#f4f4f0'; x.fillRect(X + 4, Y + 10, 36, 4);
  for (let k = 0; k < 12; k++) if (k % 7 !== 2 && k % 7 !== 6) { x.fillStyle = '#101010'; x.fillRect(X + 6 + k * 3, Y + 10, 2, 2); }
  x.fillStyle = '#c8a040'; x.fillRect(X + 18, Y + 16, 8, 3); // stool
  for (let k = 0; k < 3; k++) { // music notes
    const ph = (now / 1800 + k / 3) % 1;
    x.globalAlpha = 1 - ph; text(x, '*', X + 12 + k * 10 + Math.sin(ph * 6) * 3, Y - 12 - ph * 18, ['#ffe060', '#80f0ff', '#ff80d0'][k]); x.globalAlpha = 1;
  }
}

function sofa(x, sx, sy) {
  x.fillStyle = '#c8a040'; x.fillRect(sx - 1, sy - 9, 38, 11);
  x.fillStyle = '#7a1022'; x.fillRect(sx, sy - 8, 36, 9);
  x.fillStyle = '#9a1830'; for (let k = 0; k < 3; k++) x.fillRect(sx + 2 + k * 12, sy - 6, 10, 5);
}

function statue(x, sx, sy, now) {
  x.fillStyle = '#2a2432'; x.fillRect(sx - 5, sy - 6, 10, 6);
  x.fillStyle = '#c8a040'; x.fillRect(sx - 3, sy - 20, 6, 14); x.fillRect(sx - 2, sy - 24, 4, 4);
  x.fillStyle = '#f8e080'; x.fillRect(sx - 2, sy - 19, 1, 10);
  if (Math.floor(now / 600 + sx) % 4 === 0) { x.fillStyle = '#fff'; x.fillRect(sx + 2, sy - 22, 1, 1); }
}

export function drawVip(x, cam, now, players, meId, prompts, myVip) {
  const t = now / 1000;
  x.drawImage(background(), -cam.x, -cam.y);
  x.save(); x.translate(-cam.x, -cam.y);
  const objs = [];
  tableObjs(x, objs, VIP_TABLES, players, now);
  npcObjs(x, objs, V_NPCS, now);
  objs.push([11 * T + 10, () => partition(x, now, myVip)]);
  objs.push([15 * T, () => vipBar(x, now)]);
  objs.push([13 * T + 9, () => champagneTower(x, now)]);
  objs.push([PIANO.y + 12, () => piano(x, now)]);
  for (const [sx, sy] of [[3 * T, 22 * T + 12], [26 * T, 22 * T + 12]]) objs.push([sy, () => sofa(x, sx, sy)]);
  for (const sx of [17 * T + 8, 23 * T + 8]) objs.push([22 * T + 14, () => statue(x, sx, 22 * T + 14, now)]);
  playerObjs(x, objs, players, now);
  objs.sort((a, b) => a[0] - b[0]);
  for (const [, f] of objs) f();
  tableChips(x, players, VIP_TABLES);
  lights(x, t);
  overheads(x, players, now, meId);
  for (const pr of prompts) label(x, pr.text, pr.x, pr.y, '#ffe680', 'rgba(30,10,40,.9)');
  x.restore();
}

let lightBuf = null;
function lights(x, t) {
  if (!lightBuf) lightBuf = canvas(W / 4, H / 4);
  const [lc, l] = lightBuf;
  l.globalCompositeOperation = 'source-over';
  l.fillStyle = 'rgba(8,4,16,.5)'; l.fillRect(0, 0, W / 4, H / 4);
  l.globalCompositeOperation = 'destination-out';
  const spot = (sx, sy, r, a) => {
    const g = l.createRadialGradient(sx / 4, sy / 4, 0, sx / 4, sy / 4, r / 4);
    g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    l.fillStyle = g; l.fillRect(sx / 4 - r / 4, sy / 4 - r / 4, r / 2, r / 2);
  };
  for (const tb of VIP_TABLES) spot((tb.x + tb.w / 2) * T, (tb.y + tb.h / 2) * T, tb.w * T * 1.4, 1);
  spot(W / 2, 2 * T, W, 0.6);
  spot(5 * T, 14 * T, 7 * T, 0.8); spot(PIANO.x + 22, PIANO.y, 5 * T, 0.8); spot(VIP_SPAWN.x, VIP_SPAWN.y, 6 * T, 0.7);
  x.save(); x.imageSmoothingEnabled = true; x.drawImage(lc, 0, 0, W, H); x.restore();
  x.save(); x.globalCompositeOperation = 'lighter';
  const glow = (gx, gy, r, col) => { const g = x.createRadialGradient(gx, gy, 0, gx, gy, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(gx - r, gy - r, r * 2, r * 2); };
  for (const tb of VIP_TABLES) glow((tb.x + tb.w / 2) * T, tb.y * T - 10, 34, `rgba(255,220,140,${0.12 + 0.03 * Math.sin(t * 2 + tb.x)})`);
  glow(10 * T, 11 * T + 4, 160, 'rgba(40,140,255,.10)'); // aquarium
  glow(20.5 * T, 10 * T, 60, `rgba(96,232,255,${0.10 + 0.04 * Math.sin(t * 3)})`);
  x.restore();
}

