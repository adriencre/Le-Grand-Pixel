// "How to play" guides: Lulu explains each game and activity on a few illustrated pages.
// Opened automatically the first time (remembered in localStorage), then with the "? Regles" button or the H key.
// The numbers come from games/*.js: keep them in sync if a rule changes.
import { HORSES, TIERS } from './map.js';
import { DRINKS } from './drinks.js';
import { text, textW, cardSprite, suitSprite, chipSprite, symbolSprite, horseSprite, drawSlotMachine } from './sprites.js';
import { portrait } from './tour.js';
import { sfx } from './sfx.js';

// ---------- little drawing helpers for the illustrations ----------
const cards = (x, list, cx, cy, gap = 20) => list.forEach((c, i) => x.drawImage(cardSprite(c), Math.round(cx - (list.length * gap - 2) / 2 + i * gap), Math.round(cy)));
function button(x, s, cx, cy, col = '#3a2448') {
  const w = textW(s) + 10, X = Math.round(cx - w / 2);
  x.fillStyle = '#6a4a7a'; x.fillRect(X - 2, cy - 2, w + 4, 15);
  x.fillStyle = col; x.fillRect(X, cy, w, 11);
  text(x, s, cx, cy + 3, '#fff', 1, 'center');
  return w;
}
function buttons(x, list, cx, cy) { // [[label, color]] side by side
  const ws = list.map(([s]) => textW(s) + 16), tot = ws.reduce((a, b) => a + b, 0);
  let X = cx - tot / 2;
  list.forEach(([s, c], i) => { button(x, s, X + ws[i] / 2, cy, c); X += ws[i]; });
}
const CHIPS = [[10, '#eceff6', '#3a6ad0'], [50, '#d03040', '#ffffff'], [100, '#24242c', '#e8e8f0'], [500, '#8a44c8', '#f0e0ff']];
function chips(x, cx, cy, list = CHIPS) {
  list.forEach(([v, c, e], i) => {
    const X = Math.round(cx - list.length * 15 + i * 30 + 6);
    x.drawImage(chipSprite(c, e), X, cy, 18, 20);
    text(x, String(v), X + 9, cy + 23, '#ffe680', 1, 'center');
  });
}
function arrow(x, dir, cx, cy, col = '#ffe060', s = 2) { // 9x9 pixel arrow; dir 0 left, 1 down, 2 up, 3 right
  const cells = [];
  for (let v = -4; v <= 0; v++) for (let u = -1; u <= 1; u++) cells.push([u, v]); // stem
  for (let v = 0; v <= 4; v++) for (let u = v - 4; u <= 4 - v; u++) cells.push([u, v]); // head
  const map = [([u, v]) => [-v, u], ([u, v]) => [u, v], ([u, v]) => [u, -v], ([u, v]) => [v, u]][dir];
  x.fillStyle = col;
  for (const c of cells) { const [a, b] = map(c); x.fillRect(Math.round(cx + a * s), Math.round(cy + b * s), s, s); }
}
function miniCard(x, c, X, Y) { // rank + small suit, for the poker hand table
  const r = c[0] === 'T' ? '10' : c[0], red = 'hd'.includes(c[1]);
  x.fillStyle = '#f4f0e8'; x.fillRect(X, Y, 15, 9);
  text(x, r, X + 1, Y + 2, red ? '#c02030' : '#141414');
  x.drawImage(suitSprite(c[1], false), X + (r.length > 1 ? 9 : 6), Y + 2);
}
const scaled = (x, k, X, Y, fn) => { x.save(); x.translate(X, Y); x.scale(k, k); fn(); x.restore(); };

