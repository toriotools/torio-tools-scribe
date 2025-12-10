const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let pythonProcess;

// Determinar caminho do Python engine
function getEnginePath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'engine', 'torio_scribe_engine.exe');
  }
  return path.join(__dirname, 'engine', 'main.py');
}

// Iniciar Python backend
function startPythonEngine() {
  const enginePath = getEnginePath();

  if (app.isPackaged) {
    pythonProcess = spawn(enginePath, [], {
      cwd: path.dirname(enginePath)
    });
  } else {
    pythonProcess = spawn('python', [enginePath], {
      cwd: path.join(__dirname, 'engine')
    });
  }

  pythonProcess.stdout.on('data', (data) => {
    console.log(`[Engine] ${data}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`[Engine Error] ${data}`);
  });

  pythonProcess.on('close', (code) => {
    console.log(`[Engine] Process exited with code ${code}`);
  });
}

// Criar janela principal
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    backgroundColor: '#09090b',
    icon: path.join(__dirname, 'assets', 'icons', 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    frame: true,
    titleBarStyle: 'default',
    show: false
  });

  // Remover menu padrão (File, Edit, View, etc.)
  Menu.setApplicationMenu(null);

  // Carregar app - tentar dev server primeiro, depois arquivo local
  const devServerUrl = 'http://localhost:3000';
  const localFile = path.join(__dirname, 'renderer', 'dist', 'index.html');

  // Verificar se dev server está rodando (com retry)
  const http = require('http');
  const checkDevServer = () => {
    return new Promise((resolve) => {
      const req = http.get(devServerUrl, (res) => {
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
      req.setTimeout(2000, () => {
        req.destroy();
        resolve(false);
      });
    });
  };

  // Tentar conectar ao dev server com retry
  const tryConnect = async (maxRetries = 10) => {
    for (let i = 0; i < maxRetries; i++) {
      console.log(`[Electron] Tentativa ${i + 1}/${maxRetries} de conectar ao dev server...`);
      const isRunning = await checkDevServer();
      if (isRunning) {
        console.log('[Electron] Dev server encontrado!');
        mainWindow.loadURL(devServerUrl);
        mainWindow.webContents.openDevTools();
        return true;
      }
      // Esperar 1 segundo antes de tentar novamente
      await new Promise(r => setTimeout(r, 1000));
    }
    return false;
  };

  tryConnect().then((connected) => {
    if (!connected) {
      // Verificar se arquivo local existe
      const fs = require('fs');
      if (fs.existsSync(localFile)) {
        console.log('[Electron] Carregando arquivo local: ' + localFile);
        mainWindow.loadFile(localFile);
      } else {
        // Mostrar página de erro/aguardando
        mainWindow.loadURL(`data:text/html,
          <html>
            <head>
              <style>
                body { 
                  font-family: 'Segoe UI', sans-serif; 
                  background: #09090b; 
                  color: white; 
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  margin: 0;
                }
                h1 { color: #F97316; }
                .spinner {
                  width: 50px;
                  height: 50px;
                  border: 4px solid #27272a;
                  border-top: 4px solid #F97316;
                  border-radius: 50%;
                  animation: spin 1s linear infinite;
                  margin-bottom: 20px;
                }
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
                code { 
                  background: #27272a; 
                  padding: 10px 20px; 
                  border-radius: 8px; 
                  display: block;
                  margin: 10px 0;
                }
                button {
                  background: #F97316;
                  color: white;
                  border: none;
                  padding: 12px 24px;
                  border-radius: 8px;
                  cursor: pointer;
                  font-size: 16px;
                  margin-top: 20px;
                }
                button:hover { background: #EA580C; }
              </style>
            </head>
            <body>
              <div class="spinner"></div>
              <h1>Aguardando Dev Server...</h1>
              <p>Execute o dev server primeiro:</p>
              <code>cd renderer && npm run dev</code>
              <p>Ou faça o build para produção:</p>
              <code>cd renderer && npm run build</code>
              <button onclick="location.reload()">Tentar Novamente</button>
            </body>
          </html>
        `);
      }
    }
  });

  // Mostrar quando pronto
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('open-external', async (event, url) => {
  await shell.openExternal(url);
  return true;
});

ipcMain.handle('transcribe-audio', async (event, filePath, options) => {
  try {
    const response = await fetch('http://127.0.0.1:5123/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_path: filePath, ...options })
    });
    return await response.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-engine-status', async () => {
  try {
    const response = await fetch('http://127.0.0.1:5123/status');
    return await response.json();
  } catch (error) {
    return { ready: false, error: error.message };
  }
});

ipcMain.handle('select-file', async (event, options) => {
  const { dialog } = require('electron');
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: options?.filters || [
      { name: 'Media Files', extensions: ['mp4', 'mov', 'mkv', 'mp3', 'wav', 'webm'] }
    ]
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('save-file', async (event, options) => {
  const { dialog } = require('electron');
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: options?.defaultPath || 'legendas.srt',
    filters: options?.filters || [
      { name: 'Subtitle Files', extensions: ['srt', 'vtt', 'ass'] }
    ]
  });
  return result.canceled ? null : result.filePath;
});

// App lifecycle
app.whenReady().then(() => {
  startPythonEngine();

  // Aguardar engine iniciar
  setTimeout(createWindow, 1500);
});

app.on('window-all-closed', () => {
  if (pythonProcess) {
    pythonProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (pythonProcess) {
    pythonProcess.kill();
  }
});
