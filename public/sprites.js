// All the pixel art, drawn from code. Everything is rendered at native resolution and scaled up with nearest-neighbour.

export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  return [c, x];
}

export function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const ch = s => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * f)));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

export function grid(rows, pal) {
  const [c, x] = canvas(rows[0].length, rows.length);
  rows.forEach((r, y) => [...r].forEach((ch, X) => { if (pal[ch]) { x.fillStyle = pal[ch]; x.fillRect(X, y, 1, 1); } }));
  return c;
}

const memo = new Map();
const once = (key, fn) => memo.get(key) || (memo.set(key, fn()), memo.get(key));

// ---------- 3x5 pixel font ----------
const G = {
  A: '.#.#.#####.##.#', B: '##.#.###.#.###.', C: '.###..#..#...##', D: '##.#.##.##.###.', E: '####..##.#..###',
  F: '####..##.#..#..', G: '.###..#.##.#.##', H: '#.##.#####.##.#', I: '###.#..#..#.###', J: '..#..#..##.#.#.',
  K: '#.##.###.#.##.#', L: '#..#..#..#..###', M: '#.########.##.#', N: '##.#.##.##.##.#', O: '.#.#.##.##.#.#.',
  P: '##.#.###.#..#..', Q: '.#.#.##.###..##', R: '##.#.###.#.##.#', S: '.###...#...###.', T: '###.#..#..#..#.',
  U: '#.##.##.##.####', V: '#.##.##.##.#.#.', W: '#.##.########.#', X: '#.##.#.#.#.##.#', Y: '#.##.#.#..#..#.',
  Z: '###..#.#.#..###', 0: '####.##.##.####', 1: '.#.##..#..#.###', 2: '##...#.#.#..###', 3: '##...#.#...###.',
  4: '#.##.####..#..#', 5: '####..##...###.', 6: '.###..####.####', 7: '###..#.#..#..#.', 8: '####.#####.####',
  9: '####.####..###.', '.': '.............#.', ',': '..........#.#..', '!': '.#..#..#.....#.', '?': '##...#.#.....#.',
  ':': '....#.....#....', '-': '......###......', '+': '....#.###.#....', '/': '..#..#.#.#..#..', "'": '.#..#..........',
  '(': '.#.#..#..#...#.', ')': '.#...#..#..#.#.', '%': '#.#..#.#.#..#.#', '=': '...###...###...', '>': '#...#...#.#.#..',
  '<': '..#.#.#...#...#', '*': '...#.#.#.#.#...', '$': '.####..#..####.', '#': '#.####.####.#.#',
};
for (const k in G) G[k] = G[k].padEnd(15, '.');

export const clean = s => String(s).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
export const textW = (s, sc = 1) => Math.max(0, clean(s).length * 4 - 1) * sc;

export function text(ctx, s, x, y, color, sc = 1, align = 'left', shadow = null) {
  s = clean(s);
  if (align === 'center') x -= textW(s, sc) / 2;
  else if (align === 'right') x -= textW(s, sc);
  x = Math.round(x); y = Math.round(y);
  if (shadow) text(ctx, s, x + sc, y + sc, shadow, sc);
  ctx.fillStyle = color;
  for (let i = 0; i < s.length; i++) {
    const g = G[s[i]];
    if (!g) continue;
    for (let p = 0; p < 15; p++) if (g[p] === '#') ctx.fillRect(x + i * 4 * sc + (p % 3) * sc, y + ((p / 3) | 0) * sc, sc, sc);
  }
}

// Text inside a dark rounded label.
export function label(ctx, s, x, y, color = '#fff', bg = 'rgba(10,6,20,.75)') {
  const w = textW(s) + 4;
  ctx.fillStyle = bg;
  ctx.fillRect(Math.round(x - w / 2), y, w, 9);
  ctx.fillRect(Math.round(x - w / 2) - 1, y + 1, w + 2, 7);
  text(ctx, s, x, y + 2, color, 1, 'center');
}

// ---------- suits & cards ----------
const SUIT = {
  h: ['.##.##.', '#######', '#######', '#######', '.#####.', '..###..', '...#...'],
  d: ['...#...', '..###..', '.#####.', '#######', '.#####.', '..###..', '...#...'],
  s: ['...#...', '..###..', '.#####.', '#######', '#######', '.#.#.#.', '..###..'],
  c: ['..###..', '..###..', '##.#.##', '#######', '##.#.##', '...#...', '..###..'],
};
const SUIT_S = { // 5x5 for corners
  h: ['##.##', '#####', '#####', '.###.', '..#..'], d: ['..#..', '.###.', '#####', '.###.', '..#..'],
  s: ['..#..', '.###.', '#####', '#####', '.#.#.'], c: ['.###.', '.###.', '#####', '#####', '..#..'],
};
export const CW = 18, CH = 26;
const RED_C = '#d0283a', BLK_C = '#1c1c2c';

