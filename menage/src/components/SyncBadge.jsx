import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { useHousehold } from '../state/HouseholdContext';

const time = (ms) => new Date(ms).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

/** Texte d'état de la synchro, partagé entre l'en-tête et la page Profil. */
export function syncLabel(sync) {
  if (sync.phase === 'off') return 'Synchronisation désactivée';
  if (sync.phase === 'syncing') return 'Synchronisation…';
  if (sync.phase === 'offline') return `Hors ligne${sync.pending ? ` · ${sync.pending} modification${sync.pending > 1 ? 's' : ''} en attente` : ''}`;
  if (sync.phase === 'error') return `Synchronisation impossible${sync.pending ? ` · ${sync.pending} en attente` : ''}`;
  if (sync.at) return `Synchronisé à ${time(sync.at)}`;
  return 'En attente de synchronisation';
}

/** Petite icône dans l'en-tête : nuage vert = à jour, barré = hors ligne ou erreur. Toucher relance la synchro. */
export default function SyncBadge() {
  const { sync } = useHousehold();
  if (sync.phase === 'off') return null;
  const problem = sync.phase === 'offline' || sync.phase === 'error';
  const Icon = sync.phase === 'syncing' ? RefreshCw : problem ? CloudOff : Cloud;
  const color = sync.phase === 'syncing' || sync.phase === 'idle' ? 'text-slate-400' : problem ? 'text-amber-500' : 'text-emerald-500';
  return (
    <button type="button" onClick={sync.syncNow} title={syncLabel(sync)} aria-label={`${syncLabel(sync)}. Toucher pour synchroniser.`}
      className={`relative rounded-full p-2 transition hover:bg-slate-200 ${color}`}>
      <Icon size={20} className={sync.phase === 'syncing' ? 'animate-spin' : ''} />
      {problem && sync.pending > 0 && (
        <span className="absolute right-0.5 top-0.5 min-w-4 rounded-full bg-amber-500 px-1 text-center text-[10px] font-bold leading-4 text-white">
          {sync.pending}
        </span>
      )}
    </button>
  );
}