// ---------- the guides ----------
// page: { title, lines, art(x, cx, top, now) } ; full: true gives the drawing the whole page.
const GUIDES = {
  blackjack: { name: 'BLACKJACK', pages: [
    { title: 'LE BUT', art: (x, cx, t) => { cards(x, ['Ah', 'Kd'], cx - 40, t + 14); text(x, '= 21 !', cx + 20, t + 23, '#ffe060', 2); },
      lines: ['Bats le croupier : approche-toi le plus pres possible de 21, sans depasser.',
        'Tu ne joues pas contre les autres joueurs : chacun affronte le croupier.',
        'Plus de 21, c\'est "saute" : tu perds ta mise tout de suite.'] },
    { title: 'VALEUR DES CARTES', art: (x, cx, t) => {
      cards(x, ['7h'], cx - 120, t + 10); text(x, '= 7', cx - 120, t + 42, '#fff', 1, 'center');
      cards(x, ['Ts', 'Jc', 'Qh', 'Kd'], cx - 20, t + 10); text(x, '= 10', cx - 20, t + 42, '#fff', 1, 'center');
      cards(x, ['As'], cx + 100, t + 10); text(x, '= 1 OU 11', cx + 100, t + 42, '#ffe060', 1, 'center');
    }, lines: ['Cartes 2 a 9 : leur chiffre. Le 10, le Valet, la Dame et le Roi valent 10.',
      'L\'As vaut 11... ou 1 si 11 te faisait depasser 21. C\'est automatique.',
      'Exemple : As + 6 = 17. Tu tires un 9 ? L\'As redevient 1 : 1 + 6 + 9 = 16.'] },
    { title: 'MISER', art: (x, cx, t) => { chips(x, cx - 50, t + 8); buttons(x, [['EFFACER'], ['DISTRIBUER', '#1f8a44']], cx + 90, t + 14); },
      lines: ['Pendant la mise, choisis un jeton dans la barre en bas, puis clique dessus pour miser.',
        'Tu peux empiler plusieurs jetons. "Effacer" reprend ta mise.',
        'Clique "Distribuer" : tu recois 2 cartes, le croupier une visible et une cachee.',
        'Chaque table a sa mise minimum et maximum.'] },
    { title: 'A TOI DE JOUER', art: (x, cx, t) => buttons(x, [['CARTE', '#1f8a44'], ['RESTER'], ['DOUBLER']], cx, t + 26),
      lines: ['CARTE : tu tires une carte de plus. Autant de fois que tu veux.',
        'RESTER : tu gardes ta main, c\'est au suivant.',
        'DOUBLER : seulement sur tes 2 premieres cartes. Ta mise double, tu recois',
        'UNE seule carte et ton tour est fini.',
        'Tu as 20 secondes par tour, ne traine pas !'] },
    { title: 'LE CROUPIER ET LES GAINS', art: (x, cx, t) => {
      cards(x, ['9s', '7d'], cx - 80, t + 6); text(x, '16 : IL TIRE', cx - 80, t + 38, '#ff9040', 1, 'center');
      cards(x, ['Th', '7c'], cx + 80, t + 6); text(x, '17 : IL RESTE', cx + 80, t + 38, '#60ff80', 1, 'center');
    }, lines: ['Le croupier tire tant qu\'il a 16 ou moins, et s\'arrete des 17.',
      'Tu gagnes : x2 (ta mise + autant). BLACKJACK (As + 10 d\'entree) : x2,5 !',
      'Egalite : ta mise est rendue. Le blackjack du croupier bat tout... sauf le tien.',
      'Conseil : tire a 11 ou moins, reste a 17 ou plus,',
      'et double sur 10 ou 11 quand le croupier montre une petite carte.'] },
  ] },

  poker: { name: 'POKER TEXAS HOLD\'EM', pages: [
    { title: 'LE PRINCIPE', art: (x, cx, t) => {
      cards(x, ['Ah', 'Kh'], cx - 130, t + 12); text(x, 'TES 2 CARTES', cx - 130, t + 44, '#ffe060', 1, 'center');
      cards(x, ['Qh', 'Jh', 'Th', '2c', '7d'], cx + 40, t + 12); text(x, 'LES 5 CARTES COMMUNES', cx + 40, t + 44, '#c8b8d8', 1, 'center');
    }, lines: ['Tu recois 2 cartes cachees. 5 cartes communes arrivent au milieu, pour tout le monde.',
      'Ta main = les 5 meilleures cartes parmi tes 2 et les 5 communes.',
      'Ici, tu joues contre les autres joueurs : le meilleur rafle le pot.',
      'Il faut au moins 2 joueurs assis pour lancer une partie.'] },
    { title: 'UNE DONNE', art: (x, cx, t) => {
      const st = [['PREFLOP', 0], ['FLOP', 3], ['TURN', 4], ['RIVER', 5], ['ABATTAGE', 5]];
      st.forEach(([s, n], i) => {
        const X = cx - 160 + i * 80;
        text(x, s, X, t + 6, i === 4 ? '#ffe060' : '#fff', 1, 'center');
        for (let k = 0; k < 5; k++) { x.fillStyle = k < n ? '#f4f0e8' : '#3a2a48'; x.fillRect(X - 15 + k * 6, t + 18, 5, 8); }
        if (i < 4) text(x, '>', X + 40, t + 18, '#8a7a9a', 1, 'center');
      });
      text(x, 'UN TOUR DE MISES A CHAQUE ETAPE', cx, t + 40, '#c8b8d8', 1, 'center');
    }, lines: ['Avant chaque donne, 2 joueurs posent les blindes (petite et grosse) : des mises forcees.',
      'Preflop : sur tes 2 cartes. Flop : 3 cartes communes. Turn : la 4e. River : la 5e.',
      'A l\'abattage, les mains encore en jeu se devoilent et la meilleure gagne.',
      'Si tout le monde se couche, le dernier joueur gagne sans montrer ses cartes !'] },
    { title: 'TES ACTIONS', art: (x, cx, t) => { buttons(x, [['SE COUCHER'], ['PAROLE', '#1f8a44'], ['SUIVRE', '#1f8a44']], cx, t + 10); buttons(x, [['RELANCER'], ['TAPIS']], cx, t + 34); },
      lines: ['SE COUCHER : tu abandonnes la main, et ce que tu as deja mise.',
        'PAROLE : tu passes sans miser (seulement si personne n\'a mise).',
        'SUIVRE : tu egales la mise en cours.',
        'RELANCER : choisis le montant avec le curseur, puis clique. TAPIS : tu mises TOUT !'] },
    { title: 'LES MAINS, DE LA MEILLEURE...', full: true, art: (x, cx, t) => {
      const HANDS = [
        ['QUINTE FLUSH', ['9h', '8h', '7h', '6h', '5h'], '5 qui se suivent, meme couleur'],
        ['CARRE', ['Ks', 'Kh', 'Kd', 'Kc', '3s'], '4 cartes pareilles'],
        ['FULL', ['Qs', 'Qh', 'Qd', '8c', '8h'], 'un brelan + une paire'],
        ['COULEUR', ['Ad', 'Jd', '8d', '5d', '2d'], '5 cartes de la meme couleur'],
        ['QUINTE', ['Ts', '9h', '8d', '7c', '6s'], '5 cartes qui se suivent'],
        ['BRELAN', ['7s', '7h', '7d', 'Kc', '2s'], '3 cartes pareilles'],
        ['DOUBLE PAIRE', ['Js', 'Jh', '4d', '4c', 'As'], 'deux paires'],
        ['PAIRE', ['As', 'Ah', '9d', '6c', '3s'], '2 cartes pareilles'],
        ['HAUTEUR', ['Ks', 'Jh', '8d', '5c', '2s'], 'rien : la plus haute carte'],
      ];
      HANDS.forEach(([n, cs, d], i) => {
        const Y = t + i * 14, X = cx - 178;
        text(x, (i + 1) + '. ' + n, X, Y + 2, i < 3 ? '#ffe060' : '#fff');
        cs.forEach((c, k) => miniCard(x, c, X + 78 + k * 17, Y));
        text(x, d, X + 166, Y + 2, '#c8b8d8');
      });
    }, lines: ['...a la moins bonne. A egalite, la carte la plus haute departage.'] },
    { title: 'CONSEILS DE PRO', art: (x, cx, t) => { cards(x, ['As', 'Ah'], cx - 60, t + 12); cards(x, ['Ad', 'Kd'], cx + 60, t + 12); text(x, 'DE SUPERBES MAINS DE DEPART', cx, t + 46, '#ffe060', 1, 'center'); },
      lines: ['Couche-toi sans regret avec une petite main : la patience paie.',
        'Les paires hautes (As, Rois, Dames) et As-Roi sont tes meilleures mains de depart.',
        'Parler en dernier est un avantage : tu as vu ce qu\'ont fait les autres.',
        'Un bluff marche mieux contre peu de joueurs... et pas a chaque main !'] },
  ] },

  roulette: { name: 'ROULETTE', pages: [
    { title: 'LE PRINCIPE', art: (x, cx, t, now) => {
      const NUMS = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11], RED = [32, 19, 21, 25, 34, 27, 36];
      NUMS.forEach((n, i) => {
        const X = Math.round(cx - NUMS.length * 11 + i * 22);
        x.fillStyle = n === 0 ? '#1f8a44' : RED.includes(n) ? '#c02030' : '#18141c'; x.fillRect(X, t + 14, 20, 16);
        text(x, String(n), X + 10, t + 20, '#fff', 1, 'center');
      });
      const b = Math.floor(now / 300) % NUMS.length;
      x.fillStyle = '#f4f4f4'; x.fillRect(Math.round(cx - NUMS.length * 11 + b * 22 + 8), t + 6, 4, 4);
    }, lines: ['La bille tombe sur l\'une des 37 cases : de 1 a 36, rouges ou noires, et le 0 vert.',
      'Tu paries sur ce qui va sortir, puis la roue tourne. Croise les doigts !'] },
    { title: 'MISER', art: (x, cx, t) => {
      chips(x, cx - 110, t + 8, CHIPS.slice(0, 3));
      for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) {
        const n = 3 * c + 3 - r, X = cx + 10 + c * 20, Y = t + 4 + r * 14;
        x.fillStyle = [1, 3, 5, 9, 12, 14, 16, 18].includes(n) ? '#c02030' : '#18141c'; x.fillRect(X, Y, 19, 13);
        text(x, String(n), X + 10, Y + 4, '#fff', 1, 'center');
      }
      x.drawImage(chipSprite('#d03040', '#ffffff'), cx + 76, t + 18);
    }, lines: ['Choisis la valeur du jeton dans la barre, puis clique sur le tapis la ou tu veux miser.',
      'Clique plusieurs fois pour empiler. Tu peux miser sur plusieurs cases a la fois.',
      '"Effacer" reprend tes mises. Tu as 15 secondes avant "Rien ne va plus".'] },
    { title: 'LES GAINS', art: (x, cx, t) => {
      [['UN NUMERO PLEIN', 'x36'], ['DOUZAINE  /  COLONNE', 'x3'], ['ROUGE  /  NOIR', 'x2'], ['PAIR  /  IMPAIR', 'x2'], ['1-18  /  19-36', 'x2']].forEach(([s, m], i) => {
        text(x, s, cx - 120, t + 4 + i * 13, '#fff');
        text(x, m, cx + 120, t + 4 + i * 13, '#ffe060', 1, 'right');
      });
    }, lines: ['Les gains comptent ta mise : 10 jetons sur le 17, le 17 sort = 360 jetons.',
      'Le 0 fait perdre toutes les mises, sauf celles placees sur le 0 lui-meme.'] },
    { title: 'CONSEILS', art: (x, cx, t) => { text(x, '1 CHANCE SUR 2', cx - 80, t + 20, '#60ff80', 1, 'center'); text(x, 'VS', cx, t + 20, '#8a7a9a', 1, 'center'); text(x, '1 CHANCE SUR 37', cx + 80, t + 20, '#ff9040', 1, 'center'); },
      lines: ['Rouge ou noir : presque une chance sur deux, mais un petit gain.',
        'Un numero plein : une chance sur 37, mais 36 fois la mise !',
        'Melange les deux pour faire durer le plaisir.',
        'Le 0 donne toujours un petit avantage a la banque : joue pour t\'amuser.'] },
  ] },

  slots: { name: 'MACHINES A SOUS', pages: [
    { title: 'JOUER', art: (x, cx, t, now) => {
      scaled(x, 2, cx - 100, t - 2, () => drawSlotMachine(x, 0, 0, now / 1000, true, 3));
      chips(x, cx + 40, t + 12, [[10, '#eceff6', '#3a6ad0'], [25, '#2fb36b', '#ffffff'], [50, '#d03040', '#ffffff'], [100, '#24242c', '#e8e8f0']]);
    }, lines: ['Choisis ta mise dans la barre : 10, 25, 50 ou 100 jetons.',
      'Clique "Jouer" ou appuie sur ESPACE : les 3 rouleaux tournent et s\'arretent un par un.',
      'Aligne 3 symboles identiques pour gagner.'] },
    { title: 'TABLE DES GAINS', full: true, art: (x, cx, t) => {
      const PAY = [['cherry', 10], ['lemon', 15], ['bell', 20], ['bar', 40], ['seven', 100], ['diamond', 250]];
      PAY.forEach(([s, m], i) => {
        const X = cx - 150 + (i % 2) * 170, Y = t + 4 + Math.floor(i / 2) * 30;
        for (let k = 0; k < 3; k++) x.drawImage(symbolSprite(s), X + k * 26, Y, 24, 24);
        text(x, 'x' + m, X + 84, Y + 6, i === 5 ? '#60e8ff' : '#ffe060', 2);
      });
      const Y = t + 96;
      for (let k = 0; k < 2; k++) x.drawImage(symbolSprite('cherry'), cx - 70 + k * 26, Y, 24, 24);
      text(x, '2 CERISES = MISE RENDUE', cx - 14, Y + 9, '#c8b8d8');
    }, lines: ['Gain = mise x multiplicateur. Exemple : mise 50, trois cloches = 1000 jetons.'] },
    { title: 'LE JACKPOT PROGRESSIF', art: (x, cx, t, now) => {
      const on = Math.floor(now / 250) % 2;
      text(x, 'JACKPOT', cx, t + 2, on ? '#ff6ad0' : '#ffe060', 2, 'center', '#400020');
      for (let k = 0; k < 3; k++) x.drawImage(symbolSprite('diamond'), cx - 40 + k * 28, t + 22, 24, 24);
    }, lines: ['1% de chaque mise, sur toutes les machines, remplit un pot commun affiche en neon.',
      'Trois diamants avec une mise de 50 ou plus : tu rafles TOUT le pot, en plus du x250 !',
      'Avec 10 ou 25, les trois diamants paient x250... mais pas le jackpot.',
      'Les 7 et les diamants sortent bien plus rarement que les cerises.'] },
  ] },

  race: { name: 'COURSES DE CHEVAUX', pages: [
    { title: 'LES COURSES', art: (x, cx, t, now) => {
      HORSES.slice(0, 3).forEach((h, i) => {
        const X = Math.round(cx - 140 + ((now / 12 + i * 70) % 280));
        x.drawImage(horseSprite(h.coat, h.silk, Math.floor(now / 120 + i) % 2), X, t + 4 + i * 16);
      });
    }, lines: ['6 chevaux, une nouvelle course toutes les 40 secondes environ.',
      'Tu as 20 secondes pour parier, puis la course dure 12 secondes.',
      'Seul le cheval qui gagne paie.'] },
    { title: 'LES COTES', art: (x, cx, t) => {
      [[HORSES[0], 'x1,8', 'FAVORI', '#60ff80'], [HORSES[2], 'x4,5', '', '#fff'], [HORSES[4], 'x9,2', 'OUTSIDER', '#ff9040']].forEach(([h, o, tag, c], i) => {
        const Y = t + 4 + i * 16;
        x.drawImage(horseSprite(h.coat, h.silk, 0), cx - 130, Y);
        text(x, h.name, cx - 90, Y + 4, '#fff');
        text(x, o, cx + 20, Y + 4, '#ffe060');
        text(x, tag, cx + 70, Y + 4, c);
      });
    }, lines: ['Chaque cheval a une cote, affichee avant la course : c\'est ce que tu touches s\'il gagne.',
      'Un favori (petite cote) gagne souvent mais rapporte peu. Un outsider, c\'est l\'inverse.',
      'La forme des chevaux change a chaque course : regarde bien les cotes !',
      'Exemple : 100 jetons sur un cheval a x4,5 qui gagne = 450 jetons.'] },
    { title: 'PARIER', art: (x, cx, t) => chips(x, cx, t + 10),
      lines: ['Choisis un jeton (10, 50, 100 ou 500), puis clique sur un cheval en bas de l\'ecran.',
        'Tu peux parier sur plusieurs chevaux, et cliquer plusieurs fois pour augmenter.',
        '"Effacer" reprend tes paris tant que la course n\'est pas partie.'] },
  ] },

  busk: { name: 'LA MANCHE A LA GUITARE', pages: [
    { title: 'JOUER EN RYTHME', art: (x, cx, t, now) => {
      x.fillStyle = '#ffe060'; x.fillRect(cx - 70, t + 50, 140, 2);
      for (let d = 0; d < 4; d++) {
        const X = cx - 52 + d * 35, y = t + ((now / 20 + d * 23) % 56) - 4;
        arrow(x, d, X, Math.min(y, t + 50), ['#ff6060', '#60c0ff', '#60ff80', '#ffe060'][d]);
      }
    }, lines: ['Des fleches descendent en rythme vers la ligne.',
      'Appuie sur la bonne fleche (ou Q, S, Z, D) au moment ou elle touche la ligne.',
      'E ou Echap pour poser la guitare.'] },
    { title: 'LE HYPE', art: (x, cx, t) => { text(x, 'COMBO x12', cx, t + 6, '#ffe060', 2, 'center'); x.fillStyle = '#3a2a48'; x.fillRect(cx - 80, t + 30, 160, 8); x.fillStyle = '#ff4ab0'; x.fillRect(cx - 80, t + 30, 110, 8); text(x, 'HYPE', cx, t + 42, '#ff8ad8', 1, 'center'); },
      lines: ['Chaque note reussie fait monter ton combo et ton hype.',
        'Plus le hype est haut, plus les passants te lancent des pourboires.',
        'Une note ratee casse le combo. Plus tu enchaines, plus le rythme s\'accelere !'] },
  ] },

  barman: { name: 'JOB : BARMAN', pages: [
    { title: 'SERVIR LES CLIENTS', full: true, art: (x, cx, t) => {
      text(x, 'COMMANDE : MOJITO', cx, t + 2, '#fff', 1, 'center', '#000');
      DRINKS.forEach((d, i) => text(x, `${i + 1}  ${d.name}`, cx - 150 + (i % 2) * 170, t + 18 + Math.floor(i / 2) * 12, i === 4 ? '#ffe060' : '#c8b8d8'));
    }, lines: ['Une commande s\'affiche : appuie sur la touche 1 a 8 de la bonne boisson.',
      'Tu as 5 secondes. Bonne boisson : +20 jetons. Mauvaise ou trop lent : rate.',
      'Plafond : 1000 jetons par heure, tous jobs confondus. Echap pour arreter.'] },
  ] },

  croupier: { name: 'JOB : CROUPIER', pages: [
    { title: 'GUIDER LE CROUPIER', art: (x, cx, t) => {
      [[['9s', '5d'], '14', '< TIRE', '#ff9040'], [['Th', '8c'], '18', 'RESTE (BAS)', '#60ff80'], [['Kd', '6s', '9h'], '25', 'SAUTE >', '#ff6060']].forEach(([cs, s, a, c], i) => {
        const X = cx - 120 + i * 120;
        cards(x, cs, X, t + 2, 14);
        text(x, s + ' : ' + a, X, t + 36, c, 1, 'center');
      });
    }, lines: ['La main du croupier s\'affiche : dis-lui quoi faire, comme au vrai blackjack.',
      'Moins de 17 : il TIRE (fleche gauche). De 17 a 21 : il RESTE (fleche bas).',
      'Plus de 21 : il a SAUTE (fleche droite).',
      '5 secondes par main, +20 jetons si c\'est juste. Echap pour arreter.'] },
  ] },

  videur: { name: 'JOB : VIDEUR', pages: [
    { title: 'FILTRER L\'ENTREE', art: (x, cx, t) => {
      ['ENTREE LIBRE', 'CARTE OR MINIMUM', 'PLATINE MINIMUM'].forEach((s, i) => text(x, s, cx - 150, t + 4 + i * 14, '#ffe680'));
      [null, ...TIERS.slice(1)].forEach((tier, i) => {
        const X = cx + 20 + i * 34;
        x.fillStyle = tier ? tier.color : '#3a2a48'; x.fillRect(X, t + 6, 26, 16);
        if (tier) { x.fillStyle = tier.dark; x.fillRect(X, t + 16, 26, 6); }
        text(x, tier ? tier.name.replace('CARTE ', '').slice(0, 4) : 'AUCUNE', X + 13, t + 28, '#c8b8d8', 1, 'center');
      });
    }, lines: ['La regle du soir s\'affiche : entree libre, carte Or minimum ou Platine minimum.',
      'Regarde la carte du client : si elle est assez haute ET qu\'il est sobre,',
      'fais-le ENTRER (fleche droite). Sinon, REFUSE (fleche gauche).',
      'Un client qui titube ne rentre jamais ! 4 secondes par client, +15 jetons.'] },
  ] },

  menage: { name: 'JOB : MENAGE', pages: [
    { title: 'TOUT FAIRE BRILLER', art: (x, cx, t) => {
      arrow(x, 3, cx - 40, t + 24); text(x, 'UN VERRE TRAINE', cx + 20, t + 20, '#fff', 1, 'center');
    }, lines: ['Un verre ou des confettis trainent quelque part : une fleche t\'indique ou.',
      'Marche jusqu\'a eux et appuie sur E pour nettoyer. +25 jetons par objet, 30 secondes.',
      'Au casino ou dans la rue : le videur dehors embauche aussi. Echap pour arreter.'] },
  ] },

  stocks: { name: 'LA BOURSE', pages: [
    { title: 'ACHETER ET VENDRE', art: (x, cx, t) => {
      const pts = [30, 26, 28, 20, 22, 14, 18, 10, 12, 6];
      x.fillStyle = '#2fb36b';
      pts.forEach((p, i) => i && x.fillRect(cx - 90 + i * 18 - 18, t + Math.min(p, pts[i - 1]) + 4, 19, 2));
      text(x, 'ACHETE BAS', cx - 90, t + 44, '#60ff80'); text(x, 'VENDS HAUT', cx + 90, t + 2, '#ffe060', 1, 'right');
    }, lines: ['Des entreprises fictives dont le cours bouge en permanence.',
      'Achete quand c\'est bas, revends quand c\'est haut : la difference est pour toi.',
      'Touche une action pour voir sa courbe, puis Acheter 1 / 10 / 100 / 1000 / MAX ou Vendre.'] },
    { title: 'LES RISQUES', art: (x, cx, t) => { text(x, 'KRACH -45%', cx - 70, t + 16, '#ff5050', 2, 'center'); text(x, 'BOOM +60%', cx + 80, t + 16, '#60ff80', 2, 'center'); },
      lines: ['1% de frais a chaque achat et a chaque vente.',
        'Attention aux KRACHS (le cours s\'effondre d\'un coup) et aux envolees !',
        'Les cours reviennent doucement vers leur valeur de base avec le temps.',
        'Ton portefeuille montre ce que tu possedes et ta plus-value.'] },
  ] },
};

