// Close-up scenes when seated. Each scene is drawn in a 480x270 space.
import { text, textW, label, cardSprite, CW, CH, chipStack, chipSprite, tableSprite, shapes, symbolSprite, canvas, horseSprite, drawEmote } from './sprites.js';
import { avatarSprite, headIcon } from './avatar.js';
import { NPC_OUTFITS } from './items.js';
import { HORSES } from './map.js';
import { raceProgress, raceElapsed } from './race.js';
import { sfx } from './sfx.js';

export const emotes = new Map(); // player id -> { k, at }, filled by main.js
export const outfits = new Map(); // player id -> outfit, filled by main.js

export const SW = 480, SH = 270;
const clamp = v => Math.max(0, Math.min(1, v));
const ease = p => 1 - (1 - p) ** 3;
const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const SYMS = ['cherry', 'lemon', 'bell', 'bar', 'seven', 'diamond'];
const PAY3 = [10, 15, 20, 40, 100, 250];

// ---------- card animation: cards fly from the shoe, hidden cards flip ----------
const anim = new Map();
let used = new Set(), staggerFrame = 0, staggerN = 0;
function card(x, slot, c, tx, ty, now, from) {
  used.add(slot);
  let a = anim.get(slot);
  if (!a) {
    if (staggerFrame !== now) { staggerFrame = now; staggerN = 0; }
    a = { c, t0: now + staggerN++ * 110 };
    setTimeout(sfx.card, a.t0 - now);
    anim.set(slot, a);
  } else if (a.c !== c) { a.prev = a.c; a.c = c; a.flip = now; sfx.flip(); }
  const p = clamp((now - a.t0) / 300);
  if (p <= 0) return;
  const e = ease(p), X = Math.round(from[0] + (tx - from[0]) * e), Y = Math.round(from[1] + (ty - from[1]) * e);
  if (a.flip && now - a.flip < 260) {
    const f = (now - a.flip) / 260, w = Math.max(1, Math.round(Math.abs(Math.cos(f * Math.PI)) * CW));
    x.drawImage(cardSprite(f < 0.5 ? a.prev : c), X + Math.round((CW - w) / 2), Y, w, CH + 1);
  } else x.drawImage(cardSprite(c), X, Y);
}
function endCards() { for (const k of anim.keys()) if (!used.has(k)) anim.delete(k); used = new Set(); }

// ---------- particles: chips and coins bursting on a win ----------
const parts = [], floats = [];
export function burst(cx, cy, amount, colors) {
  const n = Math.min(60, 12 + Math.floor(amount / 20));
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 120;
    parts.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 120, life: 1.4 + Math.random() * 0.6, c: colors[i % colors.length] });
  }
  floats.push({ x: cx, y: cy - 10, s: '+' + amount, t: 0 });
}
function drawParticles(x, dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.vy += 300 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
    if (p.life <= 0) { parts.splice(i, 1); continue; }
    x.drawImage(chipSprite(p.c, '#fff'), Math.round(p.x) - 4, Math.round(p.y) - 5);
  }
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i];
    f.t += dt;
    if (f.t > 2) { floats.splice(i, 1); continue; }
    x.globalAlpha = clamp(2 - f.t);
    text(x, f.s, f.x, f.y - f.t * 25, '#7dff9a', 3, 'center', '#0a3010');
    x.globalAlpha = 1;
  }
}

// ---------- shared bits ----------

// Carpet + vignette filling the whole screen behind a scene.
let carpet = null;
export function sceneBackdrop(x, w, h) {
  if (!carpet) {
    const [c, cx] = canvas(24, 24);
    for (let yy = 0; yy < 24; yy++) for (let xx = 0; xx < 24; xx++) {
      const u = (xx + yy) % 24, v = (xx - yy + 24) % 24;
      cx.fillStyle = u === 0 || v === 0 ? '#3a1024' : u === 12 && v === 12 ? '#8a6a28' : (xx * 3 + yy * 5) % 7 ? '#2c0a1c' : '#260818';
      cx.fillRect(xx, yy, 1, 1);
    }
    carpet = x.createPattern(c, 'repeat');
  }
  x.fillStyle = carpet; x.fillRect(0, 0, w, h);
  const g = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.75)');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
}

function plate(x, s, cx, cy, active, now, extra) {
  const w = 74, h = 22, X = Math.round(cx - w / 2), Y = Math.round(cy - h / 2);
  const glow = active ? (Math.sin(now / 150) > 0 ? '#ffe060' : '#c89020') : s.me ? '#c8a040' : '#3a2a40';
  x.fillStyle = glow; x.fillRect(X - 1, Y - 1, w + 2, h + 2);
  x.fillStyle = s.folded ? '#160e18' : '#1c1024'; x.fillRect(X, Y, w, h);
  x.fillStyle = s.color; x.fillRect(X, Y, 2, h);
  x.drawImage(headIcon(outfits.get(s.id), s.color), X + 3, Y + 4);
  text(x, s.name.slice(0, 11), X + 18, Y + 4, s.folded ? '#6a5a70' : s.me ? '#ffe680' : '#fff');
  text(x, s.chips + '', X + 18, Y + 13, '#e8c050');
  if (extra) label(x, extra, cx, Y + h + 2, '#fff', 'rgba(0,0,0,.6)');
  const em = emotes.get(s.id);
  if (em && now - em.at < 2500) drawEmote(x, em.k, cx + 30, Y, now - em.at);
}

