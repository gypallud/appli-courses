import Icon from '../ui/Icon';
import { SEASONS } from '../../utils/care';

const NAV = [
  { id: 'plants', label: 'Mes plantes', icon: 'leaf' },
  { id: 'planner', label: 'Calendrier', icon: 'calendar' },
  { id: 'diagnostic', label: 'Diagnostic S.O.S', icon: 'sos' },
  { id: 'settings', label: 'Réglages', icon: 'settings' },
];

export default function Sidebar({ view, onNavigate, season, badges = {} }) {
  const s = SEASONS[season];
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand__logo">
          <Icon name="sprout" size={22} />
        </span>
        <div>
          <strong>Chlorophylle</strong>
          <small>Jardin d'intérieur</small>
        </div>
      </div>

      <nav className="nav" aria-label="Navigation principale">
        {NAV.map((item) => (
          <button
            key={item.id}
            className={`nav__item ${view === item.id ? 'is-active' : ''}`}
            onClick={() => onNavigate(item.id)}
            aria-current={view === item.id ? 'page' : undefined}
          >
            <Icon name={item.icon} size={20} />
            <span>{item.label}</span>
            {badges[item.id] > 0 && <em className="nav__badge">{badges[item.id]}</em>}
          </button>
        ))}
      </nav>

      <div className={`sidebar__season season-chip--${season}`}>
        <Icon name={season === 'warm' ? 'sun' : 'snowflake'} size={18} />
        <div>
          <strong>{s.label}</strong>
          <small>{s.period}</small>
        </div>
      </div>
    </aside>
  );
}