export function suitSprite(s, big = true, color) {
  return once('suit' + s + big + color, () => grid(big ? SUIT[s] : SUIT_S[s], { '#': color || ('hd'.includes(s) ? RED_C : BLK_C) }));
}

function cardBase(x, fill, border) {
  x.fillStyle = border; x.fillRect(1, 0, CW - 2, CH); x.fillRect(0, 1, CW, CH - 2);
  x.fillStyle = fill; x.fillRect(1, 1, CW - 2, CH - 2);
}

export function cardSprite(card) {
  return once('card' + card, () => {
    const [c, x] = canvas(CW, CH + 1);
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(1, 2, CW - 1, CH - 1); // drop shadow
    if (card === '??') {
      cardBase(x, '#a01c34', '#f4f1e8');
      for (let yy = 3; yy < CH - 3; yy++) for (let xx = 3; xx < CW - 3; xx++)
        x.fillStyle = (xx + yy) % 4 === 0 || (xx - yy + 40) % 4 === 0 ? '#d8485c' : '#a01c34', x.fillRect(xx, yy, 1, 1);
      x.fillStyle = '#f2c94c'; x.fillRect(7, 11, 4, 4); x.fillStyle = '#a01c34'; x.fillRect(8, 12, 2, 2);
      return c;
    }
    const r = card[0] === 'T' ? '10' : card[0], s = card[1], col = 'hd'.includes(s) ? RED_C : BLK_C;
    cardBase(x, '#f6f2e6', '#9a907c');
    text(x, r, 2, 2, col);
    x.drawImage(suitSprite(s, false), 2, 8);
    if ('JQK'.includes(r)) {
      x.fillStyle = '#e8c34a'; x.fillRect(5, 9, 10, 13);
      x.fillStyle = col === RED_C ? '#f3d6d6' : '#dde0ee'; x.fillRect(6, 10, 8, 11);
      x.drawImage(suitSprite(s, true), 6, 12);
      text(x, r, 10, 3, '#b08a20');
    } else x.drawImage(suitSprite(s, true), 8, 13);
    text(x, r, CW - 2, CH - 7, col, 1, 'right');
    return c;
  });
}

// ---------- chips ----------
export const DENOMS = [[1000, '#e2b02c', '#fff6c8'], [500, '#8a44c8', '#f0e0ff'], [100, '#24242c', '#e8e8f0'], [50, '#d03040', '#ffffff'], [10, '#eceff6', '#3a6ad0']];

export function chipSprite(color, edge) {
  return once('chip' + color + edge, () => {
    const [c, x] = canvas(9, 10);
    for (let yy = 0; yy < 10; yy++) for (let xx = 0; xx < 9; xx++) {
      const top = Math.hypot(xx - 4, yy - 4), bot = Math.hypot(xx - 4, yy - 5);
      if (top <= 4.4) {
        const a = Math.atan2(yy - 4, xx - 4), ring = top > 3.1, dash = ring && Math.floor((a + Math.PI) / (Math.PI / 4)) % 2 === 0;
        x.fillStyle = dash ? edge : top < 2.2 && top > 1.4 ? shade(color, 0.8) : color;
        if (top < 1.2) x.fillStyle = shade(color, 1.15);
      } else if (bot <= 4.4) x.fillStyle = shade(color, 0.55);
      else continue;
      x.fillRect(xx, yy, 1, 1);
    }
    return c;
  });
}

export function chipStack(ctx, amount, x, y, max = 10) {
  let left = amount, n = 0;
  const chips = [];
  for (const [v, c, e] of DENOMS) while (left >= v && n < max) { chips.push([c, e]); left -= v; n++; }
  if (!chips.length && amount > 0) chips.push([DENOMS[4][1], DENOMS[4][2]]);
  chips.reverse().forEach(([c, e], k) => ctx.drawImage(chipSprite(c, e), Math.round(x - 4), Math.round(y - 5 - k * 2)));
  return chips.length;
}

