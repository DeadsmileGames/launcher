const { contextBridge, ipcRenderer } = require('electron');

function on(channel, callback) {
  if (typeof callback !== 'function') return () => {};
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('deadsmile', {
  getOverlayBootstrap: () => ipcRenderer.invoke('deadsmile:overlay-bootstrap'),
  onAchievementUnlocked: (callback) => on('deadsmile:achievement-unlocked', callback),
  onGameViewLanguageChanged: (callback) => on('deadsmile:gameview-language-changed', callback),
});
