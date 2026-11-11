import { useMemo } from 'react';
import Icon from '../components/ui/Icon';
import Segmented from '../components/ui/Segmented';
import PlantAvatar from '../components/plants/PlantAvatar';
import { buildSchedule, nextSeasonChange, SEASONS, seasonalAlerts } from '../utils/care';
import { formatShort, formatWeekday, diffDays, today } from '../utils/dates';

const MODE_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'warm', label: 'Chaude', icon: 'sun' },
  { value: 'cold', label: 'Froide', icon: 'snowflake' },
];

function SeasonCard({ s, active }) {
  return (
    <div className={`season-card season-card--${s.key} ${active ? 'is-active' : ''}`}>
      <div className="season-card__head">
        <span className="season-card__icon">
          <Icon name={s.key === 'warm' ? 'sun' : 'snowflake'} size={20} />
        </span>
        <div>
          <h3>{s.label}</h3>
          <small>
            {s.period} · {s.months}
          </small>
        </div>
        {active && <em className="season-card__badge">En cours</em>}
      </div>
      <ul>
        {s.rules.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </div>
  );
}

function TaskItem({ task, isToday, onDone, onOpen }) {
  const { plant, type, overdue, late } = task;
  return (
    <li className={`task task--${type} ${overdue ? 'is-overdue' : ''}`}>
      <button className="task__plant" onClick={() => onOpen(plant.id)} title={`Ouvrir ${plant.name}`}>
        <span className="task__avatar">
          <PlantAvatar plant={plant} size={30} />
        </span>
        <span className="task__text">
          <strong>{plant.name}</strong>
          <small>
            <Icon name={type === 'water' ? 'droplet' : 'sprout'} size={11} />
            {type === 'water' ? 'Arrosage' : 'Engrais'}
            {overdue && ` · retard ${late} j`}
          </small>
        </span>
      </button>
      {isToday && (
        <button
          className="task__check"
          onClick={() => onDone(task)}
          aria-label={`Marquer ${type === 'water' ? "l'arrosage" : "l'engrais"} de ${plant.name} comme fait`}
          title="Marquer comme fait"
        >
          <Icon name="check" size={14} strokeWidth={2.4} />
        </button>
      )}
    </li>
  );
}

export default function PlannerView({ plants, seasonApi, onWater, onFertilize, onOpen }) {
  const { season, mode, setMode } = seasonApi;
  const schedule = useMemo(() => buildSchedule(plants, season), [plants, season]);
  const alerts = useMemo(() => seasonalAlerts(season, plants), [season, plants]);

  const totals = schedule.reduce(
    (acc, d) => {
      d.tasks.forEach((t) => (acc[t.type] += 1));
      return acc;
    },
    { water: 0, fertilize: 0 },
  );
  const change = nextSeasonChange();

  const done = (task) => (task.type === 'water' ? onWater(task.plant.id) : onFertilize(task.plant.id));

  return (
    <div className="view">
      <header className="view__header">
        <div>
          <p className="eyebrow">Planning & saisons</p>
          <h1>Calendrier d'entretien</h1>
        </div>
        <div className="season-mode">
          <span className="field__label">Saison</span>
          <Segmented label="Mode de saison" options={MODE_OPTIONS} value={mode} onChange={setMode} size="sm" />
        </div>
      </header>

      <section className="season-grid">
        <SeasonCard s={SEASONS.warm} active={season === 'warm'} />
        <SeasonCard s={SEASONS.cold} active={season === 'cold'} />
      </section>
      {mode === 'auto' && (
        <p className="season-note">
          <Icon name="clock" size={14} /> Bascule automatique le {formatShort(change)} (
          {diffDays(change, today())} jours).
        </p>
      )}

      <section className="planner">
        <div className="planner__head">
          <h2>Les 7 prochains jours</h2>
          <div className="planner__totals">
            <span className="tag tag--water">
              <Icon name="droplet" size={13} /> {totals.water} arrosage{totals.water > 1 ? 's' : ''}
            </span>
            <span className={`tag ${season === 'warm' ? 'tag--fert' : 'tag--muted'}`}>
              <Icon name="sprout" size={13} />{' '}
              {season === 'warm' ? `${totals.fertilize} engrais` : 'Engrais en pause'}
            </span>
          </div>
        </div>

        <div className="week">
          {schedule.map((day, i) => (
            <div key={day.date.toISOString()} className={`day ${i === 0 ? 'is-today' : ''}`}>
              <div className="day__head">
                <span className="day__name">{i === 0 ? "Aujourd'hui" : formatWeekday(day.date)}</span>
                <span className="day__date">{formatShort(day.date)}</span>
              </div>
              {day.tasks.length ? (
                <ul className="day__tasks">
                  {day.tasks.map((t) => (
                    <TaskItem
                      key={`${t.type}-${t.plant.id}`}
                      task={t}
                      isToday={i === 0}
                      onDone={done}
                      onOpen={onOpen}
                    />
                  ))}
                </ul>
              ) : (
                <p className="day__empty">Repos 🌿</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="alerts">
        <h2>Alertes saisonnières</h2>
        <div className="alerts__list">
          {alerts.map((a) => (
            <div key={a.title} className={`alert alert--${a.tone}`}>
              <span className="alert__icon">
                <Icon name={a.icon} size={18} />
              </span>
              <div>
                <h4>{a.title}</h4>
                <p>{a.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
