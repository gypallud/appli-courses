import Icon from './Icon';

/** Contrôle segmenté accessible (groupe de boutons radio). */
export default function Segmented({ options, value, onChange, label, size = 'md' }) {
  return (
    <div className={`segmented segmented--${size}`} role="radiogroup" aria-label={label}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          className={value === opt.value ? 'is-active' : ''}
          onClick={() => onChange(opt.value)}
        >
          {opt.icon && <Icon name={opt.icon} size={15} />}
          {opt.label}
        </button>
      ))}
    </div>
  );
}