function timerBar(x, cx, y, w, left, total) {
  const f = clamp(left / total);
  x.fillStyle = '#000'; x.fillRect(cx - w / 2 - 1, y - 1, w + 2, 4);
  x.fillStyle = f > 0.3 ? '#40d060' : '#ff4040'; x.fillRect(cx - w / 2, y, Math.round(w * f), 2);
}

function banner(x, s, y, col = '#ffe680') {
  const w = textW(s, 2) + 12;
  x.fillStyle = 'rgba(10,4,16,.8)'; x.fillRect(SW / 2 - w / 2, y - 3, w, 16);
  x.fillStyle = '#c8a040'; x.fillRect(SW / 2 - w / 2, y - 3, w, 1); x.fillRect(SW / 2 - w / 2, y + 12, w, 1);
  text(x, s, SW / 2, y, col, 2, 'center', '#000');
}

const secs = (v, now) => Math.max(0, Math.ceil((v.until - now) / 1000));
const me = v => v.seats.find(s => s?.me);

// ---------- BLACKJACK ----------
const BJ_SEATS = [0, 1, 2, 3, 4].map(i => { const a = (150 - 30 * i) * Math.PI / 180; return [Math.round(245 + 182 * Math.cos(a)), Math.round(44 + 150 * Math.sin(a))]; });
const SHOE = [404, 52];

function blackjack(x, v, now) {
  x.drawImage(avatarSprite(NPC_OUTFITS.dealer, '#222230', 0, 0), 222, -2, 36, 52);
  x.drawImage(tableSprite('sbj', 470, 240, shapes.blackjack(470, 240, 44)), 5, 0);
  text(x, 'LE BLACKJACK PAIE 3 POUR 2', 240, 125, 'rgba(240,210,110,.8)', 1, 'center');
  text(x, 'LA BANQUE TIRE A 16 ET RESTE A 17', 240, 133, 'rgba(240,210,110,.45)', 1, 'center');
  // shoe and chip tray
  x.fillStyle = '#2a1408'; x.fillRect(SHOE[0] - 4, SHOE[1] - 6, 30, 34);
  for (let k = 0; k < 4; k++) x.drawImage(cardSprite('??'), SHOE[0] + k, SHOE[1] - k);
  x.fillStyle = '#1a0a06'; x.fillRect(196, 48, 88, 12);
  ['#e2b02c', '#8a44c8', '#24242c', '#d03040', '#eceff6', '#eceff6', '#d03040', '#24242c'].forEach((c, k) => {
    for (let j = 0; j < 4; j++) x.drawImage(chipSprite(c, '#fff'), 198 + k * 11, 49 - j);
  });
  // dealer hand
  v.dealer.forEach((c, k) => card(x, 'd' + k, c, 240 - (v.dealer.length * 14) / 2 + k * 14, 66, now, SHOE));
  if (v.dealer.length) label(x, v.dealerScore > 21 ? 'SAUTE' : v.dealerScore + '', 240 + v.dealer.length * 7 + 16, 74, v.dealerScore > 21 ? '#ff6060' : '#fff');

  v.seats.forEach((s, i) => {
    const [cx, cy] = BJ_SEATS[i];
    x.fillStyle = s?.bet ? '#e8c050' : 'rgba(232,192,80,.35)';
    for (let a = 0; a < 40; a++) { const t = a / 40 * Math.PI * 2; x.fillRect(Math.round(cx + Math.cos(t) * 11), Math.round(cy + Math.sin(t) * 7), 1, 1); }
    if (!s) { text(x, 'LIBRE', cx, cy - 2, 'rgba(232,192,80,.4)', 1, 'center'); return; }
    if (s.bet) { chipStack(x, s.bet, cx, cy + 2); text(x, s.bet + '', cx, cy + 5, '#fff', 1, 'center', '#000'); }
    const turn = v.phase === 'playing' && v.turn === i;
    s.cards.forEach((c, k) => card(x, 's' + i + '-' + k, c, cx - 14 + k * 9, cy - 46 - k * 3, now, SHOE));
    if (s.cards.length) {
      const sc = s.score > 21 ? 'SAUTE' : s.cards.length === 2 && s.score === 21 ? 'BJ!' : s.score + '';
      label(x, sc, cx + 22, cy - 50, s.score > 21 ? '#ff6060' : sc === 'BJ!' ? '#ffe060' : '#fff');
    }
    plate(x, s, cx, cy + 24, turn, now, v.phase === 'betting' && s.ready ? 'PRET' : '');
    if (turn) timerBar(x, cx, cy + 37, 70, v.until - now, 20000);
    if (v.phase === 'result' && s.result) {
      const [t, c] = s.result === 'win' ? ['GAGNE +' + s.gain, '#60ff80'] : s.result === 'push' ? ['EGALITE', '#ffe060'] : ['PERDU', '#ff5050'];
      text(x, t, cx, cy - 22, c, 1, 'center', '#000');
    }
  });
  const msg = {
    betting: v.until ? 'FAITES VOS MISES  ' + secs(v, now) : 'FAITES VOS MISES',
    playing: 'A ' + (v.seats[v.turn]?.name || '') + ' DE JOUER',
    dealer: 'LA BANQUE JOUE', result: 'RESULTATS',
  }[v.phase];
  banner(x, msg, 108);
}

