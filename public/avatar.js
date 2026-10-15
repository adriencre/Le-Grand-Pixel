// Layered pixel avatars: body + clothes + hair + hat + glasses + accessory, 4 directions, 3 walk frames,
// plus animated cosmetic effects. Grids use body coordinates (body is 10x16, head rows 0-7).
import { canvas, shade } from './sprites.js';
import { ITEMS, SKINS, HAIR_COLORS } from './items.js';

const P = (rows, y = 0, x = 0) => ({ x, y, rows });

// ---------- body ----------
export const HEAD = {
  down: ['..ssssss..', '.ssssssss.', '.ssssssss.', '.ssssssss.', '.ssessess.', '.ssessess.', '.sssmmsss.', '..ssssss..'],
  up: ['..ssssss..', '.ssssssss.', '.ssssssss.', '.ssssssss.', '.ssssssss.', '.ssssssss.', '.ssssssss.', '..ssssss..'],
  side: ['..ssssss..', '.ssssssss.', '.ssssssss.', '.ssssssss.', '.sssssses.', '.sssssses.', '..sssssss.', '..ssssss..'],
};

// rows 8-12; a main, A shade, c second, C second shade, x third, g gold, k black, s skin
export const TOPS = {
  tee: {
    down: ['...sAAs...', '..aaaaaa..', '.AaaaaaaA.', '.saaaaaas.', '..aaaaaa..'],
    up: ['...ssss...', '..aaaaaa..', '.AaaaaaaA.', '.saaaaaas.', '..aaaaaa..'],
    side: ['...sAA....', '...aaaa...', '..aaaaAa..', '..aaaasa..', '...aaaa...'],
  },
  stripes: {
    down: ['...sAAs...', '..cccccc..', '.AaaaaaaA.', '.sccccccs.', '..aaaaaa..'],
    up: ['...ssss...', '..cccccc..', '.AaaaaaaA.', '.sccccccs.', '..aaaaaa..'],
    side: ['...sAA....', '...cccc...', '..aaaaAa..', '..ccccsc..', '...aaaa...'],
  },
  hawaii: {
    down: ['...sAAs...', '..acaaca..', '.AacaacaA.', '.scaacaas.', '..aacaac..'],
    up: ['...ssss...', '..aacaac..', '.AcaacaaA.', '.saacaacs.', '..caacaa..'],
    side: ['...sAA....', '...acaa...', '..acaaAa..', '..aacasa..', '...caac...'],
  },
  hoodie: {
    down: ['..AssssA..', '..aaaaaa..', '.AaaCCaaA.', '.saaCCaas.', '..aaaaaa..'],
    up: ['..AAAAAA..', '..aAAAAa..', '.AaaAAaaA.', '.saaaaaas.', '..aaaaaa..'],
    side: ['..AAsA....', '..AAaaa...', '..aaaaAa..', '..aaCasa..', '...aaaa...'],
  },
  leather: {
    down: ['...sAAs...', '..acccga..', '.Aacccgaa.', '.saccgaas.', '..aaaaaa..'],
    up: ['...ssss...', '..aaaaaa..', '.AaaaaaaA.', '.saaaaaas.', '..aaaaaa..'],
    side: ['...sAA....', '...aacg...', '..aaaaAg..', '..aaaasa..', '...aaaa...'],
  },
  suit: {
    down: ['...cxxc...', '..acxxca..', '.aacxxcaa.', '.saacxcas.', '..aaaaaa..'],
    up: ['...ssss...', '..aaaaaa..', '.aaaAAaaa.', '.saaAAaas.', '..aaaaaa..'],
    side: ['...sac....', '...aacx...', '..aaaaAx..', '..aaaasa..', '...aaaa...'],
  },
  tux: {
    down: ['...xxxx...', '..acccca..', '.aacxxcaa.', '.saccccas.', '..aaccaa..'],
    up: ['...ssss...', '..aaaaaa..', '.aaaAAaaa.', '.saaAAaas.', '..aaaaaa..'],
    side: ['...sxx....', '...aacc...', '..aaaaAc..', '..aaaasa..', '...aaca...'],
  },
  armor: {
    down: ['..AaaaaA..', '..aaccaa..', '.AaaccaaA.', '.AaaaaaaA.', '..AAAAAA..'],
    up: ['..AaaaaA..', '..aaaaaa..', '.AaaaaaaA.', '.AaaaaaaA.', '..AAAAAA..'],
    side: ['...AaA....', '...aaac...', '..aaaaAc..', '..aaaaAa..', '...AAAA...'],
  },
  dress: {
    down: ['...sAAs...', '..aaaaaa..', '.saaaaaas.', '.saAaaAas.', '..aaaaaa..'],
    up: ['...ssss...', '..aaaaaa..', '.saaaaaas.', '.saaaaaas.', '..aaaaaa..'],
    side: ['...sa.....', '...aaaa...', '..aaaasa..', '..aaaasa..', '...aaaa...'],
  },
};
export const DRESS_SKIRT = { down: ['..aaaaaa..', '.aAaaaaAa.'], up: ['..aaaaaa..', '.aAaaaaAa.'], side: ['...aaaa...', '..aaaaaa..'] };

