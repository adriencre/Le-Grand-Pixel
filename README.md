# Le Grand Pixel

Un casino en pixel art où l'on se balade, s'assoit aux tables et joue entre potes sur la même map.

- **Jeux** : Blackjack, Poker Texas Hold'em, Roulette, Machines à sous, Courses de chevaux
- **Boutique & vestiaire** : 70 cosmétiques (chapeaux, coiffures, tenues, ailes, effets animés…), essayage, tenues enregistrées
- **Étage VIP** : cartes Or, Platine, Diamant à la réception, ascenseur doré, salle VIP, mezzanine Platine et salon Diamant aux mises énormes
- **La rue** : ruiné, le videur te jette dehors. Fais la manche à la guitare (jeu de rythme), fouille les poubelles, et reviens avec 100 jetons
- **Le bar** : boissons, ivresse, écran qui tangue et mises aléatoires
- **Téléphone (P)** : banque et virements entre potes, plan de qui est où, appareil photo avec filtres et galerie, bourse d'actions fictives ; modèles, fonds et sonneries en boutique
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

## Contrôles

ZQSD / flèches : bouger · E : interagir · Échap : se lever · Entrée : chat · 1-5 : emotes · M : musique · P : téléphone · L : se déconnecter

## Tests

```
npm test
```
