// Players' apartments: room, furniture sprites, lighting, and the decorating mode (B) for the owner.
import { T } from './map.js';
import { FURNITURE, WALLS, FLOORS, APT_SIZES, CATS, WALL, fits, aptDims, doorTile, aptWindows } from './furniture.js';
import { canvas, text, label, plantSprite, drawSlotMachine } from './sprites.js';
import { playerObjs, overheads } from './world.js';
import { darkness, twilight } from './daylight.js';

export const deco = { on: false, tab: 'stock', sel: null, hold: -1, f: false, tx: -1, ty: -1 };
const R = (x, c, X, Y, w, h) => { x.fillStyle = c; x.fillRect(X, Y, w, h); };
const fmt = n => n.toLocaleString('fr-FR');
const seeded = k => { const s = Math.sin(k * 61.3) * 10000; return s - Math.floor(s); };
const isNight = it => it.night ?? darkness() > 0.5; // previews force it with it.night

// ---------- wall / floor patterns ----------
export function pattern(x, st, X0, Y0, W, H, wall) {
  for (let y = Y0; y < Y0 + H; y++) for (let X = X0; X < X0 + W; X++) {
    const u = X - X0, v = y - Y0;
    let alt = false;
    if (st.kind === 'stripes') alt = u % 8 < 3;
    else if (st.kind === 'brick') alt = v % 6 === 5 || (u + (Math.floor(v / 6) % 2) * 6) % 12 === 0;
    else if (st.kind === 'planks') alt = wall ? u % 10 === 0 : v % 6 === 5 || (u + Math.floor(v / 6) * 13) % 40 === 0;
    else if (st.kind === 'dots') alt = u % 8 === 3 && v % 8 === 3 || (u + 4) % 8 === 3 && (v + 4) % 8 === 3;
    else if (st.kind === 'tiles') alt = u % 16 === 0 || v % 16 === 0;
    else if (st.kind === 'checker') alt = (Math.floor(u / 16) + Math.floor(v / 16)) % 2 === 1;
    else if (st.kind === 'marble') alt = Math.sin(u * 0.09 + v * 0.05) + Math.sin(u * 0.023 - v * 0.11) > 1.5;
    else alt = (u * 7 + v * 3) % 23 === 0; // plain: a little grain
    R(x, alt ? st.b : st.a, X, y, 1, 1);
  }
}

