import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { MATERIAL_CATEGORIES, ROOMS } from '../data/constants';
import { useHousehold } from '../state/HouseholdContext';
import { warrantyInfo } from '../lib/misc';
import { fmtDate } from '../lib/dates';
import Modal, { Field } from './Modal';

/** Squelette commun : enregistre dans `collection` (warranties | materials). */
function ItemModal({ collection, item, title, valid, form, onClose, children }) {
  const { addItem, updateItem, deleteItem } = useHousehold();
  const isNew = !item?.id;
  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    if (isNew) addItem(collection, form);
    else updateItem(collection, { ...item, ...form });
    onClose();
  };
  const remove = () => {
    if (window.confirm(`Supprimer « ${item.name} » ?`)) {
      deleteItem(collection, item.id);
      onClose();
    }
  };
  return (
    <Modal
      title={`${isNew ? 'Ajouter' : 'Modifier'} ${title}`}
      onClose={onClose}
      footer={
        <>
          {!isNew && (
            <button type="button" onClick={remove} className="btn btn-danger" aria-label="Supprimer">
              <Trash2 size={16} />
            </button>
          )}
          <button type="button" onClick={onClose} className="btn btn-ghost flex-1">Annuler</button>
          <button type="submit" form={`${collection}-form`} className="btn btn-primary flex-1" disabled={!valid}>
            Enregistrer
          </button>
        </>
      }
    >
      <form id={`${collection}-form`} onSubmit={submit} className="space-y-4">{children}</form>
    </Modal>
  );
}

const DURATIONS = [12, 24, 36, 60];

export function WarrantyForm({ item, today, onClose }) {
  const [form, setForm] = useState(() => ({
    name: item?.name ?? '', brand: item?.brand ?? '', store: item?.store ?? '',
    purchaseDate: item?.purchaseDate ?? today, durationMonths: item?.durationMonths ?? 24, notes: item?.notes ?? '',
  }));
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));
  const valid = form.name.trim() && form.purchaseDate && Number(form.durationMonths) > 0;
  const info = valid ? warrantyInfo(form, today) : null;

  return (
    <ItemModal collection="warranties" item={item} title="une garantie" valid={valid}
      form={{ ...form, name: form.name.trim(), durationMonths: Number(form.durationMonths) }} onClose={onClose}>
      <Field label="Appareil">
        <input className="input" value={form.name} onChange={set('name')} placeholder="ex : Lave-vaisselle" autoFocus={!item} required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Marque / modèle"><input className="input" value={form.brand} onChange={set('brand')} /></Field>
        <Field label="Magasin"><input className="input" value={form.store} onChange={set('store')} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date d'achat">
          <input type="date" className="input" value={form.purchaseDate} max={today} onChange={set('purchaseDate')} required />
        </Field>
        <Field label="Durée (mois)">
          <input type="number" min="1" className="input" value={form.durationMonths} onChange={set('durationMonths')} required />
        </Field>
      </div>
      <div className="flex flex-wrap gap-2">
        {DURATIONS.map((d) => (
          <button key={d} type="button" onClick={() => set('durationMonths')(d)}
            className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${Number(form.durationMonths) === d ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-surface text-slate-600 ring-slate-200'}`}>
            {d / 12} an{d > 12 ? 's' : ''}
          </button>
        ))}
      </div>
      {info && (
        <div className="rounded-xl bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
          Garantie jusqu'au <strong>{fmtDate(info.expiry)}</strong>{info.status === 'expired' ? ' (expirée)' : ''}
        </div>
      )}
      <Field label="Notes"><textarea className="input min-h-16" value={form.notes} onChange={set('notes')} placeholder="N° de série, où est la facture…" /></Field>
    </ItemModal>
  );
}

export function MaterialForm({ item, onClose }) {
  const [form, setForm] = useState(() => ({
    category: item?.category ?? 'peinture', name: item?.name ?? '', reference: item?.reference ?? '',
    roomId: item?.roomId ?? '', notes: item?.notes ?? '',
  }));
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const valid = form.name.trim() && form.reference.trim();

  return (
    <ItemModal collection="materials" item={item} title="une référence" valid={valid}
      form={{ ...form, name: form.name.trim(), reference: form.reference.trim() }} onClose={onClose}>
      <Field label="Catégorie">
        <select className="input" value={form.category} onChange={set('category')}>
          {MATERIAL_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
        </select>
      </Field>
      <Field label="Usage">
        <input className="input" value={form.name} onChange={set('name')} placeholder="ex : Murs du salon" autoFocus={!item} required />
      </Field>
      <Field label="Référence / code">
        <input className="input font-mono" value={form.reference} onChange={set('reference')} placeholder="ex : Tollens Gris Perle, E27 806 lm 2700 K" required />
      </Field>
      <Field label="Pièce">
        <select className="input" value={form.roomId} onChange={set('roomId')}>
          <option value="">🏠 Toute la maison</option>
          {ROOMS.map((r) => <option key={r.id} value={r.id}>{r.icon} {r.name}</option>)}
        </select>
      </Field>
      <Field label="Notes"><textarea className="input min-h-16" value={form.notes} onChange={set('notes')} placeholder="Où c'est rangé, quantité restante…" /></Field>
    </ItemModal>
  );
}