function blackjackBar(v) {
  const m = me(v);
  if (!m) return { sig: 'x', html: '' };
  if (v.phase === 'betting') {
    return {
      sig: 'b' + (m.bet > 0) + m.ready,
      html: [10, 50, 100, 500].map(a => `<button class="chip c${a}" data-act='{"a":"bet","amt":${a}}'>${a}</button>`).join('') +
        `<button data-act='{"a":"clear"}'>Effacer</button>` + (m.bet && !m.ready ? `<button class="go" data-act='{"a":"ready"}'>Distribuer</button>` : ''),
    };
  }
  const myTurn = v.phase === 'playing' && v.seats[v.turn]?.me;
  if (!myTurn) return { sig: 'w', html: '<span class="info">Patiente…</span>' };
  const dbl = m.cards.length === 2 && m.chips >= m.bet;
  return {
    sig: 'p' + m.cards.length + dbl,
    html: `<button class="go" data-act='{"a":"hit"}'>Carte</button><button data-act='{"a":"stand"}'>Rester</button>` +
      (dbl ? `<button data-act='{"a":"double"}'>Doubler</button>` : ''),
  };
}

// ---------- POKER ----------
const PK_PLATES = [[52, 130], [160, 38], [320, 38], [428, 130], [320, 222], [160, 222]];
const PK_CARDS = [[34, 90], [140, 54], [300, 54], [410, 90], [300, 180], [140, 180]];
const PK_CENTER = [240, 128];
const PHASE_FR = { waiting: 'EN ATTENTE DE JOUEURS', preflop: 'PREFLOP', flop: 'FLOP', turn: 'TURN', river: 'RIVER', showdown: 'ABATTAGE' };

function poker(x, v, now) {
  x.drawImage(tableSprite('spk', 440, 200, shapes.oval(440, 200, 2.4), '#2a6a9a', '#4a2414'), 20, 28);
  text(x, 'TEXAS HOLD\'EM', 240, 92, 'rgba(240,210,110,.45)', 1, 'center');
  for (let k = 0; k < 5; k++) {
    const bx = 185 + k * 22, by = 112;
    x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(bx, by, CW, CH);
    if (v.board[k]) card(x, 'b' + k, v.board[k], bx, by, now, PK_CENTER);
  }
  if (v.pot) { chipStack(x, v.pot, 240, 104); text(x, 'POT ' + v.pot, 240, 80, '#ffe680', 1, 'center', '#000'); }
  v.seats.forEach((s, i) => {
    const [px, py] = PK_PLATES[i];
    if (!s) { x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(px - 37, py - 11, 74, 22); text(x, 'LIBRE', px, py - 2, '#5a4a60', 1, 'center'); return; }
    const [cx, cy] = PK_CARDS[i];
    s.cards.forEach((c, k) => card(x, 'p' + i + '-' + k, c, cx + k * 20, cy, now, PK_CENTER));
    const active = v.toAct === i;
    const extra = v.phase === 'showdown' && s.won ? '+' + s.won + (s.hand ? ' ' + s.hand : '') : s.hand ? s.hand : s.allIn && s.inHand ? 'TAPIS' : s.folded && s.inHand ? 'COUCHE' : '';
    plate(x, s, px, py, active, now, extra);
    if (active) timerBar(x, px, py + 13, 70, v.until - now, 30000);
    if (s.bet) {
      const bx = px + (PK_CENTER[0] - px) * 0.45, by = py + (PK_CENTER[1] - py) * 0.38;
      chipStack(x, s.bet, bx, by); text(x, s.bet + '', bx, by + 3, '#fff', 1, 'center', '#000');
    }
    if (v.button === i && v.phase !== 'waiting') {
      const dx = px + 46, dy = py - 4;
      x.fillStyle = '#222'; x.fillRect(dx - 4, dy - 3, 9, 8); x.fillStyle = '#fff'; x.fillRect(dx - 3, dy - 4, 7, 9); x.fillRect(dx - 4, dy - 3, 9, 7);
      text(x, 'D', dx + 1, dy - 2, '#222', 1, 'center');
    }
  });
  let st = PHASE_FR[v.phase] || '';
  if (v.phase === 'waiting') st += v.seats.filter(Boolean).length < 2 ? ' (MIN 2)' : '...';
  if (v.toAct >= 0) st = st + ' - A ' + v.seats[v.toAct].name + ' (' + secs(v, now) + ')';
  label(x, st, 240, 146, '#ffe680');
}

function pokerBar(v) {
  const m = me(v);
  if (!m || v.seats[v.toAct] !== m || !m.inHand) {
    const txt = v.phase === 'waiting' ? 'La partie commence dès que 2 joueurs sont assis' : m?.folded && m.inHand ? 'Couché' : 'Patiente…';
    return { sig: 'w' + txt, html: `<span class="info">${txt}</span>` };
  }
  const max = m.bet + m.chips, min = Math.min(v.minTo, max);
  const canRaise = max > v.currentBet;
  return {
    sig: 't' + v.toCall + v.minTo + max + v.phase,
    html: `<button data-act='{"a":"fold"}'>Se coucher</button>` +
      (v.toCall ? `<button class="go" data-act='{"a":"call"}'>Suivre ${Math.min(v.toCall, m.chips)}</button>` : `<button class="go" data-act='{"a":"check"}'>Parole</button>`) +
      (canRaise ? `<input type="range" id="raise" min="${min}" max="${max}" step="10" value="${min}"><output id="raiseV">${min}</output>` +
        `<button data-raise>${v.currentBet ? 'Relancer' : 'Miser'}</button><button data-act='{"a":"raise","to":${max}}'>Tapis</button>` : ''),
  };
}

