const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('deadsmile', {
  platform: process.platform,
  api: (request) => ipcRenderer.invoke('deadsmile:api', request),
  storage: {
    normalizeLibrary: (library) =>
      ipcRenderer.invoke('deadsmile:normalize-library', library),
  },
  openExternal: (url) => ipcRenderer.invoke('deadsmile:open-external', url),
  onAppFocus: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('deadsmile:app-focus', listener);
    return () => ipcRenderer.removeListener('deadsmile:app-focus', listener);
  },
  deleteGame: (target, id = null, slug = null) => ipcRenderer.invoke('deadsmile:delete-game', { target, id, slug }),
  clearAuthSession: () => ipcRenderer.invoke('deadsmile:clear-auth-session'),
  checkForUpdate: () => ipcRenderer.invoke('deadsmile:update-check'),
  checkGameUpdate: (payload) => ipcRenderer.invoke('deadsmile:game-update-check', payload),
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
  getDownloadSnapshot: () => ipcRenderer.invoke('deadsmile:download-snapshot'),

  onDownloadQueue: (callback) => {
    const listener = (_event, queue) => callback(queue);
    ipcRenderer.on('deadsmile:download-queue', listener);
    return () =>
      ipcRenderer.removeListener('deadsmile:download-queue', listener);
  },
  playGame: (payload) => ipcRenderer.invoke('deadsmile:play-game', payload),
  getRunningGames: () => ipcRenderer.invoke('deadsmile:running-games'),
  onGameState: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('deadsmile:game-state', listener);
    return () => ipcRenderer.removeListener('deadsmile:game-state', listener);
  },
  onAchievementUnlocked: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('deadsmile:achievement-unlocked', listener);
    return () => ipcRenderer.removeListener('deadsmile:achievement-unlocked', listener);
  },
  onCloudSaveConflict: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('deadsmile:cloud-save-conflict', listener);
    return () => ipcRenderer.removeListener('deadsmile:cloud-save-conflict', listener);
  },
  syncGameViewLanguage: (payload) =>
    ipcRenderer.invoke('deadsmile:gameview-language-set', payload),

  onLaunchGame: (callback) => {
    const listener = (_event, gameId) => callback(gameId);
    ipcRenderer.on('deadsmile:launch-game', listener);
    return () => ipcRenderer.removeListener('deadsmile:launch-game', listener);
  },
  readyForLaunchRequests: () =>
    ipcRenderer.invoke('deadsmile:renderer-ready-for-launch'),
});
