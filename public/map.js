// Shared by the server and the browser: room layout, seats, collisions.
export const T = 16, MW = 44, MH = 28;
export const SPAWN = { x: 22 * T, y: 25 * T };
export const COLORS = ['#e04050', '#3a7bd5', '#2fb36b', '#f2b233', '#9b51e0', '#ff7a2f', '#22c4c4', '#f0f0f0'];

export const CASINO_TABLES = [
  { id: 'bj1', type: 'blackjack', x: 4, y: 9, w: 6, h: 3, seats: 5, name: 'BLACKJACK' },
  { id: 'bj2', type: 'blackjack', x: 4, y: 18, w: 6, h: 3, seats: 5, name: 'BLACKJACK' },
  { id: 'poker', type: 'poker', x: 18, y: 12, w: 8, h: 4, seats: 6, name: 'POKER' },
  { id: 'roulette', type: 'roulette', x: 32, y: 12, w: 8, h: 3, seats: 6, name: 'ROULETTE' },
  { id: 'race', type: 'race', x: 32, y: 18, w: 10, h: 3, seats: 6, name: 'COURSES' },
  ...Array.from({ length: 8 }, (_, i) => ({ id: 'slot' + i, type: 'slots', x: 4 + i * 2, y: 3, w: 1, h: 2, seats: 1, name: 'MACHINE A SOUS' })),
];

export const HORSES = [
  { name: 'ECLAIR', coat: '#8a5a2a', silk: '#e04050' }, { name: 'TONNERRE', coat: '#2a2024', silk: '#3a7bd5' },
  { name: 'COMETE', coat: '#d8d0c8', silk: '#2fb36b' }, { name: 'PIXEL', coat: '#a83a1a', silk: '#f2b233' },
  { name: 'JACKPOT', coat: '#d8a850', silk: '#9b51e0' }, { name: 'BOLIDE', coat: '#5a3418', silk: '#ff7a2f' },
];
// VIP: golden elevator under the big neon sign, reception desk on its left, a bouncer on its right.
export const VIP_ELEVATOR = { x: 24 * T, y: 5 * T };
export const VIP_RECEPTION = { x: 21 * T, y: 4 * T };
export const VIP_BOUNCER = { x: 26 * T + 6, y: 5 * T + 12 };
export const nearElevatorIn = p => Math.abs(p.x - VIP_ELEVATOR.x) < 22 && p.y < 6 * T + 4;
export const nearReception = p => Math.abs(p.x - VIP_RECEPTION.x) < 26 && p.y < 6 * T + 4;
export const LEADER = { x: 246, y: 280, w: 72, h: 52 }; // standing neon leaderboard (px)
export const SHOP = { x: 1, y: 23, w: 12, h: 4 }; // boutique corner (tiles)
export const MANNEQUINS = [[88, 398], [128, 398], [168, 398]]; // feet (px)
export function nearShop(p) { return p.x < (SHOP.x + SHOP.w) * T && p.y > 22.6 * T; }

export const PILLARS = [[14, 8], [29, 8], [14, 22], [29, 22]];
export const PLANTS = [[1, 3], [42, 3], [1, 26], [42, 26], [18, 26], [25, 26], [42, 9], [42, 18]];
export const BAR = { x: 29, y: 5, w: 12 }; // counter row, bartender stands behind it
export function dealersOf(tables) {
  return tables.filter(t => t.type === 'blackjack' || t.type === 'roulette')
    .map(t => ({ x: t.x * T + (t.type === 'blackjack' ? 48 : 72), y: t.y * T + 6, dir: 0, role: 'dealer' }));
}
export const NPCS = [
  ...dealersOf(CASINO_TABLES),
  { x: 35 * T, y: 4 * T + 14, dir: 0, role: 'barman' },
  { x: 24, y: 24 * T + 10, dir: 2, role: 'shop' },
  { x: VIP_RECEPTION.x, y: 59, dir: 0, role: 'hostess' }, { x: VIP_BOUNCER.x, y: VIP_BOUNCER.y, dir: 0, role: 'bouncer' },
];

// Feet position of a seat (px) and the direction the sitter faces: 0 down, 1 left, 2 right, 3 up.
export function seatPos(t, i) {
  const X = t.x * T, Y = t.y * T;
  if (t.type === 'blackjack') {
    const a = (150 - 30 * i) * Math.PI / 180;
    return { x: Math.round(X + 48 + 52 * Math.cos(a)), y: Math.round(Y + 4 + 50 * Math.sin(a)), dir: 3 };
  }
  if (t.type === 'poker') {
    return [
      { x: X - 6, y: Y + 38, dir: 2 }, { x: X + 40, y: Y + 6, dir: 0 }, { x: X + 88, y: Y + 6, dir: 0 },
      { x: X + 134, y: Y + 38, dir: 1 }, { x: X + 88, y: Y + 72, dir: 3 }, { x: X + 40, y: Y + 72, dir: 3 },
    ][i];
  }
  if (t.type === 'roulette') return { x: X + 14 + i * 20, y: Y + 54, dir: 3 };
  if (t.type === 'race') return { x: X + 16 + i * 26, y: Y + 3 * T + 30, dir: 3 };
  return { x: X + 8, y: Y + 2 * T + 10, dir: 3 }; // slots
}

