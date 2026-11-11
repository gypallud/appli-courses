// Synchronisation avec le Google Sheets (même Apps Script que l'appli courses, action « menageSync »).
// Principe : chaque modification locale est mise en file (outbox), envoyée au script, qui garde la version
// la plus récente de chaque élément et renvoie toutes les données. Le téléphone reconstruit alors son état
// à partir du serveur, puis réapplique ce qui n'a pas encore été envoyé.

// VITE_SYNC_URL permet de pointer vers un faux serveur pendant les tests ; vide = pas de synchronisation.
export const SYNC_URL = import.meta.env.VITE_SYNC_URL
  ?? 'https://script.google.com/macros/s/AKfycbwGgt_IxmGdadlqYG8ru6sr_2eTBPgU4gdSV0XzewvZ5jIUl6CjM0AHgwRHa_9OfuxS/exec';

export const COLLECTIONS = ['tasks', 'history', 'warranties', 'materials'];

/**
 * Modifications entre deux états : { 'type:id': { type, id, data (null = supprimé), at } }.
 * Le reducer crée un nouvel objet pour chaque élément modifié : comparer les références suffit.
 */
export function diffData(prev, next, at) {
  const changes = {};
  const put = (type, id, data) => { changes[`${type}:${id}`] = { type, id, data: data ?? null, at }; };
  for (const col of COLLECTIONS) {
    if (prev[col] === next[col]) continue;
    const before = new Map((prev[col] ?? []).map((x) => [x.id, x]));
    for (const x of next[col] ?? []) {
      if (before.get(x.id) !== x) put(col, x.id, x);
      before.delete(x.id);
    }
    for (const id of before.keys()) put(col, id, null);
  }
  if (prev.profiles !== next.profiles) {
    const p = prev.profiles ?? {};
    const n = next.profiles ?? {};
    for (const id of new Set([...Object.keys(p), ...Object.keys(n)])) if (p[id] !== n[id]) put('profiles', id, n[id]);
  }
  return changes;
}

/** Toutes les données d'un état, sous forme de modifications (premier envoi d'un téléphone). */
export const allChanges = (data, at) => diffData({}, data, at);

/** Données reconstruites à partir du serveur, puis des modifications locales pas encore envoyées. */
export function buildData(items, outbox) {
  const data = { tasks: [], history: [], warranties: [], materials: [], profiles: {} };
  const positions = {};
  const apply = (type, id, d) => {
    if (type === 'profiles') {
      if (d) data.profiles[id] = d; else delete data.profiles[id];
      return;
    }
    const list = data[type];
    if (!list) return;
    const key = `${type}:${id}`;
    const i = positions[key];
    if (d) {
      if (i === undefined) { positions[key] = list.length; list.push(d); } else list[i] = d;
    } else if (i !== undefined) {
      list[i] = null; // retiré à la fin, pour garder les positions valables
    }
  };
  items.forEach((it) => apply(it.type, it.id, it.data));
  Object.values(outbox).forEach((c) => apply(c.type, c.id, c.data));
  for (const col of COLLECTIONS) data[col] = data[col].filter(Boolean);
  data.history.sort((a, b) => b.date.localeCompare(a.date));
  return data;
}

export async function send(payload) {
  // text/plain évite la requête préalable CORS, que Apps Script ne gère pas
  const res = await fetch(SYNC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });
  const out = await res.json();
  if (!out.ok) throw new Error(out.error || 'erreur');
  return out;
}
