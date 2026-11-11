import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { HouseholdProvider } from './state/HouseholdContext.jsx';

// Service worker seulement sur la version publiée (en dev il gênerait le rechargement à chaud)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HouseholdProvider>
      <App />
    </HouseholdProvider>
  </StrictMode>,
);
