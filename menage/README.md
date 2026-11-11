# Ménage & Maison

Suivi du ménage, des tâches ménagères et de l'entretien de la maison pour Gérémy, Henda et Lucas.
React 18 + Vite + Tailwind CSS 4. Les données sont partagées entre les téléphones via le Google Sheets de la maison
(même Apps Script que l'appli courses), avec une copie sur chaque téléphone pour fonctionner hors ligne.

**Appli :** https://gypallud.github.io/appli-courses/maison/

## Installer sur le téléphone

- **iPhone (Safari)** : ouvrir l'URL, bouton Partager > « Sur l'écran d'accueil ».
- **Android (Chrome)** : ouvrir l'URL, menu ⋮ > « Ajouter à l'écran d'accueil » (ou « Installer l'application »).

Elle s'ouvre alors en plein écran, avec son icône, et fonctionne hors ligne.

## Synchronisation

- Onglet **Ménage** du Google Sheets : une ligne par élément (tâche, entrée du journal, garantie, référence, profil),
  avec l'élément en JSON, l'heure de modification et « Supprimé = oui » pour les suppressions. Créé tout seul au premier envoi.
- Chaque modification s'applique tout de suite sur le téléphone, part moins d'une seconde après (action `menageSync`
  de `apps-script/Code.gs`), puis le téléphone récupère tout. Synchro aussi au démarrage, toutes les minutes et au retour sur l'appli.
- Hors ligne, les modifications attendent sur le téléphone (nuage barré + nombre en attente dans l'en-tête) et partent au retour du réseau.
- Pour un même élément, la modification la plus récente gagne. Chaque « Fait ! » est une entrée de journal à part :
  deux personnes qui valident en même temps ne perdent rien.
- Premier téléphone à se connecter (onglet vide) : il envoie ses données. Les suivants abandonnent leurs données locales et prennent celles du tableur.
- Importer, recharger la démo ou tout effacer s'applique à **tous** les téléphones. Le profil choisi (« qui utilise ce téléphone ») et le thème restent propres à chaque appareil.
- `VITE_SYNC_URL` (fichier `.env.development.local`) permet de pointer vers un autre serveur pendant les tests ; vide = sans synchro.

Après une modification de `apps-script/Code.gs`, redéployer l'Apps Script (clasp), sinon l'appli affiche « Synchronisation impossible · action inconnue ».

## Lancer et publier

```bash
cd menage
npm install
npm run dev      # http://localhost:5173
npm run build    # version publiée dans ../maison/
```

`maison/` (à la racine du dépôt) est **généré** : ne pas le modifier à la main. Après une modification du code,
lancer `npm run build`, puis commiter `menage/` et `maison/` ensemble ; GitHub Pages publie `main` tel quel.
Les fichiers d'installation (manifest, icônes, `sw.js`) sont dans `menage/public/`.

## Fonctionnalités

- **Semaine** : tâches en retard et à faire jusqu'à dimanche, par personne, avec progression ; ce qui a été fait cette semaine apparaît barré sous chaque personne.
- **Mois** : calendrier (points colorés = tâches prévues, ✓ = tâches faites), répartition par fréquence, liste « À faire » ou « Fait ce mois-ci », détail en touchant un jour.
- **Année** : répartition des efforts par membre (pourcentage et histogramme mensuel), gros entretiens trimestriels et annuels, journal de bord filtrable par membre.
- **Tâches** : toutes les tâches par pièce, recherche, filtres membre et fréquence ; création, édition, suppression.
- **Registre** : garanties (statut actif / expire bientôt / expiré, calculé depuis la date d'achat et la durée) et références de matériaux DIY (copie de la référence en un geste).
- **Fait !** : met la date de dernière réalisation à aujourd'hui, incrémente le compteur, ajoute une entrée au journal et recalcule l'échéance. Bouton « Annuler » pendant 5 s.
- **Tâches tournantes** : chacun son tour (Gérémy → Henda → Lucas) ; la carte indique à qui c'est le tour.
- **Filtre par pièce** en haut de l'écran, avec le nombre de tâches à faire cette semaine.
- **Profil & réglages** (avatar en haut à droite) : choisir qui utilise le téléphone (ses tâches passent en premier), personnaliser son prénom, son avatar emoji et sa couleur, choisir le thème clair / sombre / auto, et gérer les données (export / import JSON, démo, tout effacer). Le profil choisi et le thème restent propres à chaque appareil ; les personnalisations font partie des données exportées.

## Structure

```
src/
  App.jsx                 navigation, filtre pièce, « Fait ! » + annulation
  state/HouseholdContext  état global (useReducer) + persistance localStorage
  data/constants.js       membres, pièces, fréquences, catégories
  data/demo.js            données de démonstration (dates relatives à aujourd'hui)
  lib/dates.js            dates « AAAA-MM-JJ » locales, semaines du lundi
  lib/tasks.js            échéance, statut, rotation, occurrences futures
  lib/misc.js             identifiants, calcul des garanties
  components/             TaskCard, TaskForm, RegistryForms, DataSection, Modal, RoomFilter, Toast, ui
  views/                  WeekView, MonthView, YearView, TasksView, RegistryView, ProfileView
  index.css               thème : le mode sombre redéfinit les variables de couleur sous html.dark
```

## Règles de calcul

- Prochaine échéance = dernière réalisation + fréquence (7 jours, 1, 3 ou 12 mois). Jamais faite : « première échéance ».
- Ponctuelle : une seule date prévue ; une fois faite, elle passe dans « Ponctuelles terminées ».
- Une tâche en retard est comptée comme due aujourd'hui dans le calendrier du mois ; les occurrences suivantes en découlent.
- Supprimer une tâche garde ses entrées dans le journal.
