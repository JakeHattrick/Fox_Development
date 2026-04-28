const { contextBridge, ipcRenderer } = require('electron');
const { version } = require('../package.json'); 

contextBridge.exposeInMainWorld('electronApp', {
  getVersion: () => version
});

// contextBridge.exposeInMainWorld('electronAPI', {
//   onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
//   onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
//   triggerInstall: () => ipcRenderer.send('install-update'),
//   triggerDownload: () => ipcRenderer.send('download-update')
// });
