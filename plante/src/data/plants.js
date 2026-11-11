import { today, toISO } from '../utils/dates';

export const AVATAR_STYLES = {
  monstera: 'Feuilles larges',
  broad: 'Feuilles en pagaie',
  palm: 'Palmes',
  spiky: 'Feuilles fines',
  fern: 'Fougère',
  cactus: 'Cactus',
};

export const AVATAR_COLORS = ['#4f7a52', '#3d6b4f', '#6f8f4a', '#2f6a5e', '#7d8f3c', '#557a6b'];


/**
 * Les plantes de la maison, identifiées à partir des photos du 11 novembre 2026.
 * Emplacements et dates d'arrosage à ajuster dans chaque fiche.
 */
export function createStarterPlants() {
  const now = toISO(today());
  const base = { photo: '', lastWatered: now, lastFertilized: '', pendingIdent: '', identInfo: null };
  return [
    {
      ...base,
      id: 'mine-bougainvillier',
      name: 'Bougainvillier',
      variety: 'Bougainvillea glabra',
      location: 'Balcon',
      avatar: 'broad',
      color: '#4f7a52',
      light: 'directe',
      waterSummer: 3,
      waterWinter: 14,
      fertilizerEvery: 14,
      soil: 'Terreau méditerranéen très drainant : universel + 30 % de sable ou de pouzzolane, billes d’argile au fond.',
      repotting: 'Tous les 2 à 3 ans au printemps. Il fleurit mieux un peu à l’étroit dans son pot.',
      humidity: 'Faible à moyenne',
      temperature: 'Hors gel : au-dessus de 5 °C (idéal 15 – 30 °C)',
      notes:
        'Plante d’extérieur : en hiver, la protéger (voile d’hivernage ou abri) dès que les nuits passent sous 5 °C, et arroser très peu. ' +
        'Engrais pour plantes fleuries (riche en potasse) au printemps et en été. Tailler à la fin de l’hiver, avec des gants (épines). ' +
        'Sur les photos : quelques feuilles jaunies et des feuilles sèches dans le pot, normal à l’automne ; les retirer.',
    },
    {
      ...base,
      id: 'mine-monstera',
      name: 'Monstera',
      variety: 'Monstera deliciosa',
      location: 'Salon',
      avatar: 'monstera',
      color: '#3d6b4f',
      light: 'indirecte',
      waterSummer: 7,
      waterWinter: 12,
      fertilizerEvery: 14,
      soil: 'Mélange aroïdées : terreau universel, écorce de pin et perlite (très drainant).',
      repotting: 'Tous les 2 ans au printemps, dans un pot 3 à 5 cm plus large. Un tuteur mousse l’aide à faire de grandes feuilles.',
      humidity: 'Moyenne à élevée (50 – 60 %)',
      temperature: '18 – 27 °C',
      notes: 'Belle feuille bien découpée et saine sur la photo. Essuyer les feuilles une fois par mois. Toxique pour les chats et les chiens.',
    },
    {
      ...base,
      id: 'mine-adansonii',
      name: 'Monstera adansonii',
      variety: 'Monstera adansonii',
      location: 'Salon (suspension)',
      avatar: 'monstera',
      color: '#6f8f4a',
      light: 'indirecte',
      waterSummer: 6,
      waterWinter: 10,
      fertilizerEvery: 21,
      soil: 'Mélange aroïdées léger : terreau, écorce de pin et perlite.',
      repotting: 'Tous les 2 ans au printemps. On peut bouturer les longues tiges dans l’eau.',
      humidity: 'Élevée (60 %)',
      temperature: '18 – 27 °C',
      notes:
        'À surveiller : sur la photo, plusieurs feuilles ont des taches jaunes et brunes et des zones décolorées. ' +
        'Regarder le dessous des feuilles (thrips ou araignées rouges possibles) et lancer le Diagnostic S.O.S. ' +
        'Retirer les feuilles très abîmées, brumiser, et l’éloigner du soleil direct et du chauffage. Toxique pour les animaux.',
    },
    {
      ...base,
      id: 'mine-dracaena',
      name: 'Dragonnier',
      variety: 'Dracaena marginata',
      location: 'Salon',
      avatar: 'spiky',
      color: '#2f6a5e',
      light: 'indirecte',
      waterSummer: 10,
      waterWinter: 20,
      fertilizerEvery: 30,
      soil: 'Terreau universel + 20 % de sable ou de pouzzolane pour le drainage.',
      repotting: 'Tous les 2 à 3 ans au printemps. Croissance lente, peu exigeant.',
      humidity: 'Faible à moyenne',
      temperature: '15 – 25 °C',
      notes:
        'Très beau feuillage sur la photo. Quelques pointes brunes : air un peu sec ou eau calcaire, rien de grave (les couper en biais). ' +
        'Craint l’excès d’eau bien plus que la sécheresse.',
    },
    {
      ...base,
      id: 'mine-ctenanthe',
      name: 'Ctenanthe Grey Star',
      variety: "Ctenanthe setosa 'Grey Star'",
      location: 'Salon',
      avatar: 'broad',
      color: '#557a6b',
      light: 'indirecte',
      waterSummer: 5,
      waterWinter: 8,
      fertilizerEvery: 21,
      soil: 'Terreau léger et riche qui garde un peu d’humidité : universel + perlite + un peu d’écorce.',
      repotting: 'Tous les 2 ans au printemps.',
      humidity: 'Élevée (60 % et +)',
      temperature: '18 – 27 °C',
      notes:
        'À surveiller : bords de feuilles bruns et secs sur la photo, signe d’air trop sec ou d’eau calcaire. ' +
        'Arroser à l’eau de pluie ou filtrée, garder la terre légèrement humide, brumiser ou poser sur des billes d’argile mouillées. ' +
        'Les feuilles qui s’enroulent indiquent la soif. Non toxique.',
    },
    {
      ...base,
      id: 'mine-euphorbe',
      name: 'Euphorbe',
      variety: 'Euphorbia trigona',
      location: 'Salon',
      avatar: 'cactus',
      color: '#3d6b4f',
      light: 'directe',
      waterSummer: 14,
      waterWinter: 30,
      fertilizerEvery: 30,
      soil: 'Terreau pour cactées et plantes grasses, très drainant.',
      repotting: 'Tous les 2 à 3 ans au printemps, dans un pot lourd (elle devient haute et bascule).',
      humidity: 'Faible',
      temperature: '15 – 30 °C (pas en dessous de 10 °C)',
      notes:
        'Ce n’est pas un cactus mais une euphorbe : sa sève blanche est toxique et irritante, porter des gants. ' +
        'Lumière la plus vive possible. Laisser sécher complètement la terre entre deux arrosages.',
    },
    {
      ...base,
      id: 'mine-epiphyllum',
      name: 'Cactus arête de poisson',
      variety: 'Epiphyllum anguliger',
      location: 'Salon (suspension)',
      avatar: 'fern',
      color: '#557a6b',
      light: 'indirecte',
      waterSummer: 7,
      waterWinter: 14,
      fertilizerEvery: 30,
      soil: 'Mélange pour épiphytes : terreau + écorce d’orchidée + perlite.',
      repotting: 'Tous les 2 à 3 ans, après la floraison. Il fleurit mieux un peu serré.',
      humidity: 'Moyenne à élevée',
      temperature: '15 – 25 °C',
      notes:
        'Cactus de forêt tropicale, pas du désert : lumière vive sans soleil direct, terre jamais détrempée. ' +
        'Quelques segments jaunis sur la photo : excès d’eau ou trop de soleil, les couper. ' +
        'Fleurs parfumées à l’automne la nuit ; les segments se bouturent facilement. Non toxique.',
    },
  ];
}

export function emptyPlant() {
  return {
    name: '',
    variety: '',
    location: '',
    avatar: 'monstera',
    color: AVATAR_COLORS[0],
    photo: '',
    light: 'indirecte',
    waterSummer: 7,
    waterWinter: 12,
    fertilizerEvery: 21,
    soil: '',
    repotting: '',
    humidity: '',
    temperature: '',
    lastWatered: toISO(today()),
    lastFertilized: '',
    notes: '',
    // Identification par photo : ID de la demande envoyée au PC (vide si aucune en cours), puis résultat
    pendingIdent: '',
    identInfo: null,
  };
}
