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

Au premier lancement, choisir son profil. L'initiale en haut à droite ouvre les réglages : profil, listes des stocks, des catégories et des unités (onglets Emplacements, Catégories, Unités du Sheets).

## Fonctionnement

```
Téléphone ──photo──> Apps Script ──> onglet caché Photos + onglet Tickets (En attente)
                                                        │
PC (tâche planifiée à 12 h et 20 h) <── voit « En attente »
   └─> Claude Code lit la photo ──> Apps Script met à jour Stock / Historique / Courses ──> Tickets = Traité
                                                        │
Téléphone <── l'appli relit le Sheets (toutes les minutes quand elle est ouverte)
```

- **Ticket de caisse** : produits ajoutés au stock, prix dans Historique, produits achetés retirés de la liste de courses.
- **Photo du stock** (on choisit le stock) : inventaire des produits visibles dans ce stock.
- Les photos sont traitées à 12 h et 20 h. Si le PC est éteint à ce moment-là, dès qu'il est rallumé.

### Panier Leclerc Drive (Montpellier Pierres Vives)

1. Courses : cocher les produits à acheter, puis **Préparer le panier Drive** (le bouton apparaît dès qu'un produit est coché).
2. Au prochain passage du PC, il cherche 5 articles Leclerc pour chaque produit coché (sans porc, sauf si le produit de la liste en est).
   Ils arrivent dans l'onglet **Drive** du Sheets.
3. Dans l'appli, **Choisir les articles** : un article et un nombre par produit, ou « Ne pas prendre ».
   L'article choisi est retenu (onglet **Choix Drive**) et proposé d'office la fois suivante (« Habituel »).
   « ≈ prix payé » signale l'article dont le prix est proche du dernier prix de l'onglet Historique.
4. Au passage suivant, le PC met les articles dans le panier Leclerc.
5. Le créneau et le paiement se font toujours à la main, sur Leclerc Drive.

Sur le PC, le serveur [mcp-leclerc-drive](https://github.com/skunkobi/mcp-leclerc-drive), en version figée 0.3.0 (`worker/drive`), pilote une fenêtre Chrome dédiée.
Ce Chrome a son propre profil, dans `~/.mcp-leclerc-drive`.
Le compte Leclerc y est connecté une fois pour toutes, à la main.
Si Leclerc demande de se reconnecter, le panier passe en erreur dans l'appli.

Installation : `cd worker/drive && npm install --ignore-scripts`.

Pour tester la recherche sans rien enregistrer : `node worker/worker.js --essai`.

## Onglets du Sheets

- **Stock** : alerte si la DLC est dans moins de 3 jours. Dates `2026-11-08` ou `08/11/2026`.
- **Courses** : `Statut` = `À acheter` ou `Sélectionné` (case cochée : à prendre aux prochaines courses, panier Drive compris). Les produits d'un ticket de caisse quittent la liste. `Priorité` = `Haute` affiche un point rouge.
- **Recettes** : `Ingrédients` et `Étapes` séparés par `;` (ex. `Blancs de poulet 500 g; Courgettes 2`).
  Colonnes facultatives : `Type`, `Difficulté`, `Coût`, `Préparation (min)`, `Cuisson (min)`, `Image` (URL d'une photo).
  Le profil Henda n'affiche jamais une recette marquée `Sans porc = Non`.
- **Emplacements**, **Tickets**, **Photos** (caché, vidé après analyse) : créés par le script, gérés par l'appli.

## Mise en place (une fois)

### 1. Apps Script
1. Sheets > **Extensions > Apps Script**. Remplacer tout `Code.gs` par [`apps-script/Code.gs`](apps-script/Code.gs).
   Dans ⚙ Paramètres du projet, cocher « Afficher le fichier manifeste "appsscript.json" », puis remplacer `appsscript.json`
   par [`apps-script/appsscript.json`](apps-script/appsscript.json) : il limite l'autorisation à ce seul Sheets
   (sans lui, Google affiche « Cette application est bloquée »). Enregistrer.
2. Choisir la fonction **installer** dans la liste en haut, cliquer **▶ Exécuter**, autoriser l'accès
   (« Google n'a pas validé cette application » : Paramètres avancés > Accéder au projet).
   Le journal affiche la **clé du PC** : la garder.
3. **Déployer > Nouveau déploiement** > ⚙ **Application Web** — Exécuter en tant que **Moi**, accès **Tout le monde**. Copier l'URL `/exec`.
4. Mettre cette URL dans `const SYNC_URL = '';` de `index.html` et publier.

Modifier le script plus tard : **Déployer > Gérer les déploiements > ✎ > Nouvelle version** (l'URL ne change pas).

### 2. PC
1. Copier `worker/config.example.json` en `worker/config.json`, y mettre l'URL `/exec` et la clé du PC.
2. Créer les tâches planifiées (photos à 12 h et 20 h, idées de recettes à 12 h 10 et 20 h 10) : `powershell -ExecutionPolicy Bypass -File worker/install-taches.ps1`.
   Pour changer les heures, modifier ce fichier et le relancer, ainsi que `ANALYSIS_TIMES` dans `index.html`.
   Traiter les photos tout de suite : `node worker/worker.js --once`. Surveillance continue : `worker/start-worker.cmd`.

Le worker utilise Claude Code (`claude -p`) avec le compte Claude connecté sur le PC.

## Publier une modification

```bash
git add -A && git commit -m "…" && git push
```
