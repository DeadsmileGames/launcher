const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('deadsmile', {
  platform: process.platform,
});