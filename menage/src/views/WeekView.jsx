import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { MEMBERS, getRoom } from '../data/constants';
import { useHousehold } from '../state/HouseholdContext';
import { byDue, effectiveAssignee, nextDue } from '../lib/tasks';
import { endOfWeek, fmtDayMonth, fmtWeekday, startOfWeek } from '../lib/dates';
import TaskCard from '../components/TaskCard';
import { Avatar, EmptyState, StatTile } from '../components/ui';

/** Planning de la semaine en cours (en retard inclus), par personne. */
export default function WeekView({ today, room, onDone, onEdit, me, onPickProfile }) {
  const { state } = useHousehold();
  const [who, setWho] = useState('all');
  const ws = startOfWeek(today);
  const we = endOfWeek(today);

  const { pending, done } = useMemo(() => {
    const inRoom = (x) => room === 'all' || x.roomId === room;
    return {
      pending: state.tasks.filter((t) => inRoom(t) && nextDue(t) && nextDue(t) <= we).sort(byDue),
      done: state.history.filter((h) => inRoom(h) && h.date >= ws && h.date <= we),
    };
  }, [state, room, ws, we]);

  const overdue = pending.filter((t) => nextDue(t) < today).length;
  // La personne qui utilise l'appareil passe en premier
  const ordered = [...MEMBERS].sort((a, b) => (b.id === me) - (a.id === me));
  const perMember = ordered.map((m) => ({
    member: m,
    todo: pending.filter((t) => effectiveAssignee(t) === m.id),
    done: done.filter((h) => h.memberId === m.id),
  }));

  return (
    <div className="space-y-5">
      {!me && (
        <button type="button" onClick={onPickProfile}
          className="flex w-full items-center gap-3 rounded-2xl bg-indigo-50 p-3 text-left text-sm text-indigo-800 ring-1 ring-indigo-200">
          <span className="text-2xl">👋</span>
          <span><strong>Qui es-tu ?</strong> Choisis ton profil pour voir tes tâches en premier et personnaliser ton avatar.</span>
        </button>
      )}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Cette semaine</h1>
        <p className="text-sm text-slate-500">du {fmtWeekday(ws)} au {fmtWeekday(we)}</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatTile label="En retard" value={overdue} tone={overdue ? 'red' : 'slate'} />
        <StatTile label="À faire" value={pending.length} tone="indigo" />
        <StatTile label="Faites" value={done.length} tone="emerald" />
      </div>

      {/* Progression par membre : touche une carte pour ne voir que ses tâches */}
      <div className="grid grid-cols-3 gap-2">
        {perMember.map(({ member, todo, done: d }) => {
          const total = todo.length + d.length;
          const pct = total ? Math.round((d.length / total) * 100) : 100;
          const active = who === member.id;
          return (
            <button
              key={member.id} type="button" onClick={() => setWho(active ? 'all' : member.id)} aria-pressed={active}
              className={`card p-2.5 text-left transition ${active ? `ring-2 ${member.soft}` : ''}`}
            >
              <div className="flex items-center gap-2">
                <Avatar memberId={member.id} size="sm" />
                <span className="truncate text-sm font-semibold">{member.name}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${member.bar} transition-all`} style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-1 text-xs text-slate-500 tabular-nums">{d.length}/{total} faites</div>
            </button>
          );
        })}
      </div>

      {perMember
        .filter(({ member }) => who === 'all' || who === member.id)
        .map(({ member, todo, done: d }) => (
          <section key={member.id}>
            <div className="mb-2 flex items-center gap-2">
              <Avatar memberId={member.id} size="sm" />
              <h2 className="font-semibold text-slate-800">{member.name}</h2>
              {member.id === me && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">toi</span>}
              <span className="text-sm text-slate-400">· {todo.length} à faire</span>
            </div>
            <div className="space-y-2">
              {todo.length === 0
                ? <EmptyState title="Rien à faire cette semaine" />
                : todo.map((t) => <TaskCard key={t.id} task={t} today={today} onDone={onDone} onEdit={onEdit} />)}
            </div>
            {d.length > 0 && (
              <ul className="mt-2 space-y-1 pl-1">
                {d.map((h) => (
                  <li key={h.id} className="flex items-center gap-2 text-sm text-slate-400">
                    <Check size={14} className="text-emerald-500" />
                    <span className="truncate line-through">{h.taskName}</span>
                    <span className="shrink-0 text-xs">· {getRoom(h.roomId).short} · {fmtDayMonth(h.date)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
    </div>
  );
}
