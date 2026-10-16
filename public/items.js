// Cosmetic catalog, shared by the server (prices, ownership) and the browser (drawing).
// Visual, except on the street at night where rarer clothes attract better clients (games/night.js charm).

export const RARITY = [
  { name: 'COMMUN', color: '#a8a8b8' },
  { name: 'RARE', color: '#4aa8ff' },
  { name: 'EPIQUE', color: '#b060ff' },
  { name: 'LEGENDAIRE', color: '#ffc030' },
  { name: 'MYTHIQUE', color: '#ff4080' }, // level pass only
];

export const SKINS = ['#f8dcc0', '#f4cda4', '#dca274', '#c08050', '#a86a40', '#6a4028'];
export const HAIR_COLORS = ['#141414', '#2a1a10', '#5a3a1a', '#8a5a2a', '#c89040', '#e8d8a8', '#f0f0f0', '#8a2a1a', '#e04050', '#ff7ac0', '#4a7ae0', '#2fb36b'];

// [id, slot, name, price, rarity, style, colors, description]
const RAW = [
  // hauts
  ['top_tee', 'top', 'T-shirt basique', 0, 0, 'tee', 'player', 'Le classique, a ta couleur.'],
  ['top_hoodie', 'top', 'Sweat a capuche', 600, 0, 'hoodie', { a: '#3a3a4c', c: '#2a2a38' }, 'Pour les longues nuits de poker.'],
  ['top_mariniere', 'top', 'Mariniere', 500, 0, 'stripes', { a: '#f4f4f4', c: '#1c3a8a' }, 'Tres chic, tres francais.'],
  ['top_hawai', 'top', 'Chemise hawaienne', 2500, 1, 'hawaii', { a: '#20a8c8', c: '#ffe040' }, 'Vacances permanentes.'],
  ['top_perfecto', 'top', 'Perfecto en cuir', 3500, 1, 'leather', { a: '#1c1c22', c: '#e04050' }, 'Le rebelle du casino.'],
  ['top_robe', 'top', 'Robe de soiree', 4500, 1, 'dress', { a: '#c01848' }, 'Pour faire sensation au bar.'],
  ['top_costume', 'top', 'Costume bleu nuit', 5000, 1, 'suit', { a: '#1c2448', c: '#f0f0f0', x: '#c02030' }, 'Le costume du joueur serieux.'],
  ['top_smoking', 'top', 'Smoking', 15000, 2, 'tux', { a: '#141418', c: '#f8f8f8', x: '#141418' }, 'Classe absolue.'],
  ['top_armure', 'top', 'Armure de chevalier', 22000, 2, 'armor', { a: '#b8bcc8', c: '#d02030' }, 'Imprenable a la table de poker.'],
  ['top_or', 'top', 'Costume en or massif', 80000, 3, 'suit', { a: '#e8b830', c: '#fff4c0', x: '#a01828' }, 'Brille plus fort que le jackpot.'],
  // chapeaux
  ['hat_cap', 'hat', 'Casquette', 400, 0, 'cap', { a: '#d02030', c: '#f4f4f4' }, 'Visiere vers l\'avant, toujours.'],
  ['hat_bonnet', 'hat', 'Bonnet', 350, 0, 'beanie', { a: '#2a6ad0', c: '#f4f4f4' }, 'Avec un pompon, evidemment.'],
  ['hat_fete', 'hat', 'Chapeau de fete', 800, 0, 'party', { a: '#ff4ab0', c: '#ffe040' }, 'Chaque gain est une fete.'],
  ['hat_cowboy', 'hat', 'Chapeau de cowboy', 2200, 1, 'cowboy', { a: '#8a5a2a', c: '#3a2010' }, 'Yeehaw au blackjack.'],
  ['hat_fedora', 'hat', 'Borsalino', 3000, 1, 'fedora', { a: '#3a3a44', c: '#c02030' }, 'Le chapeau du parrain.'],
  ['hat_hdf', 'hat', 'Haut-de-forme', 9000, 2, 'tophat', { a: '#141418', c: '#c02030' }, 'Monsieur le directeur.'],
  ['hat_viking', 'hat', 'Casque viking', 12000, 2, 'viking', { a: '#9aa0ac', c: '#f0e8d0' }, 'Pour piller la banque.'],
  ['hat_cornes', 'hat', 'Cornes de diable', 18000, 2, 'horns', { a: '#e02030' }, 'Un peu de malice.'],
  ['hat_aureole', 'hat', 'Aureole', 60000, 3, 'halo', { a: '#ffe880' }, 'Un ange a la roulette.'],
  ['hat_couronne', 'hat', 'Couronne royale', 120000, 3, 'crown', { a: '#f0c040', c: '#40d0ff', x: '#e02838' }, 'Le roi du casino, c\'est toi.'],
  // coiffures (couleur gratuite dans STYLE)
  ['hair_court', 'hair', 'Court', 0, 0, 'court', null, 'Simple et efficace.'],
  ['hair_rase', 'hair', 'Rase', 0, 0, 'rase', null, 'Zero entretien.'],
  ['hair_carre', 'hair', 'Carre', 0, 0, 'carre', null, 'Net et elegant.'],
  ['hair_long', 'hair', 'Cheveux longs', 600, 0, 'long', null, 'Libres comme le vent.'],
  ['hair_queue', 'hair', 'Queue de cheval', 700, 0, 'queue', null, 'Pratique pour jouer.'],
  ['hair_chignon', 'hair', 'Chignon', 700, 0, 'chignon', null, 'Chic en toute occasion.'],
  ['hair_couettes', 'hair', 'Couettes', 900, 0, 'couettes', null, 'Espiegle.'],
  ['hair_crete', 'hair', 'Crete punk', 2000, 1, 'crete', null, 'No future, all in.'],
  ['hair_banane', 'hair', 'Banane rock', 2500, 1, 'banane', null, 'Le King est vivant.'],
  ['hair_afro', 'hair', 'Afro XXL', 3000, 1, 'afro', null, 'Volume maximum.'],
  // lunettes
  ['gl_rondes', 'glasses', 'Lunettes rondes', 450, 0, 'round', { a: '#c8a040' }, 'Pour lire les cotes.'],
  ['gl_soleil', 'glasses', 'Lunettes de soleil', 500, 0, 'shades', { a: '#101014' }, 'Personne ne lit ton bluff.'],
  ['gl_3d', 'glasses', 'Lunettes 3D', 600, 0, '3d', { a: '#e02838', c: '#2a7af0' }, 'Le casino en relief.'],
  ['gl_aviateur', 'glasses', 'Aviateur', 2800, 1, 'aviator', { a: '#3a2a1a' }, 'Pilote de haut vol.'],
  ['gl_coeur', 'glasses', 'Lunettes coeur', 3200, 1, 'heart', { a: '#ff4ab0' }, 'Amoureux du jeu.'],
  ['gl_monocle', 'glasses', 'Monocle', 14000, 2, 'monocle', {}, 'Tres distingue.'],
  ['gl_visiere', 'glasses', 'Visiere cyber', 20000, 2, 'visor', { a: '#20f0ff' }, 'Le futur du poker.'],
  ['gl_masque', 'glasses', 'Masque de bal', 55000, 3, 'mask', { a: '#6a1a9a', c: '#ff4ab0' }, 'Mysterieux et fabuleux.'],
  // bas
  ['bot_jean', 'bottom', 'Jean', 0, 0, 'pants', { a: '#2a4a8a' }, 'Indemodable.'],
  ['bot_noir', 'bottom', 'Pantalon noir', 300, 0, 'pants', { a: '#18181e' }, 'Va avec tout.'],
  ['bot_short', 'bottom', 'Short de plage', 400, 0, 'shorts', { a: '#f08020' }, 'Toujours en vacances.'],
  ['bot_jupe', 'bottom', 'Jupe plissee', 500, 0, 'skirt', { a: '#c02040' }, 'Elegante et legere.'],
  ['bot_blanc', 'bottom', 'Pantalon blanc', 2000, 1, 'pants', { a: '#eeeef2' }, 'Style yacht club.'],
  ['bot_cuir', 'bottom', 'Pantalon en cuir', 2400, 1, 'pants', { a: '#0c0c10' }, 'Rock\'n\'roll.'],
  ['bot_ecossais', 'bottom', 'Pantalon ecossais', 3000, 1, 'checker', { a: '#c02030', c: '#1a1a20' }, 'Audacieux.'],
  ['bot_or', 'bottom', 'Pantalon dore', 16000, 2, 'pants', { a: '#e8b830' }, 'Assorti au jackpot.'],
  // chaussures
  ['sh_basic', 'shoes', 'Chaussures basiques', 0, 0, 'shoe', { a: '#100c14' }, 'Elles font le job.'],
  ['sh_pluie', 'shoes', 'Bottes de pluie', 350, 0, 'shoe', { a: '#f8d020' }, 'Au cas ou.'],
  ['sh_baskets', 'shoes', 'Baskets blanches', 400, 0, 'shoe', { a: '#f4f4f4' }, 'Toujours propres.'],
  ['sh_rangers', 'shoes', 'Rangers', 1500, 1, 'shoe', { a: '#2a2a1e' }, 'Increvables.'],
  ['sh_cowboy', 'shoes', 'Santiags', 1800, 1, 'shoe', { a: '#7a4a20' }, 'Avec les eperons.'],
  ['sh_vernis', 'shoes', 'Mocassins vernis', 2200, 1, 'shoe', { a: '#901020' }, 'Ils brillent.'],
  ['sh_neon', 'shoes', 'Baskets neon', 4000, 1, 'neon', { a: '#20f0a0' }, 'Elles s\'illuminent.'],
  ['sh_or', 'shoes', 'Chaussures en or', 12000, 2, 'shoe', { a: '#f0c040' }, 'Chaque pas vaut de l\'or.'],
  // accessoires
  ['acc_noeud', 'acc', 'Noeud papillon', 400, 0, 'bowtie', { a: '#d02030' }, 'La touche finale.'],
  ['acc_echarpe', 'acc', 'Echarpe', 500, 0, 'scarf', { a: '#e0a020' }, 'Douce et chaude.'],
  ['acc_cigare', 'acc', 'Cigare cubain', 2500, 1, 'cigar', { a: '#6a3a18', c: '#ff6020' }, 'Pour feter les gros gains.'],
  ['acc_chaine', 'acc', 'Chaine en or', 3500, 1, 'chain', {}, 'Bling bling.'],
  ['acc_cape', 'acc', 'Cape de vampire', 14000, 2, 'cape', { a: '#a01020', c: '#300810' }, 'Sortie de la nuit.'],
  ['acc_cape_royale', 'acc', 'Cape royale', 70000, 3, 'cape', { a: '#6a1a9a', c: '#f8f8f8' }, 'Bordee d\'hermine.'],
  ['acc_ailes_ange', 'acc', 'Ailes d\'ange', 90000, 3, 'wings', { a: '#f8f8ff', c: '#b8c4e0' }, 'Chance divine.'],
  ['acc_ailes_demon', 'acc', 'Ailes de demon', 90000, 3, 'wings', { a: '#3a0c14', c: '#d02030' }, 'Le diable au corps.'],
  // price -1: not for sale, only found in the street trash cans
  ['acc_sacpoubelle', 'acc', 'Cape sac-poubelle', -1, 2, 'cape', { a: '#1c1c22', c: '#34343c' }, 'Le chic de la rue.'],
  ['acc_guitare', 'acc', 'Guitare de rue', -1, 2, 'guitar', { a: '#b06a2a', c: '#1a1008', x: '#3a2010' }, 'Elle en a vu, des trottoirs.'],
  // level pass (public/levels.js TRACK): price -1, never sold, never in the trash
  ['xp_cap', 'hat', 'Casquette neon', -1, 1, 'cap', { a: '#ff40c0', c: '#20f0ff' }, 'Niveau 5 : le debut de l\'aventure.'],
  ['xp_lunettes', 'glasses', 'Lunettes dorees', -1, 1, 'shades', { a: '#e8b830' }, 'Niveau 10 : on te remarque.'],
  ['xp_sweat', 'top', 'Sweat Grand Pixel', -1, 1, 'hoodie', { a: '#5a1a8a', c: '#e8b830' }, 'Niveau 15 : aux couleurs du casino.'],
  ['xp_baskets', 'shoes', 'Baskets magenta', -1, 1, 'neon', { a: '#ff40c0' }, 'Niveau 20 : elles s\'illuminent en rose.'],
  ['xp_bonnet', 'hat', 'Bonnet dore', -1, 1, 'beanie', { a: '#e8b830', c: '#fff4c0' }, 'Niveau 25 : chaud et brillant.'],
  ['xp_echarpe', 'acc', 'Echarpe royale', -1, 1, 'scarf', { a: '#7a2aaa' }, 'Niveau 30 : un habitue.'],
  ['xp_noeud', 'acc', 'Noeud papillon dore', -1, 2, 'bowtie', { a: '#e8b830' }, 'Niveau 40 : la classe du croupier.'],
  ['xp_smoking', 'top', 'Smoking blanc', -1, 2, 'tux', { a: '#f4f4f8', c: '#141418', x: '#e8b830' }, 'Niveau 50 : rang Argent.'],
  ['xp_borsalino', 'hat', 'Borsalino d\'or', -1, 2, 'fedora', { a: '#e8b830', c: '#141418' }, 'Niveau 60 : le parrain du casino.'],
  ['xp_santiags', 'shoes', 'Santiags dorees', -1, 2, 'shoe', { a: '#e8b830' }, 'Niveau 75 : chaque pas sonne.'],
  ['xp_couronne', 'hat', 'Couronne de platine', -1, 3, 'crown', { a: '#d8e0f0', c: '#60a8ff', x: '#c070ff' }, 'Niveau 100 : rang Or.'],
  ['xp_armure', 'top', 'Armure doree', -1, 3, 'armor', { a: '#e8b830', c: '#141418' }, 'Niveau 125 : invincible.'],
  ['xp_visiere', 'glasses', 'Visiere doree', -1, 3, 'visor', { a: '#ffc030' }, 'Niveau 150 : tu vois l\'avenir.'],
  ['xp_cape', 'acc', 'Cape noir et or', -1, 3, 'cape', { a: '#141418', c: '#e8b830' }, 'Niveau 200 : rang Platine.'],
  ['xp_ailes', 'acc', 'Ailes dorees', -1, 4, 'wings', { a: '#ffe060', c: '#e8a020' }, 'Niveau 250 : tu t\'envoles.'],
  ['xp_aura', 'fx', 'Aura doree', -1, 4, 'goldaura', null, 'Niveau 300 : tu rayonnes.'],
  ['xp_costume', 'top', 'Costume diamant', -1, 4, 'suit', { a: '#60c8ff', c: '#f4fbff', x: '#c070ff' }, 'Niveau 400 : rang Diamant bientot.'],
  ['xp_eclairs', 'fx', 'Eclairs', -1, 4, 'lightning', null, 'Niveau 500 : rang Maitre.'],
  ['xp_ailes_cosmos', 'acc', 'Ailes cosmiques', -1, 4, 'wings', { a: '#2a1050', c: '#c070ff' }, 'Niveau 600 : venues d\'ailleurs.'],
  ['xp_galaxie', 'fx', 'Galaxie', -1, 4, 'galaxy', null, 'Niveau 700 : des planetes autour de toi.'],
  ['xp_jetons', 'fx', 'Pluie de jetons', -1, 4, 'chips', null, 'Niveau 800 : il pleut des jetons.'],
  ['xp_aureole', 'hat', 'Aureole sombre', -1, 4, 'halo', { a: '#a040ff' }, 'Niveau 900 : ange ou demon ?'],
  ['xp_tenue', 'top', 'Tenue de Legende', -1, 4, 'suit', { a: '#ffe060', c: '#ff40c0', x: '#20f0ff' }, 'Niveau 950 : presque au sommet.'],
  ['xp_legende', 'fx', 'Aura de Legende', -1, 4, 'legend', null, 'Niveau 1000 : la legende du Grand Pixel.'],
  // telephone: model, wallpaper, ringtone
  ['ph_basic', 'phone', 'Telephone basique', 0, 0, 'basic', { a: '#2a2a34' }, 'Il fait le job.'],
  ['ph_nokia', 'phone', 'Vieux Nokia', 300, 0, 'nokia', { a: '#5a6a7a' }, 'Increvable. Ecran vert.'],
  ['ph_clapet', 'phone', 'Clapet retro', 1500, 0, 'clapet', { a: '#8a1830' }, 'Clac ! Tres annees 2000.'],
  ['ph_smart', 'phone', 'Smartphone', 6000, 1, 'smart', { a: '#101014' }, 'Ecran bord a bord.'],
  ['ph_or', 'phone', 'Telephone en or', 60000, 3, 'gold', { a: '#e8b830' }, 'Ca brille dans la poche.'],
  ['wp_neon', 'wallpaper', 'Fond neon', 200, 0, 'neon', null, 'Grille retro-futuriste.'],
  ['wp_plage', 'wallpaper', 'Fond plage', 400, 0, 'beach', null, 'Les vacances apres le jackpot.'],
  ['wp_galaxie', 'wallpaper', 'Fond galaxie', 2000, 1, 'galaxy', null, 'Des etoiles plein l\'ecran.'],
  ['rt_retro', 'ringtone', 'Sonnerie retro', 300, 0, 'retro', null, 'La melodie que tout le monde connait.'],
  ['rt_disco', 'ringtone', 'Sonnerie disco', 800, 0, 'disco', null, 'Ca groove quand on t\'appelle.'],
  // effets
  ['fx_coeurs', 'fx', 'Coeurs', 4000, 1, 'hearts', null, 'Tout le monde t\'aime.'],
  ['fx_notes', 'fx', 'Notes de musique', 4500, 1, 'music', null, 'Tu as le rythme.'],
  ['fx_etoiles', 'fx', 'Etoiles en orbite', 5000, 1, 'stars', null, 'Tu es une star.'],
  ['fx_etincelles', 'fx', 'Etincelles dorees', 15000, 2, 'sparkle', null, 'Tu scintilles.'],
  ['fx_aura', 'fx', 'Aura neon', 20000, 2, 'aura', null, 'Une energie arc-en-ciel.'],
  ['fx_flammes', 'fx', 'Pieds en feu', 50000, 3, 'fire', null, 'Tu es en feu ce soir.'],
  ['fx_billets', 'fx', 'Pluie de billets', 100000, 3, 'money', null, 'Il pleut des billets.'],
  ['fx_arcenciel', 'fx', 'Trainee arc-en-ciel', 150000, 3, 'rainbow', null, 'Laisse ta marque partout.'],
];

