import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  openFileDialog: () => Promise<string | null>;
  readFile: (filePath: string) => Promise<string | null>;
  onFileSelected: (callback: (filePath: string) => void) => void;
}

const electronAPI: ElectronAPI = {
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  onFileSelected: (callback: (filePath: string) => void) => {
    ipcRenderer.on('file-selected', (_event, filePath) => callback(filePath));
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);