const { contextBridge, ipcRenderer } = require('electron');
// In Electron 27+, renderer-only modules are best imported from 'electron/renderer'
let desktopCapturer;
try {
  // Prefer explicit renderer import to avoid undefined in certain contexts
  desktopCapturer = require('electron/renderer').desktopCapturer;
} catch (e) {
  // Fallback if context-aware packaging isn't in use
  desktopCapturer = require('electron').desktopCapturer;
}

contextBridge.exposeInMainWorld('electronAPI', {
  saveVideo: (buffer) => ipcRenderer.invoke('save-video', buffer),
  getDocumentsPath: () => ipcRenderer.invoke('get-documents-path'),
  getPlatform: () => process.platform,
  getDesktopSources: async (options = {}) => {
    const { types = ['screen', 'window'], thumbnailSize } = options;
    if (!desktopCapturer || typeof desktopCapturer.getSources !== 'function') {
      throw new Error('desktopCapturer is unavailable in this context');
    }
    const sources = await desktopCapturer.getSources({ types, thumbnailSize });
    return sources.map(s => ({ id: s.id, name: s.name }));
  }
});
