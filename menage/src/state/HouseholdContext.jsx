import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { applyProfiles } from '../data/constants';
import { createDemoData, emptyData } from '../data/demo';
import { todayISO } from '../lib/dates';
import { uid } from '../lib/misc';
import { SYNC_URL, allChanges, buildData, diffData, send } from '../lib/sync';

const STORAGE_KEY = 'menage-maison.v1';
// Préférences propres à cet appareil (qui utilise le téléphone, thème) : jamais exportées ni synchronisées.
const PREFS_KEY = 'menage-maison.prefs';
const DEFAULT_PREFS = { me: null, theme: 'system' };
const SYNC_EVERY_MS = 60_000;
const SYNC_DELAY_MS = 800; // regroupe les modifications rapprochées avant l'envoi

function loadPrefs() {
  try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY)) }; } catch { return DEFAULT_PREFS; }
}

export function isValidData(d) {
  return d && d.version === 1 && ['tasks', 'history', 'warranties', 'materials'].every((k) => Array.isArray(d[k]));
}

/*
 * État = données du foyer + file des modifications à envoyer (outbox) + sync.joined
 * (ce téléphone a déjà rejoint les données partagées). outbox et sync sont enregistrés avec le reste :
 * une modification faite hors ligne part à la prochaine connexion, même après fermeture de l'appli.
 */
function loadState() {
  try {
    const d = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (isValidData(d)) return { profiles: {}, outbox: {}, sync: { joined: false }, ...d };
  } catch { /* stockage indisponible ou corrompu : on repart des données de démo */ }
  return { ...createDemoData(), outbox: {}, sync: { joined: false } };
}

/** Données à exporter : sans la file d'envoi ni l'état de synchro. */
export const exportable = ({ outbox, sync, ...data }) => data;

const replaceById = (list, item) => list.map((x) => (x.id === item.id ? item : x));

function dataReducer(state, a) {
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
    case 'REPLACE': {
      const data = exportable(a.data);
      return { ...state, ...data, profiles: a.keepProfiles ? state.profiles : (data.profiles ?? {}) };
    }
    default: return state;
  }
}

function reducer(state, a) {
  switch (a.type) {
    // Réponse du serveur : données partagées + modifications locales parties pendant l'envoi
    case 'SYNC_RESULT': {
      const outbox = { ...state.outbox };
      if (a.first) {
        // Ce téléphone rejoint des données existantes : sa démo locale est abandonnée
        for (const k of Object.keys(outbox)) delete outbox[k];
      } else {
        // Retire ce que le serveur a reçu, sauf ce qui a été modifié de nouveau entre-temps
        for (const [k, at] of Object.entries(a.sent)) if (outbox[k]?.at === at) delete outbox[k];
      }
      return { ...state, ...buildData(a.items, outbox), outbox, sync: { joined: true } };
    }
    // Premier téléphone de la maison (tableur vide) : il envoie toutes ses données
    case 'SYNC_SEED':
      return { ...state, outbox: { ...allChanges(state, a.at), ...state.outbox }, sync: { joined: true } };
    default: {
      const next = dataReducer(state, a);
      if (next === state) return state;
      return { ...next, outbox: { ...state.outbox, ...diffData(state, next, a.at) }, sync: state.sync };
    }
  }
}

/** Envoi / réception avec le tableur : au démarrage, toutes les minutes, au retour sur l'appli et après chaque modification. */
function useSync(state, dispatch) {
  const [status, setStatus] = useState({ phase: SYNC_URL ? 'idle' : 'off', at: null, error: null });
  const stateRef = useRef(state);
  stateRef.current = state;
  const busy = useRef(false);
  const again = useRef(false);

  const syncNow = useCallback(async () => {
    if (!SYNC_URL) return;
    if (busy.current) { again.current = true; return; }
    busy.current = true;
    setStatus((s) => ({ ...s, phase: 'syncing' }));
    try {
      const s = stateRef.current;
      const changes = s.sync.joined ? Object.values(s.outbox) : [];
      const out = await send({ action: 'menageSync', changes });
      if (!s.sync.joined && out.items.length === 0) {
        dispatch({ type: 'SYNC_SEED', at: Date.now() });
        again.current = true;
      } else {
        const sent = Object.fromEntries(changes.map((c) => [`${c.type}:${c.id}`, c.at]));
        dispatch({ type: 'SYNC_RESULT', items: out.items, sent, first: !s.sync.joined });
      }
      setStatus({ phase: 'ok', at: Date.now(), error: null });
    } catch (e) {
      setStatus((s) => ({ ...s, phase: navigator.onLine === false ? 'offline' : 'error', error: String(e?.message ?? e) }));
    } finally {
      busy.current = false;
      if (again.current) {
        again.current = false;
        setTimeout(syncNow, 0);
      }
    }
  }, [dispatch]);

  // Démarrage, minuterie, retour au premier plan, retour du réseau
  useEffect(() => {
    if (!SYNC_URL) return undefined;
    syncNow();
    const timer = setInterval(() => { if (!document.hidden) syncNow(); }, SYNC_EVERY_MS);
    const onVisible = () => { if (!document.hidden) syncNow(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', syncNow);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', syncNow);
    };
  }, [syncNow]);

  // Peu après chaque modification locale
  const pending = Object.keys(state.outbox).length;
  useEffect(() => {
    if (!SYNC_URL || !pending || !state.sync.joined) return undefined;
    const t = setTimeout(syncNow, SYNC_DELAY_MS);
    return () => clearTimeout(t);
  }, [state.outbox, state.sync.joined, pending, syncNow]);

  return { ...status, pending, syncNow };
}

const HouseholdCtx = createContext(null);

export function HouseholdProvider({ children }) {
  const [state, rawDispatch] = useReducer(reducer, undefined, loadState);
  const [prefs, setPrefsState] = useState(loadPrefs);
  applyProfiles(state.profiles); // avant le rendu des enfants : getMember() renvoie les profils à jour

  // Chaque action locale est horodatée : la modification la plus récente gagne lors de la synchro
  const dispatch = useCallback((a) => rawDispatch({ at: Date.now(), ...a }), []);
  const sync = useSync(state, dispatch);

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
  }), [dispatch]);

  const value = useMemo(() => ({ state, prefs, setPrefs, sync, ...actions }), [state, prefs, setPrefs, sync, actions]);
  return <HouseholdCtx.Provider value={value}>{children}</HouseholdCtx.Provider>;
}

export const useHousehold = () => useContext(HouseholdCtx);
