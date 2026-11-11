import { useMemo, useRef, useState } from 'react';
import Icon from '../components/ui/Icon';
import PlantCard from '../components/plants/PlantCard';
import { buildSchedule, SEASONS, waterStatus } from '../utils/care';
import { capitalize, formatLong, today } from '../utils/dates';
import { preparePhoto } from '../utils/image';

function StatCard({ icon, label, value, tone, sub }) {
  return (
    <div className={`stat-card stat-card--${tone}`}>
      <span className="stat-card__icon">
        <Icon name={icon} size={20} />
      </span>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
        {sub && <small>{sub}</small>}
      </div>
    </div>
  );
}

export default function PlantsView({ plants, season, onOpen, onWater, onAdd, onIdentifyPhoto, onResetDemo }) {
  const photoRef = useRef(null);
  const [photoError, setPhotoError] = useState('');

  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setPhotoError('');
      onIdentifyPhoto(await preparePhoto(file));
    } catch {
      setPhotoError('Impossible de lire cette image.');
    }
  };
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('Toutes');

  const locations = useMemo(
    () => ['Toutes', ...Array.from(new Set(plants.map((p) => p.location).filter(Boolean))).sort()],
    [plants],
  );

  const stats = useMemo(() => {
    const statuses = plants.map((p) => waterStatus(p, season));
    const toWater = statuses.filter((s) => s.daysUntil <= 0).length;
    const fertWeek = buildSchedule(plants, season).reduce(
      (n, d) => n + d.tasks.filter((t) => t.type === 'fertilize').length,
      0,
    );
    return { toWater, fertWeek };
  }, [plants, season]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return plants
      .filter((p) => location === 'Toutes' || p.location === location)
      .filter((p) => !q || `${p.name} ${p.variety} ${p.location}`.toLowerCase().includes(q))
      .map((p) => ({ p, d: waterStatus(p, season).daysUntil }))
      .sort((a, b) => a.d - b.d)
      .map(({ p }) => p);
  }, [plants, query, location, season]);

  return (
    <div className="view">
      <header className="view__header">
        <div>
          <p className="eyebrow">{capitalize(formatLong(today()))}</p>
          <h1>Mes plantes</h1>
        </div>
        <div className="view__actions">
          <button className="btn btn--ai" onClick={() => photoRef.current?.click()}>
            <Icon name="camera" size={17} /> Identifier par photo
          </button>
          <button className="btn btn--primary" onClick={onAdd}>
            <Icon name="plus" size={17} /> Ajouter une plante
          </button>
          <input ref={photoRef} type="file" accept="image/*" capture="environment" hidden onChange={onPhoto} />
        </div>
      </header>

      {photoError && (
        <p className="form-error">
          <Icon name="alert" size={15} /> {photoError}
        </p>
      )}

      <section className="stats">
        <StatCard icon="leaf" label="plantes suivies" value={plants.length} tone="green" />
        <StatCard
          icon="droplet"
          label="à arroser aujourd'hui"
          value={stats.toWater}
          tone={stats.toWater ? 'blue' : 'green'}
          sub={stats.toWater ? 'retards inclus' : 'Tout le monde est hydraté'}
        />
        <StatCard
          icon={season === 'warm' ? 'sprout' : 'snowflake'}
          label={season === 'warm' ? 'engrais cette semaine' : 'engrais en pause'}
          value={season === 'warm' ? stats.fertWeek : '—'}
          tone={season === 'warm' ? 'orange' : 'cold'}
          sub={SEASONS[season].label}
        />
      </section>

      <section className="toolbar">
        <label className="search">
          <Icon name="search" size={16} />
          <input
            type="search"
            placeholder="Rechercher une plante…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="chips" role="tablist" aria-label="Filtrer par emplacement">
          {locations.map((l) => (
            <button
              key={l}
              role="tab"
              aria-selected={location === l}
              className={`chip ${location === l ? 'is-active' : ''}`}
              onClick={() => setLocation(l)}
            >
              {l}
            </button>
          ))}
        </div>
      </section>

      {visible.length ? (
        <section className="plant-grid">
          {visible.map((p) => (
            <PlantCard key={p.id} plant={p} season={season} onOpen={onOpen} onWater={onWater} />
          ))}
        </section>
      ) : (
        <div className="empty">
          <span className="empty__icon">
            <Icon name="pot" size={34} />
          </span>
          <h3>{plants.length ? 'Aucune plante ne correspond' : 'Votre jungle est vide'}</h3>
          <p>
            {plants.length
              ? 'Essayez un autre filtre ou une autre recherche.'
              : 'Ajoutez votre première plante ou rechargez les exemples.'}
          </p>
          {!plants.length && (
            <div className="empty__actions">
              <button className="btn btn--primary" onClick={onAdd}>
                <Icon name="plus" size={16} /> Ajouter une plante
              </button>
              <button className="btn btn--secondary" onClick={onResetDemo}>
                <Icon name="refresh" size={16} /> Charger les exemples
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
