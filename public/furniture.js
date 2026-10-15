// Apartments, shared by the server (prices, validation) and the browser (catalogue, collisions).
// Grid in tiles: rows 0..WALL-1 are the back wall (wall items), then the floor, the last row is the front wall with the door.
import { T } from './map.js';

export const WALL = 3;
export const APT_SIZES = [
  { name: 'STUDIO', w: 12, h: 9, price: 0 },
  { name: 'LOFT', w: 18, h: 11, price: 25000 },
  { name: 'PENTHOUSE', w: 24, h: 14, price: 150000 },
];
export const MAX_ITEMS = 80;

// layer: 'rug' (on the floor, walkable), 'obj' (solid), 'wall' (hung on the back wall). use: what E does next to it.
// cat: showroom department. Rarity comes from the price (see below).
export const CATS = [['chambre', 'CHAMBRE'], ['salon', 'SALON'], ['cuisine', 'CUISINE'], ['jeux', 'JEUX'], ['deco', 'DECO'], ['mural', 'MURAL'], ['tapis', 'TAPIS']];
export const FURNITURE = {
  lit: { name: 'Lit', cat: 'chambre', price: 300, w: 2, h: 2, layer: 'obj', use: 'sleep' },
  lit_superpose: { name: 'Lits superposes', cat: 'chambre', price: 900, w: 2, h: 2, layer: 'obj', use: 'sleep' },
  lit_rond: { name: 'Lit rond king size', cat: 'chambre', price: 8000, w: 3, h: 3, layer: 'obj', use: 'sleep' },
  hamac: { name: 'Hamac', cat: 'chambre', price: 1500, w: 3, h: 1, layer: 'obj', use: 'sleep' },
  baignoire: { name: 'Baignoire', cat: 'chambre', price: 2600, w: 3, h: 1, layer: 'obj' },
  paravent: { name: 'Paravent', cat: 'chambre', price: 450, w: 2, h: 1, layer: 'obj' },
  coffre: { name: 'Coffre au tresor', cat: 'chambre', price: 4000, w: 1, h: 1, layer: 'obj' },
  canape: { name: 'Canape', cat: 'salon', price: 600, w: 3, h: 1, layer: 'obj', use: 'sit' },
  canape_cuir: { name: 'Canape cuir', cat: 'salon', price: 3000, w: 3, h: 1, layer: 'obj', use: 'sit' },
  fauteuil: { name: 'Fauteuil', cat: 'salon', price: 250, w: 1, h: 1, layer: 'obj', use: 'sit' },
  chaise: { name: 'Chaise', cat: 'salon', price: 60, w: 1, h: 1, layer: 'obj', use: 'sit' },
  table: { name: 'Table', cat: 'salon', price: 200, w: 2, h: 1, layer: 'obj' },
  table_basse: { name: 'Table basse', cat: 'salon', price: 150, w: 2, h: 1, layer: 'obj' },
  tv: { name: 'Television', cat: 'salon', price: 900, w: 2, h: 1, layer: 'obj', use: 'tv' },
  cheminee: { name: 'Cheminee', cat: 'salon', price: 5500, w: 2, h: 1, layer: 'obj', use: 'tv' },
  bureau: { name: 'Bureau + PC', cat: 'salon', price: 1600, w: 2, h: 1, layer: 'obj', use: 'tv' },
  biblio: { name: 'Bibliotheque', cat: 'salon', price: 700, w: 2, h: 1, layer: 'obj' },
  piano: { name: 'Piano a queue', cat: 'salon', price: 12000, w: 3, h: 2, layer: 'obj', use: 'music' },
  lampe: { name: 'Lampe', cat: 'salon', price: 120, w: 1, h: 1, layer: 'obj' },
  lampadaire: { name: 'Lampadaire neon', cat: 'salon', price: 1100, w: 1, h: 1, layer: 'obj' },
  frigo: { name: 'Frigo', cat: 'cuisine', price: 500, w: 1, h: 1, layer: 'obj', use: 'fridge' },
  plan_travail: { name: 'Plan de travail', cat: 'cuisine', price: 400, w: 2, h: 1, layer: 'obj' },
  plaques: { name: 'Cuisiniere', cat: 'cuisine', price: 650, w: 1, h: 1, layer: 'obj' },
  evier: { name: 'Evier', cat: 'cuisine', price: 350, w: 1, h: 1, layer: 'obj' },
  bar: { name: 'Comptoir de bar', cat: 'cuisine', price: 1400, w: 2, h: 1, layer: 'obj' },
  tabouret: { name: 'Tabouret', cat: 'cuisine', price: 90, w: 1, h: 1, layer: 'obj', use: 'sit' },
  fontaine: { name: 'Fontaine a eau', cat: 'cuisine', price: 300, w: 1, h: 1, layer: 'obj', use: 'fridge' },
  billard: { name: 'Billard', cat: 'jeux', price: 6000, w: 3, h: 2, layer: 'obj' },
  arcade: { name: 'Borne d\'arcade', cat: 'jeux', price: 1800, w: 1, h: 1, layer: 'obj' },
  machine: { name: 'Machine a sous', cat: 'jeux', price: 5000, w: 1, h: 1, layer: 'obj' },
  jukebox: { name: 'Jukebox', cat: 'jeux', price: 2500, w: 1, h: 1, layer: 'obj', use: 'music' },
  platine: { name: 'Platine vinyle', cat: 'jeux', price: 800, w: 1, h: 1, layer: 'obj', use: 'music' },
  guitare: { name: 'Guitare sur pied', cat: 'jeux', price: 700, w: 1, h: 1, layer: 'obj' },
  plante: { name: 'Plante', cat: 'deco', price: 80, w: 1, h: 1, layer: 'obj' },
  palmier: { name: 'Palmier', cat: 'deco', price: 400, w: 1, h: 1, layer: 'obj' },
  sapin: { name: 'Sapin illumine', cat: 'deco', price: 900, w: 1, h: 1, layer: 'obj' },
  aquarium: { name: 'Aquarium', cat: 'deco', price: 2200, w: 2, h: 1, layer: 'obj' },
  statue: { name: 'Statue doree', cat: 'deco', price: 20000, w: 1, h: 1, layer: 'obj' },
  trophee: { name: 'Trophee geant', cat: 'deco', price: 35000, w: 1, h: 1, layer: 'obj' },
  coffre_fort: { name: 'Coffre-fort', cat: 'deco', price: 7500, w: 1, h: 1, layer: 'obj' },
  etagere: { name: 'Etagere a trophees', cat: 'deco', price: 2000, w: 2, h: 1, layer: 'obj' },
  poster: { name: 'Poster casino', cat: 'mural', price: 100, w: 1, h: 1, layer: 'wall' },
  tableau: { name: 'Tableau', cat: 'mural', price: 1200, w: 2, h: 1, layer: 'wall' },
  fenetre: { name: 'Fenetre', cat: 'mural', price: 500, w: 2, h: 1, layer: 'wall' },
  miroir: { name: 'Miroir dore', cat: 'mural', price: 800, w: 1, h: 2, layer: 'wall' },
  horloge: { name: 'Horloge', cat: 'mural', price: 300, w: 1, h: 1, layer: 'wall' },
  coucou: { name: 'Horloge a coucou', cat: 'mural', price: 1300, w: 1, h: 2, layer: 'wall' },
  ecran: { name: 'Ecran plat mural', cat: 'mural', price: 3500, w: 3, h: 2, layer: 'wall', use: 'tv' },
  neon: { name: 'Neon Grand Pixel', cat: 'mural', price: 2500, w: 3, h: 1, layer: 'wall', noflip: true },
  tapis: { name: 'Tapis rouge', cat: 'tapis', price: 250, w: 3, h: 2, layer: 'rug' },
  tapis_rond: { name: 'Tapis rond', cat: 'tapis', price: 150, w: 2, h: 2, layer: 'rug' },
  peau: { name: 'Peau de bete', cat: 'tapis', price: 1800, w: 3, h: 2, layer: 'rug' },
  tapis_or: { name: 'Tapis royal', cat: 'tapis', price: 3000, w: 4, h: 3, layer: 'rug' },
};
for (const d of Object.values(FURNITURE)) d.rarity = d.price < 500 ? 0 : d.price < 3000 ? 1 : d.price < 10000 ? 2 : 3;
export const WALLS = {
  w_creme: { name: 'Creme', price: 0, a: '#e8dcc0', b: '#d8cca8', kind: 'plain' },
  w_rayures: { name: 'Rayures', price: 300, a: '#5a7ab0', b: '#4a6aa0', kind: 'stripes' },
  w_brique: { name: 'Brique', price: 500, a: '#8a3a28', b: '#5a2418', kind: 'brick' },
  w_bois: { name: 'Lambris', price: 600, a: '#8a5a30', b: '#6a4220', kind: 'planks' },
  w_rose: { name: 'Pois roses', price: 400, a: '#f0b0c8', b: '#ffffff', kind: 'dots' },
  w_or: { name: 'Damas or', price: 2000, a: '#2a1a10', b: '#c8a040', kind: 'dots' },
};
export const FLOORS = {
  f_parquet: { name: 'Parquet', price: 0, a: '#a06a38', b: '#8a5a2c', kind: 'planks' },
  f_carrelage: { name: 'Carrelage', price: 300, a: '#e8e8e8', b: '#c8ccd0', kind: 'tiles' },
  f_moquette: { name: 'Moquette', price: 400, a: '#4a2a6a', b: '#3e2258', kind: 'plain' },
  f_damier: { name: 'Damier', price: 600, a: '#f0f0f0', b: '#202020', kind: 'checker' },
  f_marbre: { name: 'Marbre noir', price: 1500, a: '#1a1820', b: '#2e2a36', kind: 'marble' },
  f_or: { name: 'Dalles d\'or', price: 5000, a: '#c8a040', b: '#a8842c', kind: 'tiles' },
};

