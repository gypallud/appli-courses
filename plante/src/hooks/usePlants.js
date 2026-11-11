import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { createDemoPlants } from '../data/plants';
import { today, toISO } from '../utils/dates';
import { uid } from '../utils/care';

/** CRUD des plantes, persisté dans le localStorage. */
export function usePlants() {
  const [plants, setPlants] = useLocalStorage('chlorophylle.plants.v1', createDemoPlants);

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

  const resetDemo = useCallback(() => setPlants(createDemoPlants()), [setPlants]);

  return { plants, add, update, remove, water, fertilize, resetDemo };
}
