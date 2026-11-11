export const SYMPTOMS = {
  visual: [
    { id: 'yellow', label: 'Feuilles jaunes', hint: 'Jaunissement diffus ou des feuilles du bas', icon: 'leaf' },
    { id: 'brownTips', label: 'Pointes brunes / sèches', hint: 'Extrémités cassantes, bords grillés', icon: 'flame' },
    { id: 'softStems', label: 'Tiges molles', hint: 'Base ramollie, plante affaissée', icon: 'droop' },
    { id: 'blackSpots', label: 'Taches noires', hint: 'Taches sombres, parfois auréolées de jaune', icon: 'spots' },
  ],
  pests: [
    { id: 'mealybugs', label: 'Cochenilles', hint: 'Amas cotonneux blancs ou petits boucliers bruns, miellat collant', icon: 'bug' },
    { id: 'thrips', label: 'Thrips', hint: 'Reflets argentés, petits points noirs, insectes allongés', icon: 'bug' },
    { id: 'spiderMites', label: 'Araignées rouges', hint: 'Fines toiles, feuilles piquetées et ternes', icon: 'bug' },
  ],
};

export const CONTEXT = {
  soil: {
    label: 'La terre au toucher (2–3 cm)',
    options: [
      { id: 'wet', label: 'Toujours humide' },
      { id: 'normal', label: 'Normale' },
      { id: 'dry', label: 'Très sèche' },
    ],
  },
  exposure: {
    label: 'Exposition actuelle',
    options: [
      { id: 'sun', label: 'Soleil direct' },
      { id: 'bright', label: 'Lumière vive' },
      { id: 'dark', label: 'Pièce sombre' },
    ],
  },
  flags: [
    { id: 'heating', label: "Près d'un radiateur / air sec" },
    { id: 'noFertilizer', label: "Pas d'engrais depuis + de 3 mois" },
  ],
};

/**
 * Base de règles : chaque cause a des poids par signal observé.
 * Signaux = id de symptôme, "soil:wet", "exposure:sun", "heating", etc.
 */