// ---------- slot symbols (12x12) ----------
const SYM_GRIDS = {
  cherry: ['........gg..', '.......gg...', '......g.g...', '.....g...g..', '....g....g..', '..rrr...rrr.', '.rwrrr.rwrrr', '.rrrrr.rrrrr', '.rrrrR.rrrrR', '..rrR...rrR.', '............', '............'],
  lemon: ['............', '............', '....yyyy....', '..yywwyyyy..', '.yywyyyyyyY.', 'yyyyyyyyyyyY', 'yyyyyyyyyyyY', '.yyyyyyyyyY.', '..yyyyyyYY..', '....YYYY....', '............', '............'],
  bell: ['............', '.....oo.....', '....oooo....', '...owoooo...', '...wooooO...', '..owoooooO..', '..ooooooooO.', '..ooooooooO.', '.ooooooooooO', 'OOOOOOOOOOOO', '.....oO.....', '............'],
  diamond: ['............', '............', '..cccccccc..', '.cwccwwccccC', 'ccccccccccCC', '.cccccccccC.', '..ccccccCC..', '...ccccCC...', '....cccC....', '.....cC.....', '............', '............'],
};
const SYM_PAL = { g: '#3aa040', r: '#e02838', R: '#901020', w: '#fff', y: '#f8e040', Y: '#c0a020', o: '#f0c030', O: '#a07010', c: '#60e0ff', C: '#2080c0' };

export function symbolSprite(name) {
  return once('sym' + name, () => {
    if (SYM_GRIDS[name]) return grid(SYM_GRIDS[name], SYM_PAL);
    const [c, x] = canvas(12, 12);
    if (name === 'bar') {
      x.fillStyle = '#101018'; x.fillRect(0, 3, 12, 7);
      x.fillStyle = '#f0f0f0'; x.fillRect(0, 2, 12, 1); x.fillRect(0, 10, 12, 1);
      text(x, 'BAR', 0, 4, '#f0f0f0');
    } else { // seven
      text(x, '7', 1, 1, '#600010', 2);
      text(x, '7', 0, 0, '#ff2a40', 2);
    }
    return c;
  });
}

// ---------- tables ----------
// inside(x, y) -> bool defines the felt shape in pixel coords.
export function tableSprite(key, w, h, inside, felt = '#1f7a3a', rim = '#6a3418') {
  return once('tbl' + key, () => {
    const [c, x] = canvas(w, h + 5);
    const near = (xx, yy, r) => [[r, 0], [-r, 0], [0, r], [0, -r], [r * .7, r * .7], [-r * .7, r * .7], [r * .7, -r * .7], [-r * .7, -r * .7]]
      .some(([dx, dy]) => !inside(xx + dx, yy + dy));
    for (let yy = 0; yy < h + 5; yy++) for (let xx = 0; xx < w; xx++) {
      let col = null;
      if (inside(xx, yy)) {
        if (near(xx, yy, 1)) col = '#1a0a04';
        else if (near(xx, yy, 5)) col = near(xx, yy - 2, 5) && !near(xx, yy + 2, 5) ? shade(rim, 0.75) : near(xx, yy, 3) ? rim : shade(rim, 1.35);
        else if (near(xx, yy, 7)) col = (xx + yy) % 2 ? '#c8a040' : '#a88430';
        else col = (xx * 7 + yy * 13) % 11 === 0 ? shade(felt, 0.9) : felt;
      } else if (inside(xx, yy - 4)) col = yy % 2 && !inside(xx, yy - 3) ? '#180804' : shade(rim, 0.5);
      else if (inside(xx, yy - 5)) col = '#100604';
      if (col) { x.fillStyle = col; x.fillRect(xx, yy, 1, 1); }
    }
    return c;
  });
}

export const shapes = {
  blackjack: (w, h, top = 3) => (x, y) => {
    const nx = (x - w / 2) / (w / 2), ny = (y - top) / (h - top);
    return y >= top && nx * nx + ny * ny <= 1;
  },
  oval: (w, h, p = 2.6) => (x, y) => Math.abs((x - w / 2) / (w / 2)) ** p + Math.abs((y - h / 2) / (h / 2)) ** p <= 1,
};

// Red velvet chair seen from above, back on the side away from the table.
export function chairSprite(dir) {
  return once('chair' + dir, () => {
    const rows = ['.yyyyyyyy.', 'yrrrrrrrry', 'yrRRRRRRry', 'yrRRRRRRry', 'yrRRRRRRry', 'yrrrrrrrry', '.yyyyyyyy.', '.k......k.'];
    return grid(rows, { y: '#c8a040', r: '#901828', R: '#b82838', k: '#2a1408' });
  });
}

