'use strict';
const bar = document.getElementById('bar');
const time = document.getElementById('time');
const msg = document.getElementById('msg');
const pauseBtn = document.getElementById('pause');
const stopBtn = document.getElementById('stop');
const cancelBtn = document.getElementById('cancel');

let elapsed = 0; // millisecondes enregistrées
let runningSince = null;
let ticker = null;
let paused = false;

const fmt = (ms) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
const total = () => elapsed + (runningSince ? Date.now() - runningSince : 0);

// Compte à rebours 3, 2, 1
let count = 3;
const countdown = setInterval(() => {
  count--;
  if (count > 0) { time.textContent = String(count); return; }
  clearInterval(countdown);
  time.textContent = '00:00';
  msg.textContent = 'Préparation…';
  api.recBarAction('countdown-done');
}, 800);

api.onRecBarState((state) => {
  if (state && typeof state === 'object') {
    if (state.warning) msg.textContent = state.warning;
    return;
  }
  if (state === 'recording') {
    paused = false;
    runningSince = Date.now();
    bar.className = 'bar recording';
    msg.textContent = 'Enregistrement';
    pauseBtn.disabled = false;
    pauseBtn.title = 'Pause';
    pauseBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>';
    clearInterval(ticker);
    ticker = setInterval(() => { time.textContent = fmt(total()); }, 250);
  } else if (state === 'paused') {
    paused = true;
    elapsed = total();
    runningSince = null;
    bar.className = 'bar paused';
    msg.textContent = 'En pause';
    pauseBtn.title = 'Reprendre';
    pauseBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5l12 7-12 7z"/></svg>';
  } else if (state === 'waiting') {
    msg.textContent = 'Préparation…';
  } else if (state === 'saving') {
    clearInterval(ticker);
    msg.textContent = 'Enregistrement du fichier…';
    pauseBtn.disabled = true;
    stopBtn.disabled = true;
    cancelBtn.disabled = true;
  }
});

pauseBtn.addEventListener('click', () => api.recBarAction(paused ? 'resume' : 'pause'));
stopBtn.addEventListener('click', () => api.recBarAction('stop'));
cancelBtn.addEventListener('click', () => api.recBarAction('cancel'));
