import { T, MW, MH, CASINO_TABLES as TABLES, VIP_TABLES, TIERS, VIP_ELEVATOR, VIP_RECEPTION, nearElevatorIn, nearReception, nearElevatorOut, nearVipBar, nearDiamondDoor, PILLARS, PLANTS, BAR, NPCS, HORSES, LEADER, SHOP, MANNEQUINS, seatPos, hitsIn, nearBar, nearShop, nearDoorIn } from './map.js';
import { drawAvatar } from './avatar.js';
import { NPC_OUTFITS, FEATURED } from './items.js';
import { raceProgress, raceElapsed } from './race.js';
import { canvas, text, textW, grid, label, tableSprite, shapes, chairSprite, plantSprite, pillarSprite, drawSlotMachine, chipStack, drawEmote } from './sprites.js';

// ---------- static background (floor, walls, rug, bar), rendered once ----------
let bg = null;
function background() {
  if (bg) return bg;
  const [c, x] = canvas(MW * T, MH * T);
  // carpet: burgundy with a gold diamond lattice
  for (let yy = 0; yy < MH * T; yy++) for (let xx = 0; xx < MW * T; xx++) {
    const u = (xx + yy) % 24, v = (xx - yy + 2400) % 24;
    let col = (xx * 3 + yy * 5) % 7 === 0 ? '#4a0f26' : '#561430';
    if (u === 0 || v === 0) col = '#6e2034';
    if ((u === 12 && v === 12)) col = '#c8a040';
    if ((u === 11 || u === 13) && v === 12 || (v === 11 || v === 13) && u === 12) col = '#8a5a28';
    x.fillStyle = col; x.fillRect(xx, yy, 1, 1);
  }
  // boutique corner: black and white marble with a gold border
  for (let yy = SHOP.y * T; yy < (SHOP.y + SHOP.h) * T; yy++) for (let xx = SHOP.x * T; xx < (SHOP.x + SHOP.w) * T; xx++) {
    const w = (Math.floor(xx / 8) + Math.floor(yy / 8)) % 2, vein = (xx * 7 + yy * 3) % 23 === 0;
    x.fillStyle = w ? (vein ? '#c8c0d0' : '#e8e4ee') : (vein ? '#3a3448' : '#1c1824');
    x.fillRect(xx, yy, 1, 1);
  }
  x.fillStyle = '#c8a040'; x.fillRect(SHOP.x * T, SHOP.y * T, SHOP.w * T, 2); x.fillRect((SHOP.x + SHOP.w) * T - 2, SHOP.y * T, 2, SHOP.h * T);
  // red runner from the entrance with gold borders
  x.fillStyle = '#9a1828'; x.fillRect(20 * T, 17 * T, 4 * T, 10 * T);
  x.fillStyle = '#c8a040'; x.fillRect(20 * T, 17 * T, 2, 10 * T); x.fillRect(24 * T - 2, 17 * T, 2, 10 * T); x.fillRect(20 * T, 17 * T, 4 * T, 2);
  for (let yy = 17 * T + 6; yy < 27 * T; yy += 10) { x.fillStyle = '#b8283a'; x.fillRect(21 * T + 12, yy, 8, 4); }
  // wood floor behind the bar
  for (let yy = 3 * T; yy < 6 * T; yy++) for (let xx = BAR.x * T; xx < (BAR.x + BAR.w) * T; xx++) {
    x.fillStyle = (yy % 6 === 0) ? '#3a2010' : ((xx + Math.floor(yy / 6) * 17) % 40 === 0) ? '#3a2010' : (yy % 6 < 3 ? '#6a4022' : '#5e381e');
    x.fillRect(xx, yy, 1, 1);
  }
  // back wall: dark damask wallpaper, wood wainscoting
  for (let yy = 0; yy < 3 * T; yy++) for (let xx = 0; xx < MW * T; xx++) {
    let col;
    if (yy < 30) col = (xx % 8 === 0) ? '#2c1438' : ((xx + yy) % 8 === 4 && yy % 8 < 4) ? '#3c2048' : '#24102e';
    else if (yy < 32) col = '#c8a040';
    else if (yy < 46) col = xx % 24 === 0 || xx % 24 === 23 ? '#2a140a' : yy === 33 ? '#7a4422' : (xx % 24 < 2 || yy > 43) ? '#3e2010' : '#5a3018';
    else col = '#1a0c06';
    x.fillStyle = col; x.fillRect(xx, yy, 1, 1);
  }
  // side and bottom walls seen from above
  const wall = (wx, wy, ww, wh) => { x.fillStyle = '#1c0e22'; x.fillRect(wx, wy, ww, wh); x.fillStyle = '#c8a040'; };
  wall(0, 3 * T, T, (MH - 3) * T); x.fillRect(T - 2, 3 * T, 2, (MH - 4) * T);
  wall((MW - 1) * T, 3 * T, T, (MH - 3) * T); x.fillRect((MW - 1) * T, 3 * T, 2, (MH - 4) * T);
  wall(0, (MH - 1) * T, MW * T, T); x.fillRect(T - 2, (MH - 1) * T, (MW - 2) * T + 4, 2);
  // entrance doors
  x.fillStyle = '#c8a040'; x.fillRect(20 * T - 2, (MH - 1) * T, 4 * T + 4, T);
  x.fillStyle = '#284060'; x.fillRect(20 * T + 2, (MH - 1) * T + 3, 2 * T - 4, T - 3); x.fillRect(22 * T + 2, (MH - 1) * T + 3, 2 * T - 4, T - 3);
  x.fillStyle = '#5a88b8'; x.fillRect(20 * T + 4, (MH - 1) * T + 4, 3, 8); x.fillRect(22 * T + 4, (MH - 1) * T + 4, 3, 8);
  // bar: bottle shelves on the wall
  const bx = BAR.x * T;
  x.fillStyle = '#3a1c0c'; x.fillRect(bx, 4, BAR.w * T, 42);
  const bottle = ['#3a8040', '#a02828', '#d8b040', '#4060c0', '#e0e0e0', '#8a3a10', '#40a0a0'];
  for (let shelf = 0; shelf < 2; shelf++) {
    const sy = 8 + shelf * 18;
    for (let k = 0; k < BAR.w * 4; k++) {
      const col = bottle[(k * 5 + shelf * 3) % bottle.length], hgt = 9 + (k * 7 + shelf) % 4, X = bx + 3 + k * 4;
      x.fillStyle = col; x.fillRect(X, sy + 14 - hgt, 3, hgt); x.fillRect(X + 1, sy + 12 - hgt, 1, 2);
      x.fillStyle = 'rgba(255,255,255,.4)'; x.fillRect(X, sy + 15 - hgt, 1, hgt - 4);
    }
    x.fillStyle = '#c8a040'; x.fillRect(bx, sy + 14, BAR.w * T, 2);
  }
  return (bg = c);
}

