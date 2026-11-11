import { getMember } from '../data/constants';
import { relativeDue } from '../lib/dates';

const SIZES = { sm: 'h-6 w-6 text-[11px]', md: 'h-9 w-9 text-sm', lg: 'h-11 w-11 text-base', xl: 'h-20 w-20 text-3xl' };
const EMOJI_SIZES = { sm: 'text-sm', md: 'text-lg', lg: 'text-xl', xl: 'text-4xl' };

/** Pastille colorée avec l'emoji ou l'initiale du membre ; `rotation` ajoute un badge ↻. */
export function Avatar({ memberId, size = 'md', rotation = false, className = '' }) {
  const m = getMember(memberId);
  return (
    <span className={`relative inline-flex shrink-0 ${className}`} title={m.name}>
      <span className={`inline-flex items-center justify-center rounded-full font-bold ${SIZES[size]} ${m.avatar}`}>
        {m.emoji ? <span className={`leading-none ${EMOJI_SIZES[size]}`}>{m.emoji}</span> : m.initial}
      </span>
      {rotation && (
        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-violet-500 text-[10px] font-bold text-white ring-2 ring-surface">
          ↻
        </span>
      )}
    </span>
  );
}

const PILL = {
  overdue: 'bg-red-50 text-red-700 ring-red-200',
  today: 'bg-amber-50 text-amber-800 ring-amber-200',
  week: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  later: 'bg-slate-50 text-slate-600 ring-slate-200',
  done: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
};

export function StatusPill({ status, due, today }) {
  const text = status === 'done' ? 'Terminée' : relativeDue(due, today);
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${PILL[status]}`}>
      {text}
    </span>
  );
}

const TONES = {
  red: 'text-red-500', amber: 'text-amber-500', indigo: 'text-indigo-500',
  emerald: 'text-emerald-500', slate: 'text-slate-700',
};

export function StatTile({ label, value, tone = 'slate' }) {
  return (
    <div className="card px-3 py-2.5">
      <div className={`text-2xl font-bold tabular-nums ${TONES[tone]}`}>{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

/** Puce de filtre horizontale. */
export function Chip({ active, onClick, children, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition
        ${active ? 'bg-slate-900 text-surface ring-slate-900' : 'bg-surface text-slate-600 ring-slate-200 hover:bg-slate-50'} ${className}`}
    >
      {children}
    </button>
  );
}

/** Filtre par membre (Tous / Gérémy / Henda / Lucas [/ Tournant]). */
export function MemberFilter({ value, onChange, members }) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
      <Chip active={value === 'all'} onClick={() => onChange('all')}>Tous</Chip>
      {members.map((m) => (
        <Chip key={m.id} active={value === m.id} onClick={() => onChange(m.id)}>
          <span className={`h-2.5 w-2.5 rounded-full ${m.dot}`} />
          {m.name}
        </Chip>
      ))}
    </div>
  );
}

/** Contrôle segmenté (choix exclusif). */
export function Segmented({ options, value, onChange, className = '' }) {
  return (
    <div className={`flex gap-1 rounded-xl bg-slate-100 p-1 ${className}`} role="tablist">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={value === o.id}
          onClick={() => onChange(o.id)}
          className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition
            ${value === o.id ? 'bg-surface text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SectionTitle({ children, right, className = '' }) {
  return (
    <div className={`mb-2 flex items-center justify-between gap-2 ${className}`}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{children}</h2>
      {right}
    </div>
  );
}

export function EmptyState({ emoji = '🎉', title, children }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center">
      <div className="text-2xl">{emoji}</div>
      <div className="mt-1 font-medium text-slate-700">{title}</div>
      {children && <div className="mt-0.5 text-sm text-slate-500">{children}</div>}
    </div>
  );
}
