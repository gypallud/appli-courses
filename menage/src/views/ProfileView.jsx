import { ArrowLeft, Monitor, Moon, RotateCcw, Sun } from 'lucide-react';
import { AVATAR_EMOJIS, COLORS, MEMBERS, getMember, memberDefaults } from '../data/constants';
import { useHousehold } from '../state/HouseholdContext';
import { effectiveAssignee, nextDue } from '../lib/tasks';
import DataSection from '../components/DataSection';
import { Avatar, SectionTitle } from '../components/ui';

const THEMES = [
  { id: 'light', label: 'Clair', icon: Sun },
  { id: 'dark', label: 'Sombre', icon: Moon },
  { id: 'system', label: 'Auto', icon: Monitor },
];

/** Profil de la personne qui utilise l'appareil, apparence et données. */
export default function ProfileView({ today, onBack }) {
  const { state, prefs, setPrefs, updateProfile } = useHousehold();
  const me = prefs.me ? getMember(prefs.me) : null;
  const profile = (me && state.profiles?.[me.id]) ?? {};
  const patch = (p) => updateProfile(me.id, { ...profile, ...p });
  const takenColors = MEMBERS.filter((m) => m.id !== me?.id).map((m) => m.color);

  const year = today.slice(0, 4);
  const myTasks = me ? state.tasks.filter((t) => nextDue(t) && effectiveAssignee(t) === me.id).length : 0;
  const myDone = me ? state.history.filter((h) => h.memberId === me.id && h.date.startsWith(year)).length : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onBack} className="-ml-2 rounded-full p-2 hover:bg-slate-200" aria-label="Retour">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-slate-900">Profil & réglages</h1>
      </div>

      <section>
        <SectionTitle>Qui utilise ce téléphone ?</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          {MEMBERS.map((m) => {
            const active = prefs.me === m.id;
            return (
              <button key={m.id} type="button" onClick={() => setPrefs({ me: m.id })} aria-pressed={active}
                className={`card flex flex-col items-center gap-1.5 p-3 transition ${active ? `ring-2 ${m.soft}` : ''}`}>
                <Avatar memberId={m.id} size="lg" />
                <span className="truncate text-sm font-semibold">{m.name}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-slate-500">Tes tâches s'affichent en premier dans la vue Semaine. Ce choix reste sur cet appareil.</p>
      </section>

      {me && (
        <section>
          <SectionTitle right={(profile.name || profile.emoji || profile.color) && (
            <button type="button" onClick={() => updateProfile(me.id, {})} className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700">
              <RotateCcw size={12} />Par défaut
            </button>
          )}>Mon profil</SectionTitle>
          <div className="card space-y-5 p-4">
            <div className="flex items-center gap-4">
              <Avatar memberId={me.id} size="xl" />
              <div className="min-w-0">
                <div className="truncate text-lg font-bold text-slate-900">{me.name}</div>
                <div className="text-sm text-slate-500">{myTasks} tâches attribuées · {myDone} faites en {year}</div>
              </div>
            </div>

            <label className="block">
              <span className="label">Prénom affiché</span>
              <input className="input" value={profile.name ?? me.name} maxLength={20}
                placeholder={memberDefaults(me.id).name} onChange={(e) => patch({ name: e.target.value })} />
            </label>

            <div>
              <span className="label">Avatar</span>
              <div className="grid grid-cols-8 gap-1.5">
                {AVATAR_EMOJIS.map((e) => {
                  const active = (profile.emoji || '') === e;
                  return (
                    <button key={e || 'initiale'} type="button" onClick={() => patch({ emoji: e })} aria-pressed={active}
                      aria-label={e ? `Avatar ${e}` : 'Initiale'}
                      className={`flex aspect-square items-center justify-center rounded-xl text-xl transition
                        ${active ? 'bg-slate-900 text-surface' : 'bg-slate-100 hover:bg-slate-200'}`}>
                      {e || <span className="text-sm font-bold">{me.initial}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <span className="label">Couleur</span>
              <div className="grid grid-cols-8 gap-1.5">
                {Object.entries(COLORS).map(([id, c]) => {
                  const active = me.color === id;
                  const taken = takenColors.includes(id);
                  return (
                    <button key={id} type="button" disabled={taken} onClick={() => patch({ color: id })} aria-pressed={active}
                      aria-label={`${c.label}${taken ? ' (déjà prise)' : ''}`} title={taken ? `${c.label} : déjà prise` : c.label}
                      className={`flex aspect-square items-center justify-center rounded-full ${c.bar} transition
                        ${active ? 'ring-4 ring-slate-300 ring-offset-2 ring-offset-surface' : ''} ${taken ? 'opacity-25' : 'hover:scale-110'}`}>
                      {active && <span className="h-2 w-2 rounded-full bg-white" />}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-xs text-slate-500">Une couleur par personne, pour repérer qui fait quoi.</p>
            </div>
          </div>
        </section>
      )}

      <section>
        <SectionTitle>Apparence</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map(({ id, label, icon: Icon }) => {
            const active = prefs.theme === id;
            return (
              <button key={id} type="button" onClick={() => setPrefs({ theme: id })} aria-pressed={active}
                className={`card flex flex-col items-center gap-1.5 p-3 text-sm font-medium transition
                  ${active ? 'ring-2 ring-indigo-500 text-indigo-700' : 'text-slate-600'}`}>
                <Icon size={22} />
                {label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-slate-500">« Auto » suit le réglage clair / sombre du téléphone.</p>
      </section>

      <section>
        <SectionTitle>Données</SectionTitle>
        <DataSection />
      </section>
    </div>
  );
}
