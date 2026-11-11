import { MEMBERS } from './constants';
import { addDays, addFrequency, addMonths, todayISO } from '../lib/dates';
import { uid } from '../lib/misc';

// [nom, pièce, attribué à, fréquence, jours depuis la dernière réalisation]
// Les décalages sont choisis pour avoir un mélange réaliste : en retard, aujourd'hui, cette semaine, plus tard.
const TASKS = [
  ['Changer les draps', 'chambre-hg', 'henda', 'weekly', 5],
  ['Aspirateur & poussière', 'chambre-hg', 'geremy', 'weekly', 9],
  ['Soin meubles en bois', 'chambre-hg', 'geremy', 'quarterly', 80],
  ['Retourner le matelas', 'chambre-hg', 'rotation', 'yearly', 340],

  ['Ranger la chambre', 'chambre-lucas', 'lucas', 'weekly', 6],
  ['Changer les draps', 'chambre-lucas', 'lucas', 'weekly', 3],
  ['Trier jouets & vêtements trop petits', 'chambre-lucas', 'henda', 'quarterly', 95],
  ['Nettoyer les vitres', 'chambre-lucas', 'geremy', 'monthly', 20],

  ['Nettoyer cuvette & lunette', 'toilette', 'rotation', 'weekly', 4],
  ['Laver le sol', 'toilette', 'henda', 'weekly', 7],
  ['Détartrer la cuvette', 'toilette', 'geremy', 'monthly', 33],
  ['Remplacer la brosse WC', 'toilette', 'henda', 'yearly', 300],

  ['Nettoyer douche & baignoire', 'sdb', 'henda', 'weekly', 6],
  ['Détartrer pommeau & robinets', 'sdb', 'geremy', 'monthly', 25],
  ['Laver tapis de bain & serviettes', 'sdb', 'lucas', 'monthly', 29],
  ['Déboucher siphon & bonde', 'sdb', 'geremy', 'quarterly', 70],
  ['Contrôler les joints silicone', 'sdb', 'geremy', 'yearly', 200],

  ['Serpillière', 'cuisine', 'rotation', 'weekly', 8],
  ['Sortir poubelles & tri', 'cuisine', 'lucas', 'weekly', 2],
  ['Détartrage cafetière', 'cuisine', 'henda', 'monthly', 26],
  ['Nettoyer le four', 'cuisine', 'geremy', 'quarterly', 88],
  ['Nettoyer & dégivrer le frigo', 'cuisine', 'henda', 'quarterly', 60],
  ['Nettoyer le filtre de la hotte', 'cuisine', 'geremy', 'quarterly', 100],

  ['Aspirateur', 'salon', 'lucas', 'weekly', 5],
  ['Poussière étagères & TV', 'salon', 'lucas', 'weekly', 6],
  ['Nettoyage filtres VMC/clim', 'salon', 'geremy', 'quarterly', 85],
  ['Soin meubles en bois', 'salon', 'henda', 'quarterly', 40],
  ['Shampooing du canapé', 'salon', 'rotation', 'yearly', 330],

  ['Arroser & entretenir les plantes', 'balcon', 'henda', 'weekly', 3],
  ['Balayer le balcon', 'balcon', 'lucas', 'monthly', 15],
  ['Nettoyer garde-corps & baie vitrée', 'balcon', 'geremy', 'quarterly', 50],
  ["Hiverner plantes & salon de jardin", 'balcon', 'rotation', 'yearly', 360],

  ['Ranger & trier le cellier', 'cellier', 'rotation', 'monthly', 40],
  ['Nettoyer le filtre du lave-linge', 'cellier', 'henda', 'monthly', 18],
  ['Contrôler le stock de produits ménagers', 'cellier', 'lucas', 'monthly', 10],
  ['Vérifier le groupe de sécurité du chauffe-eau', 'cellier', 'geremy', 'yearly', 150],
];

// Combien de réalisations passées générer dans le journal, selon la fréquence
const HISTORY_DEPTH = { weekly: 30, monthly: 11, quarterly: 4, yearly: 2 };

