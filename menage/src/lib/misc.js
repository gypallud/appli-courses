import { addMonths, diffDays } from './dates';

// crypto.randomUUID n'existe qu'en contexte sécurisé (https / localhost) : repli pour un test en LAN.
export const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** Échéance, jours restants, part consommée et statut d'une garantie. */
export function warrantyInfo(w, today) {
  const expiry = addMonths(w.purchaseDate, Number(w.durationMonths) || 0);
  const total = Math.max(1, diffDays(expiry, w.purchaseDate));
  const left = diffDays(expiry, today);
  const progress = Math.min(1, Math.max(0, 1 - left / total));
  const status = left < 0 ? 'expired' : left <= 60 ? 'soon' : 'active';
  return { expiry, left, progress, status };
}
