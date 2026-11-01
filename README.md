# Appli Courses

Appli web de la maison : stock (frigo, congélateur, placard… paramétrables), liste de courses commune et recettes.
100 % gratuite : une page statique sur GitHub Pages qui lit le Google Sheets « Appli Courses – Base de données ».

**Appli :** https://gypallud.github.io/appli-courses/

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Toute l'appli (HTML, CSS, JS) |
| `manifest.json`, `icon*.png`, `icon.svg`, `sw.js` | Installation sur l'écran d'accueil, ouverture hors ligne |
| `apps-script/Code.gs` | Écritures dans le Sheets : coches, ajouts, stocks, réception des photos |
| `worker/` | Sur le PC : analyse des photos avec Claude Code et mise à jour du Sheets |

## Installer sur le téléphone

- **iPhone (Safari)** : ouvrir l'URL, bouton Partager > « Sur l'écran d'accueil ».
- **Android (Chrome)** : ouvrir l'URL, menu ⋮ > « Ajouter à l'écran d'accueil ».

Au premier lancement, choisir son profil. L'initiale en haut à droite ouvre les réglages (profil, liste des stocks).

## Fonctionnement

```
Téléphone ──photo──> Apps Script ──> Drive « Appli Courses – Photos » + onglet Tickets (En attente)
                                                        │
PC (worker, toutes les 15 s, gratuit) <── voit « En attente »
   └─> Claude Code lit la photo ──> Apps Script met à jour Stock / Historique / Courses ──> Tickets = Traité
                                                        │
Téléphone <── l'appli relit le Sheets (toutes les 15 s pendant une analyse)
```

- **Ticket de caisse** : produits ajoutés au stock, prix dans Historique, produits de la liste cochés « Acheté ».
- **Photo du stock** (on choisit le stock) : inventaire des produits visibles dans ce stock.
- Si le PC est éteint, les photos attendent et sont traitées au prochain démarrage du worker.

## Onglets du Sheets

- **Stock** : alerte si la DLC est dans moins de 3 jours. Dates `2026-11-08` ou `08/11/2026`.
- **Courses** : `Statut` = `À acheter` / `Acheté`. `Priorité` = `Haute` affiche un point rouge.
- **Recettes** : `Ingrédients` et `Étapes` séparés par `;` (ex. `Blancs de poulet 500 g; Courgettes 2`).
  Colonnes facultatives : `Type`, `Difficulté`, `Coût`, `Préparation (min)`, `Cuisson (min)`, `Image` (URL d'une photo).
  Le profil Henda n'affiche jamais une recette marquée `Sans porc = Non`.
- **Emplacements**, **Tickets** : créés par le script, gérés par l'appli.

## Mise en place (une fois)

### 1. Apps Script
1. Sheets > **Extensions > Apps Script**. Remplacer tout `Code.gs` par [`apps-script/Code.gs`](apps-script/Code.gs). Enregistrer.
2. Choisir la fonction **installer** dans la liste en haut, cliquer **▶ Exécuter**, autoriser l'accès
   (« Google n'a pas validé cette application » : Paramètres avancés > Accéder au projet).
   Le journal affiche la **clé du PC** : la garder.
3. **Déployer > Nouveau déploiement** > ⚙ **Application Web** — Exécuter en tant que **Moi**, accès **Tout le monde**. Copier l'URL `/exec`.
4. Mettre cette URL dans `const SYNC_URL = '';` de `index.html` et publier.

Modifier le script plus tard : **Déployer > Gérer les déploiements > ✎ > Nouvelle version** (l'URL ne change pas).

### 2. PC
1. Copier `worker/config.example.json` en `worker/config.json`, y mettre l'URL `/exec` et la clé du PC.
2. Lancer `worker/start-worker.cmd` (double-clic). Pour un lancement automatique, le placer dans le dossier Démarrage de Windows (`Win+R` > `shell:startup`).

Le worker utilise Claude Code (`claude -p`) avec le compte Claude connecté sur le PC.

## Publier une modification

```bash
git add -A && git commit -m "…" && git push
```
