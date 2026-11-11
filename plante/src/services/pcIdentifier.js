/**
 * Identification gratuite : la photo passe par l'Apps Script du Google Sheets de la maison,
 * puis le PC l'analyse avec Claude Code (abonnement Claude, sans clé API).
 * Le PC regarde toutes les 5 minutes s'il y a une photo de plante à identifier.
 */

// Même Apps Script que l'appli des courses (index.html à la racine du dépôt)
const SYNC_URL =
  'https://script.google.com/macros/s/AKfycbwGgt_IxmGdadlqYG8ru6sr_2eTBPgU4gdSV0XzewvZ5jIUl6CjM0AHgwRHa_9OfuxS/exec';

export const PC_DELAY_TEXT = 'environ 5 minutes, si le PC de la maison est allumé';

async function send(payload) {
  let res;
  try {
    // text/plain évite la requête préalable CORS, que Apps Script ne gère pas
    res = await fetch(SYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw Object.assign(new Error('Pas de connexion. Vérifiez votre réseau.'), { code: 'network' });
  }
  const out = await res.json().catch(() => ({ ok: false, error: 'réponse illisible' }));
  if (!out.ok) throw Object.assign(new Error(`Envoi impossible : ${out.error || 'erreur'}`), { code: 'api' });
  return out;
}

/** Envoie la photo (dataURL JPEG) ; renvoie l'identifiant de la demande. */
export async function sendPlantPhoto(dataUrl) {
  const match = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(dataUrl || '');
  if (!match) throw Object.assign(new Error("Format d'image non reconnu."), { code: 'format' });
  const out = await send({ action: 'upload', type: 'plante', mime: match[1], image: match[2], par: 'Plantes' });
  return out.id;
}

/**
 * État des demandes : { [id]: { statut: 'En attente' | 'Traité' | 'Erreur', result, erreur } }.
 * Une demande absente de la réponse n'existe plus.
 */
export async function fetchPlantResults(ids) {
  if (!ids.length) return {};
  const out = await send({ action: 'plantResults', ids });
  return out.results || {};
}

/** Champs de la fiche remplis à partir d'un résultat d'identification. */
export function plantFieldsFrom(r) {
  return {
    variety: r.scientificName,
    avatar: r.avatar,
    light: r.light,
    waterSummer: r.waterSummer,
    waterWinter: r.waterWinter,
    fertilizerEvery: r.fertilizerEvery,
    soil: r.soil,
    repotting: r.repotting,
    humidity: r.humidity,
    temperature: r.temperature,
    notes: r.notes,
  };
}

export const PLACEHOLDER_NAME = 'Plante à identifier';