// rows 13-15 per walk frame; U hips, L lower legs, F feet
export const LEGS = {
  v: [['..UUUUUU..', '..LL..LL..', '..FF..FF..'], ['..UUUUUU..', '..LL..FF..', '..FF......'], ['..UUUUUU..', '..FF..LL..', '......FF..']],
  s: [['...UUUU...', '...LLLL...', '...FFFFF..'], ['...UUUU...', '..LL..LL..', '.FF....FF.'], ['...UUUU...', '...LLLL...', '...FFFFF..']],
};

// ---------- hair ----------
const COURT = {
  down: [P(['..hhhhhh..', '.hhhhhhhh.', '.hhhhhhhh.', '.h......h.'])],
  up: [P(['..hhhhhh..', '.hhhhhhhh.', '.hhhhhhhh.', '.hhhhhhhh.', '.hhhhhhhh.', '..hhhhhh..', '..HHHHHH..'])],
  side: [P(['..hhhhhh..', '.hhhhhhhh.', '.hhhhhhhh.', '.hhh....h.', '.hh.......', '.hh.......'])],
};
const TAILS = [P(['hh.', 'hhh', 'hh.', 'hh.', 'H..'], 2, -2), P(['.hh', 'hhh', '.hh', '.hh', '..H'], 2, 9)];
export const HAIR = {
  court: COURT,
  rase: {
    down: [P(['..HHHHHH..', '.H......H.'])],
    up: [P(['..HHHHHH..', '.HHHHHHHH.', '.HHHHHHHH.', '.HHHHHHHH.'])],
    side: [P(['..HHHHHH..', '.HHHHH....', '.HH.......'])],
  },
  carre: {
    down: [P(['..hhhhhh..', '.hhhhhhhh.', 'hhhhhhhhhh', 'hh......hh', 'hh......hh', 'hh......hh', 'H........H'])],
    up: [P(['..hhhhhh..', '.hhhhhhhh.', 'hhhhhhhhhh', 'hhhhhhhhhh', 'hhhhhhhhhh', 'hhhhhhhhhh', 'hhhhhhhhhh', 'HHHHHHHHHH'])],
    side: [P(['..hhhhhh..', '.hhhhhhhh.', 'hhhhhhhhh.', 'hhhh....h.', 'hhh.......', 'hhh.......', 'HHH.......'])],
  },
  long: {
    down: [P(['..hhhhhh..', '.hhhhhhhh.', 'hhhhhhhhhh', 'hh......hh', 'hh......hh', 'hh......hh', 'hh......hh', 'h........h', 'h........h', 'H........H'])],
    up: [P(['..hhhhhh..', '.hhhhhhhh.', 'hhhhhhhhhh', 'hhhhhhhhhh', 'hhhhhhhhhh', 'hhhhhhhhhh', 'hhhhhhhhhh', '.hhhhhhhh.', '.hhhhhhhh.', '..hhhhhh..', '..HHHHHH..'])],
    side: [P(['..hhhhhh..', '.hhhhhhhh.', 'hhhhhhhhh.', 'hhhh....h.', 'hhh.......', 'hhh.......', 'hhh.......', 'hhh.......', 'hh........', 'HH........'])],
  },
  queue: {
    down: COURT.down,
    up: [...COURT.up, P(['...hhhh...', '....hh....', '....hh....', '....HH....'], 7)],
    side: [...COURT.side, P(['..h', 'hhh', 'hh.', 'hh.', 'h..', 'H..'], 2, -2)],
  },
  chignon: {
    down: [P(['...hhhh...', '..hhhhhh..', '...hhhh...'], -3), ...COURT.down],
    up: [P(['...hhhh...', '..hhhhhh..', '...hhhh...'], -3), ...COURT.up],
    side: [P(['hhh.', 'hhhh', '.hh.'], -2, -1), ...COURT.side],
  },
  couettes: { down: [...COURT.down, ...TAILS], up: [...COURT.up, ...TAILS], side: [...COURT.side, P(['.hh', 'hhh', 'hh.', 'hh.', 'H..'], 2, -2)] },
  crete: {
    down: [P(['....hh....', '....hh....', '...hhhh...', '..HhhhhH..', '.H.hhhh.H.'], -3)],
    up: [P(['....hh....', '....hh....', '...hhhh...', '..HhhhhH..', '.H.hhhh.H.'], -3)],
    side: [P(['...hhhh...', '..hhhhhh..', '..hhhhhhh.', '.HHhhhhhH.', '.HH.......'], -3)],
  },
  banane: {
    down: [P(['...hhhhh..', '..hhhhhhh.', '.hhhhhhhhh'], -3), ...COURT.down],
    up: [P(['..hhhhhh..', '.hhhhhhhh.'], -2), ...COURT.up],
    side: [P(['...hhhhhh..', '..hhhhhhhhh', '.hhhhhhhhhh'], -3), ...COURT.side],
  },
  afro: {
    down: [P(['....hhhhhh....', '..hhhhhhhhhh..', '.hhhhhhhhhhhh.', 'hhhhhhhhhhhhhh', 'hhhhhhhhhhhhhh', 'hhhh......hhhh', 'hhh........hhh', 'hhh........hhh', '.hh........hh.', '..h........h..'], -4, -2)],
    up: [P(['....hhhhhh....', '..hhhhhhhhhh..', '.hhhhhhhhhhhh.', 'hhhhhhhhhhhhhh', 'hhhhhhhhhhhhhh', 'hhhhhhhhhhhhhh', 'hhhhhhhhhhhhhh', 'hhhhhhhhhhhhhh', '.hhhhhhhhhhhh.', '..HHHHHHHHHH..'], -4, -2)],
    side: [P(['....hhhhhh....', '..hhhhhhhhhh..', '.hhhhhhhhhhhh.', 'hhhhhhhhhhhhhh', 'hhhhhhhhhhhhh.', 'hhhhhhh.......', 'hhhhhh........', 'hhhhhh........', '.hhhh.........', '..hh..........'], -4, -3)],
  },
};

