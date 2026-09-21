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
  onAppFocus: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('deadsmile:app-focus', listener);
    return () => ipcRenderer.removeListener('deadsmile:app-focus', listener);
  },
  deleteGame: (target, id = null) => ipcRenderer.invoke('deadsmile:delete-game', { target, id }),
  consumePendingUpdate: () => ipcRenderer.invoke('deadsmile:consume-pending-update'),
  version: () => ipcRenderer.invoke('deadsmile:app-version'),
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
  ensureGameShortcut: (payload) =>
    ipcRenderer.invoke('deadsmile:ensure-game-shortcut', payload),
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
  getRunningGames: () => ipcRenderer.invoke('deadsmile:running-games'),
  getGameViewSettings: () => ipcRenderer.invoke('deadsmile:gameview-settings-get'),
  setGameViewSettings: (patch) => ipcRenderer.invoke('deadsmile:gameview-settings-set', patch),
  beginGameViewShortcutCapture: () =>
    ipcRenderer.invoke('deadsmile:gameview-shortcut-capture-start'),
  cancelGameViewShortcutCapture: () =>
    ipcRenderer.invoke('deadsmile:gameview-shortcut-capture-cancel'),
  onGameViewSettingsChanged: (callback) => {
    const listener = (_event, settings) => callback(settings);
    ipcRenderer.on('deadsmile:gameview-settings-changed', listener);
    return () =>
      ipcRenderer.removeListener('deadsmile:gameview-settings-changed', listener);
  },
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
  syncGameViewLibrary: (ids) =>
    ipcRenderer.invoke('deadsmile:gameview-library-set', ids),

  onGameViewLanguageChanged: (callback) => {
    const listener = (_event, payload) => callback(payload);

    ipcRenderer.on(
      'deadsmile:gameview-language-changed',
      listener
    );

    return () =>
      ipcRenderer.removeListener(
        'deadsmile:gameview-language-changed',
        listener
      );
  },
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
  onLaunchGame: (callback) => {
    const listener = (_event, gameId) => callback(gameId);
    ipcRenderer.on('deadsmile:launch-game', listener);
    return () => ipcRenderer.removeListener('deadsmile:launch-game', listener);
  },
  readyForLaunchRequests: () =>
    ipcRenderer.invoke('deadsmile:renderer-ready-for-launch'),
});
