import { useState } from 'react';
import { Check } from 'lucide-react';
import { getFreq, getMember, getRoom } from '../data/constants';
import { effectiveAssignee, nextDue, taskStatus } from '../lib/tasks';
import { fmtWeekday } from '../lib/dates';
import { Avatar, StatusPill } from './ui';

/**
 * Carte de tâche : touche la carte pour éditer, bouton « Fait ! » pour valider en 1 clic.
 * `projectedDate` : occurrence future (vue Mois) → pas de bouton, juste la date prévue.
 */
export default function TaskCard({ task, today, onDone, onEdit, projectedDate, hideRoom }) {
  const [popping, setPopping] = useState(false);
  const due = nextDue(task);
  const status = taskStatus(task, today);
  const who = effectiveAssignee(task);
  const member = getMember(who);
  const room = getRoom(task.roomId);
  const isRotation = task.assignee === 'rotation';

  const handleDone = () => {
    setPopping(true);
    setTimeout(() => setPopping(false), 350);
    onDone(task);
  };

  return (
    <div className={`card flex items-center gap-3 border-l-4 p-3 ${member.border} ${projectedDate ? 'opacity-70' : ''}`}>
      <Avatar memberId={who} rotation={isRotation} />
      <button type="button" onClick={() => onEdit(task)} className="min-w-0 flex-1 text-left">
        <div className="truncate font-medium text-slate-900">{task.name}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-slate-500">
          {!hideRoom && <span className="truncate">{room.icon} {room.short}</span>}
          {!hideRoom && <span aria-hidden>·</span>}
          <span>{getFreq(task.frequency).short}</span>
          {isRotation && <><span aria-hidden>·</span><span>tour de {member.name}</span></>}
        </div>
        <div className="mt-1.5">
          {projectedDate
            ? <span className="text-xs text-slate-500">Prévu {fmtWeekday(projectedDate)}</span>
            : <StatusPill status={status} due={due} today={today} />}
        </div>
      </button>
      {!projectedDate && status !== 'done' && (
        <button
          type="button"
          onClick={handleDone}
          className={`flex min-h-11 shrink-0 items-center gap-1 rounded-xl bg-emerald-500 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 active:scale-95 ${popping ? 'animate-pop' : ''}`}
          aria-label={`Marquer « ${task.name} » comme fait`}
        >
          <Check size={18} strokeWidth={3} />
          Fait !
        </button>
      )}
    </div>
  );
}