// ---------- decor ----------
export function plantSprite() {
  return once('plant', () => grid([
    '.....g..g.......', '...g.gg.g..g....', '..gGgGgggGg.g...', '.gGGgGGgGGgGg...', 'gGgGGgGGGgGGGg..', '.gGgGGgGgGGgGgg.',
    '..gGgGgGGgGgGg..', '.gGgGGgGgGGGgGg.', '..ggGgGgGgGgg...', '...gggGgGggg....', '....gggggg......', '....oyyyyyo.....',
    '....oyyyyyo.....', '....yOOOOOy.....', '....yOOOOOy.....', '.....yOOOy......', '.....yyyyy......',
  ], { g: '#2f8a3c', G: '#4cbc52', o: '#a07818', y: '#d8b040', O: '#7a2c20' }));
}

export function pillarSprite() {
  return once('pillar', () => {
    const [c, x] = canvas(16, 44);
    x.fillStyle = '#c8a040'; x.fillRect(0, 0, 16, 4); x.fillRect(1, 38, 14, 6);
    x.fillStyle = '#f0d070'; x.fillRect(0, 0, 16, 1); x.fillRect(1, 38, 14, 1);
    for (let yy = 4; yy < 38; yy++) for (let xx = 2; xx < 14; xx++) {
      const v = Math.sin(yy * 0.4 + xx * 0.9) + Math.sin(yy * 0.13 - xx * 0.5);
      x.fillStyle = xx === 2 ? '#a8a0b0' : xx === 13 ? '#807888' : xx < 6 ? (v > 1.2 ? '#d8d0e0' : '#f2eef6') : v > 1.1 ? '#b8b0c4' : '#e0dce8';
      x.fillRect(xx, yy, 1, 1);
    }
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, 44 - 1, 16, 1);
    return c;
  });
}

// Slot machine cabinet, 16x32, animated by t (seconds).
export function drawSlotMachine(ctx, x, y, t, busy, seed) {
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = '#100818'; ctx.fillRect(x, y + 2, 16, 30);
  ctx.fillStyle = '#7a1838'; ctx.fillRect(x + 1, y + 3, 14, 28);
  ctx.fillStyle = '#a82848'; ctx.fillRect(x + 1, y + 3, 3, 28);
  ctx.fillStyle = '#4a0c20'; ctx.fillRect(x + 13, y + 3, 2, 28);
  // marquee with chasing lights
  ctx.fillStyle = '#c8a040'; ctx.fillRect(x + 1, y, 14, 7);
  ctx.fillStyle = '#301028'; ctx.fillRect(x + 2, y + 1, 12, 5);
  const k = Math.floor(t * 8 + seed);
  for (let i = 0; i < 6; i++) { ctx.fillStyle = (i + k) % 3 === 0 ? '#fff6a0' : (i + k) % 3 === 1 ? '#ff4060' : '#60e0ff'; ctx.fillRect(x + 2 + i * 2, y + 1 + (i % 2) * 4, 1, 1); }
  text(ctx, '7', x + 7, y + 1, '#ff3050');
  // screen
  ctx.fillStyle = '#c8a040'; ctx.fillRect(x + 2, y + 9, 12, 9);
  ctx.fillStyle = '#f8f4e8'; ctx.fillRect(x + 3, y + 10, 10, 7);
  const cols = ['#e02838', '#f8e040', '#f0c030', '#101018', '#ff2a40', '#60e0ff'];
  for (let r = 0; r < 3; r++) {
    const s = busy ? Math.floor(t * 20 + r * 3) : seed * 3 + r;
    ctx.fillStyle = cols[s % 6]; ctx.fillRect(x + 4 + r * 3, y + 12, 2, 3);
  }
  ctx.fillStyle = '#ff2040'; ctx.fillRect(x + 3, y + 13, 10, 1);
  // buttons + tray
  ctx.fillStyle = Math.floor(t * 2 + seed) % 2 ? '#40ff80' : '#208040'; ctx.fillRect(x + 4, y + 20, 2, 1);
  ctx.fillStyle = '#ff6020'; ctx.fillRect(x + 7, y + 20, 2, 1);
  ctx.fillStyle = '#4060ff'; ctx.fillRect(x + 10, y + 20, 2, 1);
  ctx.fillStyle = '#c8a040'; ctx.fillRect(x + 3, y + 25, 10, 3);
  ctx.fillStyle = '#201018'; ctx.fillRect(x + 4, y + 26, 8, 1);
  // lever
  ctx.fillStyle = '#909098'; ctx.fillRect(x + 15, y + 8, 1, 8);
  ctx.fillStyle = '#ff2040'; ctx.fillRect(x + 15, y + 6, 2, 2);
}

