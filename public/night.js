// "La Nuit" in the browser: the cop, your clients, haggling, the motel scene and the result cards.
// The server (games/night.js) decides everything; this file draws and sends keys. Suggestive only.
import { MOTEL_DOOR, PIMP, nearCorner, nearMotel, nearPimp } from './map.js';
import { NPC_OUTFITS } from './items.js';
import { text, label } from './sprites.js';
import { darkness } from './daylight.js';
import { busk, startBusk, stopBusk } from './busk.js';

export const night = { on: false, mode: '', clients: [], talk: null, deal: 0, earned: 0, rep: 0, pimp: null, pimpOpen: false, warn: false, left: 0,
  busted: 0, bustedAt: 0, scene: 0, result: null, escapedAt: 0, price: 0, notes: 0, score: 0, pimpTalk: false, cop: null };
const shown = new Map(); // id -> drawn position, eased toward the server one

const LOOKS = ['dealer', 'concierge', 'seller', 'barman', 'shark', 'shop', 'hostess', 'concierge', 'shark'].map(k => NPC_OUTFITS[k]);
const COP = { ...NPC_OUTFITS.bouncer, hat: 'hat_cap', glasses: null };
const MARQUIS = { ...NPC_OUTFITS.shark, top: 'top_costume', acc: 'acc_chaine' };
const round10 = v => Math.max(10, Math.round(v / 10) * 10);

export function onCop(m) { night.cop = m; }
export function onNight(m, now) {
  if ('end' in m) {
    if (night.mode === 'scene') stopBusk();
    Object.assign(night, { on: false, mode: '', clients: [], talk: null, pimpTalk: false });
    return m.end;
  }
  const was = night.mode, oldTalk = night.talk?.id;
  Object.assign(night, m, { on: true });
  if (m.busted && was !== 'busted') night.bustedAt = now;
  if (m.talk && m.talk.id !== oldTalk) night.price = round10((m.talk.range[0] + m.talk.range[1]) / 2);
  if (m.mode === 'scene' && was !== 'scene') { startBusk(now); busk.earned = 0; night.notes = 0; night.score = 0; }
  if (was === 'scene' && m.mode !== 'scene') stopBusk();
  if (m.result) night.result = { ...m.result, at: now };
  if (m.escaped) night.escapedAt = now;
  return null;
}
export const nightNote = (q, emit) => { night.notes++; night.score += q; emit({ a: 'note', q }); };

// Fake players for the street's y-sorted drawing: the cop (everyone sees him), your clients, the Marquis.
export function nightActors(now) {
  const out = [], ease = (id, x, y) => {
    const s = shown.get(id) || { x, y };
    s.x += (x - s.x) * 0.25; s.y += (y - s.y) * 0.25;
    shown.set(id, s);
    return s;
  };
  if (night.cop) {
    const c = night.cop, s = ease('cop', c.x, c.y);
    out.push({ id: 'cop', name: 'POLICE', color: '#2040a0', outfit: COP, x: s.x, y: s.y, dir: c.dir > 0 ? 2 : 1, moving: Math.abs(s.x - c.x) > 0.3 });
  }
  if (!night.on) return out;
  for (const c of night.clients) {
    if (c.state === 'scene') continue;
    const s = ease(c.id, c.x, c.y);
    out.push({ id: 'c' + c.id, name: c.regular ? '<3 ' + c.name : '', color: '#444', outfit: LOOKS[c.arch % LOOKS.length], x: s.x, y: s.y, dir: c.dir > 0 ? 2 : 1,
      moving: ['walk', 'leave'].includes(c.state) || (c.state === 'follow' && Math.abs(s.x - c.x) + Math.abs(s.y - c.y) > 0.6) });
  }
  if (night.pimpOpen) out.push({ id: 'pimp', name: 'LE MARQUIS', color: '#6a1040', outfit: MARQUIS, x: PIMP.x, y: PIMP.y, dir: 0, moving: false });
  return out;
}

