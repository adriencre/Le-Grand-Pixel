// Shared by the server and the browser: room layout, seats, collisions.
export const T = 16, MW = 44, MH = 28;
export const SPAWN = { x: 22 * T, y: 25 * T };
export const COLORS = ['#e04050', '#3a7bd5', '#2fb36b', '#f2b233', '#9b51e0', '#ff7a2f', '#22c4c4', '#f0f0f0'];

export const TABLES = [
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
export const LEADER = { x: 246, y: 280, w: 72, h: 52 }; // standing neon leaderboard (px)
export const SHOP = { x: 1, y: 23, w: 12, h: 4 }; // boutique corner (tiles)
export const MANNEQUINS = [[88, 398], [128, 398], [168, 398]]; // feet (px)
export function nearShop(p) { return p.x < (SHOP.x + SHOP.w) * T && p.y > 22.6 * T; }

export const PILLARS = [[14, 8], [29, 8], [14, 22], [29, 22]];
export const PLANTS = [[1, 3], [42, 3], [1, 26], [42, 26], [18, 26], [25, 26], [42, 9], [42, 18]];
export const BAR = { x: 29, y: 5, w: 12 }; // counter row, bartender stands behind it
export const NPCS = [
  ...TABLES.filter(t => t.type === 'blackjack').map(t => ({ x: t.x * T + 48, y: t.y * T + 6, dir: 0, role: 'dealer' })),
  ...TABLES.filter(t => t.type === 'roulette').map(t => ({ x: t.x * T + 72, y: t.y * T + 6, dir: 0, role: 'dealer' })),
  { x: 35 * T, y: 4 * T + 14, dir: 0, role: 'barman' },
  { x: 24, y: 24 * T + 10, dir: 2, role: 'shop' },
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
  ...TABLES.map(t => {
    if (t.type === 'slots') return [t.x * T, 3 * T, T, 2 * T];
    if (t.type === 'blackjack') return [t.x * T + 8, t.y * T, 80, 40];
    if (t.type === 'race') return [t.x * T, t.y * T + 8, t.w * T, 3 * T];
    return [t.x * T + 2, t.y * T, t.w * T - 4, t.h * T - 2];
  }),
  [LEADER.x + 4, LEADER.y + LEADER.h - 10, LEADER.w - 8, 10],
  [2 * T, 23 * T, T, 3 * T], [5 * T, 26 * T, 7 * T, T], // shop counter, clothes rack
  ...MANNEQUINS.map(([x, y]) => [x - 6, y - 4, 12, 5]),
  ...PILLARS.map(([x, y]) => [x * T + 2, y * T + 6, 12, 10]),
  ...PLANTS.map(([x, y]) => [x * T + 3, y * T + 8, 10, 8]),
];

export function hits(x, y) { // feet box 8x4
  return SOLIDS.some(([sx, sy, sw, sh]) => x + 4 > sx && x - 4 < sx + sw && y > sy && y - 4 < sy + sh);
}

export function nearBar(p) { return p.y < 7 * T && p.x > BAR.x * T && p.x < (BAR.x + BAR.w) * T; }
