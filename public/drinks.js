// Bar menu, shared by the server (prices, effects) and the browser (menu).
// strength: added to the drunk level (0 sober .. 1 blackout); negative sobers you up.
export const DRINKS = [
  { id: 'eau', name: 'Eau fraiche', price: 0, strength: -0.3, icon: 'water', desc: 'Pour retrouver tes esprits.' },
  { id: 'cafe', name: 'Cafe serre', price: 30, strength: -0.5, icon: 'coffee', desc: 'Reveil express.' },
  { id: 'biere', name: 'Biere pression', price: 50, strength: 0.15, icon: 'beer', desc: 'La petite mousse.' },
  { id: 'vin', name: 'Verre de rouge', price: 80, strength: 0.2, icon: 'wine', desc: 'Un grand cru... ou presque.' },
  { id: 'mojito', name: 'Mojito', price: 150, strength: 0.25, icon: 'mojito', desc: 'Menthe fraiche et rhum.' },
  { id: 'tequila', name: 'Shot de tequila', price: 120, strength: 0.4, icon: 'shot', desc: 'Sel, citron, cul sec !' },
  { id: 'whisky', name: 'Whisky 18 ans', price: 400, strength: 0.35, icon: 'whisky', desc: 'Pour les gros joueurs.' },
  { id: 'champagne', name: 'Champagne', price: 1000, strength: 0.3, icon: 'champagne', desc: 'On fete un jackpot ?' },
];

export const SOBER_PER_SEC = 0.004; // fully drunk -> sober in about 4 minutes

export const DRUNK_LEVELS = [[0.05, 'SOBRE', '#60ff80'], [0.3, 'POMPETTE', '#c8ff60'], [0.55, 'EMECHE', '#ffe060'], [0.8, 'BOURRE', '#ff9040'], [Infinity, 'IVRE MORT', '#ff4040']];
export const drunkLevel = d => DRUNK_LEVELS.find(([max]) => d < max);

// Drunk players bet between 100% and up to 300% of what they asked (300% when blackout drunk).
export function drunkAmount(amt, drunk, rnd = Math.random()) {
  return Math.round(amt * (1 + 2 * Math.max(0, Math.min(1, drunk)) * rnd));
}
