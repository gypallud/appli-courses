import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import { applyProfiles } from '../data/constants';
import { createDemoData, emptyData } from '../data/demo';
import { todayISO } from '../lib/dates';
import { uid } from '../lib/misc';

const STORAGE_KEY = 'menage-maison.v1';
// Préférences propres à cet appareil (qui utilise le téléphone, thème) : jamais exportées.
const PREFS_KEY = 'menage-maison.prefs';
const DEFAULT_PREFS = { me: null, theme: 'system' };

function loadPrefs() {
  try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY)) }; } catch { return DEFAULT_PREFS; }
}

export function isValidData(d) {
  return d && d.version === 1 && ['tasks', 'history', 'warranties', 'materials'].every((k) => Array.isArray(d[k]));
}

function loadState() {
  try {
    const d = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (isValidData(d)) return d;
  } catch { /* stockage indisponible ou corrompu : on repart des données de démo */ }
  return createDemoData();
}

const replaceById = (list, item) => list.map((x) => (x.id === item.id ? item : x));

function reducer(state, a) {
  switch (a.type) {
    case 'ADD_TASK': return { ...state, tasks: [...state.tasks, a.task] };
    case 'UPDATE_TASK': return { ...state, tasks: replaceById(state.tasks, a.task) };
    case 'DELETE_TASK': return { ...state, tasks: state.tasks.filter((t) => t.id !== a.id) };
    case 'COMPLETE_TASK': {
      const task = state.tasks.find((t) => t.id === a.taskId);
      if (!task) return state;
      const updated = {
        ...task,
        lastDone: a.date,
        doneCount: (task.doneCount ?? 0) + 1,
        rotationIndex: task.assignee === 'rotation' ? (task.rotationIndex ?? 0) + 1 : task.rotationIndex,
      };
      const entry = {
        id: a.historyId, taskId: task.id, taskName: task.name, roomId: task.roomId,
        frequency: task.frequency, memberId: a.memberId, date: a.date,
      };
      return { ...state, tasks: replaceById(state.tasks, updated), history: [entry, ...state.history] };
    }
    case 'UNDO_COMPLETE':
      return {
        ...state,
        tasks: replaceById(state.tasks, a.prevTask),
        history: state.history.filter((h) => h.id !== a.historyId),
      };
    case 'DELETE_HISTORY': return { ...state, history: state.history.filter((h) => h.id !== a.id) };
    case 'ADD_ITEM': return { ...state, [a.collection]: [...state[a.collection], a.item] };
    case 'UPDATE_ITEM': return { ...state, [a.collection]: replaceById(state[a.collection], a.item) };
    case 'DELETE_ITEM': return { ...state, [a.collection]: state[a.collection].filter((x) => x.id !== a.id) };
    case 'UPDATE_PROFILE': return { ...state, profiles: { ...state.profiles, [a.id]: a.profile } };
    // keepProfiles : recharger la démo ou tout effacer ne touche pas aux profils personnalisés
    case 'REPLACE': return a.keepProfiles ? { ...a.data, profiles: state.profiles } : a.data;
    default: return state;
  }
}

const HouseholdCtx = createContext(null);

export function HouseholdProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const [prefs, setPrefsState] = useState(loadPrefs);
  applyProfiles(state.profiles); // avant le rendu des enfants : getMember() renvoie les profils à jour

  const setPrefs = useCallback((patch) => setPrefsState((p) => {
    const next = { ...p, ...patch };
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    return next;
  }), []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* quota / navigation privée */ }
  }, [state]);

  const actions = useMemo(() => ({
    addTask: (data) => dispatch({
      type: 'ADD_TASK',
      task: { ...data, id: uid(), doneCount: 0, rotationIndex: 0, createdAt: todayISO() },
    }),
    updateTask: (task) => dispatch({ type: 'UPDATE_TASK', task }),
    deleteTask: (id) => dispatch({ type: 'DELETE_TASK', id }),
    /** Valide une tâche ; renvoie l'id de l'entrée de journal (pour pouvoir annuler). */
    completeTask: (taskId, memberId, date) => {
      const historyId = uid();
      dispatch({ type: 'COMPLETE_TASK', taskId, memberId, date, historyId });
      return historyId;
    },
    undoComplete: (prevTask, historyId) => dispatch({ type: 'UNDO_COMPLETE', prevTask, historyId }),
    deleteHistory: (id) => dispatch({ type: 'DELETE_HISTORY', id }),
    addItem: (collection, item) => dispatch({ type: 'ADD_ITEM', collection, item: { ...item, id: uid() } }),
    updateItem: (collection, item) => dispatch({ type: 'UPDATE_ITEM', collection, item }),
    deleteItem: (collection, id) => dispatch({ type: 'DELETE_ITEM', collection, id }),
    replaceAll: (data) => dispatch({ type: 'REPLACE', data }),
    updateProfile: (id, profile) => dispatch({ type: 'UPDATE_PROFILE', id, profile }),
    resetDemo: () => dispatch({ type: 'REPLACE', data: createDemoData(), keepProfiles: true }),
    clearAll: () => dispatch({ type: 'REPLACE', data: emptyData(), keepProfiles: true }),
  }), []);

  const value = useMemo(() => ({ state, prefs, setPrefs, ...actions }), [state, prefs, setPrefs, actions]);
  return <HouseholdCtx.Provider value={value}>{children}</HouseholdCtx.Provider>;
}

export const useHousehold = () => useContext(HouseholdCtx);
