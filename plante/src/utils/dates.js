// Dates stockées au format local "YYYY-MM-DD" pour éviter les décalages de fuseau.
const DAY_MS = 86400000;

export function today() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseISO(str) {
  if (!str) return today();
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date, n) {
  const r = new Date(date);
  r.setDate(r.getDate() + n);
  return r;
}

/** Nombre de jours entre a et b (a - b). */
export function diffDays(a, b) {
  return Math.round((a - b) / DAY_MS);
}

export function formatShort(date) {
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function formatLong(date) {
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function formatWeekday(date) {
  return date.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '');
}

/** Libellé relatif à aujourd'hui pour une échéance. */
export function relativeDue(days) {
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Demain';
  if (days > 1) return `Dans ${days} j`;
  if (days === -1) return 'En retard (1 j)';
  return `En retard (${-days} j)`;
}

/** Libellé relatif pour un événement passé. */
export function relativePast(days) {
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  return `Il y a ${days} j`;
}

export function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
