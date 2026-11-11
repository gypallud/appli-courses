'use strict';
const {
  app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain, desktopCapturer,
  screen, nativeImage, clipboard, ClipboardItem, dialog, shell, session,
} = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { pathToFileURL } = require('url');
const { execFile } = require('child_process');
const winlist = require('./winlist');

if (!app.requestSingleInstanceLock()) {
  app.quit();
  return;
}
app.setAppUserModelId('fr.maison.captur');

const SRC = path.join(__dirname, 'src');
// PowerShell ne lit pas dans l'archive de l'appli installée : le script est rangé à côté.
const OCR_SCRIPT = path.join(SRC, 'ocr.ps1').replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`);
const PRELOAD = path.join(__dirname, 'preload.js');
const ICON = path.join(__dirname, 'assets', 'icon.png');
// Dossier des captures : « Images\Captur », sauf si Windows en bloque l'écriture
// (accès contrôlé aux dossiers de Windows Defender) ; on prend alors le dossier personnel.
function pickLibrary() {
  const candidates = [path.join(app.getPath('pictures'), 'Captur'), path.join(app.getPath('home'), 'Captur')];
  for (const dir of candidates) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      const probe = path.join(dir, `.ecriture-${process.pid}`);
      fs.writeFileSync(probe, '');
      fs.rmSync(probe, { force: true });
      return dir;
    } catch (_) { /* dossier protégé, on essaie le suivant */ }
  }
  return candidates[candidates.length - 1];
}
const LIB = pickLibrary();
const META = path.join(LIB, '.captur');
const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json');
const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'];
const VIDEO_EXT = ['.mp4', '.webm'];

const SHORTCUTS = [
  { accel: 'CommandOrControl+Shift+X', label: 'Ctrl + Maj + X', action: 'image', what: 'Capture d\'écran' },
  { accel: 'CommandOrControl+Shift+Y', label: 'Ctrl + Maj + Y', action: 'video', what: 'Vidéo (démarrer / arrêter)' },
  { accel: 'PrintScreen', label: 'Impr. écran', action: 'image', what: 'Capture d\'écran' },
];

let settings = { autoCopy: true, systemAudio: true, mic: false };
let tray = null;
let editorWin = null;
let overlays = [];
let capture = null; // capture en cours (sélection à l'écran)
let rec = null; // enregistrement vidéo en cours
let quitting = false;
let shortcutStatus = [];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- réglages
function loadSettings() {
  try { settings = { ...settings, ...JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')) }; } catch (_) { /* défauts */ }
}
function saveSettings() {
  try { fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2)); } catch (err) { console.error(err); }
}

// ---------------------------------------------------------------- fichiers
function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}
function uniquePath(base, ext) {
  let p = path.join(LIB, base + ext);
  for (let i = 2; fs.existsSync(p); i++) p = path.join(LIB, `${base}-${i}${ext}`);
  return p;
}
function metaPaths(file) {
  const base = path.basename(file);
  return { json: path.join(META, base + '.json'), thumb: path.join(META, base + '.thumb.jpg') };
}
function fileInfo(file) {
  const st = fs.statSync(file);
  const ext = path.extname(file).toLowerCase();
  const kind = VIDEO_EXT.includes(ext) ? 'video' : 'image';
  const v = Math.round(st.mtimeMs);
  const { thumb } = metaPaths(file);
  let thumbUrl = null;
  try {
    const tst = fs.statSync(thumb);
    thumbUrl = pathToFileURL(thumb).href + '?v=' + Math.round(tst.mtimeMs);
  } catch (_) { /* pas de vignette */ }
  return {
    path: file,
    name: path.basename(file),
    url: pathToFileURL(file).href + '?v=' + v,
    thumbUrl,
    kind,
    mtime: st.mtimeMs,
    size: st.size,
  };
}
function listLibrary() {
  let names = [];
  try { names = fs.readdirSync(LIB); } catch (_) { return []; }
  const items = [];
  for (const n of names) {
    const ext = path.extname(n).toLowerCase();
    if (!IMAGE_EXT.includes(ext) && !VIDEO_EXT.includes(ext)) continue;
    try { items.push(fileInfo(path.join(LIB, n))); } catch (_) { /* fichier disparu */ }
  }
  return items.sort((a, b) => b.mtime - a.mtime).slice(0, 300);
}
function insideLib(p) {
  const rel = path.relative(LIB, path.resolve(p));
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}

// ---------------------------------------------------------------- presse-papier
async function copyImageToClipboard(image) {
  const blob = new Blob([image.toPNG()], { type: 'image/png' });
  await clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}
async function readClipboardImage() {
  const items = await clipboard.read();
  for (const item of items) {
    for (const type of item.types) {
      if (!type.startsWith('image/')) continue;
      const blob = await item.getType(type);
      const image = nativeImage.createFromBuffer(Buffer.from(await blob.arrayBuffer()));
      if (!image.isEmpty()) return image;
    }
  }
  return null;
}

// ---------------------------------------------------------------- éditeur
function createEditor(show) {
  editorWin = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 860,
    minHeight: 520,
    show: false,
    title: 'Captur',
    icon: ICON,
    backgroundColor: '#17181c',
    autoHideMenuBar: true,
    webPreferences: { preload: PRELOAD },
  });
  editorWin.removeMenu();
  editorWin.loadFile(path.join(SRC, 'editor.html'));
  editorWin.on('close', (e) => {
    if (!quitting) { e.preventDefault(); editorWin.hide(); }
  });
  if (show) editorWin.once('ready-to-show', () => editorWin.show());
}
function showEditor() {
  if (!editorWin || editorWin.isDestroyed()) createEditor(true);
  if (editorWin.isMinimized()) editorWin.restore();
  editorWin.show();
  editorWin.focus();
}
function sendToEditor(channel, payload) {
  if (!editorWin || editorWin.isDestroyed()) createEditor(false);
  const wc = editorWin.webContents;
  if (wc.isLoading()) wc.once('did-finish-load', () => wc.send(channel, payload));
  else wc.send(channel, payload);
}
function openInEditor(file) {
  showEditor();
  sendToEditor('editor:open', fileInfo(file));
}

// ---------------------------------------------------------------- icône de notification
function buildTrayMenu() {
  const login = app.getLoginItemSettings(loginOptions());
  return Menu.buildFromTemplate([
    { label: 'Capture d\'écran\tCtrl+Maj+X', click: () => startCapture('image') },
    { label: 'Enregistrer une vidéo\tCtrl+Maj+Y', click: () => startCapture('video') },
    { label: 'Capture de l\'écran entier', click: () => quickFullScreen() },
    { type: 'separator' },
    { label: 'Ouvrir Captur', click: showEditor },
    { label: 'Ouvrir le dossier des captures', click: () => shell.openPath(LIB) },
    { type: 'separator' },
    {
      label: 'Lancer au démarrage de Windows',
      type: 'checkbox',
      checked: login.openAtLogin,
      click: (item) => app.setLoginItemSettings({ ...loginOptions(), openAtLogin: item.checked }),
    },
    { label: 'Quitter Captur', click: () => { quitting = true; app.quit(); } },
  ]);
}
// Au démarrage de Windows, Captur se lance discrètement dans la zone de notification (--hidden).
function loginOptions() {
  return app.isPackaged
    ? { path: process.execPath, args: ['--hidden'] }
    : { path: process.execPath, args: [path.resolve(__dirname), '--hidden'] };
}
function createTray() {
  tray = new Tray(nativeImage.createFromPath(ICON).resize({ width: 32, height: 32, quality: 'best' }));
  tray.setToolTip('Captur — clic : capture d\'écran');
  tray.on('click', () => startCapture('image'));
  tray.on('right-click', () => tray.popUpContextMenu(buildTrayMenu()));
  tray.on('double-click', showEditor);
}

// ---------------------------------------------------------------- raccourcis
function registerShortcuts() {
  shortcutStatus = SHORTCUTS.map((s) => {
    let ok = false;
    try {
      ok = globalShortcut.register(s.accel, () => (s.action === 'video' && rec ? stopRecording() : startCapture(s.action)));
    } catch (_) { ok = false; }
    return { label: s.label, what: s.what, ok };
  });
}

// ---------------------------------------------------------------- capture
async function grabDisplays(displays) {
  // Une demande par taille d'écran : la vignette renvoyée est alors à la taille réelle.
  const groups = new Map();
  for (const d of displays) {
    const w = Math.round(d.size.width * d.scaleFactor);
    const h = Math.round(d.size.height * d.scaleFactor);
    const key = `${w}x${h}`;
    if (!groups.has(key)) groups.set(key, { w, h, list: [] });
    groups.get(key).list.push(d);
  }
  const shots = new Map();
  for (const { w, h, list } of groups.values()) {
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: w, height: h } });
    for (const d of list) {
      const src = sources.find((s) => s.display_id === String(d.id))
        || sources[displays.indexOf(d)] || sources[0];
      if (src) shots.set(d.id, { display: d, image: src.thumbnail, sourceId: src.id });
    }
  }
  return shots;
}

function windowsForDisplay(d, wins) {
  const phys = screen.dipToScreenRect(null, d.bounds);
  const k = d.bounds.width / phys.width;
  const out = [];
  for (const w of wins) {
    const x0 = Math.max(w.x, phys.x);
    const y0 = Math.max(w.y, phys.y);
    const x1 = Math.min(w.x + w.w, phys.x + phys.width);
    const y1 = Math.min(w.y + w.h, phys.y + phys.height);
    if (x1 - x0 < 20 || y1 - y0 < 20) continue;
    out.push({ x: (x0 - phys.x) * k, y: (y0 - phys.y) * k, w: (x1 - x0) * k, h: (y1 - y0) * k });
  }
  return out;
}

async function startCapture(mode) {
  if (capture) return;
  if (rec) { if (mode === 'video') stopRecording(); return; }
  capture = { mode, shots: null, ready: 0, restoreEditor: false };
  try {
    if (editorWin && editorWin.isVisible() && !editorWin.isMinimized()) {
      capture.restoreEditor = true;
      editorWin.hide();
      await sleep(250); // laisse l'animation de fermeture se terminer
    }
    const wins = winlist.list();
    const displays = screen.getAllDisplays();
    capture.shots = await grabDisplays(displays);
    if (!capture) return;
    globalShortcut.register('Escape', () => endCapture(true));
    const cursor = screen.getCursorScreenPoint();
    for (const d of displays) {
      if (capture.shots.has(d.id)) openOverlay(d, windowsForDisplay(d, wins), cursor);
    }
  } catch (err) {
    console.error(err);
    endCapture(true);
    dialog.showErrorBox('Captur', 'La capture a échoué : ' + err.message);
  }
}

function openOverlay(d, wins, cursor) {
  const shot = capture.shots.get(d.id);
  const win = new BrowserWindow({
    x: d.bounds.x,
    y: d.bounds.y,
    width: d.bounds.width,
    height: d.bounds.height,
    frame: false,
    show: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    enableLargerThanScreen: true,
    backgroundColor: '#000000',
    title: 'Captur – sélection',
    webPreferences: { preload: PRELOAD },
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setBounds(d.bounds);
  win.displayId = d.id;
  win.loadFile(path.join(SRC, 'overlay.html'));
  win.webContents.once('did-finish-load', () => {
    if (!capture) return;
    const inside = cursor.x >= d.bounds.x && cursor.x < d.bounds.x + d.bounds.width
      && cursor.y >= d.bounds.y && cursor.y < d.bounds.y + d.bounds.height;
    win.webContents.send('overlay:init', {
      displayId: d.id,
      mode: capture.mode,
      image: 'data:image/jpeg;base64,' + shot.image.toJPEG(92).toString('base64'),
      imageWidth: shot.image.getSize().width,
      windows: wins,
      cursor: inside ? { x: cursor.x - d.bounds.x, y: cursor.y - d.bounds.y } : null,
    });
  });
  overlays.push(win);
}

function endCapture(cancelled) {
  if (!capture) return;
  const restore = capture.restoreEditor;
  capture = null;
  globalShortcut.unregister('Escape');
  for (const w of overlays) if (!w.isDestroyed()) w.destroy();
  overlays = [];
  if (cancelled && restore) showEditor();
}

ipcMain.on('overlay:ready', () => {
  if (!capture) return;
  capture.ready++;
  if (capture.ready < overlays.length) return;
  const cursor = screen.getCursorScreenPoint();
  const active = screen.getDisplayNearestPoint(cursor).id;
  for (const w of overlays) w.showInactive();
  const main = overlays.find((w) => w.displayId === active) || overlays[0];
  if (main) { main.show(); main.focus(); }
});
ipcMain.on('overlay:cancel', () => endCapture(true));
ipcMain.on('overlay:select', (_e, sel) => onSelect(sel));
function onSelect(sel) {
  if (!capture) return;
  const shot = capture.shots.get(sel.displayId);
  if (!shot) return endCapture(true);
  const mode = capture.mode;
  const size = shot.image.getSize();
  const px = {
    x: Math.max(0, Math.round(sel.x * size.width)),
    y: Math.max(0, Math.round(sel.y * size.height)),
  };
  px.width = Math.max(1, Math.min(size.width - px.x, Math.round(sel.w * size.width)));
  px.height = Math.max(1, Math.min(size.height - px.y, Math.round(sel.h * size.height)));
  endCapture(false);
  if (mode === 'image') saveCapture(shot.image.crop(px));
  else startRecording(shot, sel);
}

function saveCapture(image) {
  fs.mkdirSync(LIB, { recursive: true });
  const file = uniquePath('capture_' + stamp(), '.png');
  fs.writeFileSync(file, image.toPNG());
  if (settings.autoCopy) copyImageToClipboard(image).catch((err) => console.error(err));
  openInEditor(file);
}

async function quickFullScreen() {
  if (capture || rec) return;
  const cursor = screen.getCursorScreenPoint();
  const d = screen.getDisplayNearestPoint(cursor);
  const shots = await grabDisplays([d]);
  const shot = shots.get(d.id);
  if (shot) saveCapture(shot.image);
}

// ---------------------------------------------------------------- vidéo
function startRecording(shot, frac) {
  const d = shot.display;
  const full = frac.x <= 0.002 && frac.y <= 0.002 && frac.w >= 0.996 && frac.h >= 0.996;
  const region = {
    x: Math.round(d.bounds.x + frac.x * d.bounds.width),
    y: Math.round(d.bounds.y + frac.y * d.bounds.height),
    width: Math.round(frac.w * d.bounds.width),
    height: Math.round(frac.h * d.bounds.height),
  };
  rec = {
    display: d,
    sourceId: shot.sourceId,
    frac,
    full,
    systemAudio: settings.systemAudio,
    mic: settings.mic,
    file: null,
    fd: null,
    ready: false,
    go: false,
    cancelled: false,
    windows: [],
  };

  // Cadre rouge autour de la zone filmée (invisible dans la vidéo)
  if (!full) {
    const m = 4;
    const frame = new BrowserWindow({
      x: region.x - m, y: region.y - m, width: region.width + 2 * m, height: region.height + 2 * m,
      frame: false, transparent: true, resizable: false, movable: false, focusable: false,
      skipTaskbar: true, alwaysOnTop: true, hasShadow: false, show: false,
      webPreferences: { preload: PRELOAD },
    });
    frame.setAlwaysOnTop(true, 'screen-saver');
    frame.setIgnoreMouseEvents(true);
    frame.setContentProtection(true);
    frame.loadFile(path.join(SRC, 'frame.html'));
    frame.once('ready-to-show', () => frame.showInactive());
    rec.windows.push(frame);
  }

  // Barre de contrôle (pause, arrêt, annuler)
  const wa = d.workArea;
  const bw = 330, bh = 64;
  const below = region.y + region.height + 12;
  const by = full || below + bh > wa.y + wa.height ? wa.y + wa.height - bh - 16 : below;
  const bar = new BrowserWindow({
    x: Math.round(wa.x + (wa.width - bw) / 2), y: Math.round(by), width: bw, height: bh,
    frame: false, transparent: true, resizable: false, maximizable: false, minimizable: false,
    fullscreenable: false, skipTaskbar: true, alwaysOnTop: true, hasShadow: false, show: false,
    title: 'Captur – enregistrement',
    webPreferences: { preload: PRELOAD },
  });
  bar.setAlwaysOnTop(true, 'screen-saver');
  bar.setContentProtection(true);
  bar.loadFile(path.join(SRC, 'recbar.html'));
  bar.once('ready-to-show', () => bar.show());
  rec.bar = bar;
  rec.windows.push(bar);

  // Fenêtre invisible qui enregistre
  const recorder = new BrowserWindow({
    show: false,
    webPreferences: { preload: PRELOAD, backgroundThrottling: false },
  });
  recorder.loadFile(path.join(SRC, 'recorder.html'));
  recorder.webContents.once('did-finish-load', () => {
    const size = shot.image.getSize();
    recorder.webContents.send('rec:init', {
      frac, full, width: size.width, height: size.height,
      systemAudio: rec.systemAudio, mic: rec.mic,
    });
  });
  rec.recorder = recorder;
  rec.windows.push(recorder);
}

function sendRec(cmd) {
  if (rec && rec.recorder && !rec.recorder.isDestroyed()) rec.recorder.webContents.send('rec:cmd', cmd);
}
function sendBar(state) {
  if (rec && rec.bar && !rec.bar.isDestroyed()) rec.bar.webContents.send('recbar:state', state);
}
function stopRecording() {
  if (!rec) return;
  if (!rec.go || !rec.ready) { rec.cancelled = true; finishRecording(); return; }
  sendBar('saving');
  sendRec('stop');
}
function finishRecording(errorMessage) {
  if (!rec) return;
  const r = rec;
  rec = null;
  if (r.fd !== null) { try { fs.closeSync(r.fd); } catch (_) { /* déjà fermé */ } }
  for (const w of r.windows) if (!w.isDestroyed()) w.destroy();
  if (errorMessage) {
    if (r.file) fs.rm(r.file, { force: true }, () => {});
    dialog.showErrorBox('Captur', 'L\'enregistrement vidéo a échoué : ' + errorMessage);
    return;
  }
  if (r.cancelled || !r.file) {
    if (r.file) fs.rm(r.file, { force: true }, () => {});
    return;
  }
  openInEditor(r.file);
}

function setupDisplayMedia() {
  session.defaultSession.setDisplayMediaRequestHandler(async (_req, callback) => {
    try {
      if (!rec) return callback({});
      const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 0, height: 0 } });
      const src = sources.find((s) => s.id === rec.sourceId)
        || sources.find((s) => s.display_id === String(rec.display.id));
      if (!src) return callback({});
      callback(rec.systemAudio ? { video: src, audio: 'loopback' } : { video: src });
    } catch (err) {
      console.error(err);
      callback({});
    }
  });
}

ipcMain.on('rec:ready', (_e, info) => {
  if (!rec) return;
  fs.mkdirSync(LIB, { recursive: true });
  rec.file = uniquePath('video_' + stamp(), info.ext);
  rec.fd = fs.openSync(rec.file, 'w');
  rec.ready = true;
  if (info.warning) sendBar({ warning: info.warning });
  if (rec.go) { sendRec('start'); sendBar('recording'); }
});
ipcMain.on('rec:chunk', (_e, data) => {
  if (rec && rec.fd !== null) fs.writeSync(rec.fd, Buffer.from(data));
});
ipcMain.on('rec:done', () => finishRecording());
ipcMain.on('rec:error', (_e, msg) => finishRecording(msg || 'erreur inconnue'));
ipcMain.on('recbar:action', (_e, action) => {
  if (!rec) return;
  if (action === 'countdown-done') {
    rec.go = true;
    if (rec.ready) { sendRec('start'); sendBar('recording'); } else sendBar('waiting');
  } else if (action === 'pause') { sendRec('pause'); sendBar('paused'); }
  else if (action === 'resume') { sendRec('resume'); sendBar('recording'); }
  else if (action === 'stop') stopRecording();
  else if (action === 'cancel') {
    rec.cancelled = true;
    if (rec.go && rec.ready) sendRec('stop'); else finishRecording();
  }
});

// ---------------------------------------------------------------- OCR (Windows)
function runPowerShell(script, args) {
  return new Promise((resolve, reject) => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, ...args],
      { windowsHide: true, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, timeout: 60000 },
      (err, stdout, stderr) => {
        if (err) reject(new Error((stderr || err.message).trim()));
        else resolve(stdout.replace(/\r\n/g, '\n').trim());
      });
  });
}

// ---------------------------------------------------------------- échanges avec les fenêtres
ipcMain.on('capture:start', (_e, mode) => {
  if (mode === 'full') quickFullScreen();
  else startCapture(mode);
});
ipcMain.handle('app:info', () => ({ shortcuts: shortcutStatus, library: LIB, settings }));
ipcMain.handle('settings:set', (_e, patch) => {
  settings = { ...settings, ...patch };
  saveSettings();
  return settings;
});
ipcMain.handle('lib:list', () => listLibrary());
ipcMain.handle('lib:meta-load', (_e, file) => {
  if (!insideLib(file)) return null;
  try { return JSON.parse(fs.readFileSync(metaPaths(file).json, 'utf8')); } catch (_) { return null; }
});
ipcMain.handle('lib:meta-save', (_e, file, meta, thumbDataUrl) => {
  if (!insideLib(file)) return false;
  fs.mkdirSync(META, { recursive: true });
  const mp = metaPaths(file);
  const empty = !meta || (!meta.crop && (!meta.shapes || meta.shapes.length === 0) && (!meta.cuts || meta.cuts.length === 0));
  if (empty) {
    fs.rmSync(mp.json, { force: true });
    fs.rmSync(mp.thumb, { force: true });
  } else {
    fs.writeFileSync(mp.json, JSON.stringify(meta));
    if (thumbDataUrl) fs.writeFileSync(mp.thumb, nativeImage.createFromDataURL(thumbDataUrl).toJPEG(85));
  }
  return true;
});
ipcMain.handle('lib:delete', async (_e, file) => {
  if (!insideLib(file)) return false;
  await shell.trashItem(file);
  const mp = metaPaths(file);
  fs.rmSync(mp.json, { force: true });
  fs.rmSync(mp.thumb, { force: true });
  return true;
});
ipcMain.on('lib:reveal', (_e, file) => shell.showItemInFolder(file));
ipcMain.on('lib:open-folder', () => { fs.mkdirSync(LIB, { recursive: true }); shell.openPath(LIB); });
ipcMain.on('lib:open-external', (_e, file) => { if (insideLib(file)) shell.openPath(file); });
ipcMain.handle('clip:image', async (_e, dataUrl) => {
  await copyImageToClipboard(nativeImage.createFromDataURL(dataUrl));
  return true;
});
ipcMain.handle('clip:text', async (_e, text) => { await clipboard.writeText(text); return true; });
ipcMain.handle('clip:paste', async () => {
  const img = await readClipboardImage();
  if (!img) return false;
  saveCapture(img);
  return true;
});
ipcMain.handle('file:save-as', async (_e, dataUrl, suggested) => {
  const res = await dialog.showSaveDialog(editorWin, {
    title: 'Enregistrer l\'image',
    defaultPath: path.join(LIB, suggested || 'capture.png'),
    filters: [{ name: 'Image PNG', extensions: ['png'] }, { name: 'Image JPEG', extensions: ['jpg', 'jpeg'] }],
  });
  if (res.canceled || !res.filePath) return null;
  const img = nativeImage.createFromDataURL(dataUrl);
  const isJpg = /\.jpe?g$/i.test(res.filePath);
  try {
    fs.writeFileSync(res.filePath, isJpg ? img.toJPEG(92) : img.toPNG());
  } catch (err) {
    throw new Error('Windows refuse l\'écriture dans ce dossier (protection des dossiers ?). Choisissez un autre dossier.');
  }
  return res.filePath;
});
ipcMain.handle('ocr', async (_e, dataUrl) => {
  const tmp = path.join(os.tmpdir(), `captur-ocr-${Date.now()}.png`);
  fs.writeFileSync(tmp, nativeImage.createFromDataURL(dataUrl).toPNG());
  try {
    return await runPowerShell(OCR_SCRIPT, [tmp]);
  } finally {
    fs.rm(tmp, { force: true }, () => {});
  }
});

// ---------------------------------------------------------------- démarrage
app.on('second-instance', showEditor);
app.on('window-all-closed', () => { /* reste dans la zone de notification */ });
app.on('before-quit', () => { quitting = true; });
app.on('will-quit', () => globalShortcut.unregisterAll());

app.whenReady().then(() => {
  loadSettings();
  fs.mkdirSync(LIB, { recursive: true });
  setupDisplayMedia();
  createTray();
  registerShortcuts();
  const hidden = process.argv.includes('--hidden');
  createEditor(!hidden);
  if (process.argv.includes('--selftest')) {
    require('./selftest')({
      LIB,
      startCapture,
      stopRecording,
      select: onSelect,
      editor: () => editorWin,
      state: () => ({
        ready: !!capture && overlays.length > 0 && capture.ready >= overlays.length,
        overlays,
        rec,
      }),
      quit: (code) => { quitting = true; app.exit(code); },
    });
  }
});
