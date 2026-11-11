'use strict';
const { contextBridge, ipcRenderer } = require('electron');

const on = (channel, fn) => ipcRenderer.on(channel, (_e, ...args) => fn(...args));

contextBridge.exposeInMainWorld('api', {
  // Sélection à l'écran
  onOverlayInit: (fn) => on('overlay:init', fn),
  overlayReady: () => ipcRenderer.send('overlay:ready'),
  overlaySelect: (sel) => ipcRenderer.send('overlay:select', sel),
  overlayCancel: () => ipcRenderer.send('overlay:cancel'),

  // Éditeur
  onOpen: (fn) => on('editor:open', fn),
  startCapture: (mode) => ipcRenderer.send('capture:start', mode),
  appInfo: () => ipcRenderer.invoke('app:info'),
  setSettings: (patch) => ipcRenderer.invoke('settings:set', patch),
  listLibrary: () => ipcRenderer.invoke('lib:list'),
  loadMeta: (file) => ipcRenderer.invoke('lib:meta-load', file),
  saveMeta: (file, meta, thumb) => ipcRenderer.invoke('lib:meta-save', file, meta, thumb),
  deleteItem: (file) => ipcRenderer.invoke('lib:delete', file),
  reveal: (file) => ipcRenderer.send('lib:reveal', file),
  openFolder: () => ipcRenderer.send('lib:open-folder'),
  openExternal: (file) => ipcRenderer.send('lib:open-external', file),
  copyImage: (dataUrl) => ipcRenderer.invoke('clip:image', dataUrl),
  copyText: (text) => ipcRenderer.invoke('clip:text', text),
  pasteImage: () => ipcRenderer.invoke('clip:paste'),
  saveAs: (dataUrl, name) => ipcRenderer.invoke('file:save-as', dataUrl, name),
  ocr: (dataUrl) => ipcRenderer.invoke('ocr', dataUrl),

  // Enregistrement vidéo
  onRecInit: (fn) => on('rec:init', fn),
  onRecCommand: (fn) => on('rec:cmd', fn),
  recReady: (info) => ipcRenderer.send('rec:ready', info),
  recChunk: (bytes) => ipcRenderer.send('rec:chunk', bytes),
  recDone: () => ipcRenderer.send('rec:done'),
  recError: (msg) => ipcRenderer.send('rec:error', msg),
  onRecBarState: (fn) => on('recbar:state', fn),
  recBarAction: (action) => ipcRenderer.send('recbar:action', action),
});