export function createDemoData() {
  const today = todayISO();
  const tasks = [];
  const history = [];

  for (const [name, roomId, assignee, frequency, daysAgo] of TASKS) {
    const id = uid();
    const lastDone = addDays(today, -daysAgo);
    // Dates de réalisation, de la plus ancienne à la plus récente
    const dates = [];
    for (let k = HISTORY_DEPTH[frequency] - 1; k >= 0; k--) dates.push(addFrequency(lastDone, frequency, -k));
    dates.forEach((date, i) => {
      const memberId = assignee === 'rotation' ? MEMBERS[i % MEMBERS.length].id : assignee;
      history.push({ id: uid(), taskId: id, taskName: name, roomId, frequency, memberId, date });
    });
    tasks.push({
      id, name, roomId, assignee, frequency, lastDone,
      startDate: lastDone, doneCount: dates.length, rotationIndex: assignee === 'rotation' ? dates.length : 0,
      notes: '', createdAt: dates[0],
    });
  }

  // Deux tâches ponctuelles
  tasks.push(
    { id: uid(), name: "Revisser l'étagère qui penche", roomId: 'cellier', assignee: 'geremy', frequency: 'once',
      lastDone: null, startDate: addDays(today, 3), doneCount: 0, rotationIndex: 0, notes: 'Vis 4×40 dans la boîte rouge', createdAt: today },
    { id: uid(), name: 'Changer l’ampoule du cagibi', roomId: 'cellier', assignee: 'lucas', frequency: 'once',
      lastDone: null, startDate: today, doneCount: 0, rotationIndex: 0, notes: '', createdAt: today },
  );

  history.sort((a, b) => b.date.localeCompare(a.date));

  const m = (n) => addMonths(today, -n);
  const warranties = [
    { id: uid(), name: 'Lave-linge', brand: 'Bosch Série 6', store: 'Darty', purchaseDate: m(20), durationMonths: 24, notes: 'Facture dans le classeur « Maison »' },
    { id: uid(), name: 'Réfrigérateur', brand: 'Samsung RB34', store: 'Boulanger', purchaseDate: m(30), durationMonths: 24, notes: '' },
    { id: uid(), name: 'Aspirateur balai', brand: 'Dyson V12', store: 'Fnac', purchaseDate: m(6), durationMonths: 24, notes: 'Enregistré sur le site Dyson' },
    { id: uid(), name: 'Cafetière', brand: "De'Longhi Magnifica", store: 'Amazon', purchaseDate: addDays(m(24), 35), durationMonths: 24, notes: '' },
    { id: uid(), name: 'TV du salon', brand: 'LG OLED 55"', store: 'Boulanger', purchaseDate: m(14), durationMonths: 60, notes: 'Extension de garantie 5 ans' },
    { id: uid(), name: 'Climatisation', brand: 'Daikin Perfera', store: 'Installateur', purchaseDate: m(40), durationMonths: 60, notes: 'Entretien annuel obligatoire pour garder la garantie' },
  ];

  const materials = [
    { id: uid(), category: 'peinture', name: 'Murs du salon', reference: 'Tollens — Gris Perle, mat velours', roomId: 'salon', notes: 'Reste ½ pot au cellier' },
    { id: uid(), category: 'peinture', name: 'Murs chambre Lucas', reference: 'Dulux Valentine — Vert Sauge, satin', roomId: 'chambre-lucas', notes: '' },
    { id: uid(), category: 'peinture', name: 'Plafonds', reference: 'Blanc mat spécial plafond', roomId: '', notes: '' },
    { id: uid(), category: 'ampoule', name: 'Plafonnier salon', reference: 'E27 LED 806 lm · 2700 K', roomId: 'salon', notes: '3 ampoules' },
    { id: uid(), category: 'ampoule', name: 'Spots salle de bain', reference: 'GU10 LED 4,9 W · 345 lm · 3000 K', roomId: 'sdb', notes: '' },
    { id: uid(), category: 'quincaillerie', name: 'Étagères du cellier', reference: 'Vis bois 4×40 tête fraisée + chevilles 6 mm', roomId: 'cellier', notes: '' },
    { id: uid(), category: 'plomberie', name: 'Joint baignoire', reference: 'Mastic silicone sanitaire blanc', roomId: 'sdb', notes: '' },
    { id: uid(), category: 'filtre', name: 'Filtre de hotte', reference: 'Filtre charbon actif rond Ø 23 cm', roomId: 'cuisine', notes: 'À changer tous les 6 mois' },
    { id: uid(), category: 'filtre', name: 'Filtres VMC', reference: 'Filtres G4 pour bouches d’extraction', roomId: '', notes: '' },
  ];

  return { version: 1, tasks, history, warranties, materials, profiles: {} };
}

export const emptyData = () => ({ version: 1, tasks: [], history: [], warranties: [], materials: [], profiles: {} });