// Bar counter is drawn as a sortable object (characters stand in front of it).
function drawBar(x) {
  const X = BAR.x * T, Y = BAR.y * T;
  x.fillStyle = '#2a1408'; x.fillRect(X, Y, BAR.w * T, T);
  x.fillStyle = '#7a4424'; x.fillRect(X, Y, BAR.w * T, 6);
  x.fillStyle = '#a06038'; x.fillRect(X, Y, BAR.w * T, 2);
  x.fillStyle = '#c8a040'; x.fillRect(X, Y + 6, BAR.w * T, 2); x.fillRect(X, Y + T - 2, BAR.w * T, 1);
  x.fillStyle = '#4a2410';
  for (let k = 0; k < BAR.w * 2; k++) x.fillRect(X + 3 + k * 8, Y + 9, 5, 4);
  // glasses on the counter
  for (const k of [2, 5, 9]) { x.fillStyle = 'rgba(200,230,255,.8)'; x.fillRect(X + k * T + 4, Y - 2, 3, 4); x.fillStyle = '#e8b030'; x.fillRect(X + k * T + 4, Y, 3, 2); }
}

function stool(x, sx, sy) {
  x.fillStyle = '#2a1408'; x.fillRect(sx, sy + 2, 2, 6);
  x.fillStyle = '#c8a040'; x.fillRect(sx - 3, sy - 1, 8, 4);
  x.fillStyle = '#901828'; x.fillRect(sx - 2, sy - 1, 6, 3);
}

// ---------- table sprites for the world ----------
function worldTable(t) {
  const W = t.w * T, H = t.h * T;
  const key = t.type + (t.felt || '');
  if (t.type === 'blackjack') return tableSprite('w' + key, W, H, shapes.blackjack(W, H), t.felt || '#1f7a3a', t.rim);
  if (t.type === 'poker') return tableSprite('w' + key, W, H, shapes.oval(W, H, 2.4), t.felt || '#2a6a9a', t.rim || '#4a2414');
  return tableSprite('w' + key, W, H, shapes.oval(W, H, 6), t.felt || '#1f7a3a', t.rim);
}

