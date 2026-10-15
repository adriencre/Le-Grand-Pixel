# Héberger Le Grand Pixel sur TrueNAS SCALE

Le jeu tourne dans un conteneur Docker. Sa base (`casino.db`) est rangée dans un dataset TrueNAS : elle survit aux redémarrages et aux mises à jour, et les snapshots la sauvegardent.

Il faut **TrueNAS SCALE 24.10 (Electric Eel) ou plus récent** (Docker intégré).

## 1. L'image Docker (automatique)

À chaque `git push` sur `main`, GitHub lance les tests, construit l'image et la publie sur
`ghcr.io/adriencre/le-grand-pixel:latest` (onglet **Actions** du dépôt pour suivre, environ 3 minutes).

**Une seule fois, après le premier build** : rendre l'image publique pour que TrueNAS puisse la télécharger sans mot de passe.
GitHub → ton profil → **Packages** → `le-grand-pixel` → **Package settings** → **Change visibility** → **Public**.

## 2. Le dataset pour la base

1. **Datasets** → sélectionne ton pool → **Add Dataset**
2. Nom : `apps/grandpixel` (crée `apps` d'abord s'il n'existe pas), preset **Apps**
3. **Edit Permissions** sur le dataset → User : **apps**, Group : **apps** → coche *Apply User / Apply Group* → **Save**

Le conteneur tourne avec l'utilisateur `apps` (568), il doit pouvoir écrire ici.

**Reprendre les comptes existants (optionnel)** : arrête le jeu sur ton Mac (Ctrl+C, il enregistre tout), puis copie `data/casino.db` dans le dataset (partage SMB).

## 3. Installer l'app

**Apps** → **Discover Apps** → menu **⋮** → **Install via YAML**
- Nom : `grandpixel`
- Colle le contenu de [`deploy/truenas.yaml`](deploy/truenas.yaml) en remplaçant `/mnt/tank/apps/grandpixel` par le chemin de ton dataset (visible dans *Datasets*, ex. `/mnt/MonPool/apps/grandpixel`)
- **Save**

Test depuis chez toi : `http://IP-DU-NAS:4321`

## 4. L'ouvrir à Internet sans ouvrir de port

### Tailscale Funnel (gratuit, adresse fixe, sans nom de domaine)
1. Compte sur **tailscale.com**, puis dans la console Tailscale : **DNS** → activer **MagicDNS** et **HTTPS Certificates** ; **Access controls** → autoriser **Funnel** (la console propose de l'ajouter en un clic)
2. TrueNAS → **Apps** → installe **Tailscale** (clé d'authentification générée dans la console Tailscale → *Settings → Keys*)
3. Apps → tailscale → **Shell**, puis :
   ```
   tailscale funnel --bg 4321
   ```
4. L'adresse s'affiche, du style `https://truenas.ton-reseau.ts.net` : c'est celle à donner aux joueurs (HTTPS et WebSockets compris).

### Ou Cloudflare Tunnel
App **Cloudflared** du catalogue + un tunnel créé sur dash.cloudflare.com (*Zero Trust → Networks → Tunnels*) qui pointe vers `http://IP-DU-NAS:4321`. Il faut un nom de domaine géré par Cloudflare.

N'ouvre pas de port sur ta box vers le NAS.

## 5. Sauvegardes

**Data Protection** → **Periodic Snapshot Tasks** → **Add** : dataset `apps/grandpixel`, tous les jours, garder 2 semaines.
Pour restaurer : arrêter l'app, *Datasets → Snapshots → Rollback*, redémarrer.

## 6. Mettre à jour le jeu

1. `git push` depuis ton Mac, attendre que l'action GitHub soit verte
2. TrueNAS → **Apps** → `grandpixel` → **Update** (ou *Edit* → *Save* pour retélécharger `latest`), sinon **Stop** puis **Start**

La base n'est pas touchée : elle est dans le dataset, pas dans l'image.

## Tester l'image sur ton Mac

```
docker compose up --build
```
puis http://localhost:4321 (utilise le dossier `data/` local).
