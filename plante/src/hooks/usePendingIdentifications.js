import { useEffect, useRef } from 'react';
import { PLACEHOLDER_NAME, fetchPlantResults, plantFieldsFrom } from '../services/pcIdentifier';
import { findPlantImage } from '../services/plantImage';

const POLL_MS = 30000;

/** Ce qu'on garde de l'identification pour l'afficher dans la fiche. */
export function identInfoFrom(r) {
  return {
    commonName: r.commonName,
    scientificName: r.scientificName,
    confidence: r.confidence,
    alternatives: r.alternatives || [],
    healthNote: r.healthNote || '',
  };
}

/**
 * Plantes enregistrées dont la photo attend l'analyse du PC : on interroge le Sheets
 * toutes les 30 s (et au retour sur l'appli), puis on complète la fiche dès que la réponse arrive.
 */
export function usePendingIdentifications(plants, update, notify) {
  const pending = plants.filter((p) => p.pendingIdent);
  const key = pending.map((p) => p.pendingIdent).join(',');
  const latest = useRef(plants);
  latest.current = plants;

  useEffect(() => {
    if (!key) return undefined;
    let stop = false;

    const check = async () => {
      if (document.visibilityState === 'hidden') return;
      let results;
      try {
        results = await fetchPlantResults(key.split(','));
      } catch {
        return; // réseau : prochain tour
      }
      if (stop) return;
      for (const plant of latest.current.filter((p) => p.pendingIdent)) {
        const res = results[plant.pendingIdent];
        if (res?.statut === 'Traité' && res.result) {
          const r = res.result;
          const named = !plant.name || plant.name === PLACEHOLDER_NAME;
          update(plant.id, {
            ...plantFieldsFrom(r),
            ...(named ? { name: r.commonName } : {}),
            pendingIdent: '',
            identInfo: identInfoFrom(r),
          });
          notify(`Plante identifiée : ${r.commonName}`, 'sparkles');
          if (!plant.image && !plant.noWebImage) {
            findPlantImage(r.scientificName || r.commonName).then((found) => found && update(plant.id, found));
          }
        } else if (res?.statut === 'Erreur' || res === undefined) {
          // Erreur du PC, ou demande disparue du Sheets : on arrête d'attendre
          update(plant.id, { pendingIdent: '' });
          notify(`${plant.name} : identification impossible${res?.erreur ? ` (${res.erreur})` : ''}`, 'alert');
        }
      }
    };

    check();
    const timer = setInterval(check, POLL_MS);
    document.addEventListener('visibilitychange', check);
    return () => {
      stop = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
    };
  }, [key, update, notify]);
}