// What E does here, if it is about the night. Returns a prompt like nearbyStreet's.
export function nightPrompt(me) {
  if (!night.on) return nearCorner(me) && darkness() >= 0.5 ? { kind: 'night', a: 'start', x: me.x, y: me.y - 44, text: 'E : PRENDRE SON SERVICE (18+)' } : null;
  if (night.mode === 'free') {
    const c = night.clients.find(c => c.state === 'wait' && Math.hypot(c.x - me.x, c.y - me.y) < 30);
    if (c) return { kind: 'night', a: 'talk', id: c.id, x: c.x, y: c.y - 48, text: 'E : ABORDER' };
  }
  if ((night.mode === 'walk' || night.mode === 'busted') && night.deal && nearMotel(me)) return { kind: 'night', a: 'enter', x: MOTEL_DOOR.x, y: MOTEL_DOOR.y - 40, text: 'E : ENTRER A L\'HOTEL' };
  if (night.pimpOpen && nearPimp(me) && night.mode === 'free') return { kind: 'night', a: 'pimp', x: PIMP.x, y: PIMP.y - 50, text: 'E : PARLER AU MARQUIS' };
  return null;
}

// Keys while working. Returns true when used.
export function nightKey(code, emit) {
  if (night.pimpTalk) {
    if (code === 'Digit1' || code === 'Digit2') { emit({ a: 'pimp', yes: code === 'Digit1' }); night.pimpTalk = false; }
    if (code === 'Escape') night.pimpTalk = false;
    return true;
  }
  if (night.mode === 'talk') {
    const k = { Digit1: 1, Digit2: 2, Digit3: 3, Digit4: 4 }[code];
    if (k) { emit({ a: 'act', k, v: night.price }); return true; }
    if (['ArrowLeft', 'KeyA', 'KeyQ'].includes(code)) { night.price = Math.max(10, night.price - 10); return true; }
    if (['ArrowRight', 'KeyD'].includes(code)) { night.price = Math.min(5000, night.price + 10); return true; }
    return code !== 'Escape'; // nothing else while you talk; Escape ends the night
  }
  return false;
}

function wrap(s, n) {
  const out = [''];
  for (const w of s.split(' ')) {
    if ((out.at(-1) + ' ' + w).trim().length > n) out.push(w);
    else out[out.length - 1] = (out.at(-1) + ' ' + w).trim();
  }
  return out;
}
function panel(x, px, py, pw, ph) {
  x.fillStyle = 'rgba(10,4,16,.88)'; x.fillRect(px, py, pw, ph);
  x.fillStyle = '#ff4ab0'; x.fillRect(px, py, pw, 1); x.fillRect(px, py + ph - 1, pw, 1);
}
function bar(x, X, Y, w, f, col) {
  x.fillStyle = '#000'; x.fillRect(X, Y, w, 4);
  x.fillStyle = col; x.fillRect(X + 1, Y + 1, Math.round((w - 2) * Math.max(0, Math.min(1, f))), 2);
}

// In the world, on top of the street: interest hearts, waiting clients, the cop's cone, where the motel is.
export function drawNightWorld(x, cam, now, me) {
  if (!night.on) return;
  x.save(); x.translate(-cam.x, -cam.y);
  const c = night.cop;
  if (c && night.mode !== 'scene') { // his line of sight: long in the light, short in the dark
    const s = shown.get('cop') || c, r = 110, d = c.dir;
    x.fillStyle = night.mode === 'busted' ? 'rgba(255,60,60,.22)' : 'rgba(255,230,120,.12)';
    x.beginPath(); x.moveTo(s.x, s.y - 4); x.lineTo(s.x + d * r, s.y - 4 - 26 - r * 0.3); x.lineTo(s.x + d * r, s.y - 4 + 26 + r * 0.3); x.closePath(); x.fill();
  }
  for (const cl of night.clients) {
    const s = shown.get(cl.id);
    if (!s) continue;
    if (cl.state === 'walk' && cl.interest > 0) { bar(x, s.x - 10, s.y - 44, 20, cl.interest, '#ff4ab0'); text(x, '<3', s.x - 16, s.y - 45, '#ff4ab0'); }
    if (cl.state === 'wait') text(x, '?', s.x, s.y - 50 + Math.round(Math.sin(now / 150) * 2), '#ffe680', 2, 'center', '#000');
  }
  if (night.mode === 'walk' || (night.mode === 'busted' && night.deal)) { // bobbing arrow over the motel door
    const b = Math.round(Math.sin(now / 150) * 2);
    text(x, 'V', MOTEL_DOOR.x, MOTEL_DOOR.y - 52 + b, '#ff4ab0', 2, 'center', '#000');
  }
  x.restore();
}

