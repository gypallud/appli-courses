import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { ASSIGNEES, FREQUENCIES, ROOMS } from '../data/constants';
import { useHousehold } from '../state/HouseholdContext';
import { byDue, nextDue } from '../lib/tasks';
import TaskCard from '../components/TaskCard';
import { EmptyState, MemberFilter } from '../components/ui';

/** Toutes les tâches, regroupées par pièce, avec recherche et filtres. */
export default function TasksView({ today, room, onDone, onEdit, onNew }) {
  const { state } = useHousehold();
  const [query, setQuery] = useState('');
  const [who, setWho] = useState('all');
  const [freq, setFreq] = useState('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.tasks.filter((t) =>
      (room === 'all' || t.roomId === room)
      && (who === 'all' || t.assignee === who)
      && (freq === 'all' || t.frequency === freq)
      && (!q || t.name.toLowerCase().includes(q)));
  }, [state.tasks, query, room, who, freq]);

  const active = filtered.filter((t) => nextDue(t));
  const finished = filtered.filter((t) => !nextDue(t));
  const groups = ROOMS
    .map((r) => ({ room: r, tasks: active.filter((t) => t.roomId === r.id).sort(byDue) }))
    .filter((g) => g.tasks.length);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Toutes les tâches</h1>
          <p className="text-sm text-slate-500">{state.tasks.length} tâches · touche une tâche pour la modifier</p>
        </div>
        <button type="button" onClick={onNew} className="btn btn-primary"><Plus size={18} />Ajouter</button>
      </div>

      <div className="flex gap-2">
        <label className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Rechercher…" value={query} onChange={(e) => setQuery(e.target.value)} type="search" />
        </label>
        <select className="input w-auto" value={freq} onChange={(e) => setFreq(e.target.value)} aria-label="Fréquence">
          <option value="all">Toutes fréquences</option>
          {FREQUENCIES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
      </div>

      <MemberFilter value={who} onChange={setWho} members={ASSIGNEES} />

      {groups.length === 0 && finished.length === 0 && (
        <EmptyState emoji="🔍" title="Aucune tâche">Change les filtres ou ajoute une tâche.</EmptyState>
      )}

      {groups.map((g) => (
        <section key={g.room.id}>
          <h2 className="mb-2 flex items-center gap-2 font-semibold text-slate-800">
            <span>{g.room.icon}</span>{g.room.name}
            <span className="text-sm font-normal text-slate-400">· {g.tasks.length}</span>
          </h2>
          <div className="space-y-2">
            {g.tasks.map((t) => <TaskCard key={t.id} task={t} today={today} onDone={onDone} onEdit={onEdit} hideRoom />)}
          </div>
        </section>
      ))}

      {finished.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold text-slate-500">✅ Ponctuelles terminées</h2>
          <div className="space-y-2 opacity-70">
            {finished.map((t) => <TaskCard key={t.id} task={t} today={today} onDone={onDone} onEdit={onEdit} />)}
          </div>
        </section>
      )}
    </div>
  );
}
