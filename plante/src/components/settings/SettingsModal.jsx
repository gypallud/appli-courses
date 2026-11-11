import { useState } from 'react';
import Modal from '../ui/Modal';
import Icon from '../ui/Icon';

export default function SettingsModal({ apiKey, onSave, onClose }) {
  const [value, setValue] = useState(apiKey);
  const [show, setShow] = useState(false);

  const footer = (
    <>
      {apiKey && (
        <button
          className="btn btn--ghost btn--danger-text"
          onClick={() => {
            onSave('');
            onClose();
          }}
        >
          <Icon name="trash" size={15} /> Retirer la clé
        </button>
      )}
      <button className="btn btn--ghost" onClick={onClose}>
        Annuler
      </button>
      <button
        className="btn btn--primary"
        onClick={() => {
          onSave(value.trim());
          onClose();
        }}
      >
        <Icon name="check" size={16} /> Enregistrer
      </button>
    </>
  );

  return (
    <Modal title="Réglages" onClose={onClose} footer={footer}>
      <div className="settings">
        <div className="settings__intro">
          <span className="settings__icon">
            <Icon name="sparkles" size={20} />
          </span>
          <div>
            <h3>Identification par photo</h3>
            <p>
              Pour reconnaître une plante à partir d'une photo, l'application utilise l'IA Claude d'Anthropic. Il faut
              une clé API personnelle, à créer sur{' '}
              <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">
                console.anthropic.com
              </a>
              .
            </p>
          </div>
        </div>

        <label className="field">
          <span className="field__label">Clé API Claude</span>
          <div className="key-input">
            <Icon name="key" size={16} />
            <input
              type={show ? 'text' : 'password'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="sk-ant-…"
              autoComplete="off"
              spellCheck="false"
            />
            <button type="button" className="link-btn" onClick={() => setShow((s) => !s)}>
              {show ? 'Masquer' : 'Afficher'}
            </button>
          </div>
        </label>

        <ul className="settings__notes">
          <li>La clé reste uniquement dans ce navigateur, sur cet appareil.</li>
          <li>Chaque identification coûte environ 2 à 4 centimes, facturés sur votre compte Anthropic.</li>
          <li>N'utilisez cette clé que sur vos propres appareils.</li>
        </ul>
      </div>
    </Modal>
  );
}
