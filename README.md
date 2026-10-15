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
- **Jackpot progressif** : 1 % de chaque mise aux machines remplit un pot commun, affiché en néon ; trois diamants avec une mise de 50+ le raflent
- **Succès** : 12 succès à débloquer, annoncés à tout le casino, consultables dans l'app Succès du téléphone
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

ZQSD / flèches : bouger · E : interagir · Échap : se lever · Entrée : chat · 1-5 : emotes · M : musique · P : téléphone · B : décorer chez soi · L : se déconnecter

## Tests

```
npm test
```
