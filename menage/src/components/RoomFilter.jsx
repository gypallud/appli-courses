import { ROOMS } from '../data/constants';
import { Chip } from './ui';

/** Filtre rapide par pièce ; `counts[roomId]` = tâches à faire cette semaine. */
export default function RoomFilter({ value, onChange, counts = {} }) {
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1">
      <Chip active={value === 'all'} onClick={() => onChange('all')}>
        🏠 Toutes {total > 0 && <Badge active={value === 'all'}>{total}</Badge>}
      </Chip>
      {ROOMS.map((r) => (
        <Chip key={r.id} active={value === r.id} onClick={() => onChange(r.id)}>
          {r.icon} {r.short}
          {counts[r.id] > 0 && <Badge active={value === r.id}>{counts[r.id]}</Badge>}
        </Chip>
      ))}
    </div>
  );
}

function Badge({ active, children }) {
  return (
    <span className={`rounded-full px-1.5 text-xs tabular-nums ${active ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
      {children}
    </span>
  );
}