function tableDecor(x, t, now) {
  const X = t.x * T, Y = t.y * T;
  if (t.type === 'blackjack') {
    for (let i = 0; i < 5; i++) {
      const a = (150 - 30 * i) * Math.PI / 180, cx = X + 48 + 34 * Math.cos(a), cy = Y + 4 + 30 * Math.sin(a);
      x.fillStyle = '#c8a040'; x.fillRect(Math.round(cx) - 3, Math.round(cy) - 1, 6, 1); x.fillRect(Math.round(cx) - 3, Math.round(cy) + 2, 6, 1);
      x.fillRect(Math.round(cx) - 4, Math.round(cy), 1, 2); x.fillRect(Math.round(cx) + 3, Math.round(cy), 1, 2);
    }
    x.fillStyle = '#201010'; x.fillRect(X + 38, Y + 6, 20, 6); // chip tray
    ['#e2b02c', '#8a44c8', '#24242c', '#d03040', '#eceff6'].forEach((c, k) => { x.fillStyle = c; x.fillRect(X + 39 + k * 4, Y + 7, 3, 4); });
    x.fillStyle = '#e8e0d0'; x.fillRect(X + 70, Y + 6, 8, 6); x.fillStyle = '#a01c34'; x.fillRect(X + 71, Y + 7, 6, 4);
    text(x, t.name, X + 48, Y + 18, 'rgba(232,200,90,.75)', 1, 'center');
  } else if (t.type === 'poker') {
    x.fillStyle = 'rgba(232,200,90,.5)';
    for (let k = 0; k < 5; k++) x.fillRect(X + 40 + k * 10, Y + 26, 8, 11);
    text(x, t.name, X + 64, Y + 42, 'rgba(232,200,90,.6)', 1, 'center');
  } else if (t.type === 'roulette') {
    // wheel bowl at the left end
    const cx = X + 24, cy = Y + 24, rot = now / 1500;
    for (let yy = -20; yy <= 20; yy++) for (let xx = -20; xx <= 20; xx++) {
      const r = Math.hypot(xx, yy);
      if (r > 20) continue;
      let col;
      if (r > 18) col = '#2a1408';
      else if (r > 15) col = '#7a4424';
      else if (r > 10) { const k = Math.floor(((Math.atan2(yy, xx) + rot) / (Math.PI * 2) * 37 + 370)) % 37; col = k === 0 ? '#20a040' : k % 2 ? '#c02030' : '#181820'; }
      else if (r > 4) col = '#5a3018';
      else col = '#c8a040';
      x.fillStyle = col; x.fillRect(cx + xx, cy + yy, 1, 1);
    }
    // betting layout
    for (let c = 0; c < 12; c++) for (let r = 0; r < 3; r++) {
      const n = c * 3 + 3 - r;
      x.fillStyle = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(n) ? '#c02030' : '#181820';
      x.fillRect(X + 52 + c * 6, Y + 12 + r * 7, 5, 6);
    }
    x.fillStyle = '#20a040'; x.fillRect(X + 47, Y + 12, 4, 20);
    x.fillStyle = 'rgba(232,200,90,.7)'; x.fillRect(X + 52, Y + 34, 71, 1);
  }
}

// ---------- the room ----------
export function drawWorld(x, cam, now, players, meId, prompts, race, top, pot) {
  const t = now / 1000;
  x.drawImage(background(), -cam.x, -cam.y);
  x.save();
  x.translate(-cam.x, -cam.y);

  neonSigns(x, t);
  if (pot) text(x, 'JACKPOT ' + pot.toLocaleString('fr-FR'), 11 * T + 8, 32, Math.floor(t * 2.5) % 2 ? '#ff4aa0' : '#ffe060', 1, 'center', '#000');

  const objs = [];
  tableObjs(x, objs, TABLES, players, now, race);
  objs.push([BAR.y * T + T, () => drawBar(x)]);
  objs.push([LEADER.y + LEADER.h, () => leaderboard(x, top, t)]);
  for (let k = 0; k < 6; k++) objs.push([BAR.y * T + T + 10, () => stool(x, (BAR.x + 1 + k * 2) * T, BAR.y * T + T + 6)]);
  for (const [px, py] of PILLARS) objs.push([py * T + T, () => x.drawImage(pillarSprite(), px * T, py * T + T - 44)]);
  for (const [px, py] of PLANTS) objs.push([py * T + T, () => x.drawImage(plantSprite(), px * T, py * T + T - 17)]);
  npcObjs(x, objs, NPCS, now);
  shopCorner(x, objs, now);
  vipEntrance(x, objs, now);
  playerObjs(x, objs, players, now);
  objs.sort((a, b) => a[0] - b[0]);
  for (const [, f] of objs) f();
  tableChips(x, players, TABLES);
  lights(x, t);
  overheads(x, players, now, meId);
  for (const pr of prompts) label(x, pr.text, pr.x, pr.y, '#ffe680', 'rgba(30,10,40,.9)');
  x.restore();
}