// ---------- ROULETTE ----------
const RB = { x0: 230, y0: 52, cw: 19, ch: 26 };
function rouletteCells() {
  const cells = [{ t: 'n', v: 0, x: 212, y: RB.y0, w: 18, h: RB.ch * 3, s: '0', c: '#1a8a3a' }];
  for (let c = 0; c < 12; c++) for (let r = 0; r < 3; r++) {
    const n = c * 3 + 3 - r;
    cells.push({ t: 'n', v: n, x: RB.x0 + c * RB.cw, y: RB.y0 + r * RB.ch, w: RB.cw, h: RB.ch, s: n + '', c: RED.has(n) ? '#b81c2c' : '#16161e' });
  }
  for (let r = 0; r < 3; r++) cells.push({ t: 'col', v: 2 - r, x: RB.x0 + 12 * RB.cw, y: RB.y0 + r * RB.ch, w: 20, h: RB.ch, s: '2:1' });
  ['1-12', '13-24', '25-36'].forEach((s, k) => cells.push({ t: 'dozen', v: k, x: RB.x0 + k * 76, y: RB.y0 + 78, w: 76, h: 18, s }));
  [['low', '1-18'], ['even', 'PAIR'], ['red', ''], ['black', ''], ['odd', 'IMPAIR'], ['high', '19-36']].forEach(([t, s], k) =>
    cells.push({ t, v: 0, x: RB.x0 + k * 38, y: RB.y0 + 96, w: 38, h: 18, s, c: t === 'red' ? '#b81c2c' : t === 'black' ? '#16161e' : null }));
  return cells;
}
const CELLS = rouletteCells();
export function rouletteHit(mx, my) { return CELLS.find(c => mx >= c.x && mx < c.x + c.w && my >= c.y && my < c.y + c.h); }

let wheelImg = null;
function wheelSprite() {
  if (wheelImg) return wheelImg;
  const R = 88, [c, x] = canvas(R * 2 + 1, R * 2 + 1);
  const step = Math.PI * 2 / 37;
  for (let yy = -R; yy <= R; yy++) for (let xx = -R; xx <= R; xx++) {
    const r = Math.hypot(xx, yy);
    if (r > R) continue;
    let a = Math.atan2(yy, xx) + Math.PI / 2; if (a < 0) a += Math.PI * 2;
    const k = Math.floor(a / step) % 37, edge = Math.abs(a / step - Math.round(a / step)) < 0.06;
    let col;
    if (r > 84) col = '#2a1408';
    else if (r > 76) col = (Math.floor(a * 30) % 2) ? '#7a4424' : '#6a3a1c';
    else if (r > 68) col = '#3a1e0c';
    else if (r > 66) col = '#c8a040';
    else if (r > 46) col = edge ? '#e8c860' : WHEEL[k] === 0 ? '#1a8a3a' : RED.has(WHEEL[k]) ? '#b81c2c' : '#16161e';
    else if (r > 44) col = '#c8a040';
    else if (r > 26) col = (Math.floor(a / step) % 2) ? '#5a3018' : '#4a2812';
    else if (r > 8) col = (Math.abs(Math.sin(a * 2)) > 0.92) ? '#f0d070' : '#7a4424';
    else col = r > 5 ? '#c8a040' : '#f0e090';
    x.fillStyle = col; x.fillRect(xx + R, yy + R, 1, 1);
  }
  return (wheelImg = c);
}

const wheel = { phase: '', spinStart: 0, rot0: 0, rotEnd: 0, endAt: 0 };
const WC = [112, 140];
function wheelAngles(v, now) {
  const SPIN = 7000, step = Math.PI * 2 / 37;
  if (v.phase === 'spinning' && wheel.phase !== 'spinning') {
    wheel.spinStart = v.until - SPIN;
    wheel.rot0 = wheel.endAt ? wheel.rotEnd + (now - wheel.endAt) / 3000 : now / 3000;
    wheel.rotEnd = wheel.rot0 + Math.PI * 3;
    wheel.endAt = v.until;
  }
  wheel.phase = v.phase;
  const k = WHEEL.indexOf(v.result), pocket = (k + 0.5) * step - Math.PI / 2;
  if (v.phase === 'spinning') {
    const p = clamp((now - wheel.spinStart) / SPIN), e = ease(p), rot = wheel.rot0 + (wheel.rotEnd - wheel.rot0) * e;
    const settle = wheel.rot0 + (wheel.rotEnd - wheel.rot0) * ease(0.85), eb = 1 - (1 - clamp(p / 0.85)) ** 2;
    const ball = p >= 0.85 ? rot + pocket : settle + pocket + (1 - eb) * Math.PI * 12;
    const rr = p < 0.6 ? 72 : p < 0.85 ? 72 - (p - 0.6) / 0.25 * 16 + Math.abs(Math.sin(p * 60)) * 4 * (0.85 - p) * 4 : 55;
    return { rot, ball, rr };
  }
  const rot = wheel.endAt ? wheel.rotEnd + (now - wheel.endAt) / 3000 : now / 3000;
  return { rot, ball: v.phase === 'result' && v.result != null ? rot + pocket : null, rr: 56 };
}

