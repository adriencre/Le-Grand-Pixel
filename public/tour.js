// Guided tour after creating an account: Lulu the bellhop walks you around the casino, the street and the residence.
// Client-side staging only: in the casino your real avatar follows her, outside a local "ghost" does.
import { T, ST, VW, VH, LW, LH } from './map.js';
import { drawStreet } from './street.js';
import { drawLobby } from './lobby.js';
import { drawVip } from './viproom.js';
import { drawAvatar } from './avatar.js';
import { canvas, text } from './sprites.js';
import { sfx } from './sfx.js';

const GUIDE = { hair: 'hair_queue', hairColor: 8, skin: 1, top: 'top_smoking', bottom: 'bot_jupe', shoes: 'sh_vernis', acc: 'acc_noeud', hat: 'hat_fedora' };
const GAP = 28, TYPE_MS = 28, FADE = 400;
const SIZES = { street: [ST.w * T, ST.h * T], lobby: [LW * T, LH * T], vip: [VW * T, VH * T] };

// Paths follow the free aisles of each map (see the solids in map.js), so nobody walks through a table.
const STEPS = [
  { scene: 'casino', start: { guide: [352, 440], me: [352, 392] }, stay: true, path: [[352, 416], [376, 400]], face: 1, emote: 4, say: [
    'Salut {NAME} ! Moi c\'est Lulu, la groom du Grand Pixel.',
    'Bienvenue dans le casino le plus pixelise de toute la ville !',
    'Tu as 1000 jetons en poche. Suis-moi, je te fais visiter !'] },
  { scene: 'casino', path: [[376, 352], [300, 352]], point: [282, 278], say: [
    'Ici, le classement en neon : les plus grosses fortunes du casino.',
    'Ton but ? Voir ton nom tout en haut !'] },
  { scene: 'casino', path: [[200, 352], [200, 384]], point: [128, 372], say: [
    'La boutique et le vestiaire : 70 tenues, chapeaux, ailes, effets...',
    'Approche-toi du comptoir et appuie sur E pour tout essayer.'] },
  { scene: 'casino', path: [[192, 300]], point: [112, 284], say: [
    'Le blackjack ! Approche-toi d\'une chaise et appuie sur E pour t\'asseoir.',
    'Echap pour te lever. Le but : faire 21 sans jamais depasser.'] },
  { scene: 'casino', path: [[192, 112], [168, 112]], point: [152, 38], say: [
    'Les machines a sous. 1% de chaque mise remplit le jackpot commun...',
    '...et trois diamants avec une mise de 50 ou plus le raflent en entier !'] },
  { scene: 'casino', path: [[352, 112], [352, 176]], point: [352, 190], say: [
    'Le poker Texas Hold\'em. Ici tu joues contre les autres joueurs,',
    'pas contre la banque. Bluffe bien !'] },
  { scene: 'casino', path: [[352, 112], [488, 112], [488, 220]], point: [576, 190], say: [
    'La roulette : un numero, une couleur, pair ou impair... a toi de voir.'] },
  { scene: 'casino', path: [[488, 272]], point: [592, 286], say: [
    'Et les courses de chevaux : parie sur ton favori et croise les doigts !'] },
  { scene: 'casino', path: [[488, 112], [560, 112]], point: [560, 60], say: [
    'Le bar ! Approche-toi du comptoir et appuie sur E pour commander.',
    'Mais attention : trop de verres et tout se met a tanguer...'] },
  { scene: 'casino', path: [[448, 112]], point: [448, 30], say: [
    'Le panneau JOBS : barman, croupier, videur ou menage.',
    'Un petit boulot, c\'est un revenu stable sans rien risquer !'] },
  { scene: 'casino', path: [[392, 112]], point: [384, 44], say: [
    'L\'ascenseur dore mene a l\'etage VIP.',
    'Il faut une carte Or, Platine ou Diamant : elles sont a la reception, juste a cote.',
    'Allez, je te montre la vue d\'en haut...'] },
  { scene: 'vip', say: [
    'L\'etage VIP : tables Or, Platine et Diamant, avec des mises enormes.',
    'Et derriere la vitre, le salon Diamant... reserve aux plus riches !'] },
  { scene: 'casino', path: [[488, 112], [488, 400], [352, 400], [352, 420]], say: [
    'Allez, on sort prendre l\'air !'] },
  { scene: 'street', start: { guide: [336, 112], me: [316, 104] }, path: [[350, 132]], point: [366, 92], say: [
    'La rue. Lui, c\'est le videur : sous 10 jetons, il te jette dehors.',
    'Pour rentrer, il te faudra 100 jetons. Ne finis pas ici !'] },
  { scene: 'street', path: [[250, 132]], point: [224, 84], say: [
    'Et voila le Requin. Il prete 500 jetons... a rendre 750 en 10 minutes.',
    'En retard ? La dette grossit et il te suit partout. Brrr.'] },
  { scene: 'street', path: [[170, 148]], point: [144, 118], say: [
    'Ici, tu peux faire la manche a la guitare : un petit jeu de rythme.',
    'Et les poubelles cachent parfois de jolies trouvailles...'] },
  { scene: 'street', speed: 130, path: [[800, 148], [816, 124]], point: [816, 96], say: [
    'Et voici la Residence Les Pixels. C\'est la que tu habites !'] },
  { scene: 'lobby', start: { guide: [104, 186], me: [104, 204] }, path: [[104, 140], [76, 128]], point: [40, 84], say: [
    'Le hall. Le concierge veille sur les boites aux lettres.'] },
  { scene: 'lobby', path: [[200, 128], [312, 128]], point: [272, 60], say: [
    'Le showroom Meubles et Deco : plus de 50 meubles pour ton chez-toi.',
    'Tu peux tout voir en grand, dans ta propre piece, avant d\'acheter.'] },
  { scene: 'lobby', path: [[104, 128], [104, 68]], point: [104, 32], say: [
    'Cet ascenseur monte aux appartements. Ton studio t\'attend, offert !',
    'Chez toi, appuie sur B pour decorer. Un jour, le Loft ou le Penthouse ?'] },
  { scene: 'casino', start: { guide: [376, 400], me: [352, 400] }, face: 1, emote: 1, say: [
    'Dernier conseil : appuie sur P pour sortir ton telephone.',
    'Banque, virements, plan, messages, photos, bourse et succes : tout est dedans !',
    'Et reviens chaque jour : un bonus t\'attend a chaque connexion.',
    'Allez, a toi de jouer. Bonne chance, {NAME} !'] },
  { scene: 'casino', stay: true, path: [[376, 424], [352, 444]], say: [] },
];