// Where you end up when you stand: one step away from the table.
export function standPos(t, i) {
  const s = seatPos(t, i), d = 14;
  return { x: s.x + [0, d, -d, 0][s.dir], y: s.y + [-d, 0, 0, d][s.dir] };
}

export const SOLIDS = [
  [0, 0, MW * T, 3 * T], [0, 0, T, MH * T], [(MW - 1) * T, 0, T, MH * T], [0, (MH - 1) * T, MW * T, T],
  [BAR.x * T, 3 * T, BAR.w * T, 3 * T],
  ...CASINO_TABLES.map(tableSolid),
  [364, 48, 40, 32], [320, 62, 32, 12], [VIP_BOUNCER.x - 5, VIP_BOUNCER.y - 4, 10, 4], // VIP elevator, reception, bouncer
  [LEADER.x + 4, LEADER.y + LEADER.h - 10, LEADER.w - 8, 10],
  [2 * T, 23 * T, T, 3 * T], [5 * T, 26 * T, 7 * T, T], // shop counter, clothes rack
  ...MANNEQUINS.map(([x, y]) => [x - 6, y - 4, 12, 5]),
  ...PILLARS.map(([x, y]) => [x * T + 2, y * T + 6, 12, 10]),
  ...PLANTS.map(([x, y]) => [x * T + 3, y * T + 8, 10, 8]),
];

export function tableSolid(t) {
  if (t.type === 'slots') return [t.x * T, 3 * T, T, 2 * T];
  if (t.type === 'blackjack') return [t.x * T + 8, t.y * T, 80, 40];
  if (t.type === 'race') return [t.x * T, t.y * T + 8, t.w * T, 3 * T];
  return [t.x * T + 2, t.y * T, t.w * T - 4, t.h * T - 2];
}

export function hits(x, y) { // feet box 8x4
  return SOLIDS.some(([sx, sy, sw, sh]) => x + 4 > sx && x - 4 < sx + sw && y > sy && y - 4 < sy + sh);
}

export function nearBar(p) { return p.y < 7 * T && p.x > BAR.x * T && p.x < (BAR.x + BAR.w) * T; }

// ---------- the street outside the casino ----------
export const ST = { w: 40, h: 18 }; // tiles: facade 0-5, sidewalk 6-11, road 12-14, far side 15-17
export const ST_SPAWN = { x: 20 * T, y: 7 * T + 10 };
export const BROKE = 10, ENTRY_MIN = 100; // under BROKE you get thrown out, ENTRY_MIN gets a homeless player back in
export const BINS = [[3, 8], [12, 11], [27, 11], [36, 8], [32, 11]]; // feet of each trash can (tiles)
export const BUSK = { x: 9 * T, y: 8 * T + 8 };
export const LAMPS = [[6, 11], [15, 11], [25, 11], [35, 11]];
export const BENCH = [29, 7];
export const HYDRANT = [23, 11];
export const BOUNCER = { x: 22 * T + 14, y: 6 * T + 10 };

export const ST_SOLIDS = [
  [0, 0, ST.w * T, 6 * T], [0, 12 * T - 2, ST.w * T, 6 * T], [0, 0, T, ST.h * T], [(ST.w - 1) * T, 0, T, ST.h * T],
  [T, 6 * T, 2 * T, T + 8], // cardboard shelter in the corner
  ...BINS.map(([x, y]) => [x * T - 6, y * T - 5, 12, 5]),
  ...LAMPS.map(([x, y]) => [x * T - 2, y * T - 3, 4, 3]),
  [BENCH[0] * T, BENCH[1] * T - 4, 2 * T, 6], [HYDRANT[0] * T - 3, HYDRANT[1] * T - 4, 6, 4],
  [BOUNCER.x - 5, BOUNCER.y - 4, 10, 4],
];

export function hitsIn(zone, x, y, vip = 0) {
  const solids = zone === 'street' ? ST_SOLIDS : zone === 'vip' ? (vip >= 3 ? V_SOLIDS : [...V_SOLIDS, DIAMOND_DOOR]) : SOLIDS;
  return solids.some(([sx, sy, sw, sh]) => x + 4 > sx && x - 4 < sx + sw && y > sy && y - 4 < sy + sh);
}
export const nearDoorIn = p => Math.abs(p.x - 22 * T) < 2 * T && p.y > 25.6 * T;
export const nearDoorOut = p => Math.abs(p.x - 20 * T) < 1.8 * T && p.y < 7.6 * T;
export const nearBusk = p => Math.hypot(p.x - BUSK.x, p.y - BUSK.y) < 20;
export const nearBin = p => BINS.findIndex(([x, y]) => Math.hypot(p.x - x * T, p.y - y * T - 6) < 22);

