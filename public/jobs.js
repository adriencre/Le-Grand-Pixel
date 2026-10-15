// Small jobs: the server sends a task, the player answers with a key, the server checks and pays.
import { DRINKS } from './drinks.js';
import { TIERS } from './map.js';
import { ICONS } from './bar.js';
import { text, cardSprite } from './sprites.js';

export const JOB_NAMES = { barman: 'Barman', croupier: 'Croupier', videur: 'Videur', menage: 'Ménage' };
export const job = { on: false, kind: null, name: '', task: null, start: 0, end: 0, sent: false, earned: 0, left: 0, judge: null };

export function onJob(m, now) {
  if ('ok' in m) job.judge = { ok: m.ok, paid: m.paid, at: now };
  Object.assign(job, { on: true, kind: m.kind, name: m.name, task: m.task, start: now + m.wait, end: now + m.wait + m.time, sent: false, earned: m.earned, left: m.left });
}
export function stopJob() { job.on = false; job.task = null; }

function answer(v, emit, now) {
  if (job.sent || now < job.start) return;
  job.sent = true;
  emit(v);
}
export function updateJob(now, emit) { if (job.on && !job.sent && now > job.end) answer(null, emit, now); } // too slow: counts as wrong

const LEFT = ['ArrowLeft', 'KeyA'], DOWN = ['ArrowDown', 'KeyS'], RIGHT = ['ArrowRight', 'KeyD'];
// True when the key was used by the job (movement keys stay free for the cleaner).
export function jobKey(code, now, emit) {
  const k = job.kind;
  if (k === 'barman' && /^Digit[1-8]$/.test(code)) { answer(DRINKS[+code[5] - 1].id, emit, now); return true; }
  if (k === 'croupier' || k === 'videur') {
    const v = LEFT.includes(code) ? (k === 'croupier' ? 'hit' : 'out') : RIGHT.includes(code) ? (k === 'croupier' ? 'bust' : 'in') : DOWN.includes(code) && k === 'croupier' ? 'stand' : null;
    if (v) { answer(v, emit, now); return true; }
  }
  if (k === 'menage' && code === 'KeyE') { answer('clean', emit, now); return true; }
  return k !== 'menage' && !/^Digit/.test(code); // stationary jobs swallow everything else (Escape is handled before)
}

const RULES = ['ENTREE LIBRE', 'CARTE OR MINIMUM', 'PLATINE MINIMUM'];