export const ITEMS = Object.fromEntries(RAW.map(([id, slot, name, price, rarity, style, colors, desc]) => [id, { id, slot, name, price, rarity, style, colors, desc }]));
export const SLOTS = ['hat', 'hair', 'glasses', 'top', 'bottom', 'shoes', 'acc', 'fx', 'phone', 'wallpaper', 'ringtone'];
export const REMOVABLE = ['hat', 'glasses', 'acc', 'fx', 'wallpaper', 'ringtone']; // the others always need something
const isXp = r => r[0].startsWith('xp_'); // level pass items have their own shop tab
export const BY_SLOT = Object.fromEntries(SLOTS.map(s => [s, RAW.filter(r => r[1] === s && !isXp(r)).map(r => ITEMS[r[0]])]));
export const XP_ITEMS = RAW.filter(isXp).map(r => ITEMS[r[0]]);

function hash(s) { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; }

export function defaultOutfit(name) {
  const h = hash(name);
  return { hat: null, hair: 'hair_court', glasses: null, top: 'top_tee', bottom: 'bot_jean', shoes: 'sh_basic', acc: null, fx: null, phone: 'ph_basic', wallpaper: null, ringtone: null, skin: h % SKINS.length, hairColor: (h >> 4) % 6 };
}

// Staff and shop mannequins.
export const NPC_OUTFITS = {
  hostess: { hair: 'hair_long', hairColor: 0, skin: 2, top: 'top_smoking', bottom: 'bot_jupe', shoes: 'sh_vernis', acc: 'acc_chaine' },
  bouncer: { hair: 'hair_rase', hairColor: 0, skin: 4, top: 'top_smoking', bottom: 'bot_noir', shoes: 'sh_rangers', glasses: 'gl_soleil' },
  dealer: { hair: 'hair_court', hairColor: 0, skin: 1, top: 'top_smoking', bottom: 'bot_noir', shoes: 'sh_vernis', acc: 'acc_noeud' },
  barman: { hair: 'hair_banane', hairColor: 2, skin: 3, top: 'top_costume', bottom: 'bot_noir', shoes: 'sh_vernis', acc: 'acc_noeud' },
  shark: { hair: 'hair_banane', hairColor: 0, skin: 1, top: 'top_perfecto', bottom: 'bot_noir', shoes: 'sh_vernis', hat: 'hat_fedora', glasses: 'gl_soleil', acc: 'acc_cigare' },
  concierge: { hair: 'hair_court', hairColor: 3, skin: 2, top: 'top_costume', bottom: 'bot_noir', shoes: 'sh_vernis', glasses: 'gl_rondes', acc: 'acc_noeud', hat: 'hat_cap' },
  seller: { hair: 'hair_queue', hairColor: 5, skin: 1, top: 'top_mariniere', bottom: 'bot_jean', shoes: 'sh_baskets', acc: 'acc_echarpe' },
  shop: { hair: 'hair_chignon', hairColor: 9, skin: 0, top: 'top_robe', bottom: 'bot_noir', shoes: 'sh_vernis', glasses: 'gl_rondes', acc: 'acc_chaine' },
};
export const FEATURED = [
  { hair: 'hair_court', hairColor: 0, skin: 0, top: 'top_or', bottom: 'bot_or', shoes: 'sh_or', hat: 'hat_couronne', acc: 'acc_cape_royale', glasses: 'gl_soleil', fx: 'fx_etincelles' },
  { hair: 'hair_long', hairColor: 6, skin: 0, top: 'top_robe', bottom: 'bot_noir', shoes: 'sh_vernis', hat: 'hat_aureole', acc: 'acc_ailes_ange', glasses: 'gl_masque', fx: 'fx_coeurs' },
  { hair: 'hair_crete', hairColor: 8, skin: 0, top: 'top_perfecto', bottom: 'bot_cuir', shoes: 'sh_rangers', hat: 'hat_cornes', acc: 'acc_ailes_demon', glasses: 'gl_visiere', fx: 'fx_flammes' },
];
