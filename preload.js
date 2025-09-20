const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveVideo: (buffer) => ipcRenderer.invoke('save-video', buffer),
  getDocumentsPath: () => ipcRenderer.invoke('get-documents-path')
});