export const rules = { key: null, page: 0, then: null };

export function showRules(key, then = null) {
  if (!GUIDES[key]) return then?.();
  Object.assign(rules, { key, page: 0, then });
  sfx.pop();
}

// First time only: the guide, then `then`. Afterwards `then` runs straight away.
export function firstTime(key, then = null) {
  let seen = [];
  try { seen = JSON.parse(localStorage.getItem('rules_seen') || '[]'); } catch {}
  if (seen.includes(key)) return then?.();
  try { localStorage.setItem('rules_seen', JSON.stringify([...seen, key])); } catch {}
  showRules(key, then);
}

function close() { const t = rules.then; Object.assign(rules, { key: null, then: null }); t?.(); }
function turn(d) {
  const n = GUIDES[rules.key].pages.length;
  sfx.click();
  if (rules.page + d >= n) return close();
  rules.page = Math.max(0, rules.page + d);
}
export const rulesClick = () => turn(1);
export function rulesKey(code) {
  if (['ArrowRight', 'KeyD', 'Enter', 'Space'].includes(code)) turn(1);
  else if (['ArrowLeft', 'KeyA', 'KeyQ'].includes(code)) turn(-1);
  else if (code === 'Escape' || code === 'KeyH') close();
}

export function drawRules(x, w, h, now) {
  if (!rules.key) return;
  const g = GUIDES[rules.key], pg = g.pages[rules.page], n = g.pages.length;
  const pw = Math.min(w - 12, 384), ph = Math.min(h - 12, 210), X = Math.round((w - pw) / 2), Y = Math.round((h - ph) / 2), cx = Math.round(X + pw / 2);
  x.fillStyle = 'rgba(0,0,0,.7)'; x.fillRect(0, 0, w, h);
  x.fillStyle = '#c8a040'; x.fillRect(X - 2, Y - 2, pw + 4, ph + 4);
  x.fillStyle = '#150a1e'; x.fillRect(X, Y, pw, ph);
  x.fillStyle = '#3a2448'; x.fillRect(X + 6, Y + 6, 30, 30);
  x.drawImage(portrait(now), X + 7, Y + 7, 28, 28);
  text(x, `GUIDE DE LULU : ${g.name}`, X + 44, Y + 9, '#8a7a9a');
  text(x, pg.title, X + 44, Y + 20, '#ffe060', 2, 'left', '#3a2408');
  const lines = pg.lines || [], ly = pg.full ? Y + ph - 26 - lines.length * 10 : Y + 118;
  x.save(); x.beginPath(); x.rect(X + 2, Y + 40, pw - 4, (pg.full ? ly : Y + 114) - Y - 40); x.clip();
  pg.art?.(x, cx, Y + (pg.full ? 44 : 42), now);
  x.restore();
  lines.forEach((l, i) => text(x, l.replace(/"/g, '\''), X + 10, ly + i * 10, '#e8dcf0'));
  for (let i = 0; i < n; i++) { x.fillStyle = i === rules.page ? '#ffe060' : '#4a3a58'; x.fillRect(cx - n * 4 + i * 8, Y + ph - 13, 5, 5); }
  text(x, rules.page ? '< PRECEDENT' : 'ECHAP : FERMER', X + 8, Y + ph - 13, '#8a7a9a');
  if (Math.floor(now / 500) % 2 || rules.page + 1 < n) text(x, rules.page + 1 < n ? 'SUIVANT >' : 'C\'EST PARTI ! >', X + pw - 8, Y + ph - 13, rules.page + 1 < n ? '#8a7a9a' : '#60ff80', 1, 'right');
}
