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
| `menage/`, `maison/` | Appli « Ménage & Maison » (sources React et version publiée, synchronisée via l'onglet Ménage et l'action `menageSync`) : https://gypallud.github.io/appli-courses/maison/ — voir `menage/README.md` |

## Installer sur le téléphone

- **iPhone (Safari)** : ouvrir l'URL, bouton Partager > « Sur l'écran d'accueil ».
- **Android (Chrome)** : ouvrir l'URL, menu ⋮ > « Ajouter à l'écran d'accueil ».

Au premier lancement, choisir son profil. L'initiale en haut à droite ouvre les réglages : profil, listes des stocks, des catégories et des unités (onglets Emplacements, Catégories, Unités du Sheets).

## Fonctionnement

```
Téléphone ──photo──> Apps Script ──> onglet caché Photos + onglet Tickets (En attente)
                                                        │
PC (tâche planifiée à 8 h, 11 h, 14 h, 17 h et 20 h) <── voit « En attente »
   └─> Claude Code lit la photo ──> Apps Script met à jour Stock / Historique / Courses ──> Tickets = Traité
                                                        │
Téléphone <── l'appli relit le Sheets (toutes les minutes quand elle est ouverte)
```

- **Ticket de caisse** : produits ajoutés au stock, prix dans Historique, produits achetés retirés de la liste de courses.
- **Photo du stock** (on choisit le stock) : inventaire des produits visibles dans ce stock.
- Les photos sont traitées à 8 h, 11 h, 14 h, 17 h et 20 h. Si le PC est éteint à ce moment-là, dès qu'il est rallumé.

### Panier Leclerc Drive (Montpellier Pierres Vives)

1. À chaque passage photos (8 h, 11 h, 14 h, 17 h, 20 h), le PC cherche jusqu'à 5 articles Leclerc pour chaque produit de la liste de courses
   (sans porc, sauf si le produit de la liste en est) et les range dans l'onglet **Prix Drive** (`node worker/worker.js --prix` pour le lancer à la main).
2. Dans Courses, chaque produit affiche l'article retenu et son prix : le choix enregistré (onglet **Choix Drive**, « Habituel »),
   sinon l'article au prix proche du dernier payé (Historique), sinon le premier trouvé. Le toucher pour en changer ou « Ne pas le prendre au Drive » (ID `-`).
3. Cocher les produits à acheter, puis **Remplir le panier Drive** : on ajuste les nombres et on envoie (ticket directement `Validé`).
   Sans prix encore connu, le bouton devient **Préparer le panier Drive** (ancien parcours : recherche, puis choix dans l'appli).
4. Au passage suivant, le PC met les articles dans le panier Leclerc (après avoir vérifié la connexion au compte).
5. Le créneau et le paiement se font toujours à la main, sur Leclerc Drive.

Produits habituels (★, onglet **Habituels**) : depuis la fiche d'un produit du stock ou des courses. Quand il n'y en a plus en stock
(supprimé, quantité 0, cuisiné, ticket analysé), il revient dans la liste de courses, non coché, « Ajouté par Habituel ».

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
  Idées de recettes : on choisit le temps (rapide 30 min, normal 1 h, « j'ai le temps »), le type, les goûts à respecter et « seulement avec ce que j'ai ».
  Elles arrivent avec `Statut = Proposée` (badge « Nouvelle ») : « Garder » vide le statut, « Pas pour moi » supprime la recette et l'ajoute aux `Refusées` du profil.
  Fiche recette : « Choisir les courses » (ingrédients à cocher, les manquants le sont d'office), « Cuisiner pas à pas » (une étape en grand, minuteurs détectés dans le texte), « J'ai cuisiné » (met à jour le stock : quantité restante calculée quand les unités se comparent, 0 = retiré ; avis 👍/👎 dans `Avis`, plus `Cuisinée` et `Fois`).
  Menu de la semaine : un dîner par jour (2 à 7) à partir du lendemain, colonne `Menu` = `1|Lundi` ; un nouveau menu remplace l'ancien.
- **Profils** : goûts de chaque profil (Réglages > Mes goûts en cuisine) : cuisines, aime, n'aime pas, allergies, niveau, épicé, équipement. Le PC s'en sert pour les idées.
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

Ou depuis le PC avec [clasp](https://github.com/google/clasp) (`npm i -g @google/clasp`, une fois `clasp login`) ; `apps-script/.clasp.json` relie le dossier au script du Sheets :

```bash
cd apps-script && clasp push --force && clasp update-deployment AKfycbwGgt_IxmGdadlqYG8ru6sr_2eTBPgU4gdSV0XzewvZ5jIUl6CjM0AHgwRHa_9OfuxS --description "..."
```

`clasp push` remplace le code en ligne par celui du dossier ; `update-deployment` publie une nouvelle version sur le déploiement de l'appli, même URL `/exec`.

### 2. PC
1. Copier `worker/config.example.json` en `worker/config.json`, y mettre l'URL `/exec` et la clé du PC.
2. Créer les tâches planifiées (photos et prix Drive à 8 h, 11 h, 14 h, 17 h et 20 h, idées de recettes 10 min après) : `powershell -ExecutionPolicy Bypass -File worker/install-taches.ps1`.
   Pour changer les heures, modifier ce fichier et le relancer, ainsi que `ANALYSIS_TIMES` dans `index.html`.
   Traiter les photos tout de suite : `node worker/worker.js --once`. Surveillance continue : `worker/start-worker.cmd`.

Le worker utilise Claude Code (`claude -p`) avec le compte Claude connecté sur le PC.

## Publier une modification

```bash
git add -A && git commit -m "…" && git push
```