// Sortable draw calls for a set of tables with their chairs (shared with the VIP floor).
export function tableObjs(x, objs, tables, players, now, race) {
  const t = now / 1000;
  for (const tb of tables) {
    if (tb.type === 'slots') {
      const busy = players.some(p => p.seat?.t === tb.id);
      objs.push([tb.y * T + 2 * T, () => drawSlotMachine(x, tb.x * T, tb.y * T, t, busy && Math.floor(t * 3) % 4 !== 0, tb.x)]);
    } else if (tb.type === 'race') {
      objs.push([tb.y * T + 3 * T + 8, () => raceScreen(x, tb, race, now)]);
    } else {
      objs.push([tb.y * T + tb.h * T / 2, () => {
        x.drawImage(worldTable(tb), tb.x * T, tb.y * T);
        tableDecor(x, tb, now);
      }]);
    }
    for (let i = 0; i < tb.seats; i++) {
      const s = seatPos(tb, i);
      if (tb.type === 'slots') objs.push([s.y - 6, () => stool(x, s.x - 1, s.y - 4)]);
      else objs.push([s.y - 8, () => x.drawImage(chairSprite(s.dir), s.x - 5, s.y - 6)]);
    }
  }
}

export function npcObjs(x, objs, npcs, now) {
  for (const n of npcs) objs.push([n.y, () => drawAvatar(x, n.x, n.y, NPC_OUTFITS[n.role], '#222230', n.dir, 0, now)]);
}

export function playerObjs(x, objs, players, now) {
  const t = now / 1000;
  for (const p of players) objs.push([p.y + (p.seat ? 0.5 : 0), () => {
    const frame = p.moving ? 1 + (Math.floor(t * 8) % 2) : 0;
    const sway = p.drunk ? Math.round(Math.sin(now / 300 + p.x) * p.drunk * 2.5) : 0;
    drawAvatar(x, p.x + sway, p.y, p.outfit, p.color, p.dir, frame, now, { trail: trail(p) });
    if (p.phone) heldPhone(x, p.x + sway, p.y, p.dir, now);
  }]);
}

// Small phone in the hand of players who have it open.
export function heldPhone(x, px, py, dir, now) {
  if (dir === 3) return;
  const hx = Math.round(px + (dir === 1 ? -6 : dir === 2 ? 3 : 2)), hy = Math.round(py - 12);
  x.fillStyle = '#101014'; x.fillRect(hx, hy, 3, 5);
  x.fillStyle = Math.floor(now / 500) % 2 ? '#80d0ff' : '#a0e8ff'; x.fillRect(hx + 1, hy + 1, 1, 3);
}

// Chips in front of seated players: a little life in the room.
export function tableChips(x, players, tables) {
  for (const p of players) {
    const tb = tables.find(q => q.id === p.seat?.t);
    if (!tb || tb.type === 'slots' || tb.type === 'race') continue;
    const cx = tb.x * T + tb.w * T / 2, cy = tb.y * T + tb.h * T / 2;
    chipStack(x, tb.limits?.chips?.[1] || 120, Math.round(p.x + (cx - p.x) * 0.3), Math.round(p.y - 6 + (cy - p.y) * 0.3), 3);
  }
}

// Golden VIP elevator, reception desk and red carpet under the big sign.
function vipEntrance(x, objs, now) {
  const ex = VIP_ELEVATOR.x, rx = VIP_RECEPTION.x;
  objs.push([50, () => { // carpet first, under everyone
    x.fillStyle = '#9a1828'; x.fillRect(ex - 16, 80, 32, 32);
    x.fillStyle = '#c8a040'; x.fillRect(ex - 16, 80, 1, 32); x.fillRect(ex + 15, 80, 1, 32);
  }]);
  objs.push([80, () => {
    x.fillStyle = '#c8a040'; x.fillRect(ex - 20, 44, 40, 36);
    x.fillStyle = '#f0d070'; x.fillRect(ex - 20, 44, 40, 2);
    x.fillStyle = '#14080c'; x.fillRect(ex - 16, 54, 32, 26);
    for (const dx of [-15, 1]) { x.fillStyle = '#d8b858'; x.fillRect(ex + dx, 55, 14, 25); x.fillStyle = '#f8e8a8'; x.fillRect(ex + dx + 2, 57, 2, 20); }
    x.fillStyle = '#7a5a20'; x.fillRect(ex - 1, 55, 2, 25);
    const on = Math.floor(now / 500) % 2;
    x.fillStyle = '#100808'; x.fillRect(ex - 10, 46, 20, 7);
    text(x, 'VIP', ex, 47, on ? '#ff4ab0' : '#ffe680', 1, 'center');
    x.fillStyle = on ? '#60ff80' : '#205a30'; x.fillRect(ex + 13, 63, 2, 2); // call button
  }]);
  objs.push([74, () => { // reception desk in black marble
    x.fillStyle = '#c8a040'; x.fillRect(rx - 17, 60, 34, 16);
    x.fillStyle = '#1c1424'; x.fillRect(rx - 16, 61, 32, 14);
    x.fillStyle = '#2e2438'; x.fillRect(rx - 16, 61, 32, 4);
    text(x, 'VIP', rx, 67, '#f0c040', 1, 'center');
    x.fillStyle = '#ffe8a0'; x.fillRect(rx + 9, 58, 2, 3); // little lamp
  }]);
}