// ---------- hats (same grid for every direction unless split) ----------
export const HATS = {
  cap: {
    down: [P(['...aaaa...', '..aaaaaa..', '.aaaaaaaa.', '.cccccccc.'], -2)],
    up: [P(['...aaaa...', '..aaaaaa..', '.aaaaaaaa.', '.aaaaaaaa.'], -2)],
    side: [P(['..aaaa....', '.aaaaaa...', '.aaaaaaa..', '.aaaaaaccc'], -2)],
  },
  beanie: { all: [P(['....cc....', '..aaaaaa..', '.aaaaaaaa.', '.aaaaaaaa.', '.AAAAAAAA.'], -3)] },
  party: { all: [P(['....cc....', '....aa....', '...acca...', '..aaaaaa..', '..acaaca..'], -5)] },
  cowboy: { all: [P(['....aaaaaa....', '...aaAaaAaa...', '...cccccccc...', 'AAaaaaaaaaaaAA', '.AAAAAAAAAAAA.'], -4, -2)] },
  fedora: { all: [P(['...aaaaaa...', '..aAaaaaAa..', '..cccccccc..', 'aaaaaaaaaaaa'], -3, -1)] },
  tophat: { all: [P(['...aaaaaa...', '...aaaaaa...', '...aaaaaa...', '...aaaaaa...', '...cccccc...', '...aaaaaa...', 'aaaaaaaaaaaa'], -6, -1)] },
  viking: { all: [P(['....aaaaaa....', 'c..aaaaaaaa..c', 'cc.aaaaaaaa.cc', '.ccAAAAAAAAcc.'], -3, -2)] },
  horns: { all: [P(['.a......a.', '.aa....aa.'], -2)] },
  halo: { all: [P(['..aaaaaa..', '.a......a.', '..aaaaaa..'], -6)] },
  crown: { all: [P(['.a..aa..a.', '.aa.aa.aa.', '.aaaaaaaa.', '.acaxxaca.'], -4)] },
};

