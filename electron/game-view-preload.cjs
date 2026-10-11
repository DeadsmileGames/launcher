const { contextBridge, ipcRenderer } = require('electron');

function on(channel, callback) {
  if (typeof callback !== 'function') return () => {};
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('deadsmile', {
  api: (request) => ipcRenderer.invoke('deadsmile:api', request),
  getOverlayBootstrap: () => ipcRenderer.invoke('deadsmile:overlay-bootstrap'),
  closeOverlay: () => ipcRenderer.invoke('deadsmile:overlay-close'),
  setOverlayInteractive: (interactive) => ipcRenderer.invoke('deadsmile:overlay-interactive', Boolean(interactive)),
  onAchievementUnlocked: (callback) => on('deadsmile:achievement-unlocked', callback),
  onGameState: (callback) => on('deadsmile:game-state', callback),
  onGameViewLanguageChanged: (callback) => on('deadsmile:gameview-language-changed', callback),
  onOverlayShown: (callback) => on('deadsmile:overlay-shown', callback),
  onOverlayHiding: (callback) => on('deadsmile:overlay-hiding', callback),
});
