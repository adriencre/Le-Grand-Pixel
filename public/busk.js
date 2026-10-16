// Busking rhythm game: arrows fall, hit them on the line. Every judged note is reported to the server,
// which turns good playing into "hype" and hype into tips from passers-by.
import { text, grid } from './sprites.js';
import { sfx } from './sfx.js';

const BEAT = 520, TRAVEL = 1800, WINDOW = 150;
const SCALE = [57, 60, 62, 64, 67, 69, 72, 74, 76, 79]; // A minor pentatonic
const CHORDS = [[45, [57, 60, 64]], [41, [53, 57, 60]], [48, [55, 60, 64]], [43, [55, 59, 62]]]; // Am F C G
const COLORS = ['#ff4ab0', '#40d0ff', '#60ff80', '#ffd040'];
const UP = ['....a....', '...aaa...', '..aaaaa..', '.aaaaaaa.', 'aaaaaaaaa', '..aaaaa..', '..aaaaa..', '..aaaaa..', '..aaaaa..'];
const rot = rows => rows.map((_, i) => rows.map(r => r[i]).reverse().join('')); // 90° clockwise
const SHAPES = [rot(rot(rot(UP))), rot(rot(UP)), UP, rot(UP)]; // ← ↓ ↑ →
const ARROWS = SHAPES.map((rows, i) => [grid(rows, { a: COLORS[i] }), grid(rows, { a: '#3a2a48' })]);

export const busk = { on: false, notes: [], combo: 0, judge: '', judgeAt: 0, earned: 0, flash: [0, 0, 0, 0] };
let start = 0, next = 0, lastBeat = -1;

const rnd = k => { const s = Math.sin(k * 12.9898 + start * 0.001) * 43758.5453; return s - Math.floor(s); };

export function startBusk(now) {
  Object.assign(busk, { on: true, notes: [], combo: 0, judge: '', earned: 0 });
  start = now + 1500; next = 0; lastBeat = -1;
}
export function stopBusk() { busk.on = false; }

function judge(q, emit, now) {
  busk.judge = ['RATE', 'BIEN', 'PARFAIT !'][q]; busk.judgeAt = now;
  busk.combo = q ? busk.combo + 1 : 0;
  emit(q);
}

export function updateBusk(now, emit) {
  if (!busk.on) return;
  while (start + next * BEAT / 2 <= now + TRAVEL) { // eighth-note grid, denser as the combo grows
    const k = next++, dense = Math.min(0.95, 0.65 + busk.combo * 0.01);
    if (rnd(k) < (k % 2 ? dense * 0.35 : dense)) busk.notes.push({ t: start + k * BEAT / 2, lane: Math.floor(rnd(k + 0.5) * 4), k, done: false });
  }
  const beat = Math.floor((now - start) / BEAT);
  if (beat > lastBeat && beat >= 0) { // backing groove: bass on every beat, chord on each bar
    lastBeat = beat;
    const [root, chord] = CHORDS[Math.floor(beat / 4) % 4];
    sfx.bass(beat % 2 ? root + 7 : root);
    if (beat % 4 === 0) sfx.strum(chord);
  }
  for (const n of busk.notes) if (!n.done && now - n.t > WINDOW) { n.done = true; judge(0, emit, now); }
  busk.notes = busk.notes.filter(n => now - n.t < 400);
}

export function hitBusk(lane, now, emit) {
  busk.flash[lane] = now;
  const n = busk.notes.filter(m => !m.done && m.lane === lane && Math.abs(now - m.t) < WINDOW).sort((a, b) => a.t - b.t)[0];
  if (!n) { sfx.miss(); return judge(0, emit, now); }
  n.done = true; n.hitAt = now;
  sfx.pluck(SCALE[(lane * 2 + n.k) % SCALE.length]);
  judge(Math.abs(now - n.t) < 60 ? 2 : 1, emit, now);
}

// Panel on the right of the street view.
export function drawBusk(x, w, h, now, hype, title = 'AMBIANCE', foot = 'GAINS +' + busk.earned) {
  if (!busk.on) return;
  const pw = 92, px = w - pw - 6, py = 30, ph = h - 70, hitY = py + ph - 20;
  x.fillStyle = 'rgba(10,4,16,.85)'; x.fillRect(px, py, pw, ph);
  x.fillStyle = '#c8a040'; x.fillRect(px, py, pw, 1); x.fillRect(px, py + ph - 1, pw, 1);
  text(x, title, px + pw / 2, py + 4, '#ffe680', 1, 'center');
  x.fillStyle = '#000'; x.fillRect(px + 6, py + 12, pw - 12, 5);
  for (let k = 0; k < Math.round((pw - 14) * hype); k++) { x.fillStyle = `hsl(${k * 4},90%,60%)`; x.fillRect(px + 7 + k, py + 13, 1, 3); }
  const lx = i => px + 10 + i * 19;
  for (let i = 0; i < 4; i++) {
    x.fillStyle = 'rgba(255,255,255,.04)'; x.fillRect(lx(i) - 1, py + 22, 11, ph - 30);
    const lit = now - busk.flash[i] < 120;
    x.drawImage(ARROWS[i][lit ? 0 : 1], lx(i), hitY);
  }
  for (const n of busk.notes) {
    if (n.done && !n.hitAt) continue;
    const y = Math.round(hitY - (n.t - now) / TRAVEL * (ph - 40));
    if (y < py + 20) continue;
    if (n.hitAt) { // burst on hit
      const a = (now - n.hitAt) / 250;
      if (a < 1) { x.globalAlpha = 1 - a; x.drawImage(ARROWS[n.lane][0], lx(n.lane) - 2, hitY - 2, 13, 13); x.globalAlpha = 1; }
      continue;
    }
    x.drawImage(ARROWS[n.lane][0], lx(n.lane), y);
  }
  if (now < start) text(x, 'PRET ?', px + pw / 2, py + ph / 2, '#fff', 2, 'center', '#000');
  if (busk.judge && now - busk.judgeAt < 500) {
    const c = { 'PARFAIT !': '#60ff80', BIEN: '#80f0ff', RATE: '#ff6060' }[busk.judge];
    text(x, busk.judge, px + pw / 2, hitY - 28, c, 1, 'center', '#000');
  }
  if (busk.combo > 2) text(x, 'COMBO ' + busk.combo, px + pw / 2, hitY - 40, '#ffe680', 1, 'center', '#000');
  text(x, foot, px + pw / 2, py + ph + 4, '#ffe680', 1, 'center', '#000');
  text(x, 'FLECHES / ZQSD', px + pw / 2, py + ph - 8, '#8a7a9a', 1, 'center');
}
