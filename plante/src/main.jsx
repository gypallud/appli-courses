import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

// Service worker seulement sur la version publiée (en dev il gênerait le rechargement à chaud)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