export const CAUSES = [
  {
    id: 'overwatering',
    kind: 'culture',
    title: "Excès d'arrosage",
    tag: 'Sur-arrosage',
    weights: { yellow: 3, softStems: 4, blackSpots: 2, 'soil:wet': 4, 'exposure:dark': 1, 'soil:dry': -5 },
    explanation:
      "Les racines baignent dans un substrat gorgé d'eau et manquent d'oxygène. Elles commencent à pourrir et ne peuvent plus alimenter la plante : les feuilles jaunissent et les tiges ramollissent, paradoxalement comme si la plante avait soif.",
    steps: [
      'Stoppez immédiatement les arrosages et videz la soucoupe ou le cache-pot.',
      'Dépotez la plante et inspectez les racines : saines = blanches et fermes, pourries = brunes et molles.',
      'Coupez les racines abîmées avec un outil désinfecté (alcool à 70°).',
      "Rempotez dans un substrat neuf et drainant, dans un pot percé avec billes d'argile au fond.",
      'Attendez que les 3 premiers centimètres de terre soient secs avant le prochain arrosage.',
    ],
    prevention: "Testez toujours la terre au doigt avant d'arroser et espacez les arrosages en hiver.",
    adjustWatering: 1.3,
  },
  {
    id: 'underwatering',
    kind: 'culture',
    title: "Manque d'eau",
    tag: 'Sous-arrosage',
    weights: { yellow: 2, brownTips: 2, 'soil:dry': 5, 'soil:wet': -5 },
    explanation:
      "La motte est trop sèche : la plante sacrifie ses feuilles les plus anciennes pour économiser l'eau. Les bords sèchent et brunissent, le feuillage perd sa fermeté.",
    steps: [
      "Plongez le pot dans une bassine d'eau tiède 20 à 30 minutes pour réhydrater la motte.",
      'Laissez bien égoutter, puis replacez la plante.',
      'Retirez les feuilles entièrement sèches ; coupez les pointes brunes en suivant la forme de la feuille.',
      "Raccourcissez légèrement l'intervalle d'arrosage dans la fiche de la plante.",
    ],
    prevention: "Si la terre se rétracte et se décolle du pot, l'eau ruisselle sans être absorbée : préférez le bassinage.",
    adjustWatering: 0.8,
  },
  {
    id: 'lowHumidity',
    kind: 'culture',
    title: 'Air trop sec',
    tag: "Manque d'humidité",
    weights: { brownTips: 4, heating: 4, spiderMites: 1, 'soil:wet': -1 },
    explanation:
      "L'hygrométrie ambiante est insuffisante (souvent sous 40 % avec le chauffage). La plante perd plus d'eau par ses feuilles qu'elle ne peut en puiser : les pointes et les bords se dessèchent en premier.",
    steps: [
      "Éloignez la plante des radiateurs et des courants d'air chaud.",
      "Posez le pot sur une soucoupe de billes d'argile maintenues humides (sans contact avec le fond du pot).",
      'Groupez vos plantes tropicales pour créer un microclimat plus humide.',
      "Brumisez le feuillage à l'eau non calcaire le matin, ou utilisez un humidificateur.",
      'Coupez les pointes sèches avec des ciseaux propres, sans entailler le vert.',
    ],
    prevention: 'Un hygromètre à quelques euros permet de viser 50–60 % pour la plupart des tropicales.',
  },
  {
    id: 'sunburn',
    kind: 'culture',
    title: 'Brûlure du soleil',
    tag: 'Coup de soleil',
    weights: { brownTips: 2, blackSpots: 1, yellow: 1, 'exposure:sun': 5, 'exposure:dark': -5 },
    explanation:
      'Le soleil direct, amplifié par la vitre, a brûlé les tissus. Les zones exposées blanchissent, jaunissent puis brunissent en taches sèches. Ces marques ne disparaîtront pas, mais la plante récupère bien.',
    steps: [
      'Reculez la plante de 1 à 2 m de la fenêtre ou filtrez la lumière avec un voilage.',
      'Ne coupez pas tout de suite les feuilles partiellement brûlées : elles nourrissent encore la plante.',
      'Retirez seulement celles qui sont sèches à plus de 50 %.',
      "Réacclimatez progressivement au soleil sur 2 à 3 semaines si l'espèce l'apprécie.",
    ],
    prevention: 'Après un changement de place ou au retour des beaux jours, habituez la plante progressivement.',
  },
  {
    id: 'fungal',
    kind: 'culture',
    title: 'Maladie fongique ou bactérienne',
    tag: 'Champignons',
    weights: { blackSpots: 4, softStems: 2, 'soil:wet': 2, heating: -1 },
    explanation:
      "L'humidité stagnante sur les feuilles ou dans le substrat favorise champignons et bactéries. Ils forment des taches noires ou brunes, souvent entourées d'un halo jaune, qui s'étendent rapidement.",
    steps: [
      'Isolez la plante pour éviter la contagion.',
      'Supprimez toutes les feuilles tachées avec des ciseaux désinfectés entre chaque coupe.',
      'Arrosez uniquement au pied, jamais sur le feuillage, et de préférence le matin.',
      "Améliorez la circulation d'air autour de la plante.",
      'En cas de progression, pulvérisez un fongicide doux (bicarbonate de soude 5 g/L + quelques gouttes de savon noir).',
    ],
    prevention: 'Évitez de mouiller le cœur des rosettes et laissez sécher la surface du substrat entre deux arrosages.',
  },
  {
    id: 'lowLight',
    kind: 'culture',
    title: 'Manque de lumière',
    tag: 'Étiolement',
    weights: { yellow: 1, softStems: 1, 'exposure:dark': 4, 'exposure:sun': -4 },
    explanation:
      "Faute de lumière, la plante produit des tiges longues et fragiles, des feuilles plus petites et pâles, et perd ses feuilles basses. Elle consomme aussi moins d'eau, ce qui augmente le risque de pourriture.",
    steps: [
      "Rapprochez la plante d'une fenêtre lumineuse (est ou ouest idéalement).",
      "Tournez le pot d'un quart de tour chaque semaine pour une croissance équilibrée.",
      'En hiver, envisagez une lampe horticole LED 10 à 12 h par jour.',
      'Réduisez les arrosages tant que la luminosité reste faible.',
    ],
    prevention: 'Vérifiez le besoin en lumière de chaque espèce dans sa fiche avant de choisir son emplacement.',
  },
  {
    id: 'nutrient',
    kind: 'culture',
    title: 'Carence nutritive',
    tag: "Manque d'engrais",
    weights: { yellow: 3, noFertilizer: 4 },
    explanation:
      'Le substrat est épuisé, notamment en azote. Les feuilles les plus anciennes jaunissent uniformément tandis que la croissance ralentit.',
    steps: [
      'En saison chaude, reprenez un engrais plantes vertes dilué de moitié.',
      "Arrosez toujours avant d'apporter l'engrais pour ne pas brûler les racines.",
      "En saison froide, patientez jusqu'au printemps ou faites un surfaçage (remplacer les 3 cm de terre en surface).",
      "Si la plante n'a pas été rempotée depuis plus de 2 ans, prévoyez un rempotage au printemps.",
    ],
    prevention: "Suivez le calendrier d'engrais de l'application de mars à août.",
  },
  {
    id: 'mealybugs',
    kind: 'pest',
    title: 'Infestation de cochenilles',
    tag: 'Parasite',
    weights: { mealybugs: 10, yellow: 1 },
    explanation:
      "Les cochenilles piquent la plante pour se nourrir de sa sève. Elles l'affaiblissent, provoquent un jaunissement et sécrètent un miellat collant qui attire la fumagine (dépôt noir).",
    steps: [
      'Isolez immédiatement la plante des autres.',
      "Retirez les cochenilles une à une avec un coton-tige imbibé d'alcool à 70°.",
      "Douchez le feuillage (dessus et dessous) à l'eau tiède.",
      "Pulvérisez un mélange savon noir (1 c. à soupe par litre) + quelques gouttes d'huile de neem.",
      'Répétez le traitement tous les 5 à 7 jours pendant 3 à 4 semaines pour casser le cycle des œufs.',
    ],
    prevention: "Inspectez le dessous des feuilles et l'aisselle des tiges à chaque arrosage.",
  },
  {
    id: 'thrips',
    kind: 'pest',
    title: 'Présence de thrips',
    tag: 'Parasite',
    weights: { thrips: 10, blackSpots: 1 },
    explanation:
      "Les thrips râpent l'épiderme des feuilles pour en aspirer le contenu, laissant des zones argentées décolorées ponctuées de petits excréments noirs. Ils se multiplient très vite au chaud.",
    steps: [
      "Isolez la plante et douchez abondamment le feuillage pour éliminer un maximum d'individus.",
      'Installez des pièges englués bleus près de la plante.',
      'Pulvérisez savon noir + huile de neem tous les 4 à 5 jours pendant 3 semaines.',
      'Pour une infestation installée, introduisez des auxiliaires (acariens Amblyseius).',
      'Retirez les feuilles les plus touchées.',
    ],
    prevention: 'Maintenez une humidité correcte : les thrips prolifèrent en air chaud et sec.',
  },
  {
    id: 'spiderMites',
    kind: 'pest',
    title: "Attaque d'araignées rouges",
    tag: 'Parasite',
    weights: { spiderMites: 10, brownTips: 1, heating: 1 },
    explanation:
      'Ces acariens minuscules piquent les cellules des feuilles, qui se couvrent de points jaunâtres puis deviennent ternes et grisâtres. De fines toiles apparaissent sous les feuilles et entre les tiges.',
    steps: [
      'Isolez la plante et douchez-la énergiquement, en insistant sous les feuilles.',
      "Augmentez fortement l'humidité : les araignées rouges détestent l'air humide.",
      'Pulvérisez du savon noir dilué tous les 3 à 4 jours pendant 2 à 3 semaines.',
      'En cas de forte infestation, utilisez des acariens prédateurs (Phytoseiulus persimilis).',
      'Coupez les feuilles très atteintes et nettoyez la zone autour du pot.',
    ],
    prevention: 'Brumisez régulièrement en hiver et surveillez les plantes placées près des radiateurs.',
  },
];

