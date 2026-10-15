// Lobby of the residence: marble hall (concierge, mailboxes, elevator) and the MEUBLES & DECO showroom.
import { T, LW, LH, LOBBY_ELEV, LOBBY_SPAWN, CONCIERGE, SELLER, PODIUMS, LOBBY_PLANTS, nearLobbyExit, nearElevatorApt, nearConcierge, nearFurnShop } from './map.js';
import { FURNITURE } from './furniture.js';
import { canvas, text, label, plantSprite, pillarSprite } from './sprites.js';
import { drawAvatar } from './avatar.js';
import { NPC_OUTFITS } from './items.js';
import { playerObjs, overheads } from './world.js';
import { drawFurniture, lighting, lightsOf } from './apartment.js';
import { darkness } from './daylight.js';

const W = LW * T, H = LH * T, SPLIT = 13.5 * T; // hall | showroom
const R = (x, c, X, Y, w, h) => { x.fillStyle = c; x.fillRect(X, Y, w, h); };
const DEPTS = ['SALON', 'CHAMBRE', 'CUISINE'];

let bg = null;
function background() {
  if (bg) return bg;
  const [c, x] = canvas(W, H);
  // hall: black & white marble checkerboard, green wallpaper with gold stripes and wood wainscot
  for (let y = 3 * T; y < H - T; y++) for (let X = T; X < SPLIT; X++) {
    const dark = (Math.floor(X / 16) + Math.floor(y / 16)) % 2, vein = Math.sin(X * 0.15 + y * 0.07) + Math.sin(X * 0.05 - y * 0.13) > 1.5;
    R(x, dark ? (vein ? '#3a3640' : '#26232c') : (vein ? '#d4d0c8' : '#ece8e0'), X, y, 1, 1);
  }
  for (let y = 0; y < 3 * T; y++) for (let X = T; X < SPLIT; X++) R(x, y > 30 ? ((X + y) % 9 ? '#5a3418' : '#4a2a12') : X % 12 < 2 ? '#2e6448' : '#1f4a34', X, y, 1, 1);
  R(x, '#c8a040', T, 29, SPLIT - T, 2);
  // showroom: light oak parquet, white walls
  for (let y = 3 * T; y < H - T; y++) for (let X = SPLIT; X < W - T; X++) {
    const v = y - 3 * T, u = X - SPLIT, joint = v % 8 === 7 || (u + Math.floor(v / 8) * 17) % 48 === 0;
    R(x, joint ? '#a87e4c' : (u * 7 + v * 3) % 29 === 0 ? '#d4a670' : '#c89a64', X, y, 1, 1);
  }
  for (let y = 0; y < 3 * T; y++) for (let X = SPLIT; X < W - T; X++) R(x, (X * 5 + y * 3) % 37 === 0 ? '#e0dcd2' : '#f0ece4', X, y, 1, 1);
  R(x, '#d8d0c0', SPLIT, 3 * T - 5, W - T - SPLIT, 5); R(x, '#b8b0a0', SPLIT, 3 * T - 5, W - T - SPLIT, 1);
  R(x, 'rgba(0,0,0,.25)', T, 3 * T, W - 2 * T, 4);
  // outer walls
  R(x, '#1a1018', 0, 0, T, H); R(x, '#1a1018', W - T, 0, T, H); R(x, '#1a1018', 0, H - T, W, T);
  R(x, '#2e1e2a', T - 3, 0, 3, H - T); R(x, '#2e1e2a', W - T, 0, 3, H - T);
  // red carpet from the entrance to the elevator
  R(x, '#8a1424', LOBBY_ELEV.x - 16, 3 * T, 32, H - 4 * T); R(x, '#c8a040', LOBBY_ELEV.x - 16, 3 * T, 2, H - 4 * T); R(x, '#c8a040', LOBBY_ELEV.x + 14, 3 * T, 2, H - 4 * T);
  // entrance: glass doors in the front wall + mat
  R(x, '#c8a040', LOBBY_SPAWN.x - 18, H - T, 36, 2);
  for (const dx of [-16, 1]) { R(x, '#1f5a3a', LOBBY_SPAWN.x + dx, H - T + 2, 15, T - 2); R(x, '#9ac8e0', LOBBY_SPAWN.x + dx + 2, H - T + 4, 11, 8); }
  R(x, '#3a2418', LOBBY_SPAWN.x - 18, H - T - 10, 36, 9); text(x, 'BIENVENUE', LOBBY_SPAWN.x, H - T - 8, '#c8a040', 1, 'center');
  // elevator: brass frame and doors, call button
  const ex = LOBBY_ELEV.x;
  R(x, '#8a6a2a', ex - 26, 8, 52, 40); R(x, '#c8a040', ex - 24, 10, 48, 38);
  R(x, '#e0c060', ex - 21, 18, 20, 30); R(x, '#e0c060', ex + 1, 18, 20, 30); R(x, '#a8842c', ex - 1, 18, 2, 30);
  R(x, '#f8e8a8', ex - 18, 20, 2, 26); R(x, '#f8e8a8', ex + 16, 20, 2, 26);
  R(x, '#3a2a10', ex + 28, 26, 6, 10); R(x, '#ff6040', ex + 30, 28, 2, 2); R(x, '#60ff80', ex + 30, 32, 2, 2);
  // mailboxes (brass grid)
  for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) {
    const mx = 9 * T + 2 + k * 13, my = 8 + r * 10;
    R(x, '#a8842c', mx, my, 12, 9); R(x, '#c8a040', mx + 1, my + 1, 10, 7); R(x, '#3a2a10', mx + 3, my + 2, 6, 1);
    text(x, String(r * 4 + k + 1), mx + 6, my + 4, '#5a4010', 1, 'center');
    if ((r * 4 + k) % 5 === 1) R(x, '#f0ece0', mx + 4, my + 1, 4, 2); // a letter sticking out
  }
  text(x, 'COURRIER', 9 * T + 27, 2, '#c8a040', 1, 'center');
  // key board behind the concierge
  R(x, '#3a2418', 1.4 * T, 10, 46, 18); for (let k = 0; k < 8; k++) { R(x, '#c8a040', 1.4 * T + 4 + k * 5, 13, 1, 2); R(x, '#e8c860', 1.4 * T + 3 + k * 5, 15 + (k % 3), 3, 4); }
  // showroom podiums (raised wood with a gold edge) and department tags
  PODIUMS.forEach((p, i) => {
    R(x, 'rgba(0,0,0,.3)', p.x * T + 2, (p.y + p.h) * T, p.w * T, 3);
    R(x, '#e8dcc8', p.x * T, p.y * T, p.w * T, p.h * T); R(x, '#d8ccb4', p.x * T, (p.y + p.h) * T - 4, p.w * T, 4);
    R(x, '#c8a040', p.x * T, (p.y + p.h) * T - 5, p.w * T, 1);
  });
  // the arch between the hall and the showroom
  R(x, '#c8a040', SPLIT - 1, 3 * T, 2, H - 4 * T);
  bg = c;
  return c;
}

