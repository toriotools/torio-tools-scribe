// Tipos para a API Electron exposta via preload
export interface ElectronAPI {
    openExternal: (url: string) => Promise<boolean>;
    transcribeAudio: (filePath: string, options?: TranscribeOptions) => Promise<TranscribeResult>;
    getEngineStatus: () => Promise<EngineStatus>;
    selectFile: (options?: FileDialogOptions) => Promise<string | null>;
    saveFile: (options?: SaveDialogOptions) => Promise<string | null>;
    platform: string;
    isElectron: boolean;
}

export interface TranscribeOptions {
    language?: string;
    format?: 'srt' | 'vtt' | 'ass';
    max_chars_per_line?: number;
    max_lines?: number;
    min_duration?: number;
    max_duration?: number;
}

export interface TranscribeResult {
    success: boolean;
    subtitles?: string;
    duration?: number;
    language?: string;
    error?: string;
}

export interface EngineStatus {
    ready: boolean;
    model?: string;
    version?: string;
    error?: string;
}

export interface FileDialogOptions {
    filters?: Array<{ name: string; extensions: string[] }>;
}

export interface SaveDialogOptions {
    defaultPath?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
}

// Declarar window.electronAPI
declare global {
    interface Window {
        electronAPI?: ElectronAPI;
    }
}

// Helpers para usar a API
export const electronAPI = window.electronAPI;

export const isElectron = (): boolean => {
    return window.electronAPI?.isElectron === true;
};

export const openExternalLink = async (url: string): Promise<void> => {
    if (isElectron() && electronAPI) {
        await electronAPI.openExternal(url);
    } else {
        window.open(url, '_blank', 'noopener,noreferrer');
    }
};
