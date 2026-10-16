# Le Grand Pixel

Un casino en pixel art où l'on se balade, s'assoit aux tables et joue entre potes sur la même map.

- **Jeux** : Blackjack, Poker Texas Hold'em, Roulette, Machines à sous, Courses de chevaux
- **Boutique & vestiaire** : 70 cosmétiques (chapeaux, coiffures, tenues, ailes, effets animés…), essayage, tenues enregistrées
- **Étage VIP** : cartes Or, Platine, Diamant à la réception, ascenseur doré, salle VIP, mezzanine Platine et salon Diamant aux mises énormes
- **La rue** : ruiné, le videur te jette dehors. Fais la manche à la guitare (jeu de rythme), fouille les poubelles, et reviens avec 100 jetons. Le Requin prête 500 jetons à rendre 750 sous 10 min : en retard, la dette grossit, il te suit, te bloque l'entrée et se sert dès que tu as l'argent
- **Le bar** : boissons, ivresse, écran qui tangue et mises aléatoires
- **Téléphone (P)** : banque et virements entre potes, plan de qui est où, appareil photo avec filtres et galerie, bourse d'actions fictives ; modèles, fonds et sonneries en boutique
- **Résidence Les Pixels** : à droite du casino, après la ruelle, un immeuble d'habitation. Dans le hall : concierge, boîtes aux lettres, ascenseur vers les appartements, et le showroom **Meubles et Déco** (53 meubles en 7 rayons + murs et sols, aperçu en grand dans ta propre pièce, de jour comme de nuit)
- **Appartements** : studio offert, Loft puis Penthouse avec baie vitrée sur la ville. Touche B chez soi pour décorer (stock + catalogue avec vignettes, R pour retourner, Suppr pour ranger). Lit, canapé, frigo, TV, cheminée, piano, jukebox… utilisables avec E. Ouvert ou fermé aux visites, même hors ligne
- **Petits boulots** : un revenu stable sans jouer. Au panneau « JOBS » du casino : barman (servir la bonne boisson, touches 1-8), croupier (le croupier tire ou reste ? flèches), videur (laisser entrer selon la carte et l'état, flèches) et ménage (ramasser verres et confettis, E). Dans la rue, le videur embauche aussi les fauchés. 15 à 25 jetons par tâche réussie, 1000 jetons max par heure
- **La Nuit (18+, suggéré, rien d'explicite)** : la nuit, prends ton service au réverbère du bout de la rue et promène-toi. Les passants s'intéressent à toi selon ta tenue, ta réputation et la lumière des réverbères. Aborde-les, négocie (charmer, proposer un prix, contre-offres, humeur et patience), emmène ton client à l'hôtel de la ruelle et joue la scène en rythme (fenêtre animée vue de la rue) : la satisfaction fixe le pourboire et la réputation, et les clients comblés deviennent des habitués. Un flic patrouille avec un champ de vision (long dans la lumière, court dans l'ombre) : 3 s pour lui échapper, sinon amende. Le Marquis propose sa protection contre 25 %. Réputation sauvegardée, 2500 jetons max par heure
- **Niveaux et XP (1 à 1000)** : tout rapporte de l'XP, gagné ou perdu : miser (de 6 XP pour une mise de 10 à 50 XP max par manche, selon la racine de la mise), poker et duels (pareil, plafonnés à 5000 XP/h), boulots et manche (10 par jeton), la Nuit (5 par jeton), poubelles (50), succès (2500), bonus quotidien (500 × série). Les 3000 premiers XP du jour comptent double. Chaque niveau donne des jetons, un coffre tous les 10 niveaux, des jackpots aux niveaux 100, 250, 500, 750 et 1 000 000 au niveau 1000. 8 rangs (Bronze → Légende) colorent le niveau devant le pseudo. 24 cosmétiques exclusifs, dont 5 effets animés et la rareté Mythique, à voir dans le **passe des niveaux** (touche N ou clic sur le niveau) et dans l'onglet étoile du vestiaire
- **Duels pierre-feuille-ciseaux** : touche F près d'un joueur pour le défier avec une mise, 1/2/3 pour jouer
- **Jackpot progressif** : 1 % de chaque mise aux machines remplit un pot commun, affiché en néon ; trois diamants avec une mise de 50+ le raflent
- **Succès** : 24 succès à débloquer, annoncés à tout le casino, consultables dans l'app Succès du téléphone
- **Visite guidée** : à la création du compte, Lulu la groom te fait visiter le casino, l'étage VIP, la rue et la Résidence en marchant avec toi, et t'explique chaque endroit
- **Guides des jeux** : chaque jeu et activité (blackjack, poker, roulette, machines, courses, guitare, jobs, bourse) a son guide illustré par Lulu : règles, mises, gains et conseils. Il s'ouvre la première fois, puis via le bouton « ? Règles » ou la touche H
- **Social** : chat en bulles, emotes (touches 1-5), classement néon des plus riches
- **Ambiance** : sons 8-bit et musique lounge générés en code (touche M)

Tout le pixel art et les sons sont générés par le code, sans aucun fichier d'image ni de son.

## Lancer

```
npm install
npm start
```

Ouvre `http://localhost:4321`. Tes potes sur le même Wi-Fi utilisent l'adresse affichée dans le terminal.

Chaque joueur a un compte (pseudo + mot de passe haché). Tout est sauvegardé dans une base SQLite, `data/casino.db` (SQLite intégré à Node, aucune installation).

## Héberger sur un serveur (Docker / TrueNAS)

Chaque push sur `main` publie l'image `ghcr.io/adriencre/le-grand-pixel:latest`. La base vit dans le volume `/app/data`. Guide pas à pas : [DEPLOY-TRUENAS.md](DEPLOY-TRUENAS.md). Test local : `docker compose up --build`.

## Contrôles

ZQSD / flèches : bouger · E : interagir · Échap : se lever · Entrée : chat · 1-5 : emotes · M : musique · P : téléphone · B : décorer chez soi · H : règles du jeu en cours · L : se déconnecter

## Tests

```
npm test
```
