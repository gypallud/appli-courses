// Toutes les dates sont manipulées en chaînes locales « AAAA-MM-JJ » (pas de souci de fuseau).
const pad = (n) => String(n).padStart(2, '0');

export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseISO = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const todayISO = () => toISO(new Date());

export const addDays = (iso, n) => {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};

// Ajoute n mois en gardant le jour, borné à la fin du mois (31 janv. + 1 mois = 28/29 févr.)
export const addMonths = (iso, n) => {
  const d = parseISO(iso);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toISO(d);
};

export const addFrequency = (iso, freq, times = 1) => {
  switch (freq) {
    case 'weekly': return addDays(iso, 7 * times);
    case 'monthly': return addMonths(iso, times);
    case 'quarterly': return addMonths(iso, 3 * times);
    case 'yearly': return addMonths(iso, 12 * times);
    default: return iso;
  }
};

/** Nombre de jours de b à a (a - b). */
export const diffDays = (a, b) => Math.round((parseISO(a) - parseISO(b)) / 86400000);

export const startOfWeek = (iso) => {
  const d = parseISO(iso);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // semaine du lundi au dimanche
  return toISO(d);
};
export const endOfWeek = (iso) => addDays(startOfWeek(iso), 6);
export const startOfMonth = (iso) => `${iso.slice(0, 7)}-01`;
export const endOfMonth = (iso) => {
  const d = parseISO(iso);
  return toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0));
};

const fmt = (iso, opts) => parseISO(iso).toLocaleDateString('fr-FR', opts);
export const fmtDayMonth = (iso) => fmt(iso, { day: 'numeric', month: 'short' });
export const fmtWeekday = (iso) => fmt(iso, { weekday: 'short', day: 'numeric', month: 'short' });
export const fmtFull = (iso) => fmt(iso, { weekday: 'long', day: 'numeric', month: 'long' });
export const fmtDate = (iso) => fmt(iso, { day: 'numeric', month: 'short', year: 'numeric' });
export const fmtMonthYear = (iso) => fmt(iso, { month: 'long', year: 'numeric' });

export const relativeDue = (iso, today) => {
  const n = diffDays(iso, today);
  if (n === 0) return "Aujourd'hui";
  if (n === 1) return 'Demain';
  if (n === -1) return 'En retard · hier';
  if (n < 0) return `En retard · ${-n} j`;
  if (n < 7) return `Dans ${n} j`;
  return fmtDayMonth(iso);
};
