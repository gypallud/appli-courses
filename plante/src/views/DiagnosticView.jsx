import { useRef, useState } from 'react';
import Icon from '../components/ui/Icon';
import Segmented from '../components/ui/Segmented';
import { CONTEXT, SIGNAL_LABELS, SYMPTOMS, runDiagnosis } from '../data/diagnostics';

function SymptomToggle({ item, checked, onToggle, pest }) {
  return (
    <button
      type="button"
      className={`symptom ${checked ? 'is-checked' : ''} ${pest ? 'symptom--pest' : ''}`}
      onClick={() => onToggle(item.id)}
      aria-pressed={checked}
    >
      <span className="symptom__icon">
        <Icon name={item.icon} size={20} />
      </span>
      <span className="symptom__text">
        <strong>{item.label}</strong>
        <small>{item.hint}</small>
      </span>
      <span className="symptom__check">
        <Icon name="check" size={13} strokeWidth={2.6} />
      </span>
    </button>
  );
}

function ResultCard({ result, rank, plant, onAdjust }) {
  const isPest = result.kind === 'pest';
  return (
    <article className={`result ${isPest ? 'result--pest' : ''} ${rank === 0 ? 'result--top' : ''}`}>
      <header className="result__head">
        <div>
          <span className={`tag ${isPest ? 'tag--danger' : 'tag--soft'}`}>
            <Icon name={isPest ? 'bug' : 'leaf'} size={12} /> {result.tag}
          </span>
          <h3>{result.title}</h3>
        </div>
        <div className="confidence" aria-label={`Probabilité ${result.confidence} %`}>
          <strong>{result.confidence}%</strong>
          <span>probabilité</span>
        </div>
      </header>
      <div className="confidence-bar">
        <div style={{ width: `${result.confidence}%` }} />
      </div>
      <p className="result__matched">
        Indices : {result.matched.map((m) => SIGNAL_LABELS[m] ?? m).join(', ')}
      </p>

      <h4>Cause probable</h4>
      <p>{result.explanation}</p>

      <h4>Plan d'action</h4>
      <ol className="steps">
        {result.steps.map((s, i) => (
          <li key={i}>
            <span>{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>

      <p className="result__tip">
        <Icon name="sprout" size={15} />
        <span>
          <strong>Prévention :</strong> {result.prevention}
        </span>
      </p>

      {plant && result.adjustWatering && (
        <button className="btn btn--secondary btn--sm" onClick={() => onAdjust(result)}>
          <Icon name="droplet" size={14} />
          {result.adjustWatering > 1 ? 'Espacer' : 'Rapprocher'} les arrosages de {plant.name}
        </button>
      )}
    </article>
  );
}

export default function DiagnosticView({ plants, onUpdate, notify }) {
  const [plantId, setPlantId] = useState('');
  const [symptoms, setSymptoms] = useState([]);
  const [soil, setSoil] = useState('');
  const [exposure, setExposure] = useState('');
  const [flags, setFlags] = useState([]);
  const [results, setResults] = useState(null);
  const resultsRef = useRef(null);

  const plant = plants.find((p) => p.id === plantId);
  const toggle = (list, setList) => (id) =>
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const analyse = () => {
    setResults(runDiagnosis({ symptoms, soil, exposure, flags }));
    requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const reset = () => {
    setSymptoms([]);
    setSoil('');
    setExposure('');
    setFlags([]);
    setResults(null);
  };

  const adjust = (result) => {
    const f = result.adjustWatering;
    const patch = {
      waterSummer: Math.max(1, Math.round(plant.waterSummer * f)),
      waterWinter: Math.max(1, Math.round(plant.waterWinter * f)),
    };
    if (patch.waterSummer === plant.waterSummer) patch.waterSummer += f > 1 ? 1 : -1;
    if (patch.waterWinter === plant.waterWinter) patch.waterWinter += f > 1 ? 1 : -1;
    patch.waterSummer = Math.max(1, patch.waterSummer);
    patch.waterWinter = Math.max(1, patch.waterWinter);
    onUpdate(plant.id, patch);
    notify(`${plant.name} : arrosage tous les ${patch.waterSummer} j (été) / ${patch.waterWinter} j (hiver)`, 'droplet');
  };

  const optionsFor = (ctx) => ctx.options.map((o) => ({ value: o.id, label: o.label }));

  return (
    <div className="view">
      <header className="view__header">
        <div>
          <p className="eyebrow">Module S.O.S</p>
          <h1>Diagnostic de plante</h1>
        </div>
      </header>

      <div className="diag">
        <section className="diag__form card">
          <div className="diag__step">
            <span className="step-num">1</span>
            <div className="diag__step-body">
              <h2>Quelle plante ? <span className="muted">(facultatif)</span></h2>
              <select value={plantId} onChange={(e) => setPlantId(e.target.value)} className="select">
                <option value="">— Diagnostic général —</option>
                {plants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.location}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="diag__step">
            <span className="step-num">2</span>
            <div className="diag__step-body">
              <h2>Problème visuel</h2>
              <div className="symptom-grid">
                {SYMPTOMS.visual.map((s) => (
                  <SymptomToggle key={s.id} item={s} checked={symptoms.includes(s.id)} onToggle={toggle(symptoms, setSymptoms)} />
                ))}
              </div>
            </div>
          </div>

          <div className="diag__step">
            <span className="step-num">3</span>
            <div className="diag__step-body">
              <h2>Présence de parasites</h2>
              <div className="symptom-grid">
                {SYMPTOMS.pests.map((s) => (
                  <SymptomToggle key={s.id} item={s} checked={symptoms.includes(s.id)} onToggle={toggle(symptoms, setSymptoms)} pest />
                ))}
              </div>
            </div>
          </div>

          <div className="diag__step">
            <span className="step-num">4</span>
            <div className="diag__step-body">
              <h2>Contexte <span className="muted">(affine le diagnostic)</span></h2>
              <div className="context-row">
                <span className="field__label">{CONTEXT.soil.label}</span>
                <Segmented
                  label={CONTEXT.soil.label}
                  options={optionsFor(CONTEXT.soil)}
                  value={soil}
                  onChange={(v) => setSoil(v === soil ? '' : v)}
                  size="sm"
                />
              </div>
              <div className="context-row">
                <span className="field__label">{CONTEXT.exposure.label}</span>
                <Segmented
                  label={CONTEXT.exposure.label}
                  options={optionsFor(CONTEXT.exposure)}
                  value={exposure}
                  onChange={(v) => setExposure(v === exposure ? '' : v)}
                  size="sm"
                />
              </div>
              <div className="flag-row">
                {CONTEXT.flags.map((f) => (
                  <label key={f.id} className={`flag ${flags.includes(f.id) ? 'is-checked' : ''}`}>
                    <input type="checkbox" checked={flags.includes(f.id)} onChange={() => toggle(flags, setFlags)(f.id)} />
                    {f.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="diag__actions">
            <button className="btn btn--ghost" onClick={reset} disabled={!symptoms.length && !results}>
              Réinitialiser
            </button>
            <button className="btn btn--primary btn--lg" onClick={analyse} disabled={!symptoms.length}>
              <Icon name="sos" size={18} /> Lancer le diagnostic
            </button>
          </div>
        </section>

        <section className="diag__results" ref={resultsRef} aria-live="polite">
          {results === null && (
            <div className="diag__placeholder card">
              <span className="empty__icon">
                <Icon name="sos" size={32} />
              </span>
              <h3>Sélectionnez les symptômes observés</h3>
              <p>
                Cochez au moins un symptôme puis lancez l'analyse. Plus vous renseignez le contexte, plus le diagnostic est
                précis.
              </p>
            </div>
          )}
          {results && results.length === 0 && (
            <div className="diag__placeholder card">
              <span className="empty__icon">
                <Icon name="leaf" size={32} />
              </span>
              <h3>Pas de cause nette identifiée</h3>
              <p>
                Les indices se contredisent (ex : terre sèche et sur-arrosage). Vérifiez le contexte ou ajoutez des symptômes.
              </p>
            </div>
          )}
          {results && results.length > 0 && (
            <>
              <div className="diag__summary">
                <h2>
                  {results.length} cause{results.length > 1 ? 's' : ''} probable{results.length > 1 ? 's' : ''}
                  {plant && <span className="muted"> pour {plant.name}</span>}
                </h2>
                <p className="muted">Classées par probabilité. Commencez par la première.</p>
              </div>
              {results.map((r, i) => (
                <ResultCard key={r.id} result={r} rank={i} plant={plant} onAdjust={adjust} />
              ))}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
