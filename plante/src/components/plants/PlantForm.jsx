import { useCallback, useEffect, useRef, useState } from 'react';
import Modal from '../ui/Modal';
import Icon from '../ui/Icon';
import Segmented from '../ui/Segmented';
import PlantAvatar from './PlantAvatar';
import IdentifyResult from './IdentifyResult';
import { AVATAR_COLORS, AVATAR_STYLES, emptyPlant } from '../../data/plants';
import { LIGHT } from '../../utils/care';
import { preparePhoto } from '../../utils/image';
import {
  PLACEHOLDER_NAME,
  fetchPlantResults,
  plantFieldsFrom,
  sendPlantPhoto,
} from '../../services/pcIdentifier';
import { identInfoFrom } from '../../hooks/usePendingIdentifications';

// Le module IA (SDK Anthropic) n'est chargé qu'au premier usage pour garder l'app légère.
const loadIdentifier = () => import('../../services/plantIdentifier');

const LIGHT_OPTIONS = Object.entries(LIGHT).map(([value, l]) => ({ value, label: l.label, icon: l.icon }));

function Field({ label, children, hint, full }) {
  return (
    <label className={`field ${full ? 'field--full' : ''}`}>
      <span className="field__label">{label}</span>
      {children}
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  );
}

export default function PlantForm({
  initial,
  initialIdImage = '',
  autoIdentify = false,
  apiKey,
  locations,
  onSave,
  onClose,
  onOpenSettings,
}) {
  const [form, setForm] = useState(() => ({ ...emptyPlant(), ...initial }));
  const [idImage, setIdImage] = useState(initialIdImage);
  // idle | sending (envoi au PC) | queued (le PC n'a pas encore répondu) | loading (clé API) | done | error
  const [ident, setIdent] = useState(() =>
    initial?.pendingIdent ? { status: 'queued', id: initial.pendingIdent } : { status: 'idle' },
  );
  const [error, setError] = useState('');
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const autoRan = useRef(false);
  const isEdit = Boolean(initial?.id);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e?.target ? e.target.value : e }));

  const applyResult = useCallback((r) => {
    setForm((f) => ({
      ...f,
      ...plantFieldsFrom(r),
      name: !f.name.trim() || f.name === PLACEHOLDER_NAME ? r.commonName : f.name,
      pendingIdent: '',
      identInfo: identInfoFrom(r),
    }));
    setIdent({ status: 'done', result: r });
  }, []);

  const identify = useCallback(
    async (image) => {
      // Option payante : résultat immédiat avec la clé API
      if (apiKey) {
        setIdent({ status: 'loading' });
        try {
          const { identifyPlant } = await loadIdentifier();
          applyResult(await identifyPlant(image, apiKey));
        } catch (err) {
          setIdent({ status: 'error', message: err.message, code: err.code });
        }
        return;
      }
      // Gratuit : la photo part au PC de la maison
      setIdent({ status: 'sending' });
      try {
        const id = await sendPlantPhoto(image);
        setForm((f) => ({ ...f, pendingIdent: id, name: f.name.trim() ? f.name : PLACEHOLDER_NAME }));
        setIdent({ status: 'queued', id });
      } catch (err) {
        setIdent({ status: 'error', message: err.message, code: err.code });
      }
    },
    [apiKey, applyResult],
  );

  // Tant que le formulaire est ouvert, on regarde si le PC a répondu
  useEffect(() => {
    if (ident.status !== 'queued') return undefined;
    let stop = false;
    const check = async () => {
      try {
        const res = (await fetchPlantResults([ident.id]))[ident.id];
        if (stop || !res) return;
        if (res.statut === 'Traité' && res.result) applyResult(res.result);
        else if (res.statut === 'Erreur') {
          setForm((f) => ({ ...f, pendingIdent: '' }));
          setIdent({ status: 'error', code: 'pc', message: res.erreur || "Le PC n'a pas pu identifier la plante." });
        }
      } catch {
        /* réseau : on réessaiera au prochain tour */
      }
    };
    const timer = setInterval(check, 15000);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [ident.status, ident.id, applyResult]);

  // Ouverture via « Identifier par photo » : on lance l'identification tout de suite.
  useEffect(() => {
    if (autoIdentify && initialIdImage && !autoRan.current) {
      autoRan.current = true;
      identify(initialIdImage);
    }
  }, [autoIdentify, initialIdImage, identify]);

  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const { photo, idImage: big } = await preparePhoto(file);
      setForm((f) => ({ ...f, photo, pendingIdent: '' }));
      setIdImage(big);
      setIdent({ status: 'idle' });
    } catch {
      setError('Impossible de lire cette image.');
    }
  };

  const runIdentify = () => identify(idImage || form.photo);

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Donnez un nom à votre plante.');
      return;
    }
    onSave({
      ...form,
      name: form.name.trim(),
      waterSummer: Math.max(1, Number(form.waterSummer) || 1),
      waterWinter: Math.max(1, Number(form.waterWinter) || 1),
      fertilizerEvery: Math.max(0, Number(form.fertilizerEvery) || 0),
    });
  };

  const footer = (
    <>
      <button type="button" className="btn btn--ghost" onClick={onClose}>
        Annuler
      </button>
      <button
        type="submit"
        form="plant-form"
        className="btn btn--primary"
        disabled={ident.status === 'loading' || ident.status === 'sending'}
      >
        <Icon name="check" size={16} /> {isEdit ? 'Enregistrer' : 'Ajouter la plante'}
      </button>
    </>
  );

  return (
    <Modal title={isEdit ? `Modifier ${initial.name}` : 'Nouvelle plante'} onClose={onClose} footer={footer} wide>
      <form id="plant-form" className="plant-form" onSubmit={submit}>
        <div className="plant-form__visual">
          <div className={`plant-form__preview ${ident.status === 'loading' ? 'is-scanning' : ''}`}>
            <PlantAvatar plant={form} size={140} />
          </div>

          <div className="photo-buttons">
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => cameraRef.current?.click()}>
              <Icon name="camera" size={15} /> Prendre une photo
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => galleryRef.current?.click()}>
              <Icon name="image" size={15} /> Galerie
            </button>
            {form.photo && (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  setForm((f) => ({ ...f, photo: '', pendingIdent: '' }));
                  setIdImage('');
                  setIdent({ status: 'idle' });
                }}
              >
                Retirer
              </button>
            )}
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onPhoto} />
            <input ref={galleryRef} type="file" accept="image/*" hidden onChange={onPhoto} />
          </div>

          {form.photo && ident.status !== 'queued' && (
            <button
              type="button"
              className="btn btn--ai"
              onClick={runIdentify}
              disabled={ident.status === 'loading' || ident.status === 'sending'}
            >
              <Icon name="sparkles" size={16} />
              {ident.status === 'loading'
                ? 'Analyse en cours…'
                : ident.status === 'sending'
                  ? 'Envoi de la photo…'
                  : ident.status === 'done'
                    ? 'Relancer l’identification'
                    : 'Identifier la plante'}
            </button>
          )}

          {!form.photo && (
            <>
              <p className="photo-hint">
                <Icon name="sparkles" size={14} /> Vous ne connaissez pas son nom ? Prenez-la en photo, l'IA la
                reconnaît et remplit la fiche.
              </p>
              <span className="field__label">Illustration</span>
              <div className="style-picker">
                {Object.entries(AVATAR_STYLES).map(([key, label]) => (
                  <button
                    type="button"
                    key={key}
                    className={form.avatar === key ? 'is-active' : ''}
                    onClick={() => setForm((f) => ({ ...f, avatar: key }))}
                    title={label}
                    aria-label={label}
                  >
                    <PlantAvatar plant={{ ...form, avatar: key, photo: '' }} size={44} />
                  </button>
                ))}
              </div>
              <div className="color-picker">
                {AVATAR_COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    style={{ background: c }}
                    className={form.color === c ? 'is-active' : ''}
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                    aria-label={`Couleur ${c}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="plant-form__fields">
          <IdentifyResult state={ident} onOpenSettings={onOpenSettings} onRetry={runIdentify} />
          {error && (
            <p className="form-error">
              <Icon name="alert" size={15} /> {error}
            </p>
          )}
          <div className="field-grid">
            <Field label="Nom *">
              <input value={form.name} onChange={set('name')} placeholder="ex : Monstera du salon" />
            </Field>
            <Field label="Variété">
              <input value={form.variety} onChange={set('variety')} placeholder="ex : Monstera Deliciosa" />
            </Field>
            <Field label="Emplacement">
              <input value={form.location} onChange={set('location')} list="locations" placeholder="ex : Salon, Balcon" />
              <datalist id="locations">
                {locations.map((l) => (
                  <option key={l} value={l} />
                ))}
              </datalist>
            </Field>
            <Field label="Dernier arrosage">
              <input type="date" value={form.lastWatered} onChange={set('lastWatered')} />
            </Field>

            <Field label="Besoin en lumière" full>
              <Segmented label="Besoin en lumière" options={LIGHT_OPTIONS} value={form.light} onChange={set('light')} />
            </Field>

            <Field label="Arrosage saison chaude" hint="Printemps / Été, en jours">
              <input type="number" min="1" max="60" value={form.waterSummer} onChange={set('waterSummer')} />
            </Field>
            <Field label="Arrosage saison froide" hint="Automne / Hiver, en jours">
              <input type="number" min="1" max="90" value={form.waterWinter} onChange={set('waterWinter')} />
            </Field>
            <Field label="Engrais tous les… (jours)" hint="Mars → août uniquement · 0 = jamais">
              <input type="number" min="0" max="120" value={form.fertilizerEvery} onChange={set('fertilizerEvery')} />
            </Field>
            <Field label="Température idéale">
              <input value={form.temperature} onChange={set('temperature')} placeholder="ex : 18 – 25 °C" />
            </Field>

            <Field label="Terreau recommandé" full>
              <input value={form.soil} onChange={set('soil')} placeholder="ex : terreau universel + perlite" />
            </Field>
            <Field label="Rempotage">
              <input value={form.repotting} onChange={set('repotting')} placeholder="ex : tous les 2 ans au printemps" />
            </Field>
            <Field label="Humidité">
              <input value={form.humidity} onChange={set('humidity')} placeholder="ex : élevée (60 %)" />
            </Field>
            <Field label="Notes" full>
              <textarea rows="3" value={form.notes} onChange={set('notes')} placeholder="Astuces, historique…" />
            </Field>
          </div>
        </div>
      </form>
    </Modal>
  );
}