export const tour = { on: false, scene: 'casino' };
let st = null;

const dirOf = (dx, dy) => Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0);
function stepTo(p, [x, y], sp) {
  const dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy);
  if (d > 0.01) p.dir = dirOf(dx, dy);
  if (d <= sp) { p.x = x; p.y = y; return true; }
  p.x += dx / d * sp; p.y += dy / d * sp;
  return false;
}
const actor = () => tour.scene === 'casino' ? st.me : st.ghost;

export function startTour(me, now, onEnd) {
  tour.on = true; tour.scene = 'casino';
  st = { i: -1, me, onEnd, at: now, fadeAt: -1e9, next: null, phase: 'walk', line: 0, lineAt: 0, shown: 0, sceneAt: now, crumbs: [], path: [],
    g: { id: 'guide', name: 'LULU', color: '#e04050', outfit: GUIDE, x: 0, y: 0, dir: 0, moving: false, emote: null },
    ghost: { x: 0, y: 0, dir: 0, moving: false }, cf: { x: me.x, y: me.y } };
  apply(0, now);
}

export function endTour() {
  if (!st) return;
  const cb = st.onEnd;
  st.me.moving = false;
  st = null; tour.on = false;
  cb?.();
}

function go(i, now) {
  if (i >= STEPS.length) return endTour();
  if (STEPS[i].scene !== tour.scene) { st.fadeAt = now; st.next = i; return; } // fade to black, switch halfway
  apply(i, now);
}

function apply(i, now) {
  const s = STEPS[i], a = s.scene === 'casino' ? st.me : st.ghost;
  if (s.scene !== tour.scene || i === 0) { st.sceneAt = now; st.crumbs = []; }
  tour.scene = s.scene;
  if (s.start) {
    [st.g.x, st.g.y] = s.start.guide; [a.x, a.y] = s.start.me; a.dir = 0;
    st.crumbs = []; st.cf = { x: (a.x + st.g.x) / 2, y: (a.y + st.g.y) / 2 };
  }
  Object.assign(st, { i, path: (s.path || []).slice(), phase: 'walk', line: 0 });
}

