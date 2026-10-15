// Horse race timing, shared by the big screen in the room and the close-up scene.
import { HORSES } from './map.js';

export const RUN_TIME = 12000;

function rng(seed) { // mulberry32: same race on every screen
  return () => {
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Track progress of each horse (0 at the gate, 1 on the line) `el` ms after the start.
export function raceProgress(v, el) {
  if (!v?.order) return HORSES.map(() => 0);
  const r = rng(v.seed), finish = [], wob = HORSES.map(() => [r(), r()]);
  v.order.forEach((h, rank) => { finish[h] = 9000 + rank * 380 + r() * 150; });
  return HORSES.map((_, h) => {
    const T = finish[h], base = (el < 600 ? el * el / 1200 : el - 300) / (T - 300);
    if (base >= 1) return Math.min(1.08, 1 + (el - T) / 25000);
    return Math.max(0, base + 0.05 * Math.sin(Math.PI * base) * Math.sin(el * 0.0011 * (1 + wob[h][0]) + wob[h][1] * 6));
  });
}

const starts = new Map();
export function raceElapsed(v, now) {
  if (!v || v.phase === 'betting') return 0;
  if (!starts.has(v.seed)) starts.set(v.seed, v.phase === 'running' ? v.until - RUN_TIME : now - RUN_TIME);
  return Math.max(0, now - starts.get(v.seed));
}