function roulette(x, v, now, ui) {
  x.drawImage(tableSprite('srl', 470, 250, shapes.oval(470, 250, 7)), 5, 8);
  const { rot, ball, rr } = wheelAngles(v, now);
  if (ball != null && v.phase === 'spinning') { // click each time the ball passes a pocket
    const pk = Math.floor((ball - rot) / (Math.PI * 2 / 37));
    if (pk !== wheel.pk) { wheel.pk = pk; sfx.tick(); }
  }
  x.save(); x.translate(WC[0], WC[1]); x.rotate(rot); x.drawImage(wheelSprite(), -88, -88); x.restore();
  if (ball != null) {
    const bx = Math.round(WC[0] + Math.cos(ball) * rr), by = Math.round(WC[1] + Math.sin(ball) * rr);
    x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(bx - 1, by + 1, 5, 3);
    x.fillStyle = '#e8e8f0'; x.fillRect(bx - 2, by - 1, 5, 3); x.fillRect(bx - 1, by - 2, 3, 5);
    x.fillStyle = '#fff'; x.fillRect(bx - 1, by - 1, 1, 1);
  }
  // betting layout
  const hover = v.phase === 'betting' ? rouletteHit(ui.mx, ui.my) : null;
  const win = v.phase === 'result' ? v.result : null;
  for (const c of CELLS) {
    x.fillStyle = '#e8c860'; x.fillRect(c.x, c.y, c.w + 1, c.h + 1);
    const lit = win != null && c.t === 'n' && c.v === win && Math.floor(now / 250) % 2;
    x.fillStyle = lit ? '#ffe060' : c === hover ? '#2aa050' : c.c || '#1f7a3a'; x.fillRect(c.x + 1, c.y + 1, c.w - 1, c.h - 1);
    if (c.t === 'red' || c.t === 'black') { x.fillStyle = c.t === 'red' ? '#e02838' : '#000'; for (let k = 0; k < 5; k++) x.fillRect(c.x + 19 - k, c.y + 5 + k, 1 + k * 2, 1), x.fillRect(c.x + 19 - k, c.y + 13 - k, 1 + k * 2, 1); }
    if (c.s) text(x, c.s, c.x + c.w / 2 + 1, c.y + c.h / 2 - 2, '#fff', 1, 'center');
  }
  const cellOf = b => CELLS.find(c => c.t === b.t && c.v === b.v);
  v.seats.forEach((s, i) => s?.bets.forEach(b => {
    const c = cellOf(b);
    if (!c) return;
    const n = Math.min(5, 1 + Math.floor(Math.log2(b.a / 10 + 1)));
    for (let k = 0; k < n; k++) x.drawImage(chipSprite(s.color, '#fff'), Math.round(c.x + c.w / 2 - 4 + (i % 3) * 3 - 3), Math.round(c.y + c.h / 2 - 2 - k * 2 + Math.floor(i / 3) * 3));
  }));
  // history
  text(x, 'DERNIERS', 212, 22, '#c8a040');
  v.history.forEach((n, k) => {
    x.fillStyle = n === 0 ? '#1a8a3a' : RED.has(n) ? '#b81c2c' : '#16161e';
    x.fillRect(248 + k * 19, 18, 17, 12);
    text(x, n + '', 248 + k * 19 + 9, 21, '#fff', 1, 'center');
  });
  const st = v.phase === 'betting' ? (v.until ? 'FAITES VOS JEUX ' + secs(v, now) : 'FAITES VOS JEUX')
    : v.phase === 'spinning' ? 'RIEN NE VA PLUS'
      : v.result + ' ' + (v.result === 0 ? 'VERT' : RED.has(v.result) ? 'ROUGE' : 'NOIR');
  label(x, st, 344, 36, v.phase === 'result' ? '#ffe060' : '#fff');
  // players
  v.seats.forEach((s, i) => {
    if (!s) return;
    const px = 254 + (i % 3) * 82, py = 186 + Math.floor(i / 3) * 34;
    const tot = s.bets.reduce((a, b) => a + b.a, 0);
    plate(x, s, px, py, false, now, v.phase === 'result' && s.gain > 0 ? '+' + s.gain : tot ? 'MISE ' + tot : '');
  });
}

function rouletteBar(v, ui) {
  const m = me(v);
  const tot = m ? m.bets.reduce((a, b) => a + b.a, 0) : 0;
  return {
    sig: 'r' + ui.chip + v.phase + tot,
    html: [10, 50, 100, 500].map(a => `<button class="chip c${a} ${ui.chip === a ? 'sel' : ''}" data-chip="${a}">${a}</button>`).join('') +
      (v.phase === 'betting' ? `<button data-act='{"a":"clear"}'>Effacer</button><span class="info">Clique sur le tapis pour miser${tot ? ' — total ' + tot : ''}</span>` : '<span class="info">Rien ne va plus</span>'),
  };
}

// ---------- SLOTS ----------
const STRIP = [0, 3, 1, 4, 2, 5, 0, 1, 2, 3, 0, 4, 1, 2, 0, 3, 1, 5];
const reels = { tid: null, id: -1, t0: 0, pos: [0, 0, 0], target: [0, 0, 0] };
const REEL_STOP = [900, 1350, 1800];