const stars = new Map();
function star(col) {
  if (!stars.has(col)) stars.set(col, grid(['..a..', '.aaa.', 'aaaaa', '.aaa.', '.a.a.'], { a: col }));
  return stars.get(col);
}

// Names, SDF tag, HIC, chat bubbles and emotes above players (shared with the street).
export function overheads(x, players, now, meId) {
  for (const p of players) {
    if (p.drunk > 0.35 && (now / 2600 + p.x / 50) % 3 < 0.3) text(x, 'HIC !', p.x + 8, p.y - 30 - ((now / 2600 + p.x / 50) % 3) * 20, '#ffe680', 1, 'left', '#000');
    label(x, p.name, p.x, p.y - 36, p.id === meId ? '#ffe680' : '#fff');
    if (p.vip) { // member star, the Diamant one twinkles
      const tier = TIERS[p.vip], sx = Math.round(p.x - textW(p.name) / 2 - 9), sy = p.y - 34;
      x.fillStyle = 'rgba(10,6,20,.75)'; x.fillRect(sx - 1, sy - 2, 7, 9);
      x.drawImage(star(p.vip === 3 && Math.floor(now / 250) % 3 === 0 ? '#ffffff' : tier.color), sx, sy);
    }
    if (p.homeless) label(x, 'SDF', p.x, p.y - 45, '#c8b8a0', 'rgba(40,30,20,.85)');
    const top = p.homeless ? 9 : 0;
    if (p.bubble && now - p.bubble.at < 6000) bubble(x, p.bubble.text, p.x, p.y - 39 - top);
    else if (p.emote && now - p.emote.at < 2500) drawEmote(x, p.emote.k, p.x, p.y - 38 - top, now - p.emote.at);
  }
}

// Rainbow trail: recent positions of each moving player.
const trails = new Map();
function trail(p) {
  let t = trails.get(p.id);
  if (!t) trails.set(p.id, t = []);
  if (p.moving && (!t.length || Math.hypot(t[0].x - p.x, t[0].y - p.y) > 3)) { t.unshift({ x: p.x, y: p.y }); t.length = Math.min(t.length, 14); }
  else if (!p.moving && t.length) t.pop();
  return t.slice(1);
}

function shopCorner(x, objs, now) {
  objs.push([26 * T, () => { // counter with register and bags
    x.fillStyle = '#3a1c0c'; x.fillRect(2 * T, 23 * T - 4, T, 3 * T + 4);
    x.fillStyle = '#7a4424'; x.fillRect(2 * T, 23 * T - 4, T, 6);
    x.fillStyle = '#c8a040'; x.fillRect(2 * T, 23 * T + 2, T, 1); x.fillRect(2 * T + T - 1, 23 * T - 4, 1, 3 * T + 4);
    x.fillStyle = '#c8a040'; x.fillRect(2 * T + 3, 23 * T + 6, 10, 8);
    x.fillStyle = '#40ff80'; x.fillRect(2 * T + 5, 23 * T + 7, 6, 2);
    x.fillStyle = '#ff4ab0'; x.fillRect(2 * T + 4, 25 * T, 8, 9); x.fillStyle = '#ffd0f0'; x.fillRect(2 * T + 6, 25 * T - 3, 4, 1); x.fillRect(2 * T + 6, 25 * T - 3, 1, 3); x.fillRect(2 * T + 9, 25 * T - 3, 1, 3);
  }]);
  objs.push([27 * T, () => { // clothes rack
    x.fillStyle = '#c8a040'; x.fillRect(5 * T, 26 * T - 8, 7 * T, 1); x.fillRect(5 * T, 26 * T - 8, 1, 14); x.fillRect(12 * T - 1, 26 * T - 8, 1, 14);
    const cols = ['#e04050', '#20a8c8', '#141418', '#f2b233', '#9b51e0', '#f4f4f4', '#2fb36b', '#e8b830', '#c01848', '#3a3a4c', '#ff7a2f', '#1c2448', '#d8d0c8'];
    for (let k = 0; k < 13; k++) {
      const cx = 5 * T + 4 + k * 8, sway = Math.round(Math.sin(now / 900 + k) * 0.6);
      x.fillStyle = '#909098'; x.fillRect(cx + 2, 26 * T - 9, 1, 2);
      x.fillStyle = cols[k]; x.fillRect(cx + sway, 26 * T - 7, 6, 9); x.fillRect(cx - 1 + sway, 26 * T - 7, 8, 3);
      x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(cx + 4 + sway, 26 * T - 4, 2, 6);
    }
  }]);
  MANNEQUINS.forEach(([mx, my], i) => objs.push([my, () => {
    x.fillStyle = '#7a5a20'; x.fillRect(mx - 7, my - 2, 14, 4); x.fillStyle = '#c8a040'; x.fillRect(mx - 6, my - 3, 12, 3);
    drawAvatar(x, mx, my - 2, FEATURED[i], '#fff', [0, 2, 3, 1][Math.floor(now / 1800 + i) % 4], 0, now, { mannequin: true });
  }]));
}