// Built-in windows on the back wall (tiles): wall items can't cover them.
export function aptWindows(apt) {
  return [[{ x: 4, w: 4 }], [{ x: 3, w: 4 }, { x: 11, w: 4 }], [{ x: 5, w: 14 }]][apt.size].map(r => ({ ...r, y: 0, h: WALL }));
}
export const aptDims = apt => APT_SIZES[apt.size] || APT_SIZES[0];
export const doorTile = apt => aptDims(apt).w >> 1; // column of the door in the front wall
export const aptDoor = apt => ({ x: doorTile(apt) * T + T / 2, y: (aptDims(apt).h - 1) * T - 2 }); // px, where you stand when you come in

const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

// Can furniture `id` go at tile (x, y)? `skip` is the index of an item being moved (ignored for overlaps).
export function fits(apt, id, x, y, skip = -1) {
  const d = FURNITURE[id], { w, h } = aptDims(apt);
  if (!d || !Number.isInteger(x) || !Number.isInteger(y)) return false;
  const [y0, y1] = d.layer === 'wall' ? [0, WALL] : [WALL, h - 1];
  if (x < 1 || y < y0 || x + d.w > w - 1 || y + d.h > y1) return false;
  const box = { x, y, w: d.w, h: d.h }, door = doorTile(apt);
  if (d.layer === 'obj' && overlap(box, { x: door, y: h - 2, w: 1, h: 1 })) return false; // keep the way in free
  if (d.layer === 'wall' && aptWindows(apt).some(win => overlap(box, win))) return false;
  return !apt.items.some((it, i) => i !== skip && FURNITURE[it.id].layer === d.layer && overlap(box, { x: it.x, y: it.y, w: FURNITURE[it.id].w, h: FURNITURE[it.id].h }));
}

