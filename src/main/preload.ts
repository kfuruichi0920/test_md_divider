import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  openFileDialog: () => Promise<string | null>;
  readFile: (filePath: string) => Promise<string | null>;
  onFileSelected: (callback: (filePath: string) => void) => void;
  saveJson: (jsonContent: string, suggestedName: string) => Promise<string | null>;
  openJsonDialog: () => Promise<string | null>;
  overwriteJson: (jsonContent: string, filePath: string) => Promise<string | null>;
}

const electronAPI: ElectronAPI = {
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  onFileSelected: (callback: (filePath: string) => void) => {
    ipcRenderer.on('file-selected', (_event, filePath) => callback(filePath));
  },
  saveJson: (jsonContent: string, suggestedName: string) => ipcRenderer.invoke('save-json', jsonContent, suggestedName),
  openJsonDialog: () => ipcRenderer.invoke('open-json-dialog'),
  overwriteJson: (jsonContent: string, filePath: string) => ipcRenderer.invoke('overwrite-json', jsonContent, filePath),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);