import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { ASSIGNEES, FREQUENCIES, ROOMS, TASK_SUGGESTIONS } from '../data/constants';
import { useHousehold } from '../state/HouseholdContext';
import { nextDue } from '../lib/tasks';
import { fmtFull } from '../lib/dates';
import Modal, { Field } from './Modal';
import { Avatar } from './ui';

/** Création / édition / suppression d'une tâche. `task` absent ou sans id = nouvelle tâche. */
export default function TaskForm({ task, defaultRoom, today, onClose }) {
  const { addTask, updateTask, deleteTask } = useHousehold();
  const isNew = !task?.id;
  const [form, setForm] = useState(() => ({
    name: task?.name ?? '',
    roomId: task?.roomId ?? (defaultRoom && defaultRoom !== 'all' ? defaultRoom : ROOMS[0].id),
    assignee: task?.assignee ?? 'geremy',
    frequency: task?.frequency ?? 'weekly',
    lastDone: task?.lastDone ?? '',
    startDate: task?.startDate ?? today,
    notes: task?.notes ?? '',
  }));
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e?.target ? e.target.value : e }));
  const isOnce = form.frequency === 'once';
  const preview = nextDue({ ...form, lastDone: form.lastDone || null, startDate: form.startDate || today });

  const submit = (e) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return;
    const data = { ...form, name, lastDone: form.lastDone || null, startDate: form.startDate || today };
    if (isNew) addTask(data);
    else updateTask({ ...task, ...data });
    onClose();
  };

  const remove = () => {
    if (window.confirm(`Supprimer la tâche « ${task.name} » ? Le journal garde les réalisations passées.`)) {
      deleteTask(task.id);
      onClose();
    }
  };

  return (
    <Modal
      title={isNew ? 'Nouvelle tâche' : 'Modifier la tâche'}
      onClose={onClose}
      footer={
        <>
          {!isNew && (
            <button type="button" onClick={remove} className="btn btn-danger" aria-label="Supprimer la tâche">
              <Trash2 size={16} />
            </button>
          )}
          <button type="button" onClick={onClose} className="btn btn-ghost flex-1">Annuler</button>
          <button type="submit" form="task-form" className="btn btn-primary flex-1" disabled={!form.name.trim()}>
            Enregistrer
          </button>
        </>
      }
    >
      <form id="task-form" onSubmit={submit} className="space-y-4">
        <Field label="Nom de la tâche">
          <input
            className="input" value={form.name} onChange={set('name')} list="task-suggestions"
            placeholder="ex : Détartrage cafetière" autoFocus={isNew} required
          />
          <datalist id="task-suggestions">
            {TASK_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
          </datalist>
        </Field>

        <Field label="Pièce">
          <select className="input" value={form.roomId} onChange={set('roomId')}>
            {ROOMS.map((r) => <option key={r.id} value={r.id}>{r.icon} {r.name}</option>)}
          </select>
        </Field>

        <div>
          <span className="label">Attribuée à</span>
          <div className="grid grid-cols-4 gap-2">
            {ASSIGNEES.map((m) => (
              <button
                key={m.id} type="button" onClick={() => set('assignee')(m.id)} aria-pressed={form.assignee === m.id}
                className={`flex flex-col items-center gap-1 rounded-xl p-2 text-xs font-medium ring-1 ring-inset transition
                  ${form.assignee === m.id ? `${m.soft} ring-2` : 'bg-surface text-slate-600 ring-slate-200'}`}
              >
                <Avatar memberId={m.id} size="sm" />
                {m.id === 'rotation' ? 'Tournant' : m.name}
              </button>
            ))}
          </div>
          {form.assignee === 'rotation' && (
            <p className="mt-1.5 text-xs text-slate-500">Chacun son tour : Gérémy → Henda → Lucas.</p>
          )}
        </div>

        <div>
          <span className="label">Fréquence</span>
          <div className="flex flex-wrap gap-2">
            {FREQUENCIES.map((f) => (
              <button
                key={f.id} type="button" onClick={() => set('frequency')(f.id)} aria-pressed={form.frequency === f.id}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition
                  ${form.frequency === f.id ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-surface text-slate-600 ring-slate-200'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={isOnce ? 'Faite le' : 'Dernière réalisation'}>
            <input type="date" className="input" value={form.lastDone ?? ''} max={today} onChange={set('lastDone')} />
          </Field>
          {(isOnce || !form.lastDone) && (
            <Field label={isOnce ? 'Date prévue' : 'Première échéance'}>
              <input type="date" className="input" value={form.startDate} onChange={set('startDate')} />
            </Field>
          )}
        </div>

        <div className="rounded-xl bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
          {preview ? <>Prochaine échéance : <strong>{fmtFull(preview)}</strong></> : 'Tâche terminée ✓'}
          {!isNew && <span className="text-indigo-600"> · réalisée {task.doneCount ?? 0} fois</span>}
        </div>

        <Field label="Notes (facultatif)">
          <textarea className="input min-h-16" value={form.notes} onChange={set('notes')} placeholder="Produit à utiliser, astuce…" />
        </Field>
      </form>
    </Modal>
  );
}
