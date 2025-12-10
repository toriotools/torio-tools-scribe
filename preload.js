const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Abrir links no navegador padrão
    openExternal: (url) => ipcRenderer.invoke('open-external', url),

    // Transcrição de áudio
    transcribeAudio: (filePath, options) => ipcRenderer.invoke('transcribe-audio', filePath, options),

    // Status do engine Python
    getEngineStatus: () => ipcRenderer.invoke('get-engine-status'),

    // Diálogos de arquivo
    selectFile: (options) => ipcRenderer.invoke('select-file', options),
    saveFile: (options) => ipcRenderer.invoke('save-file', options),

    // Info do sistema
    platform: process.platform,
    isElectron: true
});