// ---------- furniture sprites: X, Y = top-left of the footprint, drawn up from its bottom edge ----------
function sofa(main, dark, light) {
  return (x, X, Y) => { R(x, dark, X, Y - 7, 48, 11); R(x, main, X + 2, Y + 2, 44, 11); R(x, dark, X, Y, 4, 14); R(x, dark, X + 44, Y, 4, 14); R(x, light, X + 4, Y + 3, 19, 3); R(x, light, X + 25, Y + 3, 19, 3); R(x, light, X + 6, Y - 5, 36, 2); };
}
const SPRITES = {
  lit(x, X, Y) { R(x, '#5a3418', X, Y - 4, 32, 36); R(x, '#7a4a24', X, Y - 6, 32, 8); R(x, '#f0ece0', X + 2, Y + 2, 28, 28); R(x, '#fff', X + 4, Y + 3, 10, 6); R(x, '#fff', X + 18, Y + 3, 10, 6); R(x, '#3a7bd5', X + 2, Y + 12, 28, 18); R(x, '#2a5ab0', X + 2, Y + 12, 28, 2); R(x, '#5a8ae0', X + 6, Y + 18, 20, 1); },
  lit_superpose(x, X, Y) {
    R(x, '#5a3418', X, Y - 22, 3, 54); R(x, '#5a3418', X + 29, Y - 22, 3, 54); R(x, '#7a4a24', X, Y - 22, 32, 3);
    R(x, '#f0ece0', X + 3, Y - 18, 26, 8); R(x, '#fff', X + 4, Y - 18, 8, 4); R(x, '#2fb36b', X + 12, Y - 17, 17, 7);
    R(x, '#7a4a24', X, Y - 10, 32, 3);
    R(x, '#f0ece0', X + 3, Y + 4, 26, 26); R(x, '#fff', X + 5, Y + 5, 10, 5); R(x, '#e04050', X + 3, Y + 13, 26, 17); R(x, '#c03040', X + 3, Y + 13, 26, 2);
    R(x, '#9a6a3a', X + 22, Y - 10, 1, 22); R(x, '#9a6a3a', X + 28, Y - 10, 1, 22); for (let k = 0; k < 4; k++) R(x, '#9a6a3a', X + 22, Y - 7 + k * 5, 7, 1);
  },
  lit_rond(x, X, Y) { R(x, '#c8a040', X + 2, Y - 6, 44, 8); R(x, '#6a1a2c', X, Y, 48, 48); R(x, '#8a2438', X + 3, Y + 3, 42, 42); R(x, '#fff0f4', X + 8, Y + 4, 12, 7); R(x, '#fff0f4', X + 28, Y + 4, 12, 7); R(x, '#c02848', X + 3, Y + 18, 42, 27); for (let k = 0; k < 5; k++) R(x, '#ff6080', X + 8 + k * 8, Y + 26 + (k % 2) * 6, 3, 3); },
  hamac(x, X, Y) { R(x, '#7a4a24', X + 1, Y - 14, 3, 28); R(x, '#7a4a24', X + 44, Y - 14, 3, 28); for (let i = 0; i < 40; i++) R(x, ['#e04050', '#f2b233', '#3a7bd5'][Math.floor(i / 5) % 3], X + 4 + i, Math.round(Y - 10 + Math.sin(i / 39 * Math.PI) * 8), 1, 5); R(x, '#c8b090', X + 3, Y - 12, 2, 3); R(x, '#c8b090', X + 43, Y - 12, 2, 3); },
  baignoire(x, X, Y) { R(x, '#c8c0b0', X + 2, Y - 6, 44, 18); R(x, '#f4f0e8', X + 3, Y - 5, 42, 15); R(x, '#7ac8f0', X + 6, Y - 3, 36, 6); for (let k = 0; k < 5; k++) R(x, '#fff', X + 8 + k * 7, Y - 4 - (k % 2), 3, 2); R(x, '#c8a040', X + 4, Y + 12, 3, 3); R(x, '#c8a040', X + 41, Y + 12, 3, 3); R(x, '#b0b0b8', X + 40, Y - 11, 2, 6); R(x, '#b0b0b8', X + 36, Y - 11, 6, 2); R(x, '#ffe060', X + 14, Y - 5, 3, 2); },
  paravent(x, X, Y) { for (let k = 0; k < 3; k++) { R(x, '#5a3418', X + 1 + k * 10, Y - 22, 10, 34); R(x, k % 2 ? '#d8c090' : '#e8d0a0', X + 2 + k * 10, Y - 21, 8, 31); R(x, '#e04050', X + 5 + k * 10, Y - 14 + k * 4, 2, 2); R(x, '#2f8a3c', X + 4 + k * 10, Y - 12 + k * 4, 1, 4); } },
  coffre(x, X, Y) { R(x, '#6a3a18', X + 1, Y, 14, 12); R(x, '#8a5a24', X + 1, Y - 4, 14, 5); R(x, '#c8a040', X + 1, Y + 1, 14, 1); R(x, '#c8a040', X + 7, Y, 2, 5); R(x, '#ffe060', X + 3, Y - 5, 10, 1); },
  canape: sofa('#8a2438', '#6a1a2c', '#a83048'),
  canape_cuir: sofa('#3a2418', '#24160e', '#5a3a28'),
  fauteuil(x, X, Y) { R(x, '#2a6a3a', X + 1, Y - 6, 14, 10); R(x, '#3a8a4a', X + 2, Y + 2, 12, 10); R(x, '#2a6a3a', X, Y, 3, 13); R(x, '#2a6a3a', X + 13, Y, 3, 13); R(x, '#5aaa6a', X + 3, Y + 3, 10, 2); },
  chaise(x, X, Y) { R(x, '#7a4a24', X + 3, Y - 8, 10, 12); R(x, '#5a3418', X + 3, Y - 8, 10, 2); R(x, '#9a6a3a', X + 3, Y + 3, 10, 5); R(x, '#5a3418', X + 3, Y + 8, 2, 6); R(x, '#5a3418', X + 11, Y + 8, 2, 6); },
  table(x, X, Y) { R(x, '#5a3418', X + 2, Y + 6, 3, 9); R(x, '#5a3418', X + 27, Y + 6, 3, 9); R(x, '#8a5a30', X, Y - 2, 32, 9); R(x, '#a06a38', X, Y - 2, 32, 2); R(x, '#e8e0c8', X + 10, Y - 3, 6, 3); R(x, '#c02838', X + 21, Y - 5, 2, 4); },
  table_basse(x, X, Y) { R(x, '#202028', X + 3, Y + 8, 2, 6); R(x, '#202028', X + 27, Y + 8, 2, 6); R(x, 'rgba(160,210,240,.55)', X, Y + 3, 32, 6); R(x, '#d0f0ff', X + 2, Y + 3, 10, 1); R(x, '#e04050', X + 20, Y + 1, 5, 3); },
  tv(x, X, Y, it, now) {
    R(x, '#2a2a30', X + 4, Y + 6, 24, 9); R(x, '#3a3a42', X + 4, Y + 6, 24, 1); R(x, '#101014', X + 1, Y - 14, 30, 20);
    if (it.on) { const k = Math.floor(now / 250); for (let i = 0; i < 4; i++) R(x, ['#3a7bd5', '#e04050', '#2fb36b', '#f2b233'][(i + k) % 4], X + 3 + i * 7, Y - 12, 7, 16); R(x, 'rgba(255,255,255,.25)', X + 3, Y - 12 + (now / 40) % 16, 26, 1); }
    else { R(x, '#1e2430', X + 3, Y - 12, 26, 16); R(x, '#2e3644', X + 5, Y - 11, 6, 2); }
  },
  cheminee(x, X, Y, it, now) {
    R(x, '#8a8a92', X, Y - 22, 32, 36); R(x, '#a8a8b0', X - 2, Y - 24, 36, 4); R(x, '#6a6a72', X, Y - 18, 32, 1);
    for (let k = 0; k < 4; k++) R(x, '#7a7a82', X + 2 + k * 8, Y - 16 + (k % 2) * 6, 6, 1);
    R(x, '#1a1010', X + 6, Y - 12, 20, 24); R(x, '#5a3018', X + 7, Y + 8, 18, 3);
    if (it.on) for (let k = 0; k < 6; k++) { const hh = 6 + Math.round(Math.sin(now / 90 + k * 1.7) * 3 + 3); R(x, k % 2 ? '#ff8020' : '#ffd040', X + 8 + k * 3, Y + 9 - hh, 3, hh); }
    R(x, '#c8a040', X + 4, Y - 27, 4, 3); R(x, '#e04050', X + 24, Y - 28, 3, 4); // candle + vase
  },
  bureau(x, X, Y, it, now) {
    R(x, '#5a3418', X + 2, Y + 2, 3, 12); R(x, '#5a3418', X + 27, Y + 2, 3, 12); R(x, '#8a5a30', X, Y - 2, 32, 6); R(x, '#a06a38', X, Y - 2, 32, 1);
    R(x, '#202028', X + 8, Y - 16, 16, 12); R(x, '#303038', X + 15, Y - 4, 2, 2);
    if (it.on) { R(x, '#0a2a14', X + 9, Y - 15, 14, 10); for (let k = 0; k < 4; k++) R(x, '#60ff80', X + 10, Y - 14 + k * 2, 2 + ((Math.floor(now / 200) + k * 3) % 11), 1); }
    else R(x, '#101018', X + 9, Y - 15, 14, 10);
    R(x, '#d0d0d8', X + 9, Y - 1, 12, 2); R(x, '#e04050', X + 26, Y - 5, 3, 3);
  },
  biblio(x, X, Y) { R(x, '#5a3418', X, Y - 20, 32, 34); for (let s = 0; s < 3; s++) { R(x, '#3a2010', X + 2, Y - 18 + s * 11, 28, 9); for (let k = 0; k < 9; k++) R(x, ['#e04050', '#3a7bd5', '#2fb36b', '#f2b233', '#9b51e0'][(k + s * 2) % 5], X + 3 + k * 3, Y - 17 + s * 11 + (k % 3 ? 1 : 0), 2, 8 - (k % 3 ? 1 : 0)); } },
  piano(x, X, Y) {
    R(x, '#101014', X, Y - 6, 48, 30); R(x, '#24242c', X + 2, Y - 4, 44, 10); R(x, '#2a2a32', X + 4, Y - 16, 30, 11); R(x, '#101014', X + 33, Y - 16, 2, 12);
    R(x, '#f0f0f0', X + 2, Y + 16, 44, 8); for (let k = 0; k < 14; k++) if (k % 7 !== 2 && k % 7 !== 6) R(x, '#101014', X + 4 + k * 3, Y + 16, 2, 5);
    R(x, '#101014', X + 3, Y + 24, 3, 6); R(x, '#101014', X + 42, Y + 24, 3, 6); R(x, '#3a2418', X + 14, Y + 27, 20, 4); R(x, '#c8a040', X + 20, Y - 2, 8, 1);
  },
  lampe(x, X, Y) { R(x, '#2a2a30', X + 4, Y + 10, 8, 3); R(x, '#4a4a50', X + 7, Y - 8, 2, 18); R(x, '#f0d890', X + 2, Y - 16, 12, 8); R(x, '#d8b860', X + 2, Y - 9, 12, 1); R(x, '#fff6d0', X + 4, Y - 15, 3, 5); },
  lampadaire(x, X, Y, it, now) { R(x, '#2a2a30', X + 4, Y + 10, 8, 3); R(x, '#3a3a40', X + 7, Y - 20, 2, 30); R(x, `hsl(${(now / 20) % 360},100%,65%)`, X + 6, Y - 26, 4, 14); R(x, 'rgba(255,255,255,.6)', X + 7, Y - 25, 1, 12); },
  frigo(x, X, Y) { R(x, '#c8ccd4', X + 1, Y - 14, 14, 28); R(x, '#e8ecf0', X + 2, Y - 13, 12, 26); R(x, '#a8acb4', X + 2, Y - 4, 12, 1); R(x, '#808890', X + 11, Y - 11, 1, 5); R(x, '#808890', X + 11, Y - 1, 1, 6); R(x, '#e04050', X + 4, Y - 10, 3, 3); R(x, '#f2b233', X + 6, Y - 8, 2, 2); },
  plan_travail(x, X, Y) { R(x, '#e8e4dc', X, Y - 4, 32, 18); R(x, '#3a3a42', X, Y - 6, 32, 3); R(x, '#d8d4cc', X + 2, Y, 13, 12); R(x, '#d8d4cc', X + 17, Y, 13, 12); R(x, '#808088', X + 13, Y + 4, 1, 3); R(x, '#808088', X + 19, Y + 4, 1, 3); R(x, '#c8a070', X + 4, Y - 8, 9, 3); R(x, '#e04050', X + 22, Y - 9, 3, 3); R(x, '#f2b233', X + 25, Y - 9, 3, 3); R(x, '#2fb36b', X + 23, Y - 11, 3, 2); },
  plaques(x, X, Y, it, now) { R(x, '#2a2a30', X, Y - 6, 16, 20); R(x, '#3a3a42', X, Y - 7, 16, 2); const hot = Math.sin(now / 300) > 0; R(x, hot ? '#ff5020' : '#802818', X + 3, Y - 7, 4, 1); R(x, hot ? '#802818' : '#ff5020', X + 9, Y - 7, 4, 1); R(x, '#101014', X + 2, Y + 1, 12, 8); R(x, 'rgba(255,140,60,.5)', X + 3, Y + 2, 10, 3); R(x, '#c8c8d0', X + 3, Y - 3, 2, 2); R(x, '#c8c8d0', X + 11, Y - 3, 2, 2); },
  evier(x, X, Y) { R(x, '#e8e4dc', X, Y - 4, 16, 18); R(x, '#3a3a42', X, Y - 6, 16, 3); R(x, '#9aa4b0', X + 3, Y - 6, 10, 2); R(x, '#b0b0b8', X + 7, Y - 12, 2, 6); R(x, '#b0b0b8', X + 7, Y - 12, 5, 2); R(x, '#d8d4cc', X + 2, Y, 12, 12); R(x, '#808088', X + 7, Y + 4, 2, 1); },
  bar(x, X, Y) { R(x, '#5a2418', X, Y - 4, 32, 18); R(x, '#7a3420', X, Y - 6, 32, 4); R(x, '#c8a040', X, Y + 10, 32, 2); for (let k = 0; k < 4; k++) { R(x, ['#2f8a3c', '#a01828', '#e8c860', '#3a7bd5'][k], X + 4 + k * 7, Y - 14, 3, 8); R(x, ['#2f8a3c', '#a01828', '#e8c860', '#3a7bd5'][k], X + 5 + k * 7, Y - 17, 1, 3); } },
  tabouret(x, X, Y) { R(x, '#c02838', X + 3, Y - 2, 10, 4); R(x, '#e04858', X + 4, Y - 2, 8, 1); R(x, '#b0b0b8', X + 7, Y + 2, 2, 9); R(x, '#808088', X + 4, Y + 11, 8, 2); },
  fontaine(x, X, Y) { R(x, '#7ac8f0', X + 4, Y - 20, 8, 10); R(x, '#a8e0ff', X + 5, Y - 19, 2, 8); R(x, '#e8ecf0', X + 3, Y - 10, 10, 24); R(x, '#3a7bd5', X + 5, Y - 6, 2, 2); R(x, '#e04050', X + 9, Y - 6, 2, 2); R(x, '#c8ccd4', X + 3, Y + 2, 10, 1); },
  billard(x, X, Y) { R(x, '#5a3418', X, Y - 2, 48, 34); R(x, '#1f7a3a', X + 4, Y + 2, 40, 26); for (const [a, b] of [[4, 2], [22, 2], [42, 2], [4, 26], [22, 26], [42, 26]]) R(x, '#0a0a0a', X + a, Y + b, 3, 3); R(x, '#fff', X + 14, Y + 14, 3, 3); R(x, '#e02020', X + 30, Y + 12, 3, 3); R(x, '#f0c020', X + 33, Y + 15, 3, 3); R(x, '#3a7bd5', X + 30, Y + 17, 3, 3); R(x, '#d8b070', X + 8, Y + 20, 22, 1); },
  arcade(x, X, Y, it, now) { R(x, '#2a3a8a', X + 1, Y - 18, 14, 32); R(x, '#101020', X + 3, Y - 14, 10, 9); R(x, Math.floor(now / 300) % 2 ? '#60ff80' : '#ff4ab0', X + 5, Y - 11, 3, 3); R(x, '#e04050', X + 4, Y - 2, 3, 3); R(x, '#f2b233', X + 9, Y - 2, 2, 2); R(x, '#ffe060', X + 1, Y - 18, 14, 2); },
  machine(x, X, Y, it, now) { drawSlotMachine(x, X, Y - 18, now / 1000, false, X + Y); },
  jukebox(x, X, Y, it, now) { R(x, '#6a1a2c', X, Y - 14, 16, 28); R(x, '#c8a040', X + 1, Y - 13, 14, 8); for (let k = 0; k < 4; k++) R(x, `hsl(${(now / 6 + k * 60) % 360},100%,60%)`, X + 2 + k * 3, Y - 4, 2, 10); R(x, '#200818', X + 3, Y - 11, 10, 4); },
  platine(x, X, Y, it, now) { R(x, '#5a3418', X + 1, Y + 2, 14, 12); R(x, '#202028', X + 1, Y - 4, 14, 6); R(x, '#101014', X + 3, Y - 4, 8, 5); R(x, '#e04050', X + 6, Y - 2, 2, 1); R(x, '#fff', X + 3 + Math.floor(now / 80) % 8, Y - 3, 1, 1); R(x, '#c0c0c8', X + 12, Y - 4, 1, 4); for (let k = 0; k < 3; k++) R(x, ['#3a7bd5', '#f2b233', '#e04050'][k], X + 3 + k * 4, Y + 4, 3, 8); },
  guitare(x, X, Y) { R(x, '#2a2a30', X + 5, Y + 9, 6, 4); R(x, '#2a2a30', X + 7, Y - 2, 2, 12); R(x, '#b06a2a', X + 4, Y - 4, 8, 10); R(x, '#d08a4a', X + 5, Y - 4, 6, 1); R(x, '#1a1008', X + 7, Y - 1, 2, 2); R(x, '#3a2010', X + 7, Y - 18, 2, 14); R(x, '#3a2010', X + 6, Y - 20, 4, 3); },
  plante(x, X, Y) { x.drawImage(plantSprite(), X, Y - 3); },
  palmier(x, X, Y) { R(x, '#a07818', X + 4, Y + 6, 8, 8); R(x, '#8a5a30', X + 7, Y - 12, 3, 18); for (const [a, b] of [[-7, -15], [7, -15], [-5, -19], [5, -19], [0, -21]]) R(x, '#2f8a3c', X + 8 + Math.min(a, 0), Y + b, Math.abs(a) + 3, 3); R(x, '#4cbc52', X + 6, Y - 19, 5, 2); },
  sapin(x, X, Y, it, now) {
    for (let r = 0; r < 21; r++) { const hw = Math.floor(r / 2.4) + 1; R(x, r % 4 === 3 ? '#1a5a28' : '#1f6a30', X + 8 - hw, Y - 20 + r, hw * 2, 1); }
    R(x, '#5a3418', X + 7, Y + 1, 3, 4); R(x, '#c02838', X + 4, Y + 5, 8, 8); R(x, '#ffe060', X + 7, Y - 23, 3, 3);
    for (let k = 0; k < 7; k++) R(x, (k + Math.floor(now / 400)) % 2 ? ['#ff4040', '#ffe060', '#40a0ff'][k % 3] : '#0a3a18', X + 8 + ((k * 5) % 9) - 4, Y - 16 + k * 3, 1, 1);
  },
  aquarium(x, X, Y, it, now) {
    R(x, '#2a2a30', X, Y + 2, 32, 12); R(x, '#5ab0e0', X + 1, Y - 12, 30, 15); R(x, '#3a90c8', X + 1, Y - 12, 30, 3); R(x, '#c8b070', X + 1, Y + 1, 30, 2);
    for (let k = 0; k < 3; k++) { const fx = X + 3 + ((now / (40 + k * 17) + k * 9) % 24); R(x, ['#ff8020', '#ffe040', '#ff4ab0'][k], fx, Y - 8 + k * 3, 3, 2); }
    R(x, '#2f8a3c', X + 5, Y - 6, 1, 7); R(x, '#2f8a3c', X + 25, Y - 8, 1, 9); R(x, 'rgba(255,255,255,.5)', X + 3, Y - 10 + Math.floor(now / 200) % 8, 1, 1);
  },
  statue(x, X, Y, it, now) { R(x, '#6a5020', X + 2, Y + 6, 12, 8); R(x, '#c8a040', X + 5, Y - 14, 6, 20); R(x, '#e8c860', X + 5, Y - 19, 6, 6); R(x, '#c8a040', X + 2, Y - 10, 3, 8); R(x, '#c8a040', X + 11, Y - 14, 3, 6); if (Math.floor(now / 500) % 3 === 0) R(x, '#fff', X + 7, Y - 17, 1, 1); },
  trophee(x, X, Y, it, now) { R(x, '#3a2418', X + 3, Y + 8, 10, 5); R(x, '#c8a040', X + 7, Y + 1, 2, 7); R(x, '#e8c860', X + 2, Y - 16, 12, 13); R(x, '#c8a040', X + 3, Y - 5, 10, 3); R(x, '#e8c860', X, Y - 14, 2, 6); R(x, '#e8c860', X + 14, Y - 14, 2, 6); R(x, '#fff6c0', X + 4, Y - 14, 2, 7); R(x, '#a07818', X + 5, Y + 10, 6, 1); if (Math.floor(now / 350) % 4 === 0) R(x, '#fff', X + 11, Y - 15, 1, 1); },
  coffre_fort(x, X, Y) { R(x, '#3a3e48', X + 1, Y - 10, 14, 24); R(x, '#5a606a', X + 2, Y - 9, 12, 22); R(x, '#c8c8d0', X + 5, Y - 4, 6, 6); R(x, '#2a2a30', X + 7, Y - 2, 2, 2); R(x, '#c8a040', X + 11, Y + 4, 2, 5); },
  etagere(x, X, Y) { R(x, '#5a3418', X, Y - 18, 32, 32); for (let s = 0; s < 2; s++) { R(x, '#3a2010', X + 2, Y - 16 + s * 14, 28, 12); for (let k = 0; k < 4; k++) { const c = ['#e8c860', '#c8ccd8', '#d08040', '#e8c860'][(k + s) % 4]; R(x, c, X + 4 + k * 7, Y - 13 + s * 14, 4, 4); R(x, c, X + 5 + k * 7, Y - 9 + s * 14, 2, 3); R(x, c, X + 4 + k * 7, Y - 6 + s * 14, 4, 1); } } },
  tapis(x, X, Y) { R(x, '#c8a040', X, Y, 48, 32); R(x, '#a01828', X + 2, Y + 2, 44, 28); R(x, '#c8a040', X + 6, Y + 6, 36, 1); R(x, '#c8a040', X + 6, Y + 25, 36, 1); R(x, '#c8a040', X + 22, Y + 14, 4, 4); },
  tapis_rond(x, X, Y) { for (let r = 0; r < 16; r++) { const hw = Math.round(Math.sqrt(256 - (r - 15.5) ** 2)), c = r % 5 === 2 ? '#c8a0e0' : '#6a3a8a'; R(x, c, X + 16 - hw, Y + r, hw * 2, 1); R(x, c, X + 16 - hw, Y + 31 - r, hw * 2, 1); } },
  peau(x, X, Y) { const c = '#b08860'; R(x, c, X + 8, Y + 6, 32, 20); R(x, '#d8b888', X + 12, Y + 10, 24, 12); for (const [a, b] of [[2, 2], [38, 2], [2, 22], [38, 22]]) R(x, c, X + a, Y + b, 8, 8); R(x, '#9a7450', X + 20, Y - 1, 9, 9); R(x, '#000', X + 22, Y + 2, 1, 1); R(x, '#000', X + 26, Y + 2, 1, 1); R(x, '#3a2418', X + 23, Y + 5, 3, 2); },
  tapis_or(x, X, Y) { R(x, '#e8c860', X, Y, 64, 48); R(x, '#2a1a40', X + 3, Y + 3, 58, 42); for (let k = 0; k < 6; k++) R(x, '#c8a040', X + 8 + k * 9, Y + 22, 4, 4); R(x, '#c8a040', X + 6, Y + 6, 52, 1); R(x, '#c8a040', X + 6, Y + 41, 52, 1); },
  poster(x, X, Y) { R(x, '#101014', X + 2, Y + 1, 12, 14); R(x, '#ff4ab0', X + 3, Y + 2, 10, 12); R(x, '#ffe060', X + 5, Y + 4, 6, 6); R(x, '#200818', X + 6, Y + 6, 4, 2); R(x, '#fff', X + 4, Y + 11, 8, 1); },
  tableau(x, X, Y) { R(x, '#c8a040', X + 2, Y + 1, 28, 14); R(x, '#5ab0e0', X + 4, Y + 3, 24, 10); R(x, '#2f8a3c', X + 4, Y + 9, 24, 4); R(x, '#ffe060', X + 21, Y + 4, 3, 3); R(x, '#fff', X + 8, Y + 5, 6, 2); },
  fenetre(x, X, Y, it) {
    const night = isNight(it);
    R(x, '#e8e0d0', X + 1, Y, 30, 16); R(x, night ? '#0a1030' : '#7ab8f0', X + 3, Y + 2, 26, 12);
    if (night) for (let k = 0; k < 5; k++) R(x, '#fff', X + 5 + k * 5, Y + 3 + (k * 7) % 6, 1, 1); else R(x, '#fff6c0', X + 20, Y + 4, 4, 4);
    R(x, '#3a3a50', X + 3, Y + 10, 26, 4); R(x, '#e8e0d0', X + 15, Y + 2, 2, 12);
  },
  miroir(x, X, Y) { R(x, '#c8a040', X + 2, Y + 1, 12, 30); R(x, '#e8c860', X + 3, Y + 1, 10, 1); R(x, '#a8c8e0', X + 4, Y + 3, 8, 26); R(x, '#d8f0ff', X + 5, Y + 5, 2, 10); R(x, '#d8f0ff', X + 8, Y + 18, 1, 6); },
  horloge(x, X, Y) { R(x, '#3a2418', X + 3, Y + 2, 10, 10); R(x, '#f0ece0', X + 4, Y + 3, 8, 8); const h = new Date(); R(x, '#000', X + 7, Y + 4, 1, 4); R(x, '#e04050', X + 7, Y + 7, 1 + (h.getMinutes() > 30 ? 0 : 3), 1); },
  coucou(x, X, Y, it, now) { R(x, '#5a3418', X + 1, Y + 2, 14, 3); R(x, '#7a4a24', X + 2, Y + 4, 12, 12); R(x, '#f0ece0', X + 5, Y + 7, 6, 6); R(x, '#000', X + 7, Y + 8, 1, 3); R(x, '#000', X + 7, Y + 10, 3, 1); const sw = Math.round(Math.sin(now / 300) * 3); R(x, '#c8a040', X + 7 + sw, Y + 16, 1, 10); R(x, '#c8a040', X + 6 + sw, Y + 25, 3, 3); },
  ecran(x, X, Y, it, now) {
    R(x, '#101014', X + 1, Y + 2, 46, 28); R(x, '#2a2a32', X + 22, Y + 30, 4, 2);
    if (it.on) { R(x, '#7ab8f0', X + 3, Y + 4, 42, 12); R(x, '#2f8a3c', X + 3, Y + 16, 42, 12); const hx = X + 3 + Math.floor(now / 50) % 38; R(x, '#8a5a2a', hx, Y + 13, 5, 4); R(x, '#e04050', hx + 2, Y + 11, 2, 2); R(x, '#fff', X + 3, Y + 16, 42, 1); }
    else { R(x, '#1a1e28', X + 3, Y + 4, 42, 24); R(x, '#2a3040', X + 6, Y + 6, 10, 2); }
  },
  neon(x, X, Y, it, now) { const on = Math.sin(now / 90) < 0.95; R(x, '#120818', X + 1, Y + 1, 46, 14); text(x, 'GRAND', X + 24, Y + 2, on ? '#80f0ff' : '#205060', 1, 'center'); text(x, 'PIXEL', X + 24, Y + 9, on ? '#ff6ad0' : '#602050', 1, 'center'); },
};