// Furniture shown on the showroom's back wall.
const WALL_DISPLAY = [{ id: 'tableau', x: 15, y: 1 }, { id: 'ecran', x: 19, y: 1, on: true }, { id: 'coucou', x: 23, y: 1 }, { id: 'miroir', x: 17, y: 1 }];

export function drawLobby(x, cam, now, players, meId, prompts) {
  x.drawImage(background(), -cam.x, -cam.y);
  x.save(); x.translate(-cam.x, -cam.y);
  const t = now / 1000;
  // neon sign of the showroom
  const flick = Math.sin(t * 11) > 0.97 ? 0.3 : 1, sx = 19.5 * T;
  R(x, '#1a1020', sx - 58, 2, 116, 13);
  x.globalAlpha = 0.35 * flick; for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) text(x, 'MEUBLES ET DECO', sx + dx, 5 + dy, '#ff2090', 1, 'center');
  x.globalAlpha = flick; text(x, 'MEUBLES ET DECO', sx, 5, '#ffb0e0', 1, 'center'); x.globalAlpha = 1;
  for (const it of WALL_DISPLAY) drawFurniture(x, it.id, it.x * T, it.y * T, it, now);
  // elevator floor dial
  const ex = LOBBY_ELEV.x, a = Math.PI * (0.15 + 0.7 * (0.5 + 0.5 * Math.sin(t * 0.4)));
  R(x, '#3a2a10', ex - 9, 11, 18, 6);
  R(x, '#ffe060', Math.round(ex - Math.cos(a) * 6), Math.round(16 - Math.sin(a) * 4), 1, 1); R(x, '#ffe060', ex, 16, 1, 1);
  const objs = [];
  for (const p of PODIUMS) for (const it of p.items) {
    const d = FURNITURE[it.id], draw = () => drawFurniture(x, it.id, it.x * T, it.y * T, { ...it, on: true }, now);
    if (d.layer === 'rug') draw(); else objs.push([(it.y + d.h) * T, draw]);
  }
  objs.push([CONCIERGE.y, () => drawAvatar(x, CONCIERGE.x, CONCIERGE.y, NPC_OUTFITS.concierge, '#222', 0, 0, now)]);
  objs.push([7 * T, () => { // concierge desk with a bell and the register
    R(x, '#5a3418', T, 6 * T - 2, 4 * T, T + 2); R(x, '#c8a040', T, 6 * T - 3, 4 * T, 2); R(x, '#7a4a24', T + 4, 6 * T + 2, 4 * T - 8, 8);
    R(x, '#e8c860', 3.5 * T, 6 * T - 6, 5, 3); R(x, '#f0ece0', 1.6 * T, 6 * T - 5, 10, 3);
  }]);
  objs.push([SELLER.y, () => drawAvatar(x, SELLER.x, SELLER.y, NPC_OUTFITS.seller, '#222', 0, 0, now)]);
  objs.push([11 * T, () => { // showroom counter with a cash register
    R(x, '#f0ece4', 21 * T, 10 * T - 2, 3 * T, T + 2); R(x, '#c8a040', 21 * T, 10 * T - 3, 3 * T, 2); R(x, '#d8d0c4', 21 * T + 3, 10 * T + 3, 3 * T - 6, 8);
    R(x, '#2a2a30', 23 * T, 10 * T - 10, 12, 8); R(x, '#60ff80', 23 * T + 2, 10 * T - 8, 8, 2); text(x, 'CAISSE', 22.5 * T, 10 * T + 5, '#a89880', 1, 'center');
  }]);
  objs.push([11 * T, () => { R(x, '#5a3418', 9 * T, 10 * T + 4, 3 * T, 6); R(x, '#7a4a24', 9 * T, 10 * T, 3 * T, 4); R(x, '#3a2418', 9 * T + 2, 10 * T + 10, 2, 3); R(x, '#3a2418', 12 * T - 4, 10 * T + 10, 2, 3); }]); // bench
  for (const [px, py] of LOBBY_PLANTS) objs.push([py * T + T, () => x.drawImage(plantSprite(), px * T, py * T + T - 17)]);
  for (const py of [3, 12]) objs.push([py * T + T, () => x.drawImage(pillarSprite(), 13 * T, py * T + T - 44)]);
  playerObjs(x, objs, players, now);
  objs.sort((a2, b2) => a2[0] - b2[0]);
  for (const [, f] of objs) f();
  PODIUMS.forEach((p, i) => { // department tags in front of each podium
    const cx = (p.x + p.w / 2) * T, ty = (p.y + p.h) * T - 2;
    R(x, '#c8a040', cx - 19, ty - 1, 38, 9); R(x, '#2a1a10', cx - 18, ty, 36, 7); text(x, DEPTS[i], cx, ty + 1, '#ffe680', 1, 'center');
  });
  // night: chandeliers in the hall, spots on the podiums
  const lights = [[6.5 * T, 7 * T, 130, '255,220,160'], [3 * T, 5 * T, 60, '255,210,140'], ...PODIUMS.map(p => [(p.x + p.w / 2) * T, (p.y + p.h / 2) * T, 70, '255,240,210']), [sx, 10, 60, '255,90,200'], [22.5 * T, 10 * T, 50, '255,240,210']];
  for (const p of PODIUMS) for (const it of p.items) lights.push(...lightsOf({ ...it, on: true }));
  lighting(x, W, H, darkness() * 0.7, lights);
  overheads(x, players, now, meId);
  for (const pr of prompts) label(x, pr.text, pr.x, pr.y, '#ffe680', 'rgba(30,10,40,.9)');
  x.restore();
}