function talk(now) {
  const s = STEPS[st.i], a = actor(), g = st.g;
  st.phase = 'talk'; st.lineAt = now; st.shown = 0;
  g.moving = a.moving = false;
  g.dir = s.face ?? dirOf(a.x - g.x, a.y - g.y);
  if (Math.hypot(g.x - a.x, g.y - a.y) < 60) a.dir = dirOf(g.x - a.x, g.y - a.y);
  if (s.emote != null) { g.emote = { k: s.emote, at: now }; sfx.pop(); }
  if (!s.say.length) go(st.i + 1, now);
}

export function updateTour(dt, now) {
  if (!st) return;
  if (st.next != null && now - st.fadeAt >= FADE) { apply(st.next, now); st.next = null; }
  const s = STEPS[st.i], g = st.g, a = actor();
  if (st.phase === 'walk' && st.next == null) {
    const sp = (s.speed || 80) * dt;
    g.moving = st.path.length > 0;
    if (g.moving) { if (stepTo(g, st.path[0], sp)) st.path.shift(); st.crumbs.push([g.x, g.y]); }
    a.moving = false;
    if (!s.stay) { // follow Lulu's footsteps, a few steps behind
      let left = Math.hypot(st.crumbs[0]?.[0] - a.x, st.crumbs[0]?.[1] - a.y) || 0;
      for (let k = 1; k < st.crumbs.length; k++) left += Math.hypot(st.crumbs[k][0] - st.crumbs[k - 1][0], st.crumbs[k][1] - st.crumbs[k - 1][1]);
      if (left > GAP + 0.5) { // margin: float rounding would otherwise keep you shuffling forever
        a.moving = true;
        let budget = Math.min(sp, left - GAP);
        while (budget > 0 && st.crumbs.length) {
          const c = st.crumbs[0], d = Math.hypot(c[0] - a.x, c[1] - a.y);
          stepTo(a, c, budget);
          if (d <= budget) st.crumbs.shift();
          budget -= d;
        }
      }
    }
    if (!g.moving && !a.moving) { talk(now); if (!st) return; } // the last stop ends the tour
  }
  if (st.phase === 'talk') {
    const n = Math.floor((now - st.lineAt) / TYPE_MS), len = (s.say[st.line] || '').length;
    if (n > st.shown && st.shown < len) { if (n % 3 === 0) sfx.tick(); st.shown = n; }
  }
  // the camera drifts toward what Lulu is showing
  const p = st.phase === 'talk' && s.point;
  const tx = p ? (g.x + p[0]) / 2 : (g.x + a.x) / 2, ty = p ? (g.y + p[1]) / 2 : (g.y + a.y) / 2, k = Math.min(1, dt * 3);
  st.cf.x += (tx - st.cf.x) * k; st.cf.y += (ty - st.cf.y) * k;
}

export const tourFocus = () => st.cf;
export const tourGuide = () => st.g;

// Click / Enter: finish the line being typed, then the next line, then the next stop.
export function advanceTour(now) {
  if (!st || st.phase !== 'talk' || st.next != null) return;
  const say = STEPS[st.i].say, len = say[st.line].length;
  sfx.click();
  if ((now - st.lineAt) / TYPE_MS < len) st.lineAt = now - len * TYPE_MS;
  else if (st.line + 1 < say.length) { st.line++; st.lineAt = now; st.shown = 0; }
  else { st.phase = 'walk'; go(st.i + 1, now); }
}

// Scenes outside the casino: drawn with the zone's own renderer, only Lulu and you in it. Returns the camera.
export function drawTourScene(x, w, h, now, mine, meId) {
  const [mw, mh] = SIZES[tour.scene];
  let fx = st.cf.x, fy = st.cf.y;
  if (tour.scene === 'vip') { fx = w / 2 + (mw - w) * (0.5 - 0.5 * Math.cos((now - st.sceneAt) / 2200)); fy = mh / 2 + 20; } // slow pan across the floor
  const cam = {
    x: Math.round(mw > w ? Math.max(0, Math.min(mw - w, fx - w / 2)) : (mw - w) / 2),
    y: Math.round(mh > h ? Math.max(0, Math.min(mh - h, fy - 20 - h / 2)) : (mh - h) / 2),
  };
  const people = mine ? [st.g, { ...mine, ...st.ghost, seat: null, bubble: null, emote: null, phone: false }] : [st.g];
  if (tour.scene === 'street') drawStreet(x, cam, now, people, meId, []);
  else if (tour.scene === 'lobby') drawLobby(x, cam, now, people, meId, []);
  else drawVip(x, cam, now, [], meId, [], 0);
  return cam;
}