// ---------- glasses (not visible from behind) ----------
export const GLASSES = {
  shades: { down: [P(['.aaaaaaaa.', '..aa..aa..'], 4)], side: [P(['...aaaaaa.', '......aa..'], 4)] },
  round: { down: [P(['.allaalla.', '..aa..aa..'], 4)], side: [P(['...aaalla.', '......aa..'], 4)] },
  '3d': { down: [P(['.wwwwwwww.', '.waawwccw.'], 4)], side: [P(['...wwwwww.', '......cc..'], 4)] },
  aviator: { down: [P(['.gaaggaag.', '..aa..aa..'], 4)], side: [P(['...gggaag.', '......aa..'], 4)] },
  heart: { down: [P(['.a.a..a.a.', 'aaaaaaaaaa', '.aaa..aaa.', '..a....a..'], 3)], side: [P(['......a.a.', '...aaaaaaa', '......aaa.', '.......a..'], 3)] },
  monocle: { down: [P(['......gg..', '.....g..g.', '.....g..g.', '......gg..', '.......g..', '.......g..'], 3)], side: [P(['......gg..', '.....g..g.', '.....g..g.', '......gg..', '........g.'], 3)] },
  visor: { down: [P(['kkkkkkkkkk', 'kaaaaaaaak'], 4)], side: [P(['...kkkkkkk', '...kaaaaak'], 4)] },
  mask: {
    down: [P(['.gaaaaaag.', '.aa.aa.aa.', '..aa..aa..'], 3), P(['........cc', '.........c', '........c.'], 0)],
    side: [P(['...gaaaaag', '......a.aa', '......aaa.'], 3), P(['...cc.....', '....c.....', '...c......'], 0)],
  },
};

