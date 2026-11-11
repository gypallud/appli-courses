import { useRef } from 'react';
import { Download, RotateCcw, Trash2, Upload } from 'lucide-react';
import { isValidData, useHousehold } from '../state/HouseholdContext';
import { todayISO } from '../lib/dates';

function Row({ icon: Icon, title, desc, onClick, danger }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl bg-surface p-3 text-left ring-1 ring-inset transition hover:bg-slate-50 ${danger ? 'ring-red-200' : 'ring-slate-200'}`}>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${danger ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
        <Icon size={18} />
      </span>
      <span>
        <span className={`block font-medium ${danger ? 'text-red-700' : 'text-slate-800'}`}>{title}</span>
        <span className="block text-xs text-slate-500">{desc}</span>
      </span>
    </button>
  );
}

/** Sauvegarde / restauration / réinitialisation des données du foyer. */
export default function DataSection() {
  const { state, replaceAll, resetDemo, clearAll } = useHousehold();
  const fileRef = useRef(null);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `menage-sauvegarde-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importData = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!isValidData(data)) throw new Error('format');
      if (window.confirm(`Remplacer toutes les données par « ${file.name} » ?`)) replaceAll(data);
    } catch {
      window.alert("Ce fichier n'est pas une sauvegarde valide.");
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-500">
        Tout est enregistré sur cet appareil : {state.tasks.length} tâches, {state.history.length} entrées de journal,
        {' '}{state.warranties.length} garanties, {state.materials.length} références.
      </p>
      <Row icon={Download} title="Exporter une sauvegarde" desc="Fichier JSON à garder ou à importer sur un autre téléphone" onClick={exportData} />
      <Row icon={Upload} title="Importer une sauvegarde" desc="Remplace les données de cet appareil" onClick={() => fileRef.current?.click()} />
      <Row icon={RotateCcw} title="Recharger les données de démo" desc="Remet l'exemple (les profils sont gardés)" danger
        onClick={() => window.confirm('Effacer vos données et recharger la démo ?') && resetDemo()} />
      <Row icon={Trash2} title="Tout effacer" desc="Repartir d'une maison vide (les profils sont gardés)" danger
        onClick={() => window.confirm('Effacer définitivement toutes les tâches, le journal et le registre ?') && clearAll()} />
      <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={importData} />
    </div>
  );
}
