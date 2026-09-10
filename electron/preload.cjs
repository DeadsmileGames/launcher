const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('deadsmile', {
  platform: process.platform,
  api: (request) => ipcRenderer.invoke('deadsmile:api', request),
  storage: { paths: () => ipcRenderer.invoke('deadsmile:storage-paths'), normalizeLibrary: (library) => ipcRenderer.invoke('deadsmile:normalize-library', library) },
  openExternal: (url) => ipcRenderer.invoke('deadsmile:open-external', url),
  openPath: (target) => ipcRenderer.invoke('deadsmile:open-path', target),
  deleteGame: (target) => ipcRenderer.invoke('deadsmile:delete-game', target),
  downloadGame: (request) => ipcRenderer.invoke('deadsmile:download-game', request),
  checkForUpdate: () => ipcRenderer.invoke('deadsmile:update-check'),
  updateLauncher: () => ipcRenderer.invoke('deadsmile:update-start'),
  window: {
    minimize: () => ipcRenderer.invoke('deadsmile:window', 'minimize'),
    close: () => ipcRenderer.invoke('deadsmile:window', 'close'),
    toggleMaximize: () => ipcRenderer.invoke('deadsmile:window', 'toggleMaximize'),
  },
  onUpdateProgress: (callback) => {
    const listener = (_event, progress) => callback(progress);
    ipcRenderer.on('deadsmile:update-progress', listener);
    return () => ipcRenderer.removeListener('deadsmile:update-progress', listener);
  },
  onDownloadProgress: (callback) => {
    const listener = (_event, progress) => callback(progress);
    ipcRenderer.on('deadsmile:download-progress', listener);
    return () => ipcRenderer.removeListener('deadsmile:download-progress', listener);
  },
});
