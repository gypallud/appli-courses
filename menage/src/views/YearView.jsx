import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { MEMBERS, getFreq, getMember, getRoom } from '../data/constants';
import { useHousehold } from '../state/HouseholdContext';
import { byDue, effectiveAssignee, nextDue, taskStatus } from '../lib/tasks';
import { fmtDate, fmtDayMonth, fmtMonthYear } from '../lib/dates';
import { Avatar, EmptyState, MemberFilter, SectionTitle, StatusPill } from '../components/ui';

const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const PAGE = 40;

/** Gros entretiens, répartition des efforts et journal de bord de l'année. */
export default function YearView({ today, room, onEdit }) {
  const { state, deleteHistory } = useHousehold();
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [who, setWho] = useState('all');
  const [limit, setLimit] = useState(PAGE);

  const inRoom = (x) => room === 'all' || x.roomId === room;
  const yearEntries = useMemo(
    () => state.history
      .filter((h) => h.date.startsWith(String(year)) && (room === 'all' || h.roomId === room))
      .sort((a, b) => b.date.localeCompare(a.date)),
    [state.history, year, room],
  );
  const entries = who === 'all' ? yearEntries : yearEntries.filter((h) => h.memberId === who);

  // Répartition globale (toujours sur les 3 membres)
  const total = yearEntries.length;
  const split = MEMBERS.map((m) => {
    const n = yearEntries.filter((h) => h.memberId === m.id).length;
    return { member: m, n, pct: total ? Math.round((n / total) * 100) : 0 };
  });

  // Histogramme mensuel empilé par membre
  const monthly = MONTH_LABELS.map((_, i) => {
    const mm = String(i + 1).padStart(2, '0');
    const inMonth = entries.filter((h) => h.date.slice(5, 7) === mm);
    return MEMBERS.map((m) => ({ member: m, n: inMonth.filter((h) => h.memberId === m.id).length }));
  });
  const maxMonth = Math.max(1, ...monthly.map((col) => col.reduce((s, x) => s + x.n, 0)));

  const bigTasks = state.tasks
    .filter((t) => (t.frequency === 'quarterly' || t.frequency === 'yearly') && inRoom(t))
    .filter((t) => who === 'all' || effectiveAssignee(t) === who)
    .sort(byDue);

  // Journal groupé par mois
  const shown = entries.slice(0, limit);
  const groups = [];
  shown.forEach((h) => {
    const key = h.date.slice(0, 7);
    if (groups.at(-1)?.key !== key) groups.push({ key, items: [] });
    groups.at(-1).items.push(h);
  });

  const currentYear = Number(today.slice(0, 4));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setYear(year - 1)} className="rounded-full p-2 hover:bg-slate-200" aria-label="Année précédente"><ChevronLeft /></button>
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-900">{year}</h1>
          <p className="text-xs text-slate-500">{total} tâches réalisées</p>
        </div>
        <button type="button" onClick={() => setYear(year + 1)} disabled={year >= currentYear} className="rounded-full p-2 hover:bg-slate-200 disabled:opacity-30" aria-label="Année suivante"><ChevronRight /></button>
      </div>

      <MemberFilter value={who} onChange={(v) => { setWho(v); setLimit(PAGE); }} members={MEMBERS} />

      {/* Répartition des efforts */}
      <section className="card p-4">
        <SectionTitle>Répartition des efforts</SectionTitle>
        {total === 0 ? (
          <p className="text-sm text-slate-500">Aucune tâche réalisée sur cette période.</p>
        ) : (
          <>
            <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
              {split.filter((s) => s.n).map((s) => (
                <div key={s.member.id} className={`${s.member.bar} ${who !== 'all' && who !== s.member.id ? 'opacity-25' : ''}`}
                  style={{ width: `${(s.n / total) * 100}%` }} title={`${s.member.name} : ${s.n}`} />
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {split.map((s) => (
                <div key={s.member.id} className="flex items-center gap-2">
                  <Avatar memberId={s.member.id} size="sm" />
                  <div className="leading-tight">
                    <div className="text-sm font-semibold tabular-nums">{s.pct} %</div>
                    <div className="text-xs text-slate-500 tabular-nums">{s.n} tâches</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex h-28 items-end gap-1" aria-label="Tâches réalisées par mois">
              {monthly.map((col, i) => {
                const sum = col.reduce((s, x) => s + x.n, 0);
                return (
                  <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                    <div className="flex w-full max-w-6 flex-col-reverse overflow-hidden rounded-md" style={{ height: `${(sum / maxMonth) * 100}%` }}
                      title={`${sum} tâches`}>
                      {col.filter((x) => x.n).map((x) => (
                        <div key={x.member.id} className={x.member.bar} style={{ flexGrow: x.n }} />
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-400">{MONTH_LABELS[i]}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* Gros entretiens */}
      <section>
        <SectionTitle>Gros entretiens (trimestriels & annuels)</SectionTitle>
        {bigTasks.length === 0 ? <EmptyState emoji="🔧" title="Aucun gros entretien" /> : (
          <div className="card divide-y divide-slate-100">
            {bigTasks.map((t) => {
              const due = nextDue(t);
              const doneThisYear = yearEntries.filter((h) => h.taskId === t.id).length;
              return (
                <button key={t.id} type="button" onClick={() => onEdit(t)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-slate-50">
                  <Avatar memberId={effectiveAssignee(t)} size="sm" rotation={t.assignee === 'rotation'} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{t.name}</div>
                    <div className="text-xs text-slate-500">
                      {getRoom(t.roomId).icon} {getRoom(t.roomId).short} · {getFreq(t.frequency).short}
                      {' · '}{t.lastDone ? `fait le ${fmtDate(t.lastDone)}` : 'jamais fait'}
                      {doneThisYear > 0 && ` · ${doneThisYear}× en ${year}`}
                    </div>
                  </div>
                  {due && <StatusPill status={taskStatus(t, today)} due={due} today={today} />}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Journal de bord */}
      <section>
        <SectionTitle right={<span className="text-xs text-slate-400">{entries.length} entrées</span>}>Journal de bord</SectionTitle>
        {entries.length === 0 ? <EmptyState emoji="📖" title="Journal vide" /> : (
          <div className="space-y-4">
            {groups.map((g) => (
              <div key={g.key}>
                <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">{fmtMonthYear(`${g.key}-01`)}</h3>
                <ul className="card divide-y divide-slate-100">
                  {g.items.map((h) => (
                    <li key={h.id} className="group flex items-center gap-3 px-3 py-2">
                      <Avatar memberId={h.memberId} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm">{h.taskName}</div>
                        <div className="text-xs text-slate-500">{getRoom(h.roomId).short} · {getMember(h.memberId).name}</div>
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-slate-400">{fmtDayMonth(h.date)}</span>
                      <button type="button" onClick={() => window.confirm(`Retirer « ${h.taskName} » du journal ?`) && deleteHistory(h.id)}
                        className="rounded-lg p-1 text-slate-300 hover:bg-red-50 hover:text-red-500" aria-label="Retirer du journal">
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {entries.length > limit && (
              <button type="button" onClick={() => setLimit(limit + PAGE)} className="btn btn-ghost w-full">
                Voir plus ({entries.length - limit})
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