// Screen-space panels.
export function drawNight(x, w, h, now) {
  if (night.result && now - night.result.at < 5000) drawResult(x, w, h, night.result);
  if (night.escapedAt && now - night.escapedAt < 1500) text(x, 'SEMES !', w / 2, 40, '#60ff80', 3, 'center', '#000');
  if (!night.on) return;
  if (night.mode !== 'talk' && night.mode !== 'scene') { // service badge, under the player count
    const bw = 120, bx = w - bw - 6;
    panel(x, bx, 18, bw, 22);
    text(x, 'EN SERVICE  REP ' + night.rep, bx + bw / 2, 21, '#ff8ad8', 1, 'center');
    text(x, 'NUIT +' + night.earned + '  ECHAP: FINIR', bx + bw / 2, 30, '#c8b8d8', 1, 'center');
  }
  if (night.warn && night.mode !== 'scene') label(x, 'LE MARQUIS : PSST ! LES FLICS !', w / 2, 54, '#ff8ad8', 'rgba(40,0,30,.92)');
  if (night.mode === 'busted') {
    const left = Math.max(0, 3 - (now - night.bustedAt) / 1000);
    text(x, 'LA POLICE T\'A VU !', w / 2, 30, Math.floor(now / 200) % 2 ? '#ff4040' : '#4080ff', 2, 'center', '#000');
    text(x, 'SORS DE SON CHAMP DE VISION... ' + left.toFixed(1), w / 2, 46, '#fff', 1, 'center', '#000');
  } else if (night.mode === 'walk') text(x, 'EMMENE TON CLIENT A L\'HOTEL (RUELLE)', w / 2, 34, '#ff8ad8', 1, 'center', '#000');
  else if (night.mode === 'free' && !night.clients.some(c => c.state === 'wait')) text(x, 'RESTE PRES DES PASSANTS. LA LUMIERE ATTIRE... LA POLICE AUSSI', w / 2, h - 14, '#c8b8d8', 1, 'center', '#000');
  if (night.mode === 'talk' && night.talk) drawTalk(x, w, h, night.talk);
  if (night.pimpTalk) drawPimp(x, w, h);
}