// What E does here. Next to a podium, E opens the showroom on that piece of furniture.
export function nearbyLobby(me) {
  if (nearLobbyExit(me)) return { kind: 'exit', x: me.x, y: me.y - 40, text: 'E : SORTIR DANS LA RUE' };
  if (nearElevatorApt(me)) return { kind: 'elev', x: LOBBY_ELEV.x, y: 3 * T - 2, text: 'E : ASCENSEUR' };
  if (nearConcierge(me)) return { kind: 'concierge', x: CONCIERGE.x, y: CONCIERGE.y - 40, text: 'E : PARLER AU CONCIERGE' };
  if (nearFurnShop(me)) return { kind: 'fshop', x: SELLER.x, y: SELLER.y - 40, text: 'E : BOUTIQUE DE MEUBLES' };
  for (const p of PODIUMS) {
    if (me.x < p.x * T - 10 || me.x > (p.x + p.w) * T + 10 || me.y < p.y * T - 6 || me.y > (p.y + p.h) * T + 14) continue;
    let best = null, bd = 1e9;
    for (const it of p.items) { const d = FURNITURE[it.id], dist = Math.hypot((it.x + d.w / 2) * T - me.x, (it.y + d.h) * T - me.y); if (dist < bd) { bd = dist; best = it; } }
    const d = FURNITURE[best.id];
    return { kind: 'fshop', sel: best.id, x: (best.x + d.w / 2) * T, y: best.y * T - 26, text: `E : ${d.name.toUpperCase()} - ${d.price.toLocaleString('fr-FR')}` };
  }
  return null;
}
