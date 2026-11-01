# Appli Courses

Appli web de la maison : stock (frigo, congélateur, placard), liste de courses commune et recettes.
100 % gratuite : une page statique sur GitHub Pages qui lit le Google Sheets « Appli Courses – Base de données ».

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Toute l'appli (HTML, CSS, JS) |
| `manifest.json`, `icon*.png`, `icon.svg` | Installation sur l'écran d'accueil |
| `sw.js` | Ouverture hors ligne (dernières données affichées) |
| `apps-script/Code.gs` | V2 : script qui enregistre les coches dans le Sheets |

## Installer sur le téléphone

- **Android (Chrome)** : ouvrir l'URL, menu ⋮ > « Ajouter à l'écran d'accueil ».
- **iPhone (Safari)** : ouvrir l'URL, bouton Partager > « Sur l'écran d'accueil ».

Au premier lancement, choisir son profil (Henda ou Gérémy). Il est mémorisé sur le téléphone ; on le change en touchant l'initiale en haut à droite.

## Données

L'appli lit les onglets `Stock`, `Courses` et `Recettes` via l'export CSV public du Sheets.
Le Sheets doit être partagé en **« Tous les utilisateurs disposant du lien » – Lecteur**.
Les noms d'onglets et les en-têtes de colonnes doivent rester identiques.

- **Stock** : alerte si la DLC est dans moins de 3 jours. Dates acceptées : `2026-11-08` ou `08/11/2026`.
- **Courses** : `Statut` = `À acheter` ou `Acheté`. `Priorité` = `Haute` affiche un point rouge.
- **Recettes** : `Ingrédients` et `Étapes` séparés par des `;`. `Sans porc` et `Partagée` = `Oui`/`Non`.
  Le profil Henda n'affiche jamais une recette marquée `Sans porc = Non`.

L'appli se rafraîchit à l'ouverture, toutes les minutes, et avec le bouton ⟳.

## V2 : coches synchronisées entre téléphones

Sans cette étape, cocher un produit ne change que le téléphone où l'on coche.

1. Ouvrir le Google Sheets > **Extensions > Apps Script**.
2. Remplacer tout le contenu de `Code.gs` par celui de [`apps-script/Code.gs`](apps-script/Code.gs). Enregistrer.
3. **Déployer > Nouveau déploiement** > type **Application Web**.
   - Exécuter en tant que : **Moi**
   - Qui a accès : **Tout le monde**
4. Autoriser l'accès (écran « Google n'a pas validé cette application » : Paramètres avancés > Accéder au projet).
5. Copier l'URL de l'application Web (elle finit par `/exec`).
6. Dans `index.html`, coller cette URL dans `const SYNC_URL = '';`, puis publier (commit + push).

Pour modifier le script plus tard : **Déployer > Gérer les déploiements > ✎ > Nouvelle version**, l'URL reste la même.

## Mettre en ligne une modification

```bash
git add -A && git commit -m "…" && git push
```

GitHub Pages republie en une minute environ.
