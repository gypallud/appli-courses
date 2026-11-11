import { addDays, diffDays, parseISO, today } from './dates';

export const SEASONS = {
  warm: {
    key: 'warm',
    label: 'Saison chaude',
    period: 'Printemps / Été',
    months: 'mars → août',
    rules: [
      'Arrosages rapprochés : la plante pousse activement',
      'Engrais selon la fréquence de chaque plante',
      'Période idéale pour rempoter et bouturer',
    ],
  },
  cold: {
    key: 'cold',
    label: 'Saison froide',
    period: 'Automne / Hiver',
    months: 'septembre → février',
    rules: [
      'Arrosages espacés : laissez sécher le haut du substrat',
      "Arrêt complet de l'engrais (repos végétatif)",
      "Éloignez des radiateurs, surveillez l'humidité",
    ],
  },
};

export const LIGHT = {
  directe: { label: 'Directe', desc: 'Plein soleil quelques heures par jour', icon: 'sun' },
  indirecte: { label: 'Indirecte', desc: 'Lumière vive, sans soleil direct', icon: 'sunDim' },
  ombre: { label: 'Ombre', desc: 'Mi-ombre, loin des fenêtres', icon: 'moon' },
};

/** Saison chaude de mars (2) à août (7). */
export function autoSeason(date = new Date()) {
  const m = date.getMonth();
  return m >= 2 && m <= 7 ? 'warm' : 'cold';
}

/** Date du prochain changement de saison. */
export function nextSeasonChange(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth();
  if (m >= 2 && m <= 7) return new Date(y, 8, 1); // 1er septembre
  return m >= 8 ? new Date(y + 1, 2, 1) : new Date(y, 2, 1); // 1er mars
}

export function waterInterval(plant, season) {
  const v = season === 'warm' ? plant.waterSummer : plant.waterWinter;
  return Math.max(1, Number(v) || 1);
}

export function fertilizerActive(plant, season) {
  return season === 'warm' && Number(plant.fertilizerEvery) > 0;
}

export function nextWatering(plant, season) {
  return addDays(parseISO(plant.lastWatered), waterInterval(plant, season));
}

export function nextFertilizing(plant, season) {
  if (!fertilizerActive(plant, season)) return null;
  if (!plant.lastFertilized) return today();
  return addDays(parseISO(plant.lastFertilized), Number(plant.fertilizerEvery));
}

/** État d'arrosage d'une plante : échéance, retard, réserve. */
export function waterStatus(plant, season) {
  const now = today();
  const interval = waterInterval(plant, season);
  const next = nextWatering(plant, season);
  const daysUntil = diffDays(next, now);
  const sinceLast = diffDays(now, parseISO(plant.lastWatered));
  let state = 'ok';
  if (daysUntil < 0) state = 'overdue';
  else if (daysUntil === 0) state = 'today';
  else if (daysUntil <= 2) state = 'soon';
  const reserve = Math.max(0, Math.min(1, daysUntil / interval));
  return { next, daysUntil, sinceLast, interval, state, reserve, wateredToday: sinceLast === 0 };
}

export const STATE_LABEL = {
  overdue: 'Assoiffée',
  today: 'À arroser',
  soon: 'Bientôt',
  ok: 'Hydratée',
};

/**
 * Tâches d'arrosage et d'engrais sur une période (7 jours par défaut).
 * Les tâches en retard sont ramenées au premier jour.
 */
export function buildSchedule(plants, season, days = 7, start = today()) {
  const end = addDays(start, days - 1);
  const buckets = Array.from({ length: days }, (_, i) => ({ date: addDays(start, i), tasks: [] }));
  const push = (date, task) => {
    const idx = diffDays(date, start);
    if (idx >= 0 && idx < days) buckets[idx].tasks.push(task);
  };

  const schedule = (first, interval, type, plant) => {
    let d = first;
    if (d < start) {
      push(start, { type, plant, overdue: true, late: diffDays(start, d) });
      d = addDays(start, interval);
    }
    while (d <= end) {
      push(d, { type, plant, overdue: false });
      d = addDays(d, interval);
    }
  };

  for (const plant of plants) {
    schedule(nextWatering(plant, season), waterInterval(plant, season), 'water', plant);
    if (fertilizerActive(plant, season)) {
      schedule(nextFertilizing(plant, season), Number(plant.fertilizerEvery), 'fertilize', plant);
    }
  }
  buckets.forEach((b) => b.tasks.sort((a, c) => (a.type === c.type ? 0 : a.type === 'water' ? -1 : 1)));
  return buckets;
}

/** Alertes saisonnières contextuelles. */
export function seasonalAlerts(season, plants, date = new Date()) {
  const alerts = [];
  const m = date.getMonth();
  const daysToChange = diffDays(nextSeasonChange(date), today());

  if (daysToChange <= 21) {
    alerts.push({
      tone: 'info',
      icon: 'clock',
      title: `Changement de saison dans ${daysToChange} j`,
      text:
        season === 'warm'
          ? "À partir du 1er septembre, les fréquences d'arrosage hivernales s'appliqueront et l'engrais sera mis en pause."
          : "À partir du 1er mars, reprise des arrosages rapprochés et de l'engrais.",
    });
  }

  if (season === 'cold') {
    alerts.push({
      tone: 'cold',
      icon: 'snowflake',
      title: "Pause de l'engrais",
      text: "Les plantes sont au repos : aucun apport d'engrais jusqu'au retour du printemps.",
    });
    alerts.push({
      tone: 'warn',
      icon: 'thermometer',
      title: 'Chauffage = air sec',
      text: 'Éloignez les plantes des radiateurs, brumisez ou groupez les espèces tropicales.',
    });
    const humid = plants.filter((p) => /élevée/i.test(p.humidity || ''));
    if (humid.length) {
      alerts.push({
        tone: 'info',
        icon: 'droplet',
        title: 'Humidité à surveiller',
        text: `${humid.map((p) => p.name).join(', ')} : humidité élevée appréciée. Placez une soucoupe de billes d'argile humides.`,
      });
    }
  } else {
    alerts.push({
      tone: 'warm',
      icon: 'sprout',
      title: "Saison d'engrais",
      text: "Apportez de l'engrais dilué selon la fréquence de chaque plante, sur terre déjà humide.",
    });
    if (m >= 2 && m <= 4) {
      alerts.push({
        tone: 'info',
        icon: 'pot',
        title: 'Période de rempotage',
        text: 'Mars à mai est idéal pour rempoter les plantes dont les racines sortent du pot.',
      });
    }
    if (m >= 5 && m <= 7) {
      alerts.push({
        tone: 'warn',
        icon: 'sun',
        title: 'Risque de brûlures',
        text: 'Derrière une vitre en plein été, le soleil direct peut brûler les feuillages. Voilez si nécessaire.',
      });
    }
  }
  return alerts;
}

export function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
