import { useMemo, useState } from 'react';
import { Copy, Plus, Search } from 'lucide-react';
import { MATERIAL_CATEGORIES, getRoom } from '../data/constants';
import { useHousehold } from '../state/HouseholdContext';
import { warrantyInfo } from '../lib/misc';
import { fmtDate } from '../lib/dates';
import { MaterialForm, WarrantyForm } from '../components/RegistryForms';
import { EmptyState, Segmented, StatTile } from '../components/ui';

/** Registre technique : garanties d'appareils et références de matériaux DIY. */
export default function RegistryView({ today, notify }) {
  const [tab, setTab] = useState('warranties');
  const [editing, setEditing] = useState(null); // { item? }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Registre technique</h1>
        <p className="text-sm text-slate-500">Garanties des appareils et références pour le bricolage</p>
      </div>
      <Segmented
        options={[{ id: 'warranties', label: '🛡️ Garanties' }, { id: 'materials', label: '🧰 Matériaux DIY' }]}
        value={tab} onChange={setTab}
      />
      {tab === 'warranties'
        ? <Warranties today={today} onEdit={(item) => setEditing({ item })} />
        : <Materials notify={notify} onEdit={(item) => setEditing({ item })} />}

      {editing && tab === 'warranties' && <WarrantyForm item={editing.item} today={today} onClose={() => setEditing(null)} />}
      {editing && tab === 'materials' && <MaterialForm item={editing.item} onClose={() => setEditing(null)} />}
    </div>
  );
}

const STATUS = {
  active: { label: 'Active', pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200', bar: 'bg-emerald-500' },
  soon: { label: 'Expire bientôt', pill: 'bg-amber-50 text-amber-800 ring-amber-200', bar: 'bg-amber-500' },
  expired: { label: 'Expirée', pill: 'bg-slate-100 text-slate-500 ring-slate-200', bar: 'bg-slate-300' },
};
const ORDER = { soon: 0, active: 1, expired: 2 };

function Warranties({ today, onEdit }) {
  const { state } = useHousehold();
  const list = useMemo(() => state.warranties
    .map((w) => ({ w, info: warrantyInfo(w, today) }))
    .sort((a, b) => ORDER[a.info.status] - ORDER[b.info.status] || a.info.left - b.info.left), [state.warranties, today]);
  const count = (s) => list.filter((x) => x.info.status === s).length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <StatTile label="Actives" value={count('active')} tone="emerald" />
        <StatTile label="Bientôt finies" value={count('soon')} tone={count('soon') ? 'amber' : 'slate'} />
        <StatTile label="Expirées" value={count('expired')} />
      </div>
      <button type="button" onClick={() => onEdit(undefined)} className="btn btn-primary w-full"><Plus size={18} />Ajouter une garantie</button>
      {list.length === 0 && <EmptyState emoji="🛡️" title="Aucune garantie enregistrée" />}
      {list.map(({ w, info }) => {
        const s = STATUS[info.status];
        return (
          <button key={w.id} type="button" onClick={() => onEdit(w)} className="card block w-full p-4 text-left transition hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-slate-900">{w.name}</div>
                <div className="truncate text-sm text-slate-500">{[w.brand, w.store].filter(Boolean).join(' · ')}</div>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${s.pill}`}>{s.label}</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${s.bar}`} style={{ width: `${info.progress * 100}%` }} />
            </div>
            <div className="mt-1.5 flex justify-between text-xs text-slate-500">
              <span>Achat {fmtDate(w.purchaseDate)} · {w.durationMonths} mois</span>
              <span className="tabular-nums">
                {info.status === 'expired' ? `Fin ${fmtDate(info.expiry)}` : `Jusqu'au ${fmtDate(info.expiry)}`}
              </span>
            </div>
            {w.notes && <p className="mt-2 text-xs text-slate-500">📝 {w.notes}</p>}
          </button>
        );
      })}
    </div>
  );
}

function Materials({ onEdit, notify }) {
  const { state } = useHousehold();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const filtered = state.materials.filter((m) => !q
    || [m.name, m.reference, m.notes, getRoom(m.roomId).name].some((s) => s?.toLowerCase().includes(q)));

  const copy = async (e, text) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      notify('Référence copiée');
    } catch {
      notify('Copie impossible sur ce navigateur');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <label className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" type="search" placeholder="Peinture, ampoule, pièce…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <button type="button" onClick={() => onEdit(undefined)} className="btn btn-primary" aria-label="Ajouter une référence"><Plus size={18} /></button>
      </div>
      {filtered.length === 0 && <EmptyState emoji="🧰" title={q ? 'Aucun résultat' : 'Aucune référence enregistrée'} />}
      {MATERIAL_CATEGORIES.map((c) => {
        const items = filtered.filter((m) => m.category === c.id);
        if (!items.length) return null;
        return (
          <section key={c.id}>
            <h2 className="mb-2 font-semibold text-slate-800">{c.icon} {c.label}</h2>
            <div className="space-y-2">
              {items.map((m) => {
                const room = getRoom(m.roomId);
                return (
                  <div key={m.id} role="button" tabIndex={0} onClick={() => onEdit(m)}
                    onKeyDown={(e) => e.key === 'Enter' && onEdit(m)}
                    className="card flex cursor-pointer items-start gap-3 p-3 transition hover:shadow-md">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">{m.name}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">{room.icon} {room.short}</span>
                      </div>
                      <div className="mt-1 break-words font-mono text-sm text-indigo-700">{m.reference}</div>
                      {m.notes && <p className="mt-1 text-xs text-slate-500">{m.notes}</p>}
                    </div>
                    <button type="button" onClick={(e) => copy(e, m.reference)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Copier la référence">
                      <Copy size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