function slots(x, v, now, ui) {
  if (reels.tid !== ui.tid) { reels.tid = ui.tid; reels.id = -1; }
  if (reels.id === -1) { reels.id = v.spinId; reels.target = v.reels.map(r => STRIP.indexOf(r)); reels.t0 = -1e9; }
  if (v.spinId !== reels.id) {
    reels.id = v.spinId; reels.t0 = now; reels.stopped = [false, false, false];
    sfx.lever();
    reels.target = v.reels.map((r, i) => { const js = STRIP.map((s, j) => (s === r ? j : -1)).filter(j => j >= 0); return js[(v.spinId + i) % js.length]; });
  }
  const el = now - reels.t0;
  // cabinet
  const X = 130, Y = 8, W = 220, H = 256;
  x.fillStyle = '#0a0410'; x.fillRect(X - 2, Y - 2, W + 4, H + 4);
  x.fillStyle = '#7a1838'; x.fillRect(X, Y, W, H);
  x.fillStyle = '#a82848'; x.fillRect(X, Y, 14, H); x.fillStyle = '#4a0c20'; x.fillRect(X + W - 10, Y, 10, H);
  x.fillStyle = '#c8a040'; x.fillRect(X + 10, Y + 6, W - 20, 50);
  x.fillStyle = '#200818'; x.fillRect(X + 13, Y + 9, W - 26, 44);
  const k = Math.floor(now / 90);
  for (let i = 0; i < 26; i++) {
    const on = (i + k) % 4 < 2;
    x.fillStyle = on ? '#fff6a0' : '#806020';
    x.fillRect(X + 14 + i * 7.6 | 0, Y + 10, 3, 3); x.fillRect(X + 14 + i * 7.6 | 0, Y + 48, 3, 3);
  }
  const jc = Math.floor(now / 400) % 2 ? '#ff4aa0' : '#ffe060';
  text(x, 'JACKPOT', 240 + 2, Y + 20 + 2, '#400010', 3, 'center');
  text(x, 'JACKPOT', 240, Y + 20, jc, 3, 'center');
  // reel window
  const RX = 160, RY = 72, RH = 120;
  x.fillStyle = '#c8a040'; x.fillRect(RX - 6, RY - 6, 172, RH + 12);
  x.fillStyle = '#2a1008'; x.fillRect(RX - 3, RY - 3, 166, RH + 6);
  for (let i = 0; i < 3; i++) {
    const rx = RX + i * 54;
    const stop = reels.t0 + REEL_STOP[i];
    if (reels.stopped && !reels.stopped[i] && now >= stop) { reels.stopped[i] = true; sfx.reel(); }
    let pos;
    if (now < stop) pos = reels.target[i] + (stop - now) * 0.022;
    else { const b = (now - stop) / 180; pos = reels.target[i] - (b < 1 ? Math.sin(b * Math.PI) * 0.18 : 0); }
    reels.pos[i] = pos;
    x.save(); x.beginPath(); x.rect(rx, RY, 50, RH); x.clip();
    const g = x.createLinearGradient(0, RY, 0, RY + RH);
    g.addColorStop(0, '#9a9488'); g.addColorStop(0.5, '#fbf8ee'); g.addColorStop(1, '#9a9488');
    x.fillStyle = g; x.fillRect(rx, RY, 50, RH);
    const base = Math.floor(pos), fr = pos - base, cy = RY + RH / 2;
    const fast = now < stop - 120;
    for (let r = -2; r <= 2; r++) {
      const sym = SYMS[STRIP[((base + r) % STRIP.length + STRIP.length) % STRIP.length]];
      const sy = Math.round(cy + (r - fr) * 40 - 18);
      if (fast) { x.globalAlpha = 0.5; x.drawImage(symbolSprite(sym), rx + 7, sy - 6, 36, 48); x.globalAlpha = 1; }
      else x.drawImage(symbolSprite(sym), rx + 7, sy, 36, 36);
    }
    x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(rx, RY, 50, 10); x.fillRect(rx, RY + RH - 10, 50, 10);
    x.restore();
  }
  x.fillStyle = 'rgba(255,32,64,.8)'; x.fillRect(RX - 6, RY + RH / 2, 172, 1);
  x.fillStyle = '#ff2040'; for (let k2 = 0; k2 < 4; k2++) { x.fillRect(RX - 10 + k2, RY + RH / 2 - 3 + k2, 1, 7 - k2 * 2); x.fillRect(RX + 175 - k2, RY + RH / 2 - 3 + k2, 1, 7 - k2 * 2); }
  // LED counters
  const done = el > REEL_STOP[2] + 200;
  const s = v.seats[0];
  const led = (lab, val, lx) => {
    text(x, lab, lx + 30, 202, '#e8c050', 1, 'center');
    x.fillStyle = '#100404'; x.fillRect(lx, 209, 60, 14);
    text(x, String(val).padStart(6, ' '), lx + 56, 213, '#ff3a3a', 1, 'right');
  };
  led('CREDITS', s ? s.chips : 0, 150);
  led('MISE', ui.slotBet, 210);
  led('GAIN', done ? v.win : 0, 270);
  if (done && v.win > 0 && Math.floor(now / 200) % 2) text(x, 'GAGNE !', 240, 232, '#ffe060', 2, 'center', '#600010');
  // coin tray
  x.fillStyle = '#c8a040'; x.fillRect(X + 40, Y + H - 18, W - 80, 12);
  x.fillStyle = '#180810'; x.fillRect(X + 44, Y + H - 15, W - 88, 6);
  // lever
  const pull = clamp(1 - Math.abs(el - 150) / 150);
  x.fillStyle = '#909098'; x.fillRect(X + W + 6, 90, 4, 60);
  x.fillStyle = '#b0b0b8'; x.fillRect(X + W + 8, 70 + pull * 60, 3, 80 - pull * 60);
  x.fillStyle = '#ff2040'; x.fillRect(X + W + 4, 62 + pull * 60, 10, 10); x.fillStyle = '#ff8090'; x.fillRect(X + W + 6, 64 + pull * 60, 3, 3);
  // pay table
  x.fillStyle = 'rgba(10,4,16,.85)'; x.fillRect(12, 40, 104, 164);
  x.fillStyle = '#c8a040'; x.fillRect(12, 40, 104, 1); x.fillRect(12, 203, 104, 1);
  text(x, 'GAINS', 64, 46, '#ffe680', 1, 'center');
  SYMS.slice().reverse().forEach((sym, k) => {
    const yy = 58 + k * 22;
    for (let j = 0; j < 3; j++) x.drawImage(symbolSprite(sym), 18 + j * 14, yy);
    text(x, 'X' + PAY3[5 - k], 110, yy + 4, '#fff', 1, 'right');
  });
  x.drawImage(symbolSprite('cherry'), 18, 192 - 2); x.drawImage(symbolSprite('cherry'), 32, 190);
  text(x, '= MISE', 110, 194, '#fff', 1, 'right');
}

