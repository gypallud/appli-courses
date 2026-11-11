# Chlorophylle — Mes plantes

Appli web pour suivre ses plantes d'intérieur. React + Vite, aucune base de données : tout est enregistré dans le navigateur (localStorage).

**Appli :** https://gypallud.github.io/appli-courses/plantes/

## Fonctions

- **Mes plantes** : état d'arrosage de chaque plante, bouton « Arrosé aujourd'hui », fiche détaillée (fréquences été / hiver, lumière, terreau, engrais, rempotage).
- **Identifier par photo** : on prend la plante en photo, l'IA Claude reconnaît l'espèce et remplit la fiche. Il faut une clé API Claude personnelle (Réglages), créée sur https://console.anthropic.com/settings/keys. Elle reste dans le navigateur du téléphone ; chaque identification coûte quelques centimes.
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
