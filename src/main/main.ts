import { app, BrowserWindow, Menu, dialog, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

class Application {
  private mainWindow: BrowserWindow | null = null;

  constructor() {
    this.isDev = process.env.NODE_ENV === 'development';
    this.initializeApp();
  }

  private isDev: boolean;

  private initializeApp(): void {
    app.whenReady().then(() => {
      this.createWindow();
      this.setupMenu();
      this.setupIPC();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createWindow();
        }
      });
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });
  }

  private createWindow(): void {
    this.mainWindow = new BrowserWindow({
      height: 800,
      width: 1200,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
    });

    if (this.isDev) {
      this.mainWindow.loadURL('http://localhost:3000');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }
  }

  private setupMenu(): void {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'ファイル',
        submenu: [
          {
            label: 'ファイルを開く',
            accelerator: 'CmdOrCtrl+O',
            click: () => this.openFile(),
          },
          { type: 'separator' },
          {
            label: '終了',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => app.quit(),
          },
        ],
      },
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  private setupIPC(): void {
    ipcMain.handle('open-file-dialog', this.handleOpenFileDialog.bind(this));
    ipcMain.handle('read-file', this.handleReadFile.bind(this));
    ipcMain.handle('save-json', this.handleSaveJson.bind(this));
    ipcMain.handle('open-json-dialog', this.handleOpenJsonDialog.bind(this));
    ipcMain.handle('overwrite-json', this.handleOverwriteJson.bind(this));
  }

  private async openFile(): Promise<void> {
    if (!this.mainWindow) return;

    const result = await dialog.showOpenDialog(this.mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'テキストファイル', extensions: ['txt', 'md'] },
        { name: 'すべてのファイル', extensions: ['*'] },
      ],
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      this.mainWindow.webContents.send('file-selected', filePath);
    }
  }

  private async handleOpenFileDialog(): Promise<string | null> {
    if (!this.mainWindow) return null;

    const result = await dialog.showOpenDialog(this.mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'テキストファイル', extensions: ['txt', 'md'] },
        { name: 'すべてのファイル', extensions: ['*'] },
      ],
    });

    return result.canceled ? null : result.filePaths[0];
  }

  private async handleReadFile(event: Electron.IpcMainInvokeEvent, filePath: string): Promise<string | null> {
    try {
      const stats = await fs.promises.stat(filePath);
      if (stats.size > 10 * 1024 * 1024) { // 10MB制限
        throw new Error('ファイルサイズが10MBを超えています');
      }

      const content = await fs.promises.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      console.error('ファイル読み込みエラー:', error);
      return null;
    }
  }

  private async handleSaveJson(event: Electron.IpcMainInvokeEvent, jsonContent: string, suggestedName: string): Promise<string | null> {
    if (!this.mainWindow) return null;

    try {
      const result = await dialog.showSaveDialog(this.mainWindow, {
        defaultPath: suggestedName,
        filters: [
          { name: 'JSONファイル', extensions: ['json'] },
          { name: 'すべてのファイル', extensions: ['*'] },
        ],
      });

      if (result.canceled || !result.filePath) {
        return null;
      }

      await fs.promises.writeFile(result.filePath, jsonContent, 'utf-8');
      return result.filePath;
    } catch (error) {
      console.error('JSON保存エラー:', error);
      return null;
    }
  }

  private async handleOpenJsonDialog(): Promise<string | null> {
    if (!this.mainWindow) return null;

    const result = await dialog.showOpenDialog(this.mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'JSONファイル', extensions: ['json'] },
        { name: 'すべてのファイル', extensions: ['*'] },
      ],
    });

    return result.canceled ? null : result.filePaths[0];
  }

  private async handleOverwriteJson(_event: Electron.IpcMainInvokeEvent, jsonContent: string, filePath: string): Promise<string | null> {
    try {
      const backupDir = path.join(process.cwd(), '_bk');
      await fs.promises.mkdir(backupDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const baseName = path.basename(filePath);
      const backupPath = path.join(backupDir, `${timestamp}_${baseName}`);
      await fs.promises.copyFile(filePath, backupPath);

      await fs.promises.writeFile(filePath, jsonContent, 'utf-8');
      console.log(`JSONファイルを上書き保存しました: ${filePath}`);
      return filePath;
    } catch (error) {
      console.error('JSON上書き保存エラー:', error);
      return null;
    }
  }
}

new Application();