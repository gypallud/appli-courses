'use strict';
// Fenêtre invisible qui filme l'écran (ou une zone) et envoie la vidéo morceau par morceau.

const TYPES = [
  ['video/mp4;codecs=avc1.640033,mp4a.40.2', '.mp4'],
  ['video/mp4;codecs=avc1,mp4a.40.2', '.mp4'],
  ['video/mp4', '.mp4'],
  ['video/webm;codecs=vp9,opus', '.webm'],
  ['video/webm;codecs=vp8,opus', '.webm'],
  ['video/webm', '.webm'],
];

let stream = null;
let recorder = null;
let started = false;
let wantStart = false;
let drawTimer = null;
let audioCtx = null;
let sending = Promise.resolve();
const toStop = [];

function pickType() {
  for (const [mime, ext] of TYPES) if (MediaRecorder.isTypeSupported(mime)) return { mime, ext };
  return { mime: '', ext: '.webm' };
}

async function waitForSize(video) {
  for (let i = 0; i < 100 && !video.videoWidth; i++) await new Promise((r) => setTimeout(r, 30));
}

async function prepare(o) {
  let warning = null;
  const display = await navigator.mediaDevices.getDisplayMedia({
    video: { width: { ideal: o.width }, height: { ideal: o.height }, frameRate: { ideal: 30, max: 30 } },
    audio: !!o.systemAudio,
  });
  toStop.push(...display.getTracks());

  let mic = null;
  if (o.mic) {
    try {
      mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      toStop.push(...mic.getTracks());
    } catch (_) {
      warning = 'Micro indisponible';
    }
  }

  // Image : écran entier tel quel, ou zone découpée via un canevas.
  let videoTrack = display.getVideoTracks()[0];
  if (!o.full) {
    const video = document.createElement('video');
    video.muted = true;
    video.srcObject = new MediaStream([videoTrack]);
    await video.play();
    await waitForSize(video);
    const vw = video.videoWidth, vh = video.videoHeight;
    const sx = Math.round(o.frac.x * vw), sy = Math.round(o.frac.y * vh);
    let sw = Math.round(o.frac.w * vw), sh = Math.round(o.frac.h * vh);
    sw = Math.max(2, sw - (sw % 2));
    sh = Math.max(2, sh - (sh % 2));
    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const c = canvas.getContext('2d', { alpha: false });
    const draw = () => c.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
    draw();
    drawTimer = setInterval(draw, 1000 / 30);
    videoTrack = canvas.captureStream(30).getVideoTracks()[0];
    toStop.push(videoTrack);
  }

  // Son : ordinateur et/ou micro mélangés sur une seule piste.
  const audioSources = [];
  if (display.getAudioTracks().length) audioSources.push(new MediaStream(display.getAudioTracks()));
  if (mic) audioSources.push(mic);
  const tracks = [videoTrack];
  if (audioSources.length) {
    audioCtx = new AudioContext();
    const dest = audioCtx.createMediaStreamDestination();
    for (const s of audioSources) audioCtx.createMediaStreamSource(s).connect(dest);
    tracks.push(dest.stream.getAudioTracks()[0]);
  }
  stream = new MediaStream(tracks);
  return warning;
}

function begin() {
  if (started || !stream) return;
  started = true;
  const { mime } = pickType();
  recorder = new MediaRecorder(stream, {
    mimeType: mime || undefined,
    videoBitsPerSecond: 8_000_000,
    audioBitsPerSecond: 160_000,
  });
  recorder.ondataavailable = (e) => {
    if (!e.data || !e.data.size) return;
    sending = sending.then(async () => api.recChunk(new Uint8Array(await e.data.arrayBuffer())));
  };
  recorder.onstop = () => {
    sending.then(() => {
      cleanup();
      api.recDone();
    });
  };
  recorder.onerror = (e) => {
    cleanup();
    api.recError(e.error ? e.error.message : 'erreur d\'enregistrement');
  };
  recorder.start(1000);
}

function cleanup() {
  clearInterval(drawTimer);
  for (const t of toStop) { try { t.stop(); } catch (_) { /* déjà arrêtée */ } }
  if (audioCtx) audioCtx.close().catch(() => {});
}

api.onRecInit(async (o) => {
  try {
    const warning = await prepare(o);
    api.recReady({ ext: pickType().ext, warning });
    if (wantStart) begin();
  } catch (err) {
    cleanup();
    api.recError(err && err.message ? err.message : String(err));
  }
});

api.onRecCommand((cmd) => {
  if (cmd === 'start') { wantStart = true; begin(); }
  else if (cmd === 'pause' && recorder && recorder.state === 'recording') recorder.pause();
  else if (cmd === 'resume' && recorder && recorder.state === 'paused') recorder.resume();
  else if (cmd === 'stop') {
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    else { cleanup(); api.recDone(); }
  }
});