function drawTalk(x, w, h, t) {
  const pw = 136, px = w - pw - 6, py = 32, ph = h - 64, cx = px + pw / 2;
  panel(x, px, py, pw, ph);
  let y = py + 5;
  text(x, t.who, cx, y, '#ffe680', 1, 'center');
  if (t.regular) { y += 8; text(x, '<3 ' + t.name + ' (' + (t.regular + 1) + 'E VISITE)', cx, y, '#ff8ad8', 1, 'center'); }
  y += 11;
  for (const l of wrap('"' + t.reply + '"', 30).slice(0, 3)) { text(x, l.replace(/"/g, '\''), cx, y, '#fff', 1, 'center'); y += 8; }
  y += 3;
  text(x, 'HUMEUR', px + 6, y, '#8a7a9a'); bar(x, px + 42, y + 1, pw - 48, t.mood / 100, t.mood > 50 ? '#60ff80' : t.mood > 25 ? '#ffd040' : '#ff6060');
  y += 9;
  text(x, 'PATIENCE', px + 6, y, '#8a7a9a');
  for (let i = 0; i < t.patience; i++) { x.fillStyle = '#ffe680'; x.fillRect(px + 50 + i * 6, y + 1, 4, 4); }
  y += 9;
  text(x, 'BUDGET ESTIME ' + t.range[0] + '-' + t.range[1], cx, y, '#8a7a9a', 1, 'center');
  y += 12;
  text(x, '<  ' + night.price + '  >', cx, y, '#fff', 2, 'center', '#000');
  y += 16;
  const opt = (k, s, on = true) => { text(x, k + ' ' + s, px + 8, y, on ? '#fff' : '#5a5070'); y += 9; };
  opt(1, 'CHARMER');
  opt(2, 'PROPOSER ' + night.price);
  opt(3, t.counter ? 'ACCEPTER SES ' + t.counter : 'ACCEPTER (PAS D\'OFFRE)', !!t.counter);
  opt(4, 'LAISSER TOMBER');
  text(x, 'FLECHES : AJUSTER LE PRIX', cx, py + ph - 9, '#8a7a9a', 1, 'center');
}

function drawPimp(x, w, h) {
  const pw = 230, ph = 78, px = (w - pw) >> 1, py = (h - ph) >> 1, cx = w / 2;
  panel(x, px, py, pw, ph);
  text(x, 'LE MARQUIS', cx, py + 5, '#ff8ad8', 1, 'center');
  const yes = night.pimp === 'yes';
  const lines = yes ? ['TU ES SOUS MA PROTECTION, POUPEE.', 'JE PRENDS 25% ET JE TE PREVIENS DES FLICS.', 'TU VEUX TOUJOURS DE MOI ?']
    : ['JOLI COIN... CE SERAIT DOMMAGE QU\'IL T\'ARRIVE', 'QUELQUE CHOSE. 25% ET JE TE PROTEGE :', 'JE TE PREVIENS QUAND LES FLICS ARRIVENT.'];
  lines.forEach((l, i) => text(x, l, cx, py + 18 + i * 9, '#fff', 1, 'center'));
  text(x, '1 : ' + (yes ? 'OUI, ON CONTINUE' : 'MARCHE CONCLU') + '   2 : ' + (yes ? 'JE REPRENDS MA LIBERTE' : 'NON MERCI'), cx, py + 52, '#ffe680', 1, 'center');
  if (night.pimp === 'no') text(x, '(SES HOMMES TE VOLENT PARFOIS EN SORTIE D\'HOTEL)', cx, py + 64, '#ff9040', 1, 'center');
}

function drawResult(x, w, h, r) {
  const pw = 210, px = (w - pw) >> 1, py = 40, cx = w / 2;
  if (r.fine !== undefined) {
    panel(x, px, py, pw, 40);
    text(x, 'EMBARQUE(E) !', cx, py + 6, '#ff4040', 2, 'center', '#000');
    text(x, 'AMENDE -' + r.fine + '   REPUTATION -5', cx, py + 26, '#fff', 1, 'center');
    return;
  }
  const lines = [
    [`PRIX ${r.price} + POURBOIRE ${r.tip}  (SATISFACTION ${r.score}%)`, '#fff'],
    r.cut ? [`LE MARQUIS PREND ${r.cut}`, '#ff8ad8'] : null,
    r.robbed ? [`SES HOMMES T'ONT VOLE ${r.robbed} !`, '#ff6060'] : null,
    r.capped ? ['PLAFOND DE LA NUIT ATTEINT', '#ff9040'] : null,
    [`REPUTATION ${r.rep > 0 ? '+' : ''}${r.rep}`, r.rep > 0 ? '#60ff80' : '#ff6060'],
    r.visits === 1 ? [`${r.name} DEVIENT UN HABITUE <3`, '#ff8ad8'] : r.visits > 1 ? [`${r.name} REVIENDRA (${r.visits} VISITES)`, '#ff8ad8'] : null,
  ].filter(Boolean);
  panel(x, px, py, pw, 28 + lines.length * 10);
  text(x, '+' + (r.paid - r.robbed), cx, py + 5, '#60ff80', 2, 'center', '#000');
  lines.forEach(([s, c], i) => text(x, s, cx, py + 26 + i * 10, c, 1, 'center'));
}

export const sceneFill = () => (night.notes ? night.score / (2 * night.notes) : 0);