// ---------- horses (20x14, facing right, 2 gallop frames) ----------
const HORSE = [
  '........CC..........', '.......CCCs......m..', '.......ccc......mbb.', '......cccc.....mbbbb', '......ccc.....mbbbeb',
  '..mm..bbbbbbbbbbb.dd', '.mm..bbbbbbbbbbbb...', 'm...bbbbbbbbbbbbb...', '....bbbbbbbbbbbbd...', '....dbbbbbbbbbbd....',
];
const HORSE_LEGS = [
  ['....bb.d.....bb.d...', '...b...d....b...d...', '..b....d...b.....d..', '..k....k...k.....k..'],
  ['.....bd.....bd......', '.....bd.....bd......', '.....bd.....bd......', '.....kk.....kk......'],
];
export function horseSprite(coat, silk, frame) {
  return once('horse' + coat + silk + frame, () => grid([...HORSE, ...HORSE_LEGS[frame]], {
    b: coat, d: shade(coat, 0.7), m: shade(coat, 0.45), e: '#000', k: '#201810', c: silk, C: shade(silk, 0.7), s: '#f4cda4',
  }));
}

// ---------- emotes (11x11): 0 laugh, 1 thumbs up, 2 angry, 3 money, 4 party ----------
export function emoteSprite(k) {
  return once('emote' + k, () => {
    const [c, x] = canvas(11, 11);
    const px = (col, pts) => { x.fillStyle = col; for (const [a, b] of pts) x.fillRect(a, b, 1, 1); };
    const face = (fill) => {
      for (let yy = 0; yy < 11; yy++) for (let xx = 0; xx < 11; xx++) {
        const d = Math.hypot(xx - 5, yy - 5);
        if (d <= 5.4) { x.fillStyle = d > 4.5 ? '#2a1408' : fill; x.fillRect(xx, yy, 1, 1); }
      }
    };
    if (k === 0) {
      face('#f8d030');
      px('#2a1408', [[2, 4], [3, 3], [4, 4], [6, 4], [7, 3], [8, 4], [3, 6], [4, 7], [5, 7], [6, 7], [7, 6], [4, 6], [5, 6], [6, 6]]);
      px('#e04050', [[4, 8], [5, 8], [6, 8]]);
      px('#60c0ff', [[1, 5], [1, 6], [0, 7], [9, 5], [9, 6], [10, 7]]);
    } else if (k === 1) {
      return grid(['....oo.....', '...oyo.....', '...oyo.....', '..oyyoooo..', 'oooyyyyyyo.', 'oyoyyyyyyo.', 'oyoyyyyyo..', 'oyoyyyyyyo.', 'oyoyyyyyo..', 'oooooooo...', '...........'],
        { o: '#2a1408', y: '#f4cda4' });
    } else if (k === 2) {
      face('#e03a2a');
      px('#2a1408', [[2, 3], [3, 4], [8, 3], [7, 4], [3, 5], [7, 5], [4, 8], [5, 7], [6, 8], [3, 8], [7, 8]]);
      px('#fff', [[4, 5], [6, 5]]);
    } else if (k === 3) {
      x.fillStyle = '#1a5a20'; x.fillRect(0, 2, 11, 7);
      x.fillStyle = '#4cbc52'; x.fillRect(1, 3, 9, 5);
      text(x, '$', 4, 3, '#1a5a20');
      px('#fff', [[0, 0], [1, 1], [10, 0], [9, 1], [0, 10], [10, 10]]);
    } else {
      px('#c8a040', [[1, 9], [2, 9], [1, 8], [2, 8], [3, 8], [2, 7], [3, 7], [4, 7], [3, 6], [4, 6], [5, 6], [4, 5], [5, 5]]);
      px('#e04050', [[6, 1], [8, 4], [2, 2]]); px('#3a7bd5', [[9, 1], [5, 2], [10, 6]]); px('#2fb36b', [[7, 3], [3, 0], [9, 8]]);
      px('#f8d030', [[6, 5], [7, 6], [8, 2], [4, 3]]);
    }
    return c;
  });
}

export function drawEmote(ctx, k, x, y, age) { // age in ms, lasts 2500
  const rise = Math.min(1, age / 150);
  ctx.globalAlpha = age > 2000 ? Math.max(0, (2500 - age) / 500) : 1;
  ctx.fillStyle = '#fff';
  const X = Math.round(x - 7), Y = Math.round(y - 14 * rise - age / 250);
  ctx.fillRect(X, Y, 15, 15); ctx.fillStyle = '#1a0c20'; ctx.fillRect(X, Y + 15, 15, 1);
  ctx.drawImage(emoteSprite(k), X + 2, Y + 2);
  ctx.globalAlpha = 1;
}