// Big screen showing the current race to the whole room.
function raceScreen(x, tb, v, now) {
  const X = tb.x * T, Y = tb.y * T - 10, W = tb.w * T, H = 52;
  x.fillStyle = '#2a2a34'; x.fillRect(X + 20, Y + H, 4, 18); x.fillRect(X + W - 24, Y + H, 4, 18);
  x.fillStyle = '#c8a040'; x.fillRect(X, Y, W, H);
  x.fillStyle = '#05080c'; x.fillRect(X + 2, Y + 2, W - 4, H - 4);
  const L = X + 6, R = X + W - 14;
  if (!v || v.phase === 'betting') {
    text(x, v?.until ? 'PROCHAINE COURSE ' + Math.max(0, Math.ceil((v.until - now) / 1000)) : 'COURSES - ASSIEDS-TOI !', X + W / 2, Y + 5, '#ffe060', 1, 'center');
    HORSES.forEach((h, i) => {
      const cx = X + 8 + (i % 2) * 76, cy = Y + 15 + Math.floor(i / 2) * 11;
      x.fillStyle = h.silk; x.fillRect(cx, cy, 5, 5);
      text(x, h.name, cx + 8, cy, '#fff');
      if (v) text(x, 'X' + v.odds[i], cx + 72, cy, '#80f0ff', 1, 'right');
    });
    return;
  }
  const f = raceProgress(v, raceElapsed(v, now));
  x.fillStyle = '#1a4a24'; x.fillRect(X + 3, Y + 4, W - 6, 43);
  for (let k = 0; k < 4; k++) { x.fillStyle = k % 2 ? '#fff' : '#000'; x.fillRect(R + 4, Y + 4 + k * 11, 2, 11); x.fillStyle = k % 2 ? '#000' : '#fff'; x.fillRect(R + 6, Y + 4 + k * 11, 2, 11); }
  HORSES.forEach((h, i) => {
    const hx = Math.round(L + f[i] * (R - L)), hy = Y + 6 + i * 7, bob = Math.floor(now / 90 + i) % 2;
    x.fillStyle = h.coat; x.fillRect(hx - 5, hy + 2 - bob, 6, 3); x.fillRect(hx, hy + 1 - bob, 2, 2);
    x.fillStyle = h.silk; x.fillRect(hx - 3, hy - bob, 3, 2);
  });
  if (v.phase === 'result') {
    const h = HORSES[v.order[0]];
    x.fillStyle = 'rgba(0,0,0,.75)'; x.fillRect(X + 10, Y + 14, W - 20, 22);
    text(x, 'VAINQUEUR', X + W / 2, Y + 16, '#ffe060', 1, 'center');
    text(x, h.name, X + W / 2, Y + 24, Math.floor(now / 200) % 2 ? h.silk : '#fff', 2, 'center');
  }
}

function leaderboard(x, top, t) {
  const { x: X, y: Y, w: W } = LEADER, H = 44;
  x.fillStyle = '#2a2a34'; x.fillRect(X + 10, Y + H, 3, 8); x.fillRect(X + W - 13, Y + H, 3, 8);
  const on = Math.sin(t * 11) < 0.97;
  x.fillStyle = on ? '#ff4ab0' : '#802050'; x.fillRect(X, Y, W, H);
  x.fillStyle = '#140818'; x.fillRect(X + 2, Y + 2, W - 4, H - 4);
  text(x, 'TOP JOUEURS', X + W / 2, Y + 4, on ? '#ffe060' : '#a08030', 1, 'center');
  (top || []).forEach((p, i) => {
    const y = Y + 12 + i * 6;
    text(x, i + 1 + '', X + 5, y, ['#ffd040', '#d0d0e0', '#d08040', '#a090b0', '#a090b0'][i]);
    text(x, p.name.slice(0, 8), X + 12, y, '#fff');
    text(x, p.chips >= 100000 ? Math.floor(p.chips / 1000) + 'K' : p.chips + '', X + W - 4, y, '#80f0ff', 1, 'right');
  });
}

