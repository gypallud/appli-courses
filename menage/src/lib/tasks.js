import { MEMBERS } from '../data/constants';
import { addFrequency, diffDays, endOfWeek } from './dates';

/** Prochaine échéance : dernière réalisation + fréquence, ou date de départ si jamais faite. */
export function nextDue(task) {
  if (task.frequency === 'once') return task.lastDone ? null : task.startDate;
  return task.lastDone ? addFrequency(task.lastDone, task.frequency) : task.startDate;
}

/** 'done' | 'overdue' | 'today' | 'week' | 'later' */
export function taskStatus(task, today) {
  const due = nextDue(task);
  if (!due) return 'done';
  const n = diffDays(due, today);
  if (n < 0) return 'overdue';
  if (n === 0) return 'today';
  if (due <= endOfWeek(today)) return 'week';
  return 'later';
}

/** Pour une tâche « tournante », membre dont c'est le tour. */
export const rotationTurn = (task) => MEMBERS[(task.rotationIndex ?? 0) % MEMBERS.length].id;
export const effectiveAssignee = (task) => (task.assignee === 'rotation' ? rotationTurn(task) : task.assignee);

export const byDue = (a, b) => (nextDue(a) ?? '9999').localeCompare(nextDue(b) ?? '9999');

/**
 * Occurrences prévues d'une tâche entre from et to (inclus).
 * Une tâche en retard est considérée comme due aujourd'hui, les suivantes en découlent.
 * isCurrent = occurrence « actionnable » (celle qu'on valide avec « Fait ! »).
 */
export function occurrences(task, from, to, today) {
  let base = nextDue(task);
  if (!base) return [];
  if (base < today) base = today;
  const res = [];
  for (let k = 0; k < 500; k++) {
    const d = task.frequency === 'once' ? base : addFrequency(base, task.frequency, k);
    if (d > to) break;
    if (d >= from) res.push({ task, date: d, isCurrent: k === 0 });
    if (task.frequency === 'once') break;
  }
  return res;
}
