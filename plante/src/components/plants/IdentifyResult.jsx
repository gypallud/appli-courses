import Icon from '../ui/Icon';

const CONFIDENCE_TONE = { faible: 'low', moyenne: 'mid', élevée: 'high' };

/** Encart affichant l'état de l'identification par photo. */
export default function IdentifyResult({ state, onOpenSettings, onRetry }) {
  if (state.status === 'idle') return null;

  if (state.status === 'loading') {
    return (
      <div className="ident ident--loading" role="status">
        <span className="spinner" aria-hidden="true" />
        <div>
          <strong>Identification en cours…</strong>
          <p>L'IA observe les feuilles, la tige et le port de la plante (10 à 30 secondes).</p>
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="ident ident--error" role="alert">
        <Icon name="alert" size={18} />
        <div>
          <strong>{state.message}</strong>
          <div className="ident__actions">
            {(state.code === 'no-key' || state.code === 'auth' || state.code === 'permission') && (
              <button type="button" className="btn btn--secondary btn--sm" onClick={onOpenSettings}>
                <Icon name="key" size={14} /> {state.code === 'no-key' ? 'Ajouter ma clé' : 'Vérifier ma clé'}
              </button>
            )}
            {state.code !== 'no-key' && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={onRetry}>
                <Icon name="refresh" size={14} /> Réessayer
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const r = state.result;
  return (
    <div className="ident ident--done" role="status">
      <Icon name="sparkles" size={18} />
      <div>
        <div className="ident__title">
          <strong>{r.commonName}</strong>
          <span className={`confidence-pill confidence-pill--${CONFIDENCE_TONE[r.confidence] ?? 'mid'}`}>
            Certitude {r.confidence}
          </span>
        </div>
        <em className="ident__latin">{r.scientificName}</em>
        {r.alternatives.length > 0 && (
          <p className="ident__alt">Peut aussi être : {r.alternatives.join(', ')}</p>
        )}
        {r.healthNote && (
          <p className="ident__health">
            <Icon name="leaf" size={13} /> {r.healthNote}
          </p>
        )}
        <p className="ident__filled">
          <Icon name="check" size={13} /> Fiche remplie automatiquement : vérifiez et ajustez si besoin.
        </p>
      </div>
    </div>
  );
}
