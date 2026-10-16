// Levels 1-1000, shared by the server (XP, rewards) and the browser (HUD, level pass, shop tags).
// XP comes from everything you do (see XP), won or lost, so playing always moves you forward.
export const MAX = 1000;
export const need = l => 200 + 25 * l; // XP to go from level l to l + 1: ~3k for level 10, ~146k for 100, ~12.7M for 1000

export const XP_CAP = 50; // max XP per round at a table
// XP for the chips at risk in one round: grows with the square root, so big bets give a bit more but never 10x more.
// 10 chips -> 6 XP, 100 -> 20, 625 and above -> 50.
export const stakeXp = amt => Math.min(XP_CAP, Math.round(2 * Math.sqrt(Math.max(0, amt))));
export const PVP_CAP = 5000; // poker and duels, per hour: two friends can't farm XP off each other
export const DAY_BONUS = 3000; // the first 3000 XP of each day count double
export const XP = { job: 10, tip: 10, night: 5, bin: 50, daily: 500, achievement: 2500 }; // per chip earned, or flat

// [first level, name, color]; null color = animated rainbow.
export const RANKS = [[1, 'BRONZE', '#d0905a'], [50, 'ARGENT', '#c8d0dc'], [100, 'OR', '#ffc030'], [200, 'PLATINE', '#80f0ff'],
  [350, 'DIAMANT', '#60a8ff'], [500, 'MAITRE', '#c070ff'], [750, 'GRAND MAITRE', '#ff4060'], [1000, 'LEGENDE', null]];
export const rankOf = l => RANKS.findLast(r => l >= r[0]);
export const rankColor = (l, now) => rankOf(l)[2] || `hsl(${(now / 8) % 360},100%,65%)`;

// Cosmetics you can only get here (level -> item id, all price -1 in items.js).
export const TRACK = {
  5: 'xp_cap', 10: 'xp_lunettes', 15: 'xp_sweat', 20: 'xp_baskets', 25: 'xp_bonnet', 30: 'xp_echarpe', 40: 'xp_noeud',
  50: 'xp_smoking', 60: 'xp_borsalino', 75: 'xp_santiags', 100: 'xp_couronne', 125: 'xp_armure', 150: 'xp_visiere',
  200: 'xp_cape', 250: 'xp_ailes', 300: 'xp_aura', 400: 'xp_costume', 500: 'xp_eclairs', 600: 'xp_ailes_cosmos',
  700: 'xp_galaxie', 800: 'xp_jetons', 900: 'xp_aureole', 950: 'xp_tenue', 1000: 'xp_legende',
};
export const LEVEL_OF = Object.fromEntries(Object.entries(TRACK).map(([l, id]) => [id, +l]));
export const JACKPOTS = { 100: 25000, 250: 50000, 500: 100000, 750: 250000, 1000: 1000000 };
export const CHEST = 4; // every 10 levels the chips are multiplied

// Chips per level: 300 for beginners, slowly going down to 50 by level 70, then ~2% of the level's XP.
// Past level 100 it stays under the roulette edge (2.7%) so betting red and black at once never makes money.
const base = l => (l <= 20 ? 300 : Math.max(50, 300 - 5 * (l - 20), Math.round(need(l - 1) * 0.02 / 10) * 10));
export function rewardsOf(l) {
  const chest = l % 10 === 0, rank = RANKS.find(r => r[0] === l && l > 1);
  return { chips: base(l) * (chest ? CHEST : 1) + (JACKPOTS[l] || 0), chest, item: TRACK[l] || null, rank: rank ? rank[1] : null };
}

export function levelOf(xp) {
  let level = 1, into = Math.max(0, xp | 0);
  while (level < MAX && into >= need(level)) into -= need(level++);
  return level === MAX ? { level, into: 0, next: 0, max: true } : { level, into, next: need(level) };
}