function slotsBar(v, ui) {
  return {
    sig: 's' + ui.slotBet + v.spinning,
    html: [10, 25, 50, 100].map(a => `<button class="chip ${ui.slotBet === a ? 'sel' : ''}" data-sbet="${a}">${a}</button>`).join('') +
      `<button class="go big" data-spin ${v.spinning ? 'disabled' : ''}>Jouer (Espace)</button>`,
  };
}

// ---------- entry points ----------
// ---------- HORSE RACE ----------
const TRACK = 1600, LANE = 22, TY = 66;
const raceFx = { seed: null, gun: false, gallop: 0 };
export function raceHit(mx, my) { return my >= 210 && my < 260 && mx >= 12 && mx < 12 + 6 * 76 ? Math.floor((mx - 12) / 76) : -1; }

function race(x, v, now, ui) {
  const el = raceElapsed(v, now), f = raceProgress(v, el);
  if (raceFx.seed !== v.seed) Object.assign(raceFx, { seed: v.seed, gun: false });
  if (v.phase === 'running' && !raceFx.gun) { raceFx.gun = true; sfx.gun(); }
  if (v.phase === 'running' && el < 11000 && now - raceFx.gallop > 150) { raceFx.gallop = now; sfx.gallop(); }
  const lead = Math.max(...f), camX = Math.round(Math.max(0, Math.min(60 + TRACK * 1.08 + 70 - SW, 60 + lead * TRACK - 330)));
  // sky, clouds, stands with the crowd
  const g = x.createLinearGradient(0, 0, 0, 40); g.addColorStop(0, '#4a7ae0'); g.addColorStop(1, '#a8d0ff');
  x.fillStyle = g; x.fillRect(0, 0, SW, 40);
  for (let k = 0; k < 6; k++) {
    const cx = ((k * 173 - camX * 0.2) % 560 + 560) % 560 - 40;
    x.fillStyle = '#fff'; x.fillRect(cx, 10 + (k % 3) * 7, 26, 5); x.fillRect(cx + 5, 7 + (k % 3) * 7, 14, 3);
  }
  x.fillStyle = '#5a5a6a'; x.fillRect(0, 30, SW, 34);
  x.fillStyle = '#8a2a3a'; x.fillRect(0, 28, SW, 3);
  const crowd = ['#e04050', '#3a7bd5', '#f2b233', '#2fb36b', '#f0f0f0', '#9b51e0', '#f4cda4', '#a86a40'];
  const cheer = v.phase !== 'betting' ? 2 : 1;
  for (let row = 0; row < 5; row++) for (let k = 0; k < 64; k++) {
    const wx = k * 8 + row * 3, sx = ((wx - camX * 0.5) % 512 + 512) % 512 - 16;
    const bob = Math.floor(now / 160 + k * 7 + row) % 4 === 0 ? cheer : 0;
    x.fillStyle = crowd[(k * 5 + row * 3) % crowd.length]; x.fillRect(sx, 34 + row * 6 - bob, 4, 4);
    x.fillStyle = crowd[(k * 3 + row) % 4 + 4]; x.fillRect(sx + 1, 32 + row * 6 - bob, 2, 2);
  }
  // track
  x.fillStyle = '#f0f0f0'; x.fillRect(0, TY - 3, SW, 3);
  x.fillStyle = '#a0703a'; x.fillRect(0, TY, SW, LANE * 6);
  for (let i = 0; i < 6; i++) {
    x.fillStyle = 'rgba(80,40,10,.35)'; x.fillRect(0, TY + i * LANE + LANE - 1, SW, 1);
    for (let k = 0; k < 30; k++) { x.fillStyle = '#8a5e30'; x.fillRect(((k * 97 + i * 41 - camX) % SW + SW) % SW, TY + i * LANE + 5 + (k % 3) * 5, 3, 1); }
  }
  x.fillStyle = '#f0f0f0'; x.fillRect(0, TY + LANE * 6, SW, 3);
  x.fillStyle = '#3a9a40'; x.fillRect(0, TY + LANE * 6 + 3, SW, 6);
  for (let d = 400; d < TRACK; d += 400) { const px = 60 + d - camX; if (px > -10 && px < SW) { x.fillStyle = '#fff'; x.fillRect(px, TY - 12, 2, 9); text(x, (TRACK - d) + 'M', px + 4, TY - 11, '#fff', 1, 'left', '#000'); } }
  const fin = 60 + TRACK - camX;
  if (fin < SW + 10) for (let yy = 0; yy < LANE * 6; yy += 3) for (let k = 0; k < 2; k++) { x.fillStyle = (yy / 3 + k) % 2 ? '#000' : '#fff'; x.fillRect(fin + k * 3, TY + yy, 3, 3); }
  if (60 - camX > -40) { x.fillStyle = '#c0c0c8'; for (let i = 0; i <= 6; i++) x.fillRect(48 - camX, TY + i * LANE - 1, 18, 2); x.fillRect(64 - camX, TY, 2, LANE * 6); }
  // horses
  HORSES.forEach((h, i) => {
    const run = v.phase === 'running' || (v.phase === 'result' && f[i] < 1.07);
    const fr = run ? Math.floor(now / 80 + i * 0.5) % 2 : 0;
    const hx = Math.round(60 + f[i] * TRACK - camX - 38), hy = TY + i * LANE + LANE - 28 - fr;
    x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(hx + 6, TY + i * LANE + LANE - 4, 28, 3);
    x.drawImage(horseSprite(h.coat, h.silk, fr), hx, hy, 40, 28);
    x.fillStyle = h.silk; x.fillRect(hx + 8, hy + 18, 7, 7);
    text(x, i + 1 + '', hx + 10, hy + 19, '#fff');
  });
  // status
  let st;
  if (v.phase === 'betting') st = v.until ? 'PARIS OUVERTS ' + secs(v, now) : 'PARIS OUVERTS';
  else if (v.phase === 'running') st = el < 1500 ? "C'EST PARTI !" : 'EN TETE : ' + HORSES[f.indexOf(lead)].name;
  else st = 'VAINQUEUR : ' + HORSES[v.order[0]].name;
  banner(x, st, 4, v.phase === 'result' ? '#ffe060' : '#fff');
  // odds board
  const m = me(v), hover = v.phase === 'betting' ? raceHit(ui.mx, ui.my) : -1;
  HORSES.forEach((h, i) => {
    const cx = 12 + i * 76, cy = 210, winner = v.phase === 'result' && v.order[0] === i;
    x.fillStyle = winner && Math.floor(now / 200) % 2 ? '#ffe060' : h.silk; x.fillRect(cx, cy, 74, 50);
    x.fillStyle = i === hover ? '#3a2448' : '#140818'; x.fillRect(cx + 2, cy + 2, 70, 46);
    x.drawImage(horseSprite(h.coat, h.silk, 0), cx + 4, cy + 4);
    text(x, i + 1 + '', cx + 66, cy + 5, h.silk, 1, 'right');
    text(x, h.name, cx + 5, cy + 21, '#fff');
    text(x, 'X' + v.odds[i], cx + 5, cy + 29, '#80f0ff', 2);
    const all = v.seats.reduce((a, s) => a + (s ? s.bets[i] : 0), 0);
    if (m?.bets[i]) text(x, 'MOI ' + m.bets[i], cx + 5, cy + 41, '#ffe680');
    else if (all) text(x, 'TOTAL ' + all, cx + 5, cy + 41, '#a090b0');
  });
  if (v.phase === 'result' && m && (m.gain || m.bets.some(Boolean))) label(x, m.gain > 0 ? 'TU GAGNES ' + m.gain : 'PERDU ' + -m.gain, 240, 190, m.gain > 0 ? '#60ff80' : '#ff6060');
}