function bubble(x, s, px, py) {
  const words = s.split(' '), lines = [''];
  for (const w of words) { if ((lines.at(-1) + ' ' + w).length > 22) lines.push(w); else lines[lines.length - 1] = (lines.at(-1) + ' ' + w).trim(); }
  const w = Math.max(...lines.map(l => l.length)) * 4 + 5, h = lines.length * 7 + 4, bx = Math.round(px - w / 2), by = Math.round(py - h - 3);
  x.fillStyle = '#1a0c20'; x.fillRect(bx - 1, by, w + 2, h); x.fillRect(bx, by - 1, w, h + 2);
  x.fillStyle = '#fff'; x.fillRect(bx, by, w, h);
  x.fillRect(Math.round(px) - 1, by + h, 3, 2); x.fillRect(Math.round(px), by + h + 2, 1, 1);
  lines.forEach((l, k) => text(x, l, px, by + 2 + k * 7, '#1a0c20', 1, 'center'));
}

function neonSigns(x, t) {
  const flick = (seed) => (Math.sin(t * 13 + seed) > 0.97 || Math.sin(t * 0.7 + seed * 3) > 0.995) ? 0.25 : 1;
  const neon = (s, cx, cy, sc, col, glow, seed) => {
    const a = flick(seed);
    x.globalAlpha = 0.35 * a;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) text(x, s, cx + dx, cy + dy, glow, sc, 'center');
    x.globalAlpha = a;
    text(x, s, cx, cy, col, sc, 'center');
    x.globalAlpha = 1;
  };
  // centre sign with a tube frame and chasing bulbs
  const cx = 24 * T, k = Math.floor(t * 6);
  x.fillStyle = '#120818'; x.fillRect(cx - 62, 4, 124, 26);
  for (let i = 0; i < 30; i++) {
    const on = (i + k) % 3 === 0;
    x.fillStyle = on ? '#fff3a0' : '#7a5a20';
    const px = i < 15 ? cx - 60 + i * 8.4 : cx - 60 + (i - 15) * 8.4;
    x.fillRect(Math.round(px), i < 15 ? 5 : 27, 2, 2);
  }
  neon('LE GRAND', cx, 8, 1, '#80f0ff', '#20a0ff', 1);
  neon('PIXEL', cx, 15, 2, '#ff6ad0', '#ff2090', 2);
  neon('SLOTS', 11 * T + 8, 12, 2, '#ffe060', '#ff9000', 3);
  neon('BAR', (BAR.x + BAR.w / 2) * T, 1, 1, '#80ff90', '#20c040', 4);
  neon('BOUTIQUE', (SHOP.x + SHOP.w / 2) * T, (MH - 1) * T + 4, 2, '#ffd0f0', '#ff40b0', 5);
  // wall sconces
  for (const sx of [2, 20, 28, 42]) { x.fillStyle = '#c8a040'; x.fillRect(sx * T + 6, 20, 4, 6); x.fillStyle = '#fff0b0'; x.fillRect(sx * T + 7, 17, 2, 3); }
}

// Dark ambience with warm pools of light, done on a small buffer for a soft pixel look.
let lightBuf = null;
function lights(x, t) {
  const W = MW * T, H = MH * T;
  if (!lightBuf) lightBuf = canvas(W / 4, H / 4);
  const [lc, l] = lightBuf;
  l.globalCompositeOperation = 'source-over';
  l.fillStyle = 'rgba(8,0,18,.5)'; l.fillRect(0, 0, W / 4, H / 4);
  l.globalCompositeOperation = 'destination-out';
  const spot = (px, py, r, a = 1) => {
    const g = l.createRadialGradient(px / 4, py / 4, 0, px / 4, py / 4, r / 4);
    g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    l.fillStyle = g; l.fillRect(px / 4 - r / 4, py / 4 - r / 4, r / 2, r / 2);
  };
  for (let gy = 6; gy < MH; gy += 7) for (let gx = 4; gx < MW; gx += 8) spot(gx * T, gy * T, 9 * T, 0.45); // chandeliers
  for (const tb of TABLES) if (tb.type !== 'slots') spot((tb.x + tb.w / 2) * T, (tb.y + tb.h / 2) * T, tb.w * T * 1.3, 0.95);
  spot(11 * T + 8, 4 * T, 9 * T, 0.8);
  spot((BAR.x + BAR.w / 2) * T, 4 * T, 8 * T, 0.85);
  spot(24 * T, 2 * T, 6 * T, 0.9);
  spot(22 * T, 23 * T, 7 * T, 0.6);
  spot(37 * T, 19 * T, 9 * T, 0.9);
  spot(7 * T, 25 * T, 9 * T, 0.95);
  spot(LEADER.x + LEADER.w / 2, LEADER.y + 20, 5 * T, 0.8);
  for (const [px, py] of PILLARS) spot(px * T + 8, py * T, 3 * T, 0.5);
  x.save();
  x.imageSmoothingEnabled = true;
  x.drawImage(lc, 0, 0, W, H);
  x.restore();
  // coloured glows (additive)
  x.save();
  x.globalCompositeOperation = 'lighter';
  const glow = (px, py, r, col) => {
    const g = x.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2);
  };
  glow(24 * T, 16, 70, `rgba(255,40,160,${0.16 + 0.03 * Math.sin(t * 3)})`);
  glow(11 * T + 8, 20, 90, 'rgba(255,160,0,.10)');
  glow((BAR.x + BAR.w / 2) * T, 10, 70, 'rgba(40,255,90,.08)');
  glow(37 * T, 18 * T + 16, 90, 'rgba(80,200,255,.10)');
  glow(LEADER.x + LEADER.w / 2, LEADER.y + 22, 50, 'rgba(255,60,170,.14)');
  for (const tb of TABLES) if (tb.type === 'slots') glow(tb.x * T + 8, tb.y * T + 14, 18, `rgba(255,${120 + 80 * Math.sin(t * 4 + tb.x)},80,.14)`);
  x.restore();
}