// ---------- the VIP floor (upstairs) ----------
// Cards: tier 1 Or, 2 Platine, 3 Diamant. Each table needs at least its tier.
export const TIERS = [
  null,
  { name: 'CARTE OR', price: 100000, color: '#f0c040', dark: '#8a6010', felt: '#141414', rim: '#c8a040' },
  { name: 'CARTE PLATINE', price: 500000, color: '#dce4f0', dark: '#6a7488', felt: '#18202e', rim: '#c8d0dc' },
  { name: 'CARTE DIAMANT', price: 2000000, color: '#60e8ff', dark: '#1a6a8a', felt: '#4a0c1c', rim: '#c8a040' },
];
export const upgradeCost = (from, to) => TIERS[to].price - (from ? TIERS[from].price : 0);

export const VW = 42, VH = 24;
export const VIP_SPAWN = { x: 20 * T, y: 22 * T };
const vt = (id, type, tier, x, y, name, limits) => {
  const [w, h, seats] = { blackjack: [6, 3, 5], poker: [8, 4, 6], roulette: [8, 3, 6] }[type];
  return { id, type, zone: 'vip', tier, x, y, w, h, seats, name, limits, felt: TIERS[tier].felt, rim: TIERS[tier].rim };
};
export const VIP_TABLES = [
  vt('vbj_or', 'blackjack', 1, 2, 17, 'BLACKJACK OR', { min: 1000, max: 25000, chips: [1000, 5000, 10000, 25000] }),
  vt('vpk_or', 'poker', 1, 9, 15, 'POKER OR', { sb: 250, bb: 500 }),
  vt('vrl_or', 'roulette', 1, 23, 15, 'ROULETTE OR', { min: 500, max: 25000, chips: [500, 1000, 5000, 10000] }),
  vt('vbj_pl', 'blackjack', 2, 34, 12, 'BLACKJACK PLATINE', { min: 5000, max: 100000, chips: [5000, 10000, 25000, 50000] }),
  vt('vpk_pl', 'poker', 2, 33, 17, 'POKER PLATINE', { sb: 1000, bb: 2000 }),
  vt('vbj_di', 'blackjack', 3, 3, 5, 'BLACKJACK DIAMANT', { min: 25000, max: 500000, chips: [25000, 50000, 100000, 250000] }),
  vt('vpk_di', 'poker', 3, 16, 5, 'POKER DIAMANT', { sb: 5000, bb: 10000 }),
  vt('vrl_di', 'roulette', 3, 28, 5, 'ROULETTE DIAMANT', { min: 10000, max: 250000, chips: [10000, 25000, 50000, 100000] }),
];
export const TABLES = [...CASINO_TABLES, ...VIP_TABLES];

export const VIP_BAR = { x: 1, y: 14, w: 7 }; // counter row (tiles), barman behind
export const PIANO = { x: 13 * T, y: 21 * T + 6 };
export const DIAMOND_GUARD = { x: 22 * T + 10, y: 11 * T + 14 };
const DIAMOND_DOOR = [19 * T, 11 * T - 2, 3 * T, 10];
export const V_NPCS = [
  ...dealersOf(VIP_TABLES),
  { x: 4 * T, y: 13 * T + 10, dir: 0, role: 'barman' },
  { x: PIANO.x + 22, y: PIANO.y + 18, dir: 3, role: 'dealer' }, // pianist on his stool
  { x: DIAMOND_GUARD.x, y: DIAMOND_GUARD.y, dir: 0, role: 'bouncer' },
];
export const V_SOLIDS = [
  [0, 0, VW * T, 4 * T], [0, 0, T, VH * T], [(VW - 1) * T, 0, T, VH * T], [0, (VH - 1) * T, VW * T, T],
  [T, 11 * T - 2, 18 * T, 10], [22 * T, 11 * T - 2, 19 * T, 10], // glass wall of the Diamant salon
  [T, 12 * T, VIP_BAR.w * T, 3 * T], [9 * T, 12 * T + 8, T, 10], // VIP bar, champagne tower
  [PIANO.x, PIANO.y - 4, 3 * T, 14],
  [DIAMOND_GUARD.x - 5, DIAMOND_GUARD.y - 4, 10, 4],
  ...VIP_TABLES.map(tableSolid),
];
export const nearElevatorOut = p => Math.abs(p.x - VIP_SPAWN.x) < 2 * T && p.y > 21.4 * T;
export const nearVipBar = p => p.x < (VIP_BAR.x + VIP_BAR.w) * T && p.y < 16.5 * T && p.y > 14.6 * T;
export const nearDiamondDoor = p => Math.abs(p.x - 20.5 * T) < 2 * T && Math.abs(p.y - 11.5 * T) < T;