// ---------- accessories: back layer (behind the body) and front layer ----------
const WINGS = P(['aa..............aa', 'aaa............aaa', '.aaa..........aaa.', '.aaaa........aaaa.', '..aaaa......aaaa..', '..acaa......aaca..', '...aca......aca...', '....aa......aa....'], 5, -4);
export const ACCS = {
  bowtie: { down: { front: [P(['...aAAa...'], 8)] }, side: { front: [P(['......aa..'], 8)] }, up: {} },
  scarf: {
    down: { front: [P(['..aaaaaa..', '...Aa.....', '...A......'], 8)] },
    up: { front: [P(['..aaaaaa..'], 8)] },
    side: { front: [P(['...aaaa...', '...aA.....', '...A......'], 8)] },
  },
  chain: { down: { front: [P(['..g....g..', '...g..g...', '....gg....', '....GG....'], 8)] }, side: { front: [P(['......g...', '.....gg...'], 9)] }, up: {} },
  cigar: { down: { front: [P(['......aaac'], 6)] }, side: { front: [P(['........aac'], 6)] }, up: {} },
  cape: {
    down: { back: [P(['a..........a', 'aa........aa', 'aa........aa', 'aa........aa', 'aa........aa', 'cc........cc', 'cc........cc'], 8, -1)], front: [P(['..g....g..'], 8)] },
    up: { front: [P(['.aaaaaaaaaa.', 'aaaaaaaaaaaa', 'aaaaaaaaaaaa', 'aaaaaaaaaaaa', 'aaaaaaaaaaaa', 'aaaaaaaaaaaa', 'cccccccccccc'], 8, -1)] },
    side: { back: [P(['...a......', '..aaa.....', '..aaaa....', '.aaaaa....', '.aaaaa....', 'aaaaa.....', 'ccccc.....'], 8, -3)] },
  },
  wings: {
    down: { back: [WINGS] }, up: { front: [WINGS] },
    side: { back: [P(['aa......', 'aaa.....', '.aaa....', '.aaaa...', '..aaaa..', '..acaa..', '...aca..', '....aa..'], 4, -5)] },
  },
};

// ---------- compose ----------
const OX = 4, OY = 8, CWD = 18, CHT = 26;
function paint(x, part, pal) {
  part.rows.forEach((r, j) => {
    for (let i = 0; i < r.length; i++) {
      let col = pal[r[i]];
      if (typeof col === 'function') col = col(i, j);
      if (!col) continue;
      x.fillStyle = col;
      x.fillRect(OX + part.x + i, OY + part.y + j, 1, 1);
    }
  });
}
function palOf(item, color) {
  const c = item?.colors === 'player' ? { a: color } : item?.colors || {};
  const p = { g: '#f0c040', G: '#a07010', k: '#141018', w: '#f4f4f4', l: 'rgba(200,230,255,.45)', ...c };
  if (c.a) p.A = shade(c.a, 0.72);
  if (c.c) p.C = shade(c.c, 0.72);
  return p;
}
const get = (o, slot, fallback) => ITEMS[o?.[slot]] || (fallback && ITEMS[fallback]);

const cache = new Map();
export function avatarSprite(o, color, dir, frame, mannequin = false) {
  const key = JSON.stringify(o) + color + dir + frame + mannequin;
  let c = cache.get(key);
  if (c) return c;
  if (cache.size > 3000) cache.clear();
  const D = dir === 0 ? 'down' : dir === 3 ? 'up' : 'side';
  const [cv, x] = canvas(CWD, CHT);
  const skin = mannequin ? '#d4d4de' : SKINS[o?.skin] || SKINS[1];
  const hc = HAIR_COLORS[o?.hairColor] || HAIR_COLORS[0];
  const base = { s: skin, e: mannequin ? '#b8b8c4' : '#1a1020', m: mannequin ? skin : '#b85a50', h: hc, H: shade(hc, 0.7) };
  const acc = get(o, 'acc'), accDef = acc && ACCS[acc.style]?.[D], accPal = { ...base, ...palOf(acc) };
  accDef?.back?.forEach(p => paint(x, p, accPal));
  paint(x, P(HEAD[D]), base);
  const top = get(o, 'top', 'top_tee'), tpal = { ...base, ...palOf(top, color) };
  paint(x, P(TOPS[top.style][D], 8), tpal);
  const bot = get(o, 'bottom', 'bot_jean'), bp = palOf(bot), shoe = get(o, 'shoes', 'sh_basic');
  const cloth = bot.style === 'checker' ? (i, j) => ((i + j) % 2 ? bp.a : bp.c) : bp.a;
  paint(x, P(LEGS[D === 'side' ? 's' : 'v'][frame], 13), { U: cloth, L: bot.style === 'shorts' || bot.style === 'skirt' ? skin : cloth, F: palOf(shoe).a });
  if (bot.style === 'skirt') paint(x, P([D === 'side' ? '..aaaaaa..' : '.aaaaaaaa.'], 13), bp);
  if (top.style === 'dress') paint(x, P(DRESS_SKIRT[D], 13), tpal);
  for (const p of HAIR[get(o, 'hair', 'hair_court').style][D]) paint(x, p, base);
  const gl = get(o, 'glasses');
  if (gl && D !== 'up') GLASSES[gl.style][D].forEach(p => paint(x, p, { ...base, ...palOf(gl) }));
  const hat = get(o, 'hat');
  if (hat) (HATS[hat.style].all || HATS[hat.style][D]).forEach(p => paint(x, p, { ...base, ...palOf(hat) }));
  accDef?.front?.forEach(p => paint(x, p, accPal));
  c = cv;
  if (dir === 1) { // left = mirrored right
    const [m, mx] = canvas(CWD, CHT);
    mx.translate(CWD, 0); mx.scale(-1, 1); mx.drawImage(cv, 0, 0);
    c = m;
  }
  cache.set(key, c);
  return c;
}

