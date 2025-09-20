const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      // Enable screen sharing
      webSecurity: false,
      allowRunningInsecureContent: true,
      experimentalFeatures: true
    },
    icon: path.join(__dirname, 'assets/icon.png'), // Optional icon
    title: 'Screen & Camera Recorder'
  });

  // Load the HTML file directly
  mainWindow.loadFile('index.html');
  
  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Handle screen sharing permissions
  app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder');
  app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor');
  
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle saving video files
ipcMain.handle('save-video', async (event, buffer) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Video',
      defaultPath: `recording-${Date.now()}.webm`,
      filters: [
        { name: 'WebM Video', extensions: ['webm'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (!result.canceled && result.filePath) {
      // Convert Uint8Array to Buffer if needed
      const bufferData = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
      fs.writeFileSync(result.filePath, bufferData);
      return { success: true, path: result.filePath };
    }
    
    return { success: false, error: 'Save dialog canceled' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Handle getting user's documents directory
ipcMain.handle('get-documents-path', () => {
  return app.getPath('documents');
});
