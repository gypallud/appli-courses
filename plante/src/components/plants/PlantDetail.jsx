import { useState } from 'react';
import Modal from '../ui/Modal';
import Icon from '../ui/Icon';
import Segmented from '../ui/Segmented';
import PlantAvatar from './PlantAvatar';
import {
  LIGHT,
  STATE_LABEL,
  fertilizerActive,
  nextFertilizing,
  waterStatus,
} from '../../utils/care';
import { formatLong, formatShort, parseISO, relativeDue, relativePast, diffDays, today } from '../../utils/dates';

const LIGHT_OPTIONS = Object.entries(LIGHT).map(([value, l]) => ({ value, label: l.label, icon: l.icon }));

function FrequencySlider({ label, icon, value, max, active, onChange }) {
  return (
    <div className={`freq ${active ? 'is-active' : ''}`}>
      <div className="freq__head">
        <span>
          <Icon name={icon} size={15} /> {label}
        </span>
        {active && <em>Active</em>}
      </div>
      <div className="freq__value">
        tous les <strong>{value}</strong> jours
      </div>
      <input
        type="range"
        min="1"
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={`Fréquence d'arrosage ${label}`}
      />
    </div>
  );
}

function InfoTile({ icon, title, children }) {
  return (
    <div className="info-tile">
      <span className="info-tile__icon">
        <Icon name={icon} size={17} />
      </span>
      <div>
        <h4>{title}</h4>
        <p>{children || <span className="muted">Non renseigné</span>}</p>
      </div>
    </div>
  );
}