// ---------- movement ----------
export function move(me, keys, dt, drunk = 0, zone = 'casino', vip = 0, solids) {
  const hits = (x, y) => hitsIn(zone, x, y, vip, solids);
  let dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
  me.moving = !!(dx || dy);
  if (!me.moving) return;
  if (dx && dy) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }
  me.dir = dy > 0 ? 0 : dy < 0 ? 3 : dx < 0 ? 1 : 2;
  if (dx && !dy) me.dir = dx < 0 ? 1 : 2;
  if (drunk > 0) { // stagger sideways to the way you walk
    const t = performance.now(), s = Math.sin(t / 330) * drunk * 0.9, c = Math.cos(t / 470) * drunk * 0.9;
    [dx, dy] = [dx + (dy ? s : 0), dy + (dx ? c : 0)];
  }
  const sp = 78 * dt, stuck = hits(me.x, me.y); // if already inside something (just stood up), let them walk out
  if (stuck || !hits(me.x + dx * sp, me.y)) me.x += dx * sp;
  if (stuck || !hits(me.x, me.y + dy * sp)) me.y += dy * sp;
}

// What the player can interact with right now.
export function nearby(me, players, zone = 'casino') {
  let best = null, bd = 20;
  for (const tb of zone === 'vip' ? VIP_TABLES : TABLES) for (let i = 0; i < tb.seats; i++) {
    const s = seatPos(tb, i), d = Math.hypot(s.x - me.x, s.y - me.y);
    if (d < bd && !players.some(p => p.seat?.t === tb.id && p.seat.i === i)) {
      bd = d;
      const locked = (tb.tier || 0) > (me.vip || 0);
      best = { kind: locked ? 'locked' : 'seat', t: tb, i, x: s.x, y: s.y - 40, text: locked ? TIERS[tb.tier].name + ' REQUISE' : 'E : ' + tb.name };
    }
  }
  if (zone === 'vip') {
    if (!best && nearElevatorOut(me)) best = { kind: 'door', x: me.x, y: me.y - 40, text: 'E : DESCENDRE AU CASINO' };
    if (!best && nearVipBar(me)) best = { kind: 'bar', x: me.x, y: me.y - 40, text: 'E : BAR VIP' };
    if (!best && nearDiamondDoor(me) && (me.vip || 0) < 3) best = { kind: 'locked', x: me.x, y: me.y - 40, text: 'SALON DIAMANT : CARTE DIAMANT' };
    return best;
  }
  if (!best && nearElevatorIn(me)) best = { kind: 'door', x: me.x, y: me.y - 40, text: me.vip ? 'E : MONTER A L\'ETAGE VIP' : 'ASCENSEUR VIP : CARTE REQUISE' };
  if (!best && nearReception(me)) best = { kind: 'reception', x: me.x, y: me.y - 40, text: 'E : RECEPTION VIP' };
  if (!best && nearDoorIn(me)) best = { kind: 'door', x: me.x, y: me.y - 40, text: 'E : SORTIR DEHORS' };
  if (!best && nearShop(me)) best = { kind: 'shop', x: me.x, y: me.y - 40, text: 'E : BOUTIQUE & VESTIAIRE' };
  if (!best && nearBar(me)) best = { kind: 'bar', x: me.x, y: me.y - 40, text: 'E : LE BAR' };
  return best;
}

