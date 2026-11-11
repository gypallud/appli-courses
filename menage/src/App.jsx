import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CalendarRange, History, ListChecks, Plus, UserRound, Wrench } from 'lucide-react';
import { getMember } from './data/constants';
import { useHousehold } from './state/HouseholdContext';
import { effectiveAssignee, nextDue } from './lib/tasks';
import { endOfWeek, fmtFull, todayISO } from './lib/dates';
import RoomFilter from './components/RoomFilter';
import TaskForm from './components/TaskForm';
import Toast from './components/Toast';
import { Avatar } from './components/ui';
import ProfileView from './views/ProfileView';
import WeekView from './views/WeekView';
import MonthView from './views/MonthView';
import YearView from './views/YearView';
import TasksView from './views/TasksView';
import RegistryView from './views/RegistryView';

const TABS = [
  { id: 'week', label: 'Semaine', icon: CalendarDays },
  { id: 'month', label: 'Mois', icon: CalendarRange },
  { id: 'year', label: 'Année', icon: History },
  { id: 'tasks', label: 'Tâches', icon: ListChecks },
  { id: 'registry', label: 'Registre', icon: Wrench },
];
const TAB_KEY = 'menage-maison.tab';

export default function App() {
  const { state, prefs, completeTask, undoComplete } = useHousehold();
  const today = todayISO();
  const [tab, setTabState] = useState(() => {
    try { return localStorage.getItem(TAB_KEY) || 'week'; } catch { return 'week'; }
  });
  const [room, setRoom] = useState('all');
  const [editor, setEditor] = useState(null); // { task? } quand le formulaire est ouvert
  const [profileOpen, setProfileOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const setTab = (id) => {
    setTabState(id);
    setProfileOpen(false);
    try { localStorage.setItem(TAB_KEY, id); } catch { /* ignore */ }
    window.scrollTo({ top: 0 });
  };

  const handleDone = useCallback((task) => {
    const memberId = effectiveAssignee(task);
    const historyId = completeTask(task.id, memberId, today);
    setToast({
      key: historyId,
      text: `${task.name} · fait par ${getMember(memberId).name}`,
      undo: () => undoComplete(task, historyId),
    });
  }, [completeTask, undoComplete, today]);

  const notify = useCallback((text) => setToast({ key: Date.now(), text }), []);
  const closeToast = useCallback(() => setToast(null), []);
  const openEditor = useCallback((task) => setEditor({ task }), []);

  // Pastilles du filtre pièce : tâches à faire d'ici la fin de semaine
  const roomCounts = useMemo(() => {
    const we = endOfWeek(today);
    const counts = {};
    state.tasks.forEach((t) => {
      const d = nextDue(t);
      if (d && d <= we) counts[t.roomId] = (counts[t.roomId] ?? 0) + 1;
    });
    return counts;
  }, [state.tasks, today]);

  // Thème : classe .dark sur <html> (le script de index.html l'applique déjà avant le premier rendu)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = prefs.theme === 'dark' || (prefs.theme === 'system' && mq.matches);
      document.documentElement.classList.toggle('dark', dark);
      document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#0b1220' : '#f8fafc');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [prefs.theme]);

  const viewProps = { today, room, onDone: handleDone, onEdit: openEditor };
  const showRoomFilter = tab !== 'registry' && !profileOpen;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-slate-50/90 backdrop-blur-md">
        <div className="mx-auto max-w-3xl px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-lg font-bold text-slate-900">🏡 Ménage & Maison</div>
              <div className="truncate text-xs capitalize text-slate-500">{fmtFull(today)}</div>
            </div>
            <button type="button" onClick={() => { setProfileOpen(true); window.scrollTo({ top: 0 }); }}
              className={`flex items-center gap-2 rounded-full p-1 pr-1 transition hover:bg-slate-200 ${profileOpen ? 'bg-slate-200' : ''}`}
              aria-label="Profil et réglages">
              {prefs.me
                ? <Avatar memberId={prefs.me} />
                : <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-slate-500"><UserRound size={20} /></span>}
            </button>
          </div>
          {showRoomFilter && <div className="mt-2"><RoomFilter value={room} onChange={setRoom} counts={roomCounts} /></div>}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-4 pb-32">
        {profileOpen ? <ProfileView today={today} onBack={() => setProfileOpen(false)} /> : (
          <>
            {tab === 'week' && <WeekView {...viewProps} me={prefs.me} onPickProfile={() => setProfileOpen(true)} />}
            {tab === 'month' && <MonthView {...viewProps} />}
            {tab === 'year' && <YearView {...viewProps} />}
            {tab === 'tasks' && <TasksView {...viewProps} onNew={() => setEditor({})} />}
            {tab === 'registry' && <RegistryView today={today} notify={notify} />}
          </>
        )}
      </main>

      {!profileOpen && tab !== 'registry' && tab !== 'tasks' && (
        <button
          type="button" onClick={() => setEditor({})} aria-label="Nouvelle tâche"
          className="fixed right-4 bottom-24 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500 active:scale-95 md:right-[calc(50%-24rem+1rem)]"
        >
          <Plus size={26} />
        </button>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-surface/95 backdrop-blur-md">
        <div className="mx-auto grid max-w-3xl grid-cols-5 pb-[env(safe-area-inset-bottom)]">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id} type="button" onClick={() => setTab(id)} aria-current={tab === id && !profileOpen ? 'page' : undefined}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition ${tab === id && !profileOpen ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Icon size={22} strokeWidth={tab === id && !profileOpen ? 2.4 : 1.8} />
              {label}
            </button>
          ))}
        </div>
      </nav>

      <Toast key={toast?.key} toast={toast} onClose={closeToast} />
      {editor && <TaskForm task={editor.task} defaultRoom={room} today={today} onClose={() => setEditor(null)} />}
    </div>
  );
}
