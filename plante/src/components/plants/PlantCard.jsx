import Icon from '../ui/Icon';
import PlantAvatar from './PlantAvatar';
import { LIGHT, STATE_LABEL, waterStatus } from '../../utils/care';
import { formatShort, relativeDue, relativePast } from '../../utils/dates';

export default function PlantCard({ plant, season, onOpen, onWater }) {
  const st = waterStatus(plant, season);
  const light = LIGHT[plant.light] ?? LIGHT.indirecte;

  return (
    <article
      className={`plant-card state--${st.state}`}
      onClick={() => onOpen(plant.id)}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(plant.id)}
      tabIndex={0}
      aria-label={`Ouvrir la fiche de ${plant.name}`}
    >
      <div className="plant-card__visual">
        <span className={`status-pill status-pill--${st.state}`}>
          <span className="dot" /> {STATE_LABEL[st.state]}
        </span>
        <span className="light-pill" title={`Lumière ${light.label.toLowerCase()}`}>
          <Icon name={light.icon} size={14} />
        </span>
        <PlantAvatar plant={plant} size={128} />
      </div>

      <div className="plant-card__body">
        <h3>{plant.name}</h3>
        <p className="plant-card__variety">{plant.variety}</p>
        <p className="plant-card__location">
          <Icon name="pin" size={13} /> {plant.location || 'Sans emplacement'}
        </p>

        <div className="water-meter" aria-label={`Réserve d'eau ${Math.round(st.reserve * 100)} %`}>
          <div className="water-meter__fill" style={{ width: `${Math.max(4, st.reserve * 100)}%` }} />
        </div>

        <dl className="plant-card__dates">
          <div>
            <dt>Dernier arrosage</dt>
            <dd>{relativePast(st.sinceLast)}</dd>
          </div>
          <div>
            <dt>Prochain</dt>
            <dd className={`due due--${st.state}`}>
              {relativeDue(st.daysUntil)}
              <small>{formatShort(st.next)}</small>
            </dd>
          </div>
        </dl>

        <button
          className={`btn btn--water ${st.wateredToday ? 'is-done' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onWater(plant.id);
          }}
          disabled={st.wateredToday}
        >
          <Icon name={st.wateredToday ? 'check' : 'droplet'} size={16} />
          {st.wateredToday ? 'Arrosée aujourd’hui' : 'Arrosé aujourd’hui'}
        </button>
      </div>
    </article>
  );
}