// Feet at (x, y). opts: { mannequin, trail: [{x,y}] for the rainbow effect }
export function drawAvatar(ctx, x, y, o, color, dir, frame, now, opts = {}) {
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.fillRect(x - 4, y - 1, 8, 2); ctx.fillRect(x - 3, y - 2, 6, 4);
  const fx = ITEMS[o?.fx]?.style;
  if (fx) drawFx(ctx, fx, x, y, now, 'back', opts.trail);
  if (ITEMS[o?.shoes]?.style === 'neon') {
    const hue = (now / 8) % 360;
    ctx.fillStyle = `hsla(${hue},100%,60%,.55)`; ctx.fillRect(x - 5, y - 1, 10, 2);
  }
  ctx.drawImage(avatarSprite(o, color, dir, frame, opts.mannequin), x - 9, y - 24 + (frame ? -1 : 0));
  if (ITEMS[o?.hat]?.style === 'halo') {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255,230,120,${0.25 + 0.1 * Math.sin(now / 200)})`; ctx.fillRect(x - 4, y - 31, 8, 4);
    ctx.restore();
  }
  if (fx) drawFx(ctx, fx, x, y, now, 'front', opts.trail);
}

// Small head for name plates (14x15).
const heads = new Map();
export function headIcon(o, color) {
  const key = JSON.stringify(o) + color;
  if (heads.has(key)) return heads.get(key);
  const [c, x] = canvas(14, 15);
  x.drawImage(avatarSprite(o, color, 0, 0), 2, 3, 14, 15, 0, 0, 14, 15);
  heads.set(key, c);
  return c;
}

// ---------- effects ----------
const HEART = ['.a.a.', 'aaaaa', '.aaa.', '..a..'];
const NOTE = ['..aa', '..a.', 'aaa.', 'aa..'];
function dots(ctx, rows, x, y, col) {
  ctx.fillStyle = col;
  rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === 'a') ctx.fillRect(x + i, y + j, 1, 1); });
}

export function drawFx(ctx, fx, x, y, t, layer, trail) {
  ctx.save();
  if (fx === 'aura' && layer === 'back') {
    const hue = (t / 15) % 360, r = 15 + Math.sin(t / 300) * 2;
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y - 11, 2, x, y - 11, r);
    g.addColorStop(0, `hsla(${hue},100%,65%,.55)`); g.addColorStop(1, `hsla(${hue},100%,50%,0)`);
    ctx.fillStyle = g; ctx.fillRect(x - r, y - 11 - r, r * 2, r * 2);
    for (let k = 0; k < 8; k++) {
      const a = t / 500 + k * Math.PI / 4;
      ctx.fillStyle = `hsl(${(hue + k * 45) % 360},100%,70%)`;
      ctx.fillRect(Math.round(x + Math.cos(a) * 11), Math.round(y - 11 + Math.sin(a) * 13), 1, 1);
    }
  } else if (fx === 'rainbow' && layer === 'back') {
    const pts = trail?.length ? trail : Array.from({ length: 12 }, (_, i) => ({ x: x - 4 - i * 3, y: y - Math.abs(Math.sin(t / 300 + i * 0.4)) * 2 }));
    pts.forEach((p, i) => {
      ctx.globalAlpha = 1 - i / pts.length;
      for (let b = 0; b < 3; b++) { ctx.fillStyle = `hsl(${(i * 30 + b * 120 + t / 5) % 360},100%,60%)`; ctx.fillRect(Math.round(p.x) - 3, Math.round(p.y) - 6 + b * 2, 6, 2); }
    });
  } else if (fx === 'stars') {
    for (let k = 0; k < 4; k++) {
      const a = t / 600 + k * Math.PI / 2, front = Math.sin(a) > 0;
      if (front !== (layer === 'front')) continue;
      const px = Math.round(x + Math.cos(a) * 11), py = Math.round(y - 10 + Math.sin(a) * 3);
      ctx.fillStyle = ['#ffe060', '#80f0ff', '#ff80d0', '#fff'][k];
      ctx.fillRect(px - 1, py, 3, 1); ctx.fillRect(px, py - 1, 1, 3);
    }
  } else if (layer === 'front') {
    if (fx === 'sparkle') for (let k = 0; k < 6; k++) {
      const ph = (t / 1400 + k / 6) % 1, a = k * 1.047 + t / 1800;
      const px = Math.round(x + Math.cos(a) * 9), py = Math.round(y - 6 - ph * 20);
      ctx.globalAlpha = 1 - ph; ctx.fillStyle = k % 2 ? '#ffe060' : '#fff';
      if (ph > 0.3 && ph < 0.6) { ctx.fillRect(px - 1, py, 3, 1); ctx.fillRect(px, py - 1, 1, 3); } else ctx.fillRect(px, py, 1, 1);
    } else if (fx === 'money') for (let k = 0; k < 5; k++) {
      const ph = (t / 2200 + k / 5) % 1, px = Math.round(x - 10 + ((k * 7) % 20) + Math.sin(t / 250 + k * 2) * 2), py = Math.round(y - 40 + ph * 38);
      ctx.globalAlpha = ph < 0.8 ? 1 : (1 - ph) * 5;
      ctx.fillStyle = '#3aa040'; ctx.fillRect(px, py, 5, 3);
      ctx.fillStyle = '#a8e898'; ctx.fillRect(px, py, 5, 1);
      ctx.fillStyle = '#1a6a20'; ctx.fillRect(px + 2, py + 1, 1, 1);
    } else if (fx === 'hearts') for (let k = 0; k < 3; k++) {
      const ph = (t / 1600 + k / 3) % 1;
      ctx.globalAlpha = 1 - ph;
      dots(ctx, HEART, Math.round(x - 2 + (k - 1) * 8 + Math.sin(t / 300 + k) * 2), Math.round(y - 22 - ph * 16), k === 1 ? '#ff4ab0' : '#ff6a80');
    } else if (fx === 'music') for (let k = 0; k < 3; k++) {
      const ph = (t / 1800 + k / 3) % 1;
      ctx.globalAlpha = 1 - ph;
      dots(ctx, NOTE, Math.round(x + (k % 2 ? 7 : -11) + Math.sin(ph * 6 + k) * 3), Math.round(y - 18 - ph * 16), ['#80f0ff', '#ffe060', '#ff80d0'][k]);
    } else if (fx === 'fire') for (let k = 0; k < 12; k++) {
      const ph = (t / 500 + k / 12) % 1, s = ph < 0.5 ? 2 : 1;
      ctx.globalAlpha = 1 - ph;
      ctx.fillStyle = ph < 0.3 ? '#fff0a0' : ph < 0.6 ? '#ffa020' : '#e03010';
      ctx.fillRect(Math.round(x - 6 + ((k * 5) % 13) + Math.sin(t / 90 + k) * 0.8), Math.round(y - 1 - ph * 11), s, s);
    }
  }
  ctx.restore();
}