// Light sources (relative to the footprint): [dx, dy, radius, 'r,g,b']. Some only when switched on.
const LIGHTS = {
  lampe: () => [[8, -12, 60, '255,210,120']], lampadaire: () => [[8, -18, 52, '210,130,255']], neon: () => [[24, 8, 50, '255,90,200']],
  tv: it => it.on && [[16, -6, 44, '120,170,255']], ecran: it => it.on && [[24, 16, 54, '120,170,255']], bureau: it => it.on && [[16, -10, 32, '90,255,140']],
  cheminee: it => it.on && [[16, 4, 80, '255,140,60']], aquarium: () => [[16, -4, 34, '90,180,255']], jukebox: () => [[8, -6, 34, '255,120,200']],
  arcade: () => [[8, -10, 28, '120,255,160']], machine: () => [[8, -8, 28, '255,200,90']], sapin: () => [[8, -8, 32, '255,220,120']],
};
export const lightsOf = it => (LIGHTS[it.id]?.(it) || []).map(([dx, dy, r, c]) => [it.x * T + dx, it.y * T + dy, r, c]);

export function drawFurniture(x, id, X, Y, it = {}, now = 0) {
  const d = FURNITURE[id];
  if (!it.f || d.noflip) return SPRITES[id](x, X, Y, it, now);
  x.save(); x.translate(2 * X + d.w * T, 0); x.scale(-1, 1); SPRITES[id](x, X, Y, it, now); x.restore();
}
export const hasSprite = id => !!SPRITES[id];

