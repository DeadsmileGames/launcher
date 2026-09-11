const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('deadsmile', {
  platform: process.platform,
  api: (request) => ipcRenderer.invoke('deadsmile:api', request),
  storage: {
    paths: () => ipcRenderer.invoke('deadsmile:storage-paths'),
    normalizeLibrary: (library) =>
      ipcRenderer.invoke('deadsmile:normalize-library', library),
  },
  openExternal: (url) => ipcRenderer.invoke('deadsmile:open-external', url),
  openPath: (target) => ipcRenderer.invoke('deadsmile:open-path', target),
  deleteGame: (target) => ipcRenderer.invoke('deadsmile:delete-game', target),
  checkForUpdate: () => ipcRenderer.invoke('deadsmile:update-check'),
  updateLauncher: () => ipcRenderer.invoke('deadsmile:update-start'),
  onUpdateProgress: (callback) => {
    const listener = (_event, progress) => callback(progress);
    ipcRenderer.on('deadsmile:update-progress', listener);
    return () => ipcRenderer.removeListener('deadsmile:update-progress', listener);
  },
  downloadGame: (payload) =>
    ipcRenderer.invoke('deadsmile:download-game', payload),
  pauseDownload: (id) => ipcRenderer.invoke('deadsmile:download-pause', id),
  resumeDownload: (id) => ipcRenderer.invoke('deadsmile:download-resume', id),
  cancelDownload: (id) => ipcRenderer.invoke('deadsmile:download-cancel', id),
  reorderDownloads: (ids) =>
    ipcRenderer.invoke('deadsmile:download-reorder', ids),
  setMaxConcurrentDownloads: (n) =>
    ipcRenderer.invoke('deadsmile:download-set-concurrent', n),
  getDownloadSnapshot: () => ipcRenderer.invoke('deadsmile:download-snapshot'),

  onDownloadQueue: (callback) => {
    const listener = (_event, queue) => callback(queue);
    ipcRenderer.on('deadsmile:download-queue', listener);
    return () =>
      ipcRenderer.removeListener('deadsmile:download-queue', listener);
  },
  playtime: {
    get: () => ipcRenderer.invoke('deadsmile:playtime-get'),
    clear: () => ipcRenderer.invoke('deadsmile:playtime-clear'),
  },
  playGame: (payload) => ipcRenderer.invoke('deadsmile:play-game', payload),
  onPlaytimeUpdate: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('deadsmile:playtime-update', listener);
    return () => ipcRenderer.removeListener('deadsmile:playtime-update', listener);
  },
  window: {
    minimize: () => ipcRenderer.invoke('deadsmile:window', 'minimize'),
    close: () => ipcRenderer.invoke('deadsmile:window', 'close'),
    toggleMaximize: () =>
      ipcRenderer.invoke('deadsmile:window', 'toggleMaximize'),
  },
});