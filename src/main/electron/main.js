import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import sshService from '../../../server/services/sshService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#0D1117',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    frame: false, // For a custom title bar look if desired
    titleBarStyle: 'hiddenInset',
  });

  // Load Vite dev server or production index.html
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../../dist/index.html'));
  }
}

// IPC Handlers for SSH
function setupIPC() {
  // Connect
  ipcMain.on('ssh:connect', async (event, data) => {
    const { sessionId, config } = data;
    console.log(`[IPC] Connecting SSH session ${sessionId} to ${config.host}`);

    try {
      await sshService.createSession(
        sessionId,
        config,
        (data) => {
          // Stream raw data back to UI
          mainWindow?.webContents.send('ssh:output', { sessionId, data });
        },
        (status, payload) => {
          // Status events (READY, ERROR, CLOSED)
          mainWindow?.webContents.send('ssh:event', { sessionId, event: status, ...payload });
        }
      );
    } catch (error) {
      mainWindow?.webContents.send('ssh:event', { sessionId, event: 'ERROR', message: error.message });
    }
  });

  // Input
  ipcMain.on('ssh:input', (event, { sessionId, input }) => {
    sshService.sendData(sessionId, input);
  });

  // Resize
  ipcMain.on('ssh:resize', (event, { sessionId, cols, rows }) => {
    sshService.resize(sessionId, cols, rows);
  });

  // Disconnect
  ipcMain.on('ssh:disconnect', (event, { sessionId }) => {
    sshService.disconnect(sessionId);
    console.log(`[IPC] Session ${sessionId} disconnected.`);
  });
}

// Lifecycle
app.whenReady().then(() => {
  setupIPC();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
