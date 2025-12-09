const { contextBridge, ipcRenderer } = require('electron');
const { version } = require('../package.json'); 

// Expose the app version
contextBridge.exposeInMainWorld('electronApp', {
  getVersion: () => version
});



// Optional: keep commented Electron update API if needed
// contextBridge.exposeInMainWorld('electronAPI', {
//   onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
//   onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
//   triggerInstall: () => ipcRenderer.send('install-update'),
//   triggerDownload: () => ipcRenderer.send('download-update')
// });