function raceBar(v, ui) {
  const m = me(v), tot = m ? m.bets.reduce((a, b) => a + b, 0) : 0;
  return {
    sig: 'h' + ui.chip + v.phase + tot,
    html: [10, 50, 100, 500].map(a => `<button class="chip c${a} ${ui.chip === a ? 'sel' : ''}" data-chip="${a}">${a}</button>`).join('') +
      (v.phase === 'betting' ? `<button data-act='{"a":"clear"}'>Effacer</button><span class="info">Clique sur un cheval pour parier${tot ? ' — total ' + tot : ''}</span>` : (v.phase === 'running' ? '<span class="info">Course en cours…</span>' : '<span class="info">Résultats</span>')),
  };
}

const SCENES = { blackjack, poker, roulette, slots, race };
const BARS = { blackjack: blackjackBar, poker: pokerBar, roulette: rouletteBar, slots: slotsBar, race: raceBar };

let lastNow = 0;
export function drawTable(x, type, v, now, ui) {
  const dt = Math.min(0.05, (now - lastNow) / 1000); lastNow = now;
  SCENES[type](x, v, now, ui);
  endCards();
  drawParticles(x, dt);
}
export function tableBar(type, v, ui) { return BARS[type](v, ui); }

// Celebrate when my chips go up after a round (not on refunds during betting).
const lastChips = { id: null, v: 0 };
export function onView(tableId, v) {
  const m = me(v);
  if (!m) return;
  if (lastChips.id === tableId && m.chips > lastChips.v && v.phase !== 'betting') {
    burst(240, 150, m.chips - lastChips.v, [m.color, '#e2b02c', '#d03040', '#8a44c8']);
    sfx.win(m.chips - lastChips.v);
  }
  lastChips.id = tableId; lastChips.v = m.chips;
}