// Collision boxes (px) for the client: walls + solid furniture.
export function aptSolids(apt) {
  const { w, h } = aptDims(apt), W = w * T, H = h * T;
  const out = [[0, 0, W, WALL * T], [0, 0, T, H], [W - T, 0, T, H], [0, H - T, W, T]];
  for (const it of apt.items) { const d = FURNITURE[it.id]; if (d.layer === 'obj') out.push([it.x * T + 1, it.y * T + 2, d.w * T - 2, d.h * T - 2]); }
  return out;
}

// A studio with a bed and a rug for newcomers.
const DEFAULT = { size: 0, items: [{ id: 'lit', x: 1, y: 3 }, { id: 'tapis_rond', x: 5, y: 4 }, { id: 'plante', x: 10, y: 3 }, { id: 'poster', x: 2, y: 1 }] };

// Rebuilds a saved apartment keeping only valid things; furniture that no longer fits goes back to the stock (never lost).
export function cleanApt(a) {
  const src = a && typeof a === 'object' ? a : DEFAULT;
  const styles = Array.isArray(src.styles) ? src.styles.filter(s => WALLS[s] || FLOORS[s]) : [];
  const apt = {
    size: APT_SIZES[src.size] ? src.size : 0, open: src.open !== false, music: src.music === 1 ? 1 : 0, styles,
    wall: WALLS[src.wall] && (WALLS[src.wall].price === 0 || styles.includes(src.wall)) ? src.wall : 'w_creme',
    floor: FLOORS[src.floor] && (FLOORS[src.floor].price === 0 || styles.includes(src.floor)) ? src.floor : 'f_parquet',
    items: [], stock: {},
  };
  for (const [id, n] of Object.entries(src.stock || {})) if (FURNITURE[id] && Number.isInteger(n) && n > 0) apt.stock[id] = Math.min(n, 99);
  for (const it of Array.isArray(src.items) ? src.items : []) {
    if (!FURNITURE[it?.id]) continue;
    if (apt.items.length < MAX_ITEMS && fits(apt, it.id, it.x, it.y)) apt.items.push({ id: it.id, x: it.x, y: it.y, f: !!it.f, on: !!it.on });
    else apt.stock[it.id] = Math.min(99, (apt.stock[it.id] || 0) + 1);
  }
  return apt;
}
