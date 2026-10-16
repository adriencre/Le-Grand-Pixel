// "La Nuit": street work at night. Pure rules (clients, haggling, the patrolling cop, the motel payout);
// server.js moves things around and talks to the browser. Satirical and suggestive only: nothing explicit.
import { T, ST, LAMPS } from '../public/map.js';
import { ITEMS } from '../public/items.js';

// [name, line, budget min, budget max, reputation needed]
export const ARCHS = [
  ['LE TIMIDE', 'EUH... BONSOIR... IL FAIT FRAIS.', 40, 70, 0],
  ['LE TOURISTE PERDU', 'C\'EST BIEN ICI LE LOUVRE ?', 50, 90, 0],
  ['L\'ETUDIANT FAUCHE', 'J\'AI QUE DES PIECES, CA VA ?', 30, 60, 0],
  ['LE GAGNANT DU SOIR', 'J\'AI TOUT RAFLE AU BLACKJACK !', 90, 160, 15],
  ['LE BANQUIER PRESSE', 'J\'AI UN CONSEIL A 23H...', 120, 200, 25],
  ['L\'ELU EN CAMPAGNE', 'PAS DE PHOTO, HEIN ?', 130, 220, 35],
  ['LA DUCHESSE', 'MON MARI EST A LA ROULETTE.', 200, 320, 60],
  ['LE MINISTRE', 'JE NE SUIS PAS LA. COMPRIS ?', 250, 400, 70],
  ['LE CHEIKH', 'COMBIEN POUR TOUTE LA NUIT ?', 350, 600, 85],
];
const NAMES = ['GERARD', 'BERNARD', 'MICHEL', 'JACQUELINE', 'PATRICK', 'SYLVIE', 'ALAIN', 'MONIQUE', 'THIERRY', 'CHANTAL'];
export const SCENE_MS = 20000, CAP = 2500, FINE = 50, PIMP_AT = 300, PIMP_CUT = 0.25;

export const charm = (o = {}) => Object.values(o).reduce((s, id) => s + (ITEMS[id]?.rarity || 0), 0); // 0 common .. 3 legendary per piece
export const inLight = (x, y) => LAMPS.some(([lx, ly]) => Math.hypot(x - lx * T, y - (ly * T - 6)) < 36);
const round10 = v => Math.max(10, Math.round(v / 10) * 10);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// A passer-by who may stop for you. Regulars come back with their name, a good mood and a fatter wallet.
export function spawnClient(rec, rnd, ch, id) {
  const reg = rec.regulars.length && rnd() < 0.3 ? rec.regulars[Math.floor(rnd() * rec.regulars.length)] : null;
  const open = ARCHS.map((a, i) => i).filter(i => ARCHS[i][4] <= rec.rep);
  const arch = reg ? reg.arch : open[Math.floor(rnd() * open.length)], [, , lo, hi] = ARCHS[arch];
  const dir = rnd() < 0.5 ? 1 : -1;
  return {
    id, arch, name: reg ? reg.name : NAMES[Math.floor(rnd() * NAMES.length)], regular: reg ? reg.visits : 0,
    x: dir > 0 ? 2 * T : (ST.w - 2) * T, y: Math.round((8.6 + rnd() * 2.4) * T), dir, speed: 22 + rnd() * 10,
    state: 'walk', interest: 0, until: 0,
    budget: Math.round((lo + rnd() * (hi - lo)) * (reg ? 1.2 : 1)),
    mood: reg ? 80 : clamp(30 + rec.rep / 4 + ch * 2, 0, 90), patience: reg ? 6 : 3 + Math.floor(rnd() * 3), counter: 0,
  };
}

// Interest per second while you stand close: charm, reputation, and being seen under a lamp.
export const interestRate = (ch, rep, light) => (0.12 + ch * 0.02 + rep / 500) * (light ? 2 : 1);
export const limitOf = c => Math.round(c.budget * (0.7 + c.mood / 250)); // the most he will say yes to right now

// act: 1 charm, 2 propose `value`, 3 take his counter-offer, 4 walk away. Returns { reply, deal?, gone? } and updates c.
export function negotiate(c, act, value, ch, rnd) {
  if (act === 4) return { reply: 'TANT PIS. BONNE NUIT.', gone: true };
  if (act === 3) return c.counter ? { reply: 'MARCHE CONCLU. ON Y VA ?', deal: c.counter } : { reply: 'JE N\'AI RIEN PROPOSE...' };
  let reply;
  c.patience--;
  if (act === 1) {
    if (rnd() < 0.15) { c.mood -= 10; reply = 'DOUCEMENT... TU EN FAIS TROP.'; }
    else { c.mood = Math.min(100, c.mood + 12 + ch * 2); reply = 'OH... TU ME PLAIS BIEN, TOI.'; }
  } else {
    const v = clamp(Math.round(value) || 0, 10, 5000), lim = limitOf(c);
    if (v <= lim) return { reply: 'MARCHE CONCLU. ON Y VA ?', deal: v };
    c.mood -= 10 + Math.min(30, Math.round((v / lim - 1) * 50));
    c.counter = Math.max(c.counter, round10(limitOf(c) * 0.85));
    reply = `TROP CHER ! JE PEUX MONTER A ${c.counter}.`;
  }
  if (c.mood <= 0 || c.patience <= 0) return { reply: 'LAISSE TOMBER, JE M\'EN VAIS.', gone: true };
  return { reply };
}

// The cop walks the sidewalk, stops now and then and may turn around.
export function newCop() { return { x: 10 * T, y: Math.round(9.4 * T), dir: 1, pause: 0 }; }
export function copStep(cop, dt, rnd) {
  if (cop.pause > 0) { cop.pause -= dt; if (cop.pause <= 0 && rnd() < 0.5) cop.dir *= -1; return; }
  cop.x += cop.dir * 28 * dt;
  if (cop.x < 3 * T || cop.x > (ST.w - 3) * T) { cop.x = clamp(cop.x, 3 * T, (ST.w - 3) * T); cop.dir *= -1; }
  if (rnd() < dt * 0.08) cop.pause = 2 + rnd() * 3;
}
// A cone in front of him, longer when you stand in the light.
export const copRange = light => (light ? 110 : 60);
export function copSees(cop, p, light) {
  const ahead = (p.x - cop.x) * cop.dir;
  return ahead > -6 && ahead < copRange(light) && Math.abs(p.y - cop.y) < 26 + ahead * 0.3;
}

// After the motel: score 0..1 from the rhythm game.
export function sceneResult(price, score, pimp, rnd) {
  const tip = Math.round(price * 0.5 * score), gross = price + tip, cut = pimp === 'yes' ? Math.round(gross * PIMP_CUT) : 0;
  return { price, tip, cut, pay: gross - cut, rep: score >= 0.7 ? 4 : score >= 0.4 ? 1 : -3, regular: score >= 0.7, robbed: pimp === 'no' && rnd() < 0.2 };
}

export function cleanNight(n) {
  const regulars = Array.isArray(n?.regulars) ? n.regulars.filter(r => typeof r?.name === 'string' && ARCHS[r.arch]).slice(0, 12).map(r => ({ name: r.name.slice(0, 12), arch: r.arch, visits: Math.max(1, r.visits | 0) })) : [];
  return { rep: clamp(n?.rep | 0, 0, 100), total: Math.max(0, n?.total | 0), regulars, pimp: ['yes', 'no'].includes(n?.pimp) ? n.pimp : null };
}
