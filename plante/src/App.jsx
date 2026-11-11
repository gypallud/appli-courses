import { useCallback, useMemo, useState } from 'react';
import Sidebar from './components/layout/Sidebar';
import Toast from './components/ui/Toast';
import PlantDetail from './components/plants/PlantDetail';
import PlantForm from './components/plants/PlantForm';
import SettingsModal from './components/settings/SettingsModal';
import PlantsView from './views/PlantsView';
import PlannerView from './views/PlannerView';
import DiagnosticView from './views/DiagnosticView';
import { usePlants } from './hooks/usePlants';
import { useSeason } from './hooks/useSeason';
import { useLocalStorage } from './hooks/useLocalStorage';
import { waterStatus } from './utils/care';
import { formatShort } from './utils/dates';

export default function App() {
  const [view, setView] = useState('plants');
  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState(null); // null | 'new' | id
  const [toast, setToast] = useState(null);
  const [draft, setDraft] = useState(null); // { photo, idImage } quand on part d'une photo
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useLocalStorage('chlorophylle.apiKey.v1', '');

  const { plants, add, update, remove, water, fertilize, resetDemo } = usePlants();
  const seasonApi = useSeason();
  const { season } = seasonApi;

  const notify = useCallback((message, icon = 'check') => setToast({ message, icon, id: Date.now() }), []);
  const clearToast = useCallback(() => setToast(null), []);

  const selected = plants.find((p) => p.id === selectedId);
  const editingPlant = editing && editing !== 'new' ? plants.find((p) => p.id === editing) : null;
  const locations = useMemo(() => [...new Set(plants.map((p) => p.location).filter(Boolean))], [plants]);

  const toWaterCount = useMemo(
    () => plants.filter((p) => waterStatus(p, season).daysUntil <= 0).length,
    [plants, season],
  );

  const handleWater = (id) => {
    const p = plants.find((x) => x.id === id);
    water(id);
    const next = waterStatus({ ...p, lastWatered: undefined }, season).next;
    notify(`${p.name} arrosée · prochain arrosage le ${formatShort(next)}`, 'droplet');
  };

  const handleFertilize = (id) => {
    const p = plants.find((x) => x.id === id);
    fertilize(id);
    notify(`Engrais apporté à ${p.name}`, 'sprout');
  };

  const handleSave = (data) => {
    if (editingPlant) {
      update(editingPlant.id, data);
      notify(`Fiche de ${data.name} mise à jour`);
    } else {
      const created = add(data);
      notify(`${created.name} a rejoint votre jungle 🌱`, 'leaf');
    }
    closeForm();
  };

  const closeForm = () => {
    setEditing(null);
    setDraft(null);
  };

  const navigate = (id) => (id === 'settings' ? setShowSettings(true) : setView(id));

  const handleDelete = (id) => {
    const p = plants.find((x) => x.id === id);
    remove(id);
    setSelectedId(null);
    notify(`${p.name} a été supprimée`, 'trash');
  };

  return (
    <div className="app">
      <Sidebar view={view} onNavigate={navigate} season={season} badges={{ plants: toWaterCount }} />

      <main className="main">
        {view === 'plants' && (
          <PlantsView
            plants={plants}
            season={season}
            onOpen={setSelectedId}
            onWater={handleWater}
            onAdd={() => setEditing('new')}
            onIdentifyPhoto={(photoDraft) => {
              setDraft(photoDraft);
              setEditing('new');
              if (!apiKey) setShowSettings(true);
            }}
            onResetDemo={resetDemo}
          />
        )}
        {view === 'planner' && (
          <PlannerView
            plants={plants}
            seasonApi={seasonApi}
            onWater={handleWater}
            onFertilize={handleFertilize}
            onOpen={setSelectedId}
          />
        )}
        {view === 'diagnostic' && <DiagnosticView plants={plants} onUpdate={update} notify={notify} />}

        <footer className="app-footer">
          Données enregistrées localement dans votre navigateur ·{' '}
          <button
            className="link-btn"
            onClick={() => {
              if (window.confirm('Remplacer vos plantes par les 5 exemples de démonstration ?')) {
                resetDemo();
                notify('Exemples de démonstration rechargés', 'refresh');
              }
            }}
          >
            Recharger les exemples
          </button>
        </footer>
      </main>

      {selected && !editing && (
        <PlantDetail
          plant={selected}
          season={season}
          onClose={() => setSelectedId(null)}
          onWater={handleWater}
          onFertilize={handleFertilize}
          onUpdate={update}
          onEdit={(id) => setEditing(id)}
          onDelete={handleDelete}
        />
      )}

      {editing && (
        <PlantForm
          initial={editingPlant ?? (draft ? { photo: draft.photo } : undefined)}
          initialIdImage={draft?.idImage}
          autoIdentify={Boolean(draft)}
          apiKey={apiKey}
          locations={locations}
          onSave={handleSave}
          onClose={closeForm}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {showSettings && (
        <SettingsModal
          apiKey={apiKey}
          onSave={(k) => {
            setApiKey(k);
            notify(k ? 'Clé API enregistrée' : 'Clé API retirée', 'key');
          }}
          onClose={() => setShowSettings(false)}
        />
      )}

      <Toast toast={toast} onDone={clearToast} />
    </div>
  );
}
