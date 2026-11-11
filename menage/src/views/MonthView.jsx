import { useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { FREQUENCIES, getMember, getRoom } from '../data/constants';
import { useHousehold } from '../state/HouseholdContext';
import { effectiveAssignee, nextDue, occurrences } from '../lib/tasks';
import {
  addDays, addMonths, endOfMonth, endOfWeek, fmtFull, fmtMonthYear, fmtWeekday, startOfMonth, startOfWeek,
} from '../lib/dates';
import TaskCard from '../components/TaskCard';
import { Avatar, EmptyState, Segmented, StatTile } from '../components/ui';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/** Calendrier du mois : tâches prévues (à venir) et réalisées (passé). */
export default function MonthView({ today, room, onDone, onEdit }) {
  const { state } = useHousehold();
  const [cursor, setCursor] = useState(startOfMonth(today));
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState('todo');
  const ms = cursor;
  const me = endOfMonth(cursor);

  const { byDay, doneByDay, planned, doneCount, freqCount, overdue } = useMemo(() => {
    const inRoom = (x) => room === 'all' || x.roomId === room;
    const byDay = {};
    const freqCount = {};
    let planned = 0;
    state.tasks.filter(inRoom).forEach((t) => {
      occurrences(t, ms, me, today).forEach((o) => {
        (byDay[o.date] ??= []).push(o);
        freqCount[t.frequency] = (freqCount[t.frequency] ?? 0) + 1;
        planned++;
      });
    });
    const doneByDay = {};
    let doneCount = 0;
    state.history.filter((h) => inRoom(h) && h.date >= ms && h.date <= me).forEach((h) => {
      (doneByDay[h.date] ??= []).push(h);
      doneCount++;
    });
    const overdue = today >= ms && today <= me
      ? state.tasks.filter((t) => inRoom(t) && nextDue(t) && nextDue(t) < today).length : 0;
    return { byDay, doneByDay, planned, doneCount, freqCount, overdue };
  }, [state, room, ms, me, today]);

  const days = [];
  for (let d = startOfWeek(ms); d <= endOfWeek(me); d = addDays(d, 1)) days.push(d);

  const move = (n) => { setCursor(addMonths(cursor, n)); setSelected(null); };

  // Liste sous le calendrier : un jour choisi, ou tout le mois
  const listDays = selected
    ? [selected]
    : Object.keys(mode === 'todo' ? byDay : doneByDay).sort((a, b) => (mode === 'todo' ? a.localeCompare(b) : b.localeCompare(a)));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => move(-1)} className="rounded-full p-2 hover:bg-slate-200" aria-label="Mois précédent"><ChevronLeft /></button>
        <div className="text-center">
          <h1 className="text-xl font-bold capitalize text-slate-900">{fmtMonthYear(ms)}</h1>
          {ms !== startOfMonth(today) && (
            <button type="button" onClick={() => { setCursor(startOfMonth(today)); setSelected(null); }} className="text-xs font-medium text-indigo-600">
              Revenir à aujourd'hui
            </button>
          )}
        </div>
        <button type="button" onClick={() => move(1)} className="rounded-full p-2 hover:bg-slate-200" aria-label="Mois suivant"><ChevronRight /></button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatTile label="Prévues" value={planned} tone="indigo" />
        <StatTile label="Faites" value={doneCount} tone="emerald" />
        <StatTile label="En retard" value={overdue} tone={overdue ? 'red' : 'slate'} />
      </div>

      {planned > 0 && (
        <div className="flex flex-wrap gap-1.5 text-xs">
          {FREQUENCIES.filter((f) => freqCount[f.id]).map((f) => (
            <span key={f.id} className="rounded-full bg-surface px-2.5 py-1 text-slate-600 ring-1 ring-slate-200">
              {f.short} <strong className="tabular-nums">×{freqCount[f.id]}</strong>
            </span>
          ))}
        </div>
      )}

      {/* Calendrier */}
      <div className="card p-2">
        <div className="grid grid-cols-7 text-center text-xs font-medium text-slate-400">
          {WEEKDAYS.map((d, i) => <div key={i} className="py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const inMonth = d >= ms && d <= me;
            const occ = byDay[d] ?? [];
            const dn = doneByDay[d] ?? [];
            const isToday = d === today;
            const isSel = d === selected;
            return (
              <button
                key={d} type="button" disabled={!inMonth} onClick={() => setSelected(isSel ? null : d)}
                className={`flex min-h-14 flex-col items-center rounded-xl p-1 text-sm transition
                  ${!inMonth ? 'invisible' : ''} ${isSel ? 'bg-slate-900 text-surface' : 'hover:bg-slate-100'}
                  ${isToday && !isSel ? 'ring-2 ring-indigo-500' : ''}`}
                aria-label={`${fmtFull(d)} : ${occ.length} prévues, ${dn.length} faites`}
              >
                <span className={`tabular-nums ${isToday ? 'font-bold' : ''} ${d < today && !isSel ? 'text-slate-400' : ''}`}>
                  {Number(d.slice(8))}
                </span>
                <span className="mt-0.5 flex flex-wrap justify-center gap-0.5">
                  {occ.slice(0, 4).map((o) => (
                    <span key={o.task.id} className={`h-1.5 w-1.5 rounded-full ${getMember(effectiveAssignee(o.task)).dot}`} />
                  ))}
                  {occ.length > 4 && <span className="text-[9px] leading-none">+{occ.length - 4}</span>}
                </span>
                {dn.length > 0 && (
                  <span className={`mt-auto text-[10px] font-semibold leading-none ${isSel ? 'text-emerald-500' : 'text-emerald-600'}`}>
                    ✓{dn.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        {selected ? (
          <div className="flex items-center justify-between">
            <h2 className="font-semibold capitalize text-slate-800">{fmtFull(selected)}</h2>
            <button type="button" onClick={() => setSelected(null)} className="text-sm font-medium text-indigo-600">Tout le mois</button>
          </div>
        ) : (
          <Segmented
            options={[{ id: 'todo', label: 'À faire' }, { id: 'done', label: 'Fait ce mois-ci' }]}
            value={mode} onChange={setMode}
          />
        )}

        {listDays.length === 0 && <EmptyState emoji="🗓️" title={mode === 'todo' ? 'Rien de prévu' : 'Rien de fait pour le moment'} />}

        {listDays.map((d) => {
          const occ = selected || mode === 'todo' ? byDay[d] ?? [] : [];
          const dn = selected || mode === 'done' ? doneByDay[d] ?? [] : [];
          if (selected && occ.length === 0 && dn.length === 0) {
            return <EmptyState key={d} emoji="☕" title="Rien ce jour-là" />;
          }
          return (
            <div key={d} className="space-y-2">
              {!selected && <h3 className="pt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{fmtWeekday(d)}</h3>}
              {occ.map((o) => (
                <TaskCard key={o.task.id} task={o.task} today={today} onDone={onDone} onEdit={onEdit}
                  projectedDate={o.isCurrent ? undefined : o.date} />
              ))}
              {dn.map((h) => (
                <div key={h.id} className="flex items-center gap-3 rounded-2xl bg-emerald-50/60 px-3 py-2 ring-1 ring-emerald-100">
                  <Avatar memberId={h.memberId} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-700">{h.taskName}</div>
                    <div className="text-xs text-slate-500">{getRoom(h.roomId).short} · par {getMember(h.memberId).name}</div>
                  </div>
                  <Check size={18} className="text-emerald-500" />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
