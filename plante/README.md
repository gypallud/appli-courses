# Chlorophylle — Mes plantes

Appli web pour suivre ses plantes d'intérieur. React + Vite, aucune base de données : tout est enregistré dans le navigateur (localStorage).

**Appli :** https://gypallud.github.io/appli-courses/plantes/

## Fonctions

- **Mes plantes** : état d'arrosage de chaque plante, bouton « Arrosé aujourd'hui », fiche détaillée (fréquences été / hiver, lumière, terreau, engrais, rempotage).
- **Identifier par photo (gratuit)** : on prend la plante en photo ; elle passe par l'Apps Script du Sheets (`upload`, type `plante`), et le PC l'identifie avec Claude Code (abonnement Claude) lors du passage « Appli Courses - plantes », toutes les 5 minutes. L'appli interroge l'Apps Script (`plantResults`) et remplit la fiche toute seule. Il faut que le PC soit allumé.
- **Option payante** : avec une clé API Claude dans Réglages, l'identification se fait tout de suite depuis le téléphone (quelques centimes par photo).
- **Calendrier** : saison chaude (mars → août) ou froide (septembre → février), planning des 7 jours, alertes saisonnières.
- **Diagnostic S.O.S** : symptômes et parasites → causes probables et plan d'action.

## Installer sur le téléphone

- **iPhone (Safari)** : ouvrir l'URL, bouton Partager > « Sur l'écran d'accueil ».
- **Android (Chrome)** : ouvrir l'URL, menu ⋮ > « Ajouter à l'écran d'accueil ».

## Développer

```bash
cd plante
npm install
npm run dev
```

## Publier une modification

```bash
cd plante && npm run build
cd .. && git add -A && git commit -m "…" && git push
```

`npm run build` écrit la version publiée dans `../plantes/`, servie par GitHub Pages.