// ---------- night: darken the room, cut holes around lights, add their colour ----------
const lightBufs = new Map();
export function lighting(x, W, H, dark, lights) {
  if (dark <= 0.02) return;
  const k = `${W}x${H}`;
  if (!lightBufs.has(k)) lightBufs.set(k, canvas(Math.ceil(W / 4), Math.ceil(H / 4)));
  const [lc, l] = lightBufs.get(k);
  l.globalCompositeOperation = 'source-over'; l.clearRect(0, 0, lc.width, lc.height);
  l.fillStyle = `rgba(8,6,28,${0.68 * dark})`; l.fillRect(0, 0, lc.width, lc.height);
  l.globalCompositeOperation = 'destination-out';
  for (const [lx, ly, r] of lights) {
    const g = l.createRadialGradient(lx / 4, ly / 4, 0, lx / 4, ly / 4, r / 4);
    g.addColorStop(0, 'rgba(0,0,0,.95)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    l.fillStyle = g; l.fillRect(lx / 4 - r / 4, ly / 4 - r / 4, r / 2, r / 2);
  }
  x.save(); x.imageSmoothingEnabled = true; x.drawImage(lc, 0, 0, W, H); x.restore();
  x.save(); x.globalCompositeOperation = 'lighter';
  for (const [lx, ly, r, c] of lights) {
    const g = x.createRadialGradient(lx, ly, 0, lx, ly, r);
    g.addColorStop(0, `rgba(${c},${0.22 * dark})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(lx - r, ly - r, r * 2, r * 2);
  }
  x.restore();
}

// ---------- city view through the built-in windows ----------
const views = new Map();
function cityView(w, h, night) {
  const key = `${w}x${h}${night}`;
  if (views.has(key)) return views.get(key);
  const [c, x] = canvas(w, h);
  const sky = x.createLinearGradient(0, 0, 0, h);
  if (night) { sky.addColorStop(0, '#060818'); sky.addColorStop(1, '#2a1a4a'); } else { sky.addColorStop(0, '#4a90e0'); sky.addColorStop(1, '#bfe0ff'); }
  x.fillStyle = sky; x.fillRect(0, 0, w, h);
  if (night) for (let k = 0; k < w / 3; k++) R(x, seeded(k) > 0.8 ? '#fff' : '#8890c0', Math.floor(seeded(k + 1) * w), Math.floor(seeded(k + 2) * h * 0.5), 1, 1);
  else { R(x, '#fff6c0', w - 14, 4, 7, 7); for (let k = 0; k < w / 40 + 1; k++) { const cx = Math.floor(seeded(k + 9) * w); R(x, '#fff', cx, 6 + (k % 3) * 4, 14, 3); R(x, '#fff', cx + 3, 4 + (k % 3) * 4, 7, 2); } }
  for (let X = 0, k = 0; X < w; k++) { // skyline
    const bw = 8 + Math.floor(seeded(k + 30) * 14), bh = Math.floor(h * (0.3 + seeded(k + 40) * 0.45));
    R(x, night ? (k % 2 ? '#141022' : '#1c1830') : (k % 2 ? '#5a6a84' : '#6c7c98'), X, h - bh, bw, bh);
    for (let wy = h - bh + 3; wy < h - 2; wy += 4) for (let wx = X + 2; wx < X + bw - 2; wx += 3) if (seeded(wx * 7 + wy) > (night ? 0.55 : 0.4)) R(x, night ? '#ffd870' : '#9ec4ec', wx, wy, 1, 2);
    X += bw + 1;
  }
  views.set(key, c);
  return c;
}
function drawWindows(x, apt, now) {
  const d = darkness(), tw = twilight(d), gold = apt.size === 2;
  for (const win of aptWindows(apt)) {
    const X = win.x * T + 3, Y = 6, w = win.w * T - 6, h = WALL * T - 16;
    x.drawImage(cityView(w, h, false), X, Y);
    if (d > 0) { x.globalAlpha = d; x.drawImage(cityView(w, h, true), X, Y); x.globalAlpha = 1; }
    if (tw > 0) { x.fillStyle = `rgba(255,120,50,${0.3 * tw})`; x.fillRect(X, Y, w, h); }
    const frame = gold ? '#c8a040' : '#f0ece4';
    R(x, frame, X - 3, Y - 3, w + 6, 3); R(x, frame, X - 3, Y + h, w + 6, 4); R(x, frame, X - 3, Y, 3, h); R(x, frame, X + w, Y, 3, h);
    for (let mx = X + 30; mx < X + w - 4; mx += 32) R(x, frame, mx, Y, 2, h); // mullions
    R(x, frame, X, Y + Math.round(h * 0.45), w, 1);
    R(x, 'rgba(255,255,255,.18)', X + 4, Y + 2, 3, h - 4); // glass shine
    if (!gold) { R(x, '#a83048', X - 6, Y - 4, 5, h + 6); R(x, '#a83048', X + w + 1, Y - 4, 5, h + 6); R(x, '#c84058', X - 5, Y - 4, 1, h + 6); R(x, '#c84058', X + w + 2, Y - 4, 1, h + 6); }
    R(x, gold ? '#a8842c' : '#d8d0c4', X - 4, Y + h + 3, w + 8, 2); // sill
  }
}
function daylightBeams(x, apt) {
  const d = darkness();
  if (d >= 1) return;
  x.save(); x.globalCompositeOperation = 'lighter';
  for (const win of aptWindows(apt)) {
    const X = win.x * T, w = win.w * T;
    for (let k = 0; k < 3 * T; k++) { x.fillStyle = `rgba(255,240,200,${0.07 * (1 - d) * (1 - k / (3 * T))})`; x.fillRect(X + k * 0.3, WALL * T + k, w, 1); }
  }
  x.restore();
}

// ---------- room background (cached per size + wall + floor) ----------
const bgs = new Map();
function background(apt) {
  const key = apt.size + apt.wall + apt.floor;
  if (bgs.has(key)) return bgs.get(key);
  const { w, h } = aptDims(apt), W = w * T, H = h * T, [c, x] = canvas(W, H);
  pattern(x, FLOORS[apt.floor], T, WALL * T, W - 2 * T, H - (WALL + 1) * T, false);
  R(x, 'rgba(255,255,255,.05)', T, WALL * T, W - 2 * T, T); // floor shine near the wall
  pattern(x, WALLS[apt.wall], T, 0, W - 2 * T, WALL * T, true);
  R(x, 'rgba(255,255,255,.2)', T, 0, W - 2 * T, 2); R(x, 'rgba(0,0,0,.25)', T, 2, W - 2 * T, 1); // cornice
  R(x, 'rgba(0,0,0,.28)', T, WALL * T, W - 2 * T, 4); // shadow under the wall
  R(x, '#3a2418', T, WALL * T - 5, W - 2 * T, 5); R(x, '#6a4a2c', T, WALL * T - 5, W - 2 * T, 1); // skirting board
  R(x, '#f0ece4', T + 6, WALL * T - 11, 4, 5); R(x, '#a8a090', T + 7, WALL * T - 9, 2, 1); // socket
  R(x, '#f0ece4', W - T - 12, WALL * T - 26, 5, 7); R(x, '#a8a090', W - T - 10, WALL * T - 24, 1, 3); // light switch
  R(x, '#1a1018', 0, 0, T, H); R(x, '#1a1018', W - T, 0, T, H); R(x, '#1a1018', 0, H - T, W, T);
  R(x, '#2e1e2a', T - 3, 0, 3, H - T); R(x, '#2e1e2a', W - T, 0, 3, H - T); R(x, '#2e1e2a', T, H - T, W - 2 * T, 2);
  const dx = doorTile(apt) * T; // front door: frame, open doorway, welcome mat
  R(x, '#c8a040', dx - 3, H - T, T + 6, 2); R(x, '#8a6a3a', dx - 3, H - T, 3, T); R(x, '#8a6a3a', dx + T, H - T, 3, T); R(x, '#0a0608', dx, H - T + 2, T, T - 2);
  R(x, '#7a4a28', dx - 4, H - T - 9, T + 8, 8); R(x, '#9a6034', dx - 3, H - T - 8, T + 6, 1);
  text(x, 'BIENVENUE', dx + T / 2, H - T - 7, '#e8c890', 1, 'center');
  bgs.set(key, c);
  return c;
}

// ---------- the scene ----------
export function drawApt(x, cam, now, players, meId, prompts, apt) {
  const { w, h } = aptDims(apt), W = w * T, H = h * T;
  x.drawImage(background(apt), -cam.x, -cam.y);
  x.save(); x.translate(-cam.x, -cam.y);
  drawWindows(x, apt, now);
  daylightBeams(x, apt);
  const objs = [];
  apt.items.forEach((it, i) => {
    if (deco.on && deco.hold === i) return; // picked up: drawn as the ghost
    const d = FURNITURE[it.id], draw = () => drawFurniture(x, it.id, it.x * T, it.y * T, it, now);
    if (d.layer === 'obj') objs.push([(it.y + d.h) * T, () => { R(x, 'rgba(0,0,0,.22)', it.x * T + 2, (it.y + d.h) * T - 3, d.w * T - 4, 4); draw(); }]);
    else draw(); // rugs and wall items under everything
  });
  playerObjs(x, objs, players, now);
  objs.sort((a, b) => a[0] - b[0]);
  for (const [, f] of objs) f();
  const lights = apt.items.flatMap(lightsOf);
  lights.push([W / 2, H / 2, Math.max(W, H) * 0.55, '255,230,190']); // ceiling light
  for (const win of aptWindows(apt)) lights.push([(win.x + win.w / 2) * T, WALL * T, win.w * T * 0.7, '120,140,220']); // city glow
  lighting(x, W, H, darkness(), lights);
  overheads(x, players, now, meId);
  const plate = `APPT ${apt.owner} - ${apt.name}`, dx = doorTile(apt) * T + T / 2;
  R(x, '#c8a040', dx - plate.length * 2 - 3, H - 12, plate.length * 4 + 5, 9); R(x, '#2a1a10', dx - plate.length * 2 - 2, H - 11, plate.length * 4 + 3, 7);
  text(x, plate, dx, H - 10, '#ffe680', 1, 'center');
  if (deco.on) ghost(x, apt, now);
  for (const pr of prompts) label(x, pr.text, pr.x, pr.y, '#ffe680', 'rgba(30,10,40,.9)');
  x.restore();
}

// The furniture in hand follows the mouse, green where it fits, red where it doesn't.
const held = apt => (deco.hold >= 0 ? apt.items[deco.hold]?.id : deco.sel);
function ghost(x, apt, now) {
  const { w, h } = aptDims(apt);
  x.fillStyle = 'rgba(255,255,255,.07)';
  for (let k = 1; k < w - 1; k++) x.fillRect(k * T, 0, 1, (h - 1) * T);
  for (let k = 0; k < h - 1; k++) x.fillRect(T, k * T, (w - 2) * T, 1);
  for (const win of aptWindows(apt)) { x.fillStyle = 'rgba(255,80,80,.12)'; x.fillRect(win.x * T, 0, win.w * T, WALL * T); }
  const id = held(apt);
  if (!id || deco.tx < 0) return;
  const d = FURNITURE[id], ok = fits(apt, id, deco.tx, deco.ty, deco.hold), X = deco.tx * T, Y = deco.ty * T;
  x.fillStyle = ok ? 'rgba(60,255,120,.28)' : 'rgba(255,60,60,.32)'; x.fillRect(X, Y, d.w * T, d.h * T);
  if (d.layer === 'obj') R(x, 'rgba(0,0,0,.3)', X + 2, Y + d.h * T - 3, d.w * T - 4, 4);
  x.globalAlpha = 0.8; drawFurniture(x, id, X, Y, { f: deco.f, on: true }, now); x.globalAlpha = 1;
  x.fillStyle = ok ? '#60ff80' : '#ff5050'; // marching dashed outline
  const per = 2 * (d.w + d.h) * T, off = Math.floor(now / 60) % 6;
  for (let k = off; k < per; k += 6) {
    const p = k, bw = d.w * T, bh = d.h * T;
    const [px, py] = p < bw ? [X + p, Y] : p < bw + bh ? [X + bw - 1, Y + p - bw] : p < 2 * bw + bh ? [X + bw - 1 - (p - bw - bh), Y + bh - 1] : [X, Y + bh - 1 - (p - 2 * bw - bh)];
    x.fillRect(px, py, 3, 1);
  }
}

// Tile under the mouse, centred on the held furniture.
export function decoHover(apt, wx, wy) {
  const d = FURNITURE[held(apt)];
  deco.tx = Math.floor(wx / T - (d ? d.w / 2 - 0.5 : 0));
  deco.ty = Math.floor(wy / T - (d ? d.h / 2 - 0.5 : 0));
}

// Click in decorating mode: returns an action for the server, or null.
export function decoClick(apt, wx, wy) {
  if (deco.hold >= 0) { const a = { a: 'move', i: deco.hold, x: deco.tx, y: deco.ty, f: deco.f }; deco.hold = -1; return a; }
  if (deco.sel) {
    const a = { a: 'place', id: deco.sel, x: deco.tx, y: deco.ty, f: deco.f };
    if (deco.tab === 'stock' && (apt.stock[deco.sel] || 0) <= 1) deco.sel = null; // last one from the stock
    return a;
  }
  const tx = wx / T, ty = wy / T; // pick up what's under the mouse (top-most first)
  for (let i = apt.items.length - 1; i >= 0; i--) {
    const it = apt.items[i], d = FURNITURE[it.id];
    if (tx >= it.x && tx < it.x + d.w && ty >= it.y - (d.layer === 'obj' ? 1 : 0) && ty < it.y + d.h) { deco.hold = i; deco.f = it.f; return null; }
  }
  return null;
}

// What E does here: the door, or a piece of furniture you can use.
const TV_NAME = { cheminee: 'LE FEU', bureau: 'LE PC', ecran: 'L\'ECRAN' };
const USE_TEXT = { sleep: () => 'DORMIR', sit: () => 'S\'ASSEOIR', fridge: () => 'SE SERVIR A BOIRE', music: () => 'CHANGER DE MUSIQUE',
  tv: it => (it.on ? 'ETEINDRE ' : 'ALLUMER ') + (TV_NAME[it.id] || 'LA TV') };
export function nearbyApt(me, apt) {
  const { h } = aptDims(apt), dx = doorTile(apt) * T + T / 2;
  if (Math.abs(me.x - dx) < 14 && me.y > (h - 2) * T + 4) return { kind: 'exit', x: dx, y: (h - 1) * T - 34, text: 'E : SORTIR' };
  let best = null, bd = 1e9;
  apt.items.forEach((it, i) => {
    const d = FURNITURE[it.id];
    if (!d.use) return;
    const cx = (it.x + d.w / 2) * T, cy = (it.y + d.h) * T, dist = Math.hypot(cx - me.x, cy - me.y);
    if (dist < T * 1.5 + d.w * 6 && dist < bd) {
      bd = dist;
      best = { kind: d.use, i, x: cx, y: it.y * T - 22, seat: { x: cx, y: cy + 1 }, text: 'E : ' + USE_TEXT[d.use](it) };
    }
  });
  return best;
}

// ---------- thumbnails (showroom cards, decorating bar) ----------
const thumbCv = new Map(), thumbUrls = new Map();
export function thumbSize(id) { const d = FURNITURE[id]; return [d.w * T + 8, d.h * T + (d.layer === 'obj' ? 30 : 6)]; }
// Draws the furniture into its own little canvas (animated) and returns it.
export function thumbCanvas(id, now, it = {}) {
  const d = FURNITURE[id], [w, h] = thumbSize(id);
  if (!thumbCv.has(id)) thumbCv.set(id, canvas(w, h));
  const [c, x] = thumbCv.get(id);
  x.clearRect(0, 0, w, h);
  drawFurniture(x, id, 4, d.layer === 'obj' ? h - 3 - d.h * T : 3, { on: true, ...it }, now);
  return c;
}
export function thumbUrl(id) {
  if (!thumbUrls.has(id)) {
    const c = thumbCanvas(id, 0, { night: false }), [w, h] = thumbSize(id), s = Math.max(1, Math.floor(40 / Math.max(w, h))), [b, bx] = canvas(w * s, h * s);
    bx.drawImage(c, 0, 0, w * s, h * s);
    thumbUrls.set(id, b.toDataURL());
  }
  return thumbUrls.get(id);
}

// ---------- decorating bar (HTML, under the scene) ----------
export function decoBar(apt, chips, homeless) {
  const stockIds = Object.keys(apt.stock).filter(id => apt.stock[id] > 0);
  const TABS = [['stock', `Mon stock (${stockIds.reduce((a, id) => a + apt.stock[id], 0)})`], ...CATS.map(([id, n]) => [id, n[0] + n.slice(1).toLowerCase()]), ['wall', 'Murs'], ['floor', 'Sols'], ['apt', 'Appart']];
  const tabs = TABS.map(([id, n]) => `<button class="${deco.tab === id ? 'sel' : ''}" data-deco='{"tab":"${id}"}'>${n}</button>`).join('');
  const furn = id => {
    const d = FURNITURE[id], n = apt.stock[id] || 0, cant = !n && (homeless || chips < d.price);
    return `<button class="furn ${deco.sel === id ? 'sel' : ''}" data-deco='{"sel":"${id}"}' ${cant ? 'disabled' : ''}><img src="${thumbUrl(id)}" alt=""><span>${d.name}</span><b>${n ? 'x' + n : fmt(d.price)}</b></button>`;
  };
  let body = '';
  if (deco.tab === 'stock') body = stockIds.length ? stockIds.map(furn).join('') : '<span class="info">Ton stock est vide : achète des meubles au showroom du hall, ou dans les onglets.</span>';
  else if (CATS.some(([c]) => c === deco.tab)) body = Object.keys(FURNITURE).filter(id => FURNITURE[id].cat === deco.tab).map(furn).join('');
  else if (deco.tab === 'wall' || deco.tab === 'floor') {
    const list = deco.tab === 'wall' ? WALLS : FLOORS, cur = deco.tab === 'wall' ? apt.wall : apt.floor;
    body = Object.entries(list).map(([id, s]) => {
      const own = s.price === 0 || apt.styles.includes(id);
      return `<button class="furn ${cur === id ? 'sel' : ''}" data-aptedit='{"a":"style","id":"${id}"}' ${!own && (homeless || chips < s.price) ? 'disabled' : ''}><img src="${styleUrl(id)}" alt=""><span>${s.name}</span><b>${own ? (cur === id ? 'posé' : 'à toi') : fmt(s.price)}</b></button>`;
    }).join('');
  } else {
    const next = APT_SIZES[apt.size + 1];
    body = `<span class="info">${APT_SIZES[apt.size].name} · ${apt.items.length} meubles</span>` +
      (next ? `<button class="go" data-aptedit='{"a":"size"}' ${homeless || chips < next.price ? 'disabled' : ''}>Passer en ${next.name.toLowerCase()} — ${fmt(next.price)}</button>` : '') +
      `<button data-aptedit='{"a":"open","v":${!apt.open}}'>${apt.open ? '🔓 Ouvert aux visites' : '🔒 Fermé aux visites'}</button>`;
  }
  const help = deco.hold >= 0 ? 'Clic : poser · R : retourner · Suppr : ranger · Échap : annuler'
    : deco.sel ? 'Clic : poser · R : retourner · Échap : lâcher' : 'Choisis un meuble, ou clique sur un meuble posé pour le déplacer';
  return { sig: `deco${deco.tab}${deco.sel}${deco.hold}${chips}${JSON.stringify(apt)}`, html: `<div class="deco-tabs">${tabs}</div><span class="info">${help}</span><div class="deco-list">${body}</div><button data-deco='{"done":1}'>Terminer (B)</button>` };
}

// Swatch of a wall or floor style.
const styleUrls = new Map();
export function styleUrl(id) {
  if (!styleUrls.has(id)) {
    const [c, x] = canvas(32, 32), wall = !!WALLS[id];
    pattern(x, wall ? WALLS[id] : FLOORS[id], 0, 0, 32, 32, wall);
    const [b, bx] = canvas(40, 40); bx.drawImage(c, 0, 0, 40, 40);
    styleUrls.set(id, b.toDataURL());
  }
  return styleUrls.get(id);
}