function arrow(x, px, py) {
  px = Math.round(px); py = Math.round(py);
  for (const [c, o] of [['#3a2408', 1], ['#ffe060', 0]]) {
    x.fillStyle = c;
    x.fillRect(px - 2 - o, py - 14 - o, 4 + 2 * o, 8 + o);
    for (let r = 0; r < 6; r++) x.fillRect(px - 6 + r - o, py - 6 + r, 12 - 2 * r + 2 * o, 1 + o);
  }
}

let face = null;
export function portrait(now) { // Lulu's head and shoulders (20x20), also used by the game guides
  if (!face) face = canvas(20, 20);
  const [c, cx] = face;
  cx.clearRect(0, 0, 20, 20);
  drawAvatar(cx, 10, 24, GUIDE, '#e04050', 0, 0, now);
  return c;
}

// Cinema bars, spotlight + arrow on the place, dialogue box, fades.
export function drawTourUi(x, w, h, now, cam) {
  if (!st) return;
  const s = STEPS[st.i], el = now - st.at, talking = st.phase === 'talk' && st.next == null && s.say.length;
  if (talking && s.point) {
    const px = s.point[0] - cam.x, py = s.point[1] - cam.y;
    x.fillStyle = 'rgba(0,0,0,.45)';
    x.beginPath(); x.rect(0, 0, w, h); x.arc(px, py, 36 + Math.sin(now / 300) * 2, 0, Math.PI * 2); x.fill('evenodd');
    arrow(x, px, py - 8 - Math.abs(Math.sin(now / 180)) * 6);
  }
  const bar = Math.round(Math.min(14, el / 40));
  x.fillStyle = '#000'; x.fillRect(0, 0, w, bar); x.fillRect(0, h - bar, w, bar);
  text(x, 'ECHAP : PASSER LA VISITE', w - 6, 4, '#8a7a9a', 1, 'right');
  if (el < 4000) {
    x.globalAlpha = Math.max(0, Math.min(1, (el - 300) / 500, (4000 - el) / 700));
    text(x, 'BIENVENUE AU GRAND PIXEL', w / 2, Math.round(h * 0.4), '#ffe060', 2, 'center', '#3a2408');
    x.globalAlpha = 1;
  }
  if (talking) {
    const low = tour.scene !== 'vip' && st.g.y - cam.y > h * 0.55; // keep the box off the characters
    const bw = Math.min(w - 16, 380), bh = 50, X = Math.round((w - bw) / 2), Y = low ? 20 : h - bh - 20;
    x.fillStyle = '#c8a040'; x.fillRect(X - 2, Y - 2, bw + 4, bh + 4);
    x.fillStyle = '#150a1e'; x.fillRect(X, Y, bw, bh);
    x.fillStyle = '#3a2448'; x.fillRect(X + 5, Y + 5, 40, 40);
    x.drawImage(portrait(now), X + 5, Y + 5, 40, 40);
    text(x, 'LULU - GROOM DU GRAND PIXEL', X + 52, Y + 7, '#ffe060');
    const line = s.say[st.line].replace('{NAME}', st.me.name), n = Math.floor((now - st.lineAt) / TYPE_MS);
    const max = Math.floor((bw - 58) / 4), cut = line.length > max ? line.lastIndexOf(' ', max) : line.length; // wrap on two lines
    text(x, line.slice(0, Math.min(n, cut)), X + 52, Y + 21, '#e8dcf0');
    if (n > cut) text(x, line.slice(cut + 1, n), X + 52, Y + 31, '#e8dcf0');
    if (n >= line.length && Math.floor(now / 400) % 2) text(x, 'V', X + bw - 9, Y + bh - 9, '#ffe060');
  }
  const f = now - st.fadeAt, open = Math.max(0, 1 - el / 700);
  const a = Math.max(open, f < 2 * FADE ? (f < FADE ? f / FADE : 1 - (f - FADE) / FADE) : 0);
  if (a > 0) { x.fillStyle = `rgba(0,0,0,${a})`; x.fillRect(0, 0, w, h); }
}
