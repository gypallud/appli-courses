import { useCallback, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { createStarterPlants } from '../data/plants';
import { today, toISO } from '../utils/dates';
import { uid } from '../utils/care';

/** CRUD des plantes, persisté dans le localStorage. */
export function usePlants() {
  const [plants, setPlants] = useLocalStorage('chlorophylle.plants.v1', createStarterPlants);

  // Téléphones qui ont encore les anciens exemples (ID « demo-… ») : on les remplace par les vraies plantes
  // de la maison, en gardant les plantes ajoutées à la main.
  useEffect(() => {
    const isDemo = (p) => String(p.id).startsWith('demo-');
    if (!plants.some(isDemo)) return;
    setPlants((ps) => {
      // Re-vérifié ici : la mise à jour peut être appliquée deux fois (mode strict de React)
      if (!ps.some(isDemo)) return ps;
      const starters = createStarterPlants();
      const starterIds = new Set(starters.map((p) => p.id));
      return [...starters, ...ps.filter((p) => !isDemo(p) && !starterIds.has(p.id))];
    });
  }, [plants, setPlants]);

  const add = useCallback(
    (data) => {
      const plant = { ...data, id: uid() };
      setPlants((ps) => [...ps, plant]);
      return plant;
    },
    [setPlants],
  );

  const update = useCallback(
    (id, patch) => setPlants((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p))),
    [setPlants],
  );

  const remove = useCallback((id) => setPlants((ps) => ps.filter((p) => p.id !== id)), [setPlants]);

  const water = useCallback((id) => update(id, { lastWatered: toISO(today()) }), [update]);

  const fertilize = useCallback((id) => update(id, { lastFertilized: toISO(today()) }), [update]);

  const resetStarter = useCallback(() => setPlants(createStarterPlants()), [setPlants]);

  return { plants, add, update, remove, water, fertilize, resetStarter };
}
