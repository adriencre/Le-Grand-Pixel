// Life on the street: what you find in trash cans and what passers-by tip a busker.
export const FINDS = ['acc_sacpoubelle', 'acc_guitare']; // cosmetics you can only find in the trash

const NOTHING = [
  'Une peau de banane...', 'Un vieux journal mouille.', 'Une chaussette orpheline.', 'Un rat te regarde de travers.',
  'Une part de pizza froide. Miam ?', 'Un ticket de loto perdant.', 'Un gobelet de cafe vide.', 'Une boite de sardines. Ca sent fort.',
];

// rnd() in [0,1). Returns { text, chips, item }.
export function rollLoot(owned, rnd = Math.random) {
  const r = rnd(), between = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  if (r < 0.01) {
    const item = FINDS.find(id => !owned.includes(id));
    if (item) return { text: 'TROUVAILLE !', chips: 0, item };
    return { text: 'Une liasse cachee sous les dechets !', chips: 150, item: null };
  }
  if (r < 0.03) { const c = between(100, 250); return { text: `Une enveloppe pleine de jetons !! +${c}`, chips: c, item: null }; }
  if (r < 0.10) { const c = between(20, 60); return { text: `Un portefeuille oublie ! +${c}`, chips: c, item: null }; }
  if (r < 0.25) { const c = between(5, 15); return { text: `Une poignee de jetons : +${c}`, chips: c, item: null }; }
  if (r < 0.50) { const c = between(1, 4); return { text: `Quelques pieces collantes : +${c}`, chips: c, item: null }; }
  return { text: NOTHING[Math.floor(rnd() * NOTHING.length)], chips: 0, item: null };
}

// Chips a passer-by drops this second for a busker with this hype (0..1), or 0.
export function npcTip(hype, rnd = Math.random) {
  if (rnd() > 0.03 + hype * 0.4) return 0;
  const r = rnd();
  if (r < 0.05) return 10 + Math.floor(rnd() * 16);
  if (r < 0.30) return 4 + Math.floor(rnd() * 5);
  return 1 + Math.floor(rnd() * 3);
}
