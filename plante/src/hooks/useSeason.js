import { useLocalStorage } from './useLocalStorage';
import { autoSeason } from '../utils/care';

/** mode : "auto" (selon la date), "warm" ou "cold" (forcé par l'utilisateur). */
export function useSeason() {
  const [mode, setMode] = useLocalStorage('chlorophylle.season.v1', 'auto');
  const season = mode === 'auto' ? autoSeason() : mode;
  return { mode, setMode, season };
}