// Panel on the right of the screen, like the busking one.
export function drawJob(x, w, h, now, me) {
  if (!job.on) return;
  const pw = 112, px = w - pw - 6, py = 30, ph = h - 70, cx = px + pw / 2, t = job.task;
  x.fillStyle = 'rgba(10,4,16,.85)'; x.fillRect(px, py, pw, ph);
  x.fillStyle = '#c8a040'; x.fillRect(px, py, pw, 1); x.fillRect(px, py + ph - 1, pw, 1);
  text(x, job.name.toUpperCase(), cx, py + 4, '#ffe680', 1, 'center');
  const f = Math.max(0, Math.min(1, (job.end - now) / (job.end - job.start)));
  x.fillStyle = '#000'; x.fillRect(px + 6, py + 12, pw - 12, 4);
  x.fillStyle = f > 0.3 ? '#60ff80' : '#ff6060'; x.fillRect(px + 7, py + 13, Math.round((pw - 14) * f), 2);
  let y = py + 24;
  if (now < job.start) text(x, '...', cx, y + 30, '#8a7a9a', 2, 'center');
  else if (job.kind === 'barman') {
    text(x, 'COMMANDE :', cx, y, '#c8b8d8', 1, 'center');
    text(x, DRINKS.find(d => d.id === t.drink).name, cx, y + 10, '#fff', 1, 'center', '#000');
    DRINKS.forEach((d, i) => {
      const ix = px + 12 + (i % 2) * 50, iy = y + 26 + Math.floor(i / 2) * 22;
      text(x, String(i + 1), ix, iy + 6, '#ffe680', 1);
      x.drawImage(ICONS[d.icon], ix + 8, iy, 20, 18);
    });
  } else if (job.kind === 'croupier') {
    text(x, 'MAIN DU CROUPIER', cx, y, '#c8b8d8', 1, 'center');
    t.cards.forEach((c, i) => x.drawImage(cardSprite(c), cx - t.cards.length * 10 + i * 20, y + 14));
    text(x, '< TIRE', px + 8, y + 52, '#fff', 1);
    text(x, 'RESTE', cx, y + 64, '#fff', 1, 'center');
    text(x, 'SAUTE >', px + pw - 8, y + 52, '#fff', 1, 'right');
    text(x, '(ARRET A 17)', cx, y + 78, '#8a7a9a', 1, 'center');
  } else if (job.kind === 'videur') {
    text(x, 'CE SOIR :', cx, y, '#c8b8d8', 1, 'center');
    text(x, RULES[t.rule], cx, y + 10, '#ffe680', 1, 'center');
    const tier = TIERS[t.card];
    x.fillStyle = tier ? tier.color : '#3a3048'; x.fillRect(cx - 30, y + 26, 60, 18);
    text(x, tier ? tier.name : 'SANS CARTE', cx, y + 32, tier ? tier.dark : '#c8b8d8', 1, 'center');
    text(x, t.drunk ? 'IL TITUBE...' : 'IL A L\'AIR SOBRE', cx, y + 52, t.drunk ? '#ff9040' : '#60ff80', 1, 'center');
    text(x, '< REFUSER', px + 8, y + 72, '#fff', 1);
    text(x, 'ENTRER >', px + pw - 8, y + 72, '#fff', 1, 'right');
  } else {
    text(x, t.kind === 'glass' ? 'UN VERRE TRAINE' : 'DES CONFETTIS', cx, y, '#fff', 1, 'center');
    const dx = t.x - me.x, dy = t.y - me.y;
    const dir = Math.hypot(dx, dy) < 18 ? 'E : RAMASSER' : Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'A DROITE >' : '< A GAUCHE') : dy > 0 ? 'EN BAS' : 'EN HAUT';
    text(x, dir, cx, y + 14, '#ffe680', 1, 'center');
  }
  const j = job.judge;
  if (j && now - j.at < 900) text(x, j.ok ? '+' + j.paid : 'RATE', cx, py + ph - 44, j.ok ? '#60ff80' : '#ff6060', 2, 'center', '#000');
  text(x, 'GAINS +' + job.earned, cx, py + ph - 22, '#ffe680', 1, 'center');
  text(x, 'PLAFOND : ' + job.left, cx, py + ph - 12, '#8a7a9a', 1, 'center');
  text(x, 'ECHAP : ARRETER', cx, py + ph + 4, '#8a7a9a', 1, 'center', '#000');
}

// The mess to clean, drawn in the room with a bobbing arrow above it.
export function drawJobWorld(x, cam, now) {
  if (!job.on || job.kind !== 'menage' || now < job.start) return;
  const { x: mx, y: my, kind } = job.task, sx = mx - cam.x, sy = my - cam.y;
  if (kind === 'glass') {
    x.fillStyle = 'rgba(200,225,245,.9)'; x.fillRect(sx - 2, sy - 7, 4, 6); x.fillRect(sx - 1, sy - 1, 2, 1); x.fillRect(sx - 3, sy, 6, 1);
  } else for (let i = 0; i < 9; i++) { x.fillStyle = ['#ff4ab0', '#40d0ff', '#ffd040', '#60ff80'][i % 4]; x.fillRect(sx - 6 + (i * 5) % 12, sy - 4 + (i * 7) % 5, 2, 1); }
  const b = Math.round(Math.sin(now / 150) * 2);
  text(x, 'V', sx, sy - 18 + b, '#ffe680', 1, 'center', '#000');
}

export function jobBar(list) {
  return {
    sig: 'job' + list.join(),
    html: '<span class="info">OFFRES D\'EMPLOI — plafond 1000 jetons / heure</span>' + list.map(k => `<button class="go" data-job="${k}">${JOB_NAMES[k]}</button>`).join('') + '<button data-jobclose>Fermer (Échap)</button>',
  };
}