export const SIGNAL_LABELS = {
  yellow: 'feuilles jaunes',
  brownTips: 'pointes brunes',
  softStems: 'tiges molles',
  blackSpots: 'taches noires',
  mealybugs: 'cochenilles',
  thrips: 'thrips',
  spiderMites: 'araignées rouges',
  'soil:wet': 'terre humide',
  'soil:dry': 'terre sèche',
  'exposure:sun': 'soleil direct',
  'exposure:dark': 'pièce sombre',
  heating: 'air sec',
  noFertilizer: "pas d'engrais",
};

/** Moteur de diagnostic : score chaque cause à partir des signaux observés. */
export function runDiagnosis({ symptoms, soil, exposure, flags }) {
  const signals = new Set(symptoms);
  if (soil) signals.add(`soil:${soil}`);
  if (exposure) signals.add(`exposure:${exposure}`);
  flags.forEach((f) => signals.add(f));
  const symptomIds = new Set(symptoms);

  return CAUSES.map((cause) => {
    let score = 0;
    let max = 0;
    const matched = [];
    for (const [signal, weight] of Object.entries(cause.weights)) {
      if (weight > 0) max += weight;
      if (signals.has(signal)) {
        score += weight;
        if (weight > 0) matched.push(signal);
      }
    }
    const hasSymptom = matched.some((s) => symptomIds.has(s));
    const confidence =
      cause.kind === 'pest' ? 95 : Math.round(Math.min(92, Math.max(20, (score / max) * 100)));
    return { ...cause, score, matched, hasSymptom, confidence };
  })
    .filter((r) => r.hasSymptom && r.score >= (r.kind === 'pest' ? 10 : 3))
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'pest' ? -1 : 1;
      return b.confidence - a.confidence || b.score - a.score;
    });
}