export default function PlantDetail({ plant, season, onClose, onWater, onFertilize, onUpdate, onEdit, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const st = waterStatus(plant, season);
  const fertOn = fertilizerActive(plant, season);
  const nextFert = nextFertilizing(plant, season);
  const fertDays = nextFert ? diffDays(nextFert, today()) : null;
  const fertilizedToday = plant.lastFertilized && diffDays(today(), parseISO(plant.lastFertilized)) === 0;

  const footer = (
    <>
      {confirmDelete ? (
        <div className="confirm-row">
          <span>Supprimer définitivement {plant.name} ?</span>
          <button className="btn btn--ghost" onClick={() => setConfirmDelete(false)}>
            Annuler
          </button>
          <button className="btn btn--danger" onClick={() => onDelete(plant.id)}>
            <Icon name="trash" size={15} /> Supprimer
          </button>
        </div>
      ) : (
        <>
          <button className="btn btn--ghost btn--danger-text" onClick={() => setConfirmDelete(true)}>
            <Icon name="trash" size={15} /> Supprimer
          </button>
          <button className="btn btn--secondary" onClick={() => onEdit(plant.id)}>
            <Icon name="edit" size={15} /> Modifier la fiche
          </button>
        </>
      )}
    </>
  );

  return (
    <Modal title="Fiche plante" onClose={onClose} footer={footer} wide>
      <section className="detail-hero">
        <figure className="detail-hero__figure">
          <div className="detail-hero__visual">
            <PlantAvatar plant={plant} size={150} />
          </div>
          {plant.image && plant.imageCredit && (
            <figcaption className="image-credit">
              Photo :{' '}
              <a href={plant.imageCredit.source} target="_blank" rel="noreferrer">
                {plant.imageCredit.author}
              </a>
              {plant.imageCredit.license && ` · ${plant.imageCredit.license}`}
            </figcaption>
          )}
        </figure>
        <div className="detail-hero__info">
          <span className={`status-pill status-pill--${st.state}`}>
            <span className="dot" /> {STATE_LABEL[st.state]}
          </span>
          <h3>{plant.name}</h3>
          <p className="detail-hero__variety">{plant.variety}</p>
          <p className="plant-card__location">
            <Icon name="pin" size={13} /> {plant.location || 'Sans emplacement'}
          </p>
          <div className="detail-hero__actions">
            <button className="btn btn--water" onClick={() => onWater(plant.id)} disabled={st.wateredToday}>
              <Icon name={st.wateredToday ? 'check' : 'droplet'} size={16} />
              {st.wateredToday ? 'Arrosée aujourd’hui' : 'Arrosé aujourd’hui'}
            </button>
            <button
              className="btn btn--fert"
              onClick={() => onFertilize(plant.id)}
              disabled={!fertOn || fertilizedToday}
              title={!fertOn ? 'Engrais en pause pendant la saison froide' : undefined}
            >
              <Icon name={fertilizedToday ? 'check' : 'sprout'} size={16} />
              {fertilizedToday ? 'Engrais apporté' : 'Engrais apporté'}
            </button>
          </div>
        </div>
      </section>

      <section className="detail-section">
        <div className="detail-section__head">
          <h4>
            <Icon name="droplet" size={16} /> Arrosage
          </h4>
          <p>
            Dernier : <strong>{relativePast(st.sinceLast)}</strong> · Prochain :{' '}
            <strong className={`due--${st.state}`}>{relativeDue(st.daysUntil)}</strong>{' '}
            <span className="muted">({formatLong(st.next)})</span>
          </p>
        </div>
        <div className="freq-grid">
          <FrequencySlider
            label="Saison chaude"
            icon="sun"
            value={Number(plant.waterSummer)}
            max={30}
            active={season === 'warm'}
            onChange={(v) => onUpdate(plant.id, { waterSummer: v })}
          />
          <FrequencySlider
            label="Saison froide"
            icon="snowflake"
            value={Number(plant.waterWinter)}
            max={45}
            active={season === 'cold'}
            onChange={(v) => onUpdate(plant.id, { waterWinter: v })}
          />
        </div>
      </section>

      <section className="detail-section">
        <div className="detail-section__head">
          <h4>
            <Icon name="sun" size={16} /> Besoin en lumière
          </h4>
          <p className="muted">{LIGHT[plant.light]?.desc}</p>
        </div>
        <Segmented
          label="Besoin en lumière"
          options={LIGHT_OPTIONS}
          value={plant.light}
          onChange={(v) => onUpdate(plant.id, { light: v })}
        />
      </section>

      <section className="detail-section">
        <div className="info-grid">
          <InfoTile icon="layers" title="Terreau recommandé">
            {plant.soil}
          </InfoTile>
          <InfoTile icon="sprout" title="Engrais">
            {Number(plant.fertilizerEvery) > 0 ? (
              <>
                Tous les {plant.fertilizerEvery} j, de mars à août.{' '}
                {fertOn ? (
                  <strong>Prochain : {fertDays <= 0 ? "aujourd'hui" : formatShort(nextFert)}</strong>
                ) : (
                  <strong className="cold-text">En pause (saison froide)</strong>
                )}
              </>
            ) : (
              'Aucun engrais'
            )}
          </InfoTile>
          <InfoTile icon="pot" title="Rempotage">
            {plant.repotting}
          </InfoTile>
          <InfoTile icon="droplet" title="Humidité">
            {plant.humidity}
          </InfoTile>
          <InfoTile icon="thermometer" title="Température">
            {plant.temperature}
          </InfoTile>
          <InfoTile icon="leaf" title="Notes">
            {plant.notes}
          </InfoTile>
          {plant.pendingIdent && (
            <InfoTile icon="clock" title="Identification par photo">
              En cours : le PC de la maison analyse la photo, la fiche se remplira toute seule.
            </InfoTile>
          )}
          {!plant.pendingIdent && plant.identInfo && (
            <InfoTile icon="sparkles" title="Identifiée par photo">
              {plant.identInfo.commonName} ({plant.identInfo.scientificName}), certitude {plant.identInfo.confidence}.
              {plant.identInfo.alternatives?.length > 0 && <> Peut aussi être : {plant.identInfo.alternatives.join(', ')}.</>}
              {plant.identInfo.healthNote && <> État sur la photo : {plant.identInfo.healthNote}</>}
            </InfoTile>
          )}
        </div>
      </section>
    </Modal>
  );
}
