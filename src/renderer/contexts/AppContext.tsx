import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { Card, CardStatus, CardUpdatePayload } from '@/models';
import { CardManager, SaveDataManager } from '@/services';
import { TextProcessor } from '@/utils';
import { LogEntry, LogLevel } from '../components/StatusLog';

interface AppState {
  cards: Card[];
  selectedCardId: string | null;
  isLoading: boolean;
  error: string | null;
  currentFile: string | null;
  currentJsonPath: string | null;
  filter: {
    status?: CardStatus;
    searchText?: string;
  };
  logs: LogEntry[];
  settings: {
    fontFamily: string;
    fontSize: number;
  };
  history: {
    undoCount: number;
    redoCount: number;
  };
}

type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CARDS'; payload: Card[] }
  | { type: 'SET_SELECTED_CARD'; payload: string | null }
  | { type: 'SET_CURRENT_FILE'; payload: string | null }
  | { type: 'SET_JSON_PATH'; payload: string | null }
  | { type: 'SET_FILTER'; payload: Partial<AppState['filter']> }
  | { type: 'UPDATE_CARD'; payload: Card }
  | { type: 'ADD_LOG'; payload: LogEntry }
  | { type: 'CLEAR_LOGS' }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppState['settings']> }
  | { type: 'SET_HISTORY'; payload: { undoCount: number; redoCount: number } };

interface AppContextType {
  state: AppState & { cardManager: CardManager };
  actions: {
    loadFile: (filePath: string) => Promise<void>;
    loadJsonFile: (filePath: string) => Promise<void>;
    saveJson: () => Promise<void>;
    overwriteJson: () => Promise<void>;
    updateCard: (id: string, updates: CardUpdatePayload) => void;
    selectCard: (id: string | null) => void;
    setFilter: (filter: Partial<AppState['filter']>) => void;
    clearFilter: () => void;
    addLog: (level: LogLevel, message: string, details?: string) => void;
    clearLogs: () => void;
    updateSettings: (settings: Partial<AppState['settings']>) => void;
    moveCard: (cardId: string, direction: 'up' | 'down') => void;
    moveCardToPosition: (cardId: string, targetIndex: number) => void;
    undo: () => void;
    redo: () => void;
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialState: AppState = {
  cards: [],
  selectedCardId: null,
  isLoading: false,
  error: null,
  currentFile: null,
  currentJsonPath: null,
  filter: {},
  logs: [],
  settings: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: 12,
  },
  history: {
    undoCount: 0,
    redoCount: 0,
  },
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'SET_CARDS':
      return { ...state, cards: action.payload };
    case 'SET_SELECTED_CARD':
      return { ...state, selectedCardId: action.payload };
    case 'SET_CURRENT_FILE':
      return { ...state, currentFile: action.payload };
    case 'SET_JSON_PATH':
      return { ...state, currentJsonPath: action.payload };
    case 'SET_FILTER':
      return { ...state, filter: { ...state.filter, ...action.payload } };
    case 'UPDATE_CARD':
      return {
        ...state,
        cards: state.cards.map(card =>
          card.id === action.payload.id ? action.payload : card
        ),
      };
    case 'ADD_LOG':
      return {
        ...state,
        logs: [...state.logs, action.payload].slice(-100), // 最新100件まで保持
      };
    case 'CLEAR_LOGS':
      return { ...state, logs: [] };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'SET_HISTORY':
      return { ...state, history: action.payload };
    default:
      return state;
  }
}

const cardManager = new CardManager();

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const undoStack = useRef<Card[][]>([]);
  const redoStack = useRef<Card[][]>([]);

  const cloneCards = useCallback((cards: Card[]): Card[] =>
    cards.map(card => ({
      ...card,
      createdAt: new Date(card.createdAt),
      updatedAt: new Date(card.updatedAt),
      statusUpdatedAt: card.statusUpdatedAt ? new Date(card.statusUpdatedAt) : undefined,
    })), []);

  const updateHistoryState = useCallback(() => {
    dispatch({
      type: 'SET_HISTORY',
      payload: { undoCount: undoStack.current.length, redoCount: redoStack.current.length },
    });
  }, []);

  const restoreCards = useCallback((cards: Card[]) => {
    cardManager.clear();
    cards.forEach(card => {
      cardManager.createCardFromData(card);
    });
    const updated = cardManager.getAllCards({
      filter: state.filter,
      sortOrder: 'displayOrder',
      sortDirection: 'asc',
    });
    dispatch({ type: 'SET_CARDS', payload: updated });
  }, [state.filter]);

  const undo = useCallback(() => {
    if (undoStack.current.length === 0) return;
    const current = cloneCards(cardManager.getAllCards({ sortOrder: 'displayOrder', sortDirection: 'asc' }));
    const snapshot = undoStack.current.pop()!;
    redoStack.current.push(current);
    restoreCards(snapshot);
    updateHistoryState();
  }, [cloneCards, restoreCards, updateHistoryState]);

  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return;
    const current = cloneCards(cardManager.getAllCards({ sortOrder: 'displayOrder', sortDirection: 'asc' }));
    const snapshot = redoStack.current.pop()!;
    undoStack.current.push(current);
    if (undoStack.current.length > 10) {
      undoStack.current.shift();
    }
    restoreCards(snapshot);
    updateHistoryState();
  }, [cloneCards, restoreCards, updateHistoryState]);

  // 初期化時にログ追加
  useEffect(() => {
    const initialLogEntry: LogEntry = {
      id: `log_init_${Date.now()}`,
      timestamp: new Date(),
      level: LogLevel.INFO,
      message: 'MD Dividerアプリケーションを起動しました',
    };
    dispatch({ type: 'ADD_LOG', payload: initialLogEntry });
  }, []);

  const updateCardsList = useCallback(() => {
    const cards = cardManager.getAllCards({
      filter: state.filter,
      sortOrder: 'displayOrder',
      sortDirection: 'asc',
    });
    dispatch({ type: 'SET_CARDS', payload: cards });
  }, [state.filter]);

  useEffect(() => {
    cardManager.addListener(updateCardsList);
    return () => cardManager.removeListener(updateCardsList);
  }, [updateCardsList]);

  useEffect(() => {
    updateCardsList();
  }, [updateCardsList]);

  const addLog = useCallback((level: LogLevel, message: string, details?: string) => {
    const logEntry: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      level,
      message,
      details,
    };
    dispatch({ type: 'ADD_LOG', payload: logEntry });
  }, []);

  const loadFile = useCallback(async (filePath: string) => {
    undoStack.current = [];
    redoStack.current = [];
    dispatch({ type: 'SET_HISTORY', payload: { undoCount: 0, redoCount: 0 } });
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    addLog(LogLevel.INFO, `テキストファイルの読み込みを開始: ${filePath}`);

    try {
      const content = await window.electronAPI.readFile(filePath);
      if (!content) {
        throw new Error('ファイルの読み込みに失敗しました');
      }

      addLog(LogLevel.INFO, 'ファイル内容の検証中...');
      const validation = TextProcessor.validateTextFile(content);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      addLog(LogLevel.INFO, '段落分割処理を実行中...');
      cardManager.clear();

      const paragraphs = TextProcessor.splitIntoParagraphs(content);
      paragraphs.forEach(paragraph => {
        cardManager.createCard(paragraph.content, paragraph.position);
      });

      dispatch({ type: 'SET_CURRENT_FILE', payload: filePath });
      dispatch({ type: 'SET_JSON_PATH', payload: null });
      addLog(LogLevel.SUCCESS, `テキストファイルの読み込みが完了: ${paragraphs.length}件の段落を作成`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
      addLog(LogLevel.ERROR, `ファイル読み込みエラー: ${errorMessage}`);
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [addLog]);

  const updateCard = useCallback((id: string, updates: CardUpdatePayload) => {
    const snapshot = cloneCards(cardManager.getAllCards({ sortOrder: 'displayOrder', sortDirection: 'asc' }));
    const updatedCard = cardManager.updateCard(id, updates);
    if (updatedCard) {
      undoStack.current.push(snapshot);
      if (undoStack.current.length > 10) {
        undoStack.current.shift();
      }
      redoStack.current = [];
      updateHistoryState();
      dispatch({ type: 'UPDATE_CARD', payload: updatedCard });

      // 更新内容をログに記録
      const changes = Object.keys(updates).join(', ');
      addLog(LogLevel.INFO, `カード #${updatedCard.position + 1} を更新: ${changes}`);
    }
  }, [addLog, cloneCards, updateHistoryState]);

  const selectCard = useCallback((id: string | null) => {
    dispatch({ type: 'SET_SELECTED_CARD', payload: id });
  }, []);

  const setFilter = useCallback((filter: Partial<AppState['filter']>) => {
    dispatch({ type: 'SET_FILTER', payload: filter });
    
    // フィルター変更をログに記録
    const filterDescriptions = [];
    if (filter.status) {
      const statusLabels = { unprocessed: '未処理', processing: '処理中', processed: '処理済み' };
      filterDescriptions.push(`状態: ${statusLabels[filter.status]}`);
    }
    if (filter.searchText) {
      filterDescriptions.push(`検索: "${filter.searchText}"`);
    }
    
    if (filterDescriptions.length > 0) {
      addLog(LogLevel.INFO, `フィルターを適用: ${filterDescriptions.join(', ')}`);
    }
  }, [addLog]);

  const clearFilter = useCallback(() => {
    dispatch({ type: 'SET_FILTER', payload: {} });
    addLog(LogLevel.INFO, 'フィルターをクリアしました');
  }, [addLog]);

  const clearLogs = useCallback(() => {
    dispatch({ type: 'CLEAR_LOGS' });
  }, []);

  const updateSettings = useCallback((settings: Partial<AppState['settings']>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
    
    // 設定変更をログに記録
    const settingsDescriptions = [];
    if (settings.fontFamily) {
      settingsDescriptions.push(`フォント: ${settings.fontFamily}`);
    }
    if (settings.fontSize) {
      settingsDescriptions.push(`フォントサイズ: ${settings.fontSize}px`);
    }
    
    if (settingsDescriptions.length > 0) {
      addLog(LogLevel.INFO, `設定を更新: ${settingsDescriptions.join(', ')}`);
    }
  }, [addLog]);

  const moveCard = useCallback((cardId: string, direction: 'up' | 'down') => {
    const snapshot = cloneCards(cardManager.getAllCards({ sortOrder: 'displayOrder', sortDirection: 'asc' }));
    const success = cardManager.moveCard(cardId, direction);
    if (success) {
      undoStack.current.push(snapshot);
      if (undoStack.current.length > 10) {
        undoStack.current.shift();
      }
      redoStack.current = [];
      updateHistoryState();
      const card = cardManager.getCard(cardId);
      if (card) {
        const directionText = direction === 'up' ? '上' : '下';
        addLog(LogLevel.INFO, `カード #${cardManager.getDisplayOrderNumber(card)} を${directionText}に移動しました`);
      }
    }
  }, [addLog, cloneCards, updateHistoryState]);

  const moveCardToPosition = useCallback((cardId: string, targetIndex: number) => {
    const snapshot = cloneCards(cardManager.getAllCards({ sortOrder: 'displayOrder', sortDirection: 'asc' }));
    const success = cardManager.moveCardToPosition(cardId, targetIndex);
    if (success) {
      undoStack.current.push(snapshot);
      if (undoStack.current.length > 10) {
        undoStack.current.shift();
      }
      redoStack.current = [];
      updateHistoryState();
      const card = cardManager.getCard(cardId);
      if (card) {
        addLog(LogLevel.INFO, `カード #${cardManager.getDisplayOrderNumber(card)} を位置 ${targetIndex + 1} に移動しました`);
      }
    }
  }, [addLog, cloneCards, updateHistoryState]);

  const loadJsonFile = useCallback(async (filePath: string) => {
    undoStack.current = [];
    redoStack.current = [];
    dispatch({ type: 'SET_HISTORY', payload: { undoCount: 0, redoCount: 0 } });
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    addLog(LogLevel.INFO, `JSONファイルの読み込みを開始: ${filePath}`);

    try {
      const content = await window.electronAPI.readFile(filePath);
      if (!content) {
        throw new Error('ファイルの読み込みに失敗しました');
      }

      addLog(LogLevel.INFO, 'JSONファイルの解析とバリデーションを実行中...');
      const { data, validation } = SaveDataManager.parseSaveData(content);

      // バリデーション結果をログに出力
      if (validation.warnings.length > 0) {
        validation.warnings.forEach(warning => {
          addLog(LogLevel.WARNING, `バリデーション警告: ${warning}`);
        });
      }

      if (!validation.isValid) {
        validation.errors.forEach(error => {
          addLog(LogLevel.ERROR, `バリデーションエラー: ${error}`);
        });
        throw new Error('JSONファイルの形式が正しくありません');
      }

      if (!data) {
        throw new Error('JSONデータの解析に失敗しました');
      }

      addLog(LogLevel.SUCCESS, `JSONファイルのバリデーションが完了 (${data.cards.length}件のカード)`);

      // CardManagerにデータを設定
      cardManager.clear();
      data.cards.forEach(cardData => {
        cardManager.createCardFromData({
          id: cardData.id,
          content: cardData.content,
          position: cardData.position,
          status: cardData.status,
          createdAt: cardData.createdAt,
          updatedAt: cardData.updatedAt,
          originalContent: cardData.originalContent,
          hasChanges: cardData.hasChanges,
          statusUpdatedAt: cardData.statusUpdatedAt,
        });
      });

      // カードリストを手動で更新
      updateCardsList();

      dispatch({ type: 'SET_CURRENT_FILE', payload: data.originalFile });
      dispatch({ type: 'SET_JSON_PATH', payload: filePath });
      addLog(LogLevel.SUCCESS, `JSONファイルの読み込みが完了: ${data.cards.length}件のカードを復元`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
      addLog(LogLevel.ERROR, `JSONファイル読み込みエラー: ${errorMessage}`);
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [addLog]);

  const saveJson = useCallback(async () => {
    if (!state.currentFile) {
      addLog(LogLevel.ERROR, 'ファイルが読み込まれていません');
      return;
    }

    try {
      addLog(LogLevel.INFO, 'JSONファイルの保存を開始...');
      const cards = cardManager.getAllCards({ sortOrder: 'position', sortDirection: 'asc' });
      const saveData = SaveDataManager.createSaveData(state.currentFile, cards);
      const jsonContent = JSON.stringify(saveData, null, 2);
      const suggestedName = SaveDataManager.generateFilename(state.currentFile);

      const savedPath = await window.electronAPI.saveJson(jsonContent, suggestedName);
      if (savedPath) {
        addLog(LogLevel.SUCCESS, `JSONファイルを保存しました: ${savedPath}`);
        dispatch({ type: 'SET_JSON_PATH', payload: savedPath });
      } else {
        addLog(LogLevel.INFO, 'JSON保存がキャンセルされました');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
      addLog(LogLevel.ERROR, `JSON保存エラー: ${errorMessage}`);
    }
  }, [state.currentFile, addLog]);

  const overwriteJson = useCallback(async () => {
    if (!state.currentFile || !state.currentJsonPath) {
      addLog(LogLevel.ERROR, '上書き保存するJSONファイルがありません');
      return;
    }

    try {
      addLog(LogLevel.INFO, 'JSONファイルの上書き保存を開始...');
      const cards = cardManager.getAllCards({ sortOrder: 'position', sortDirection: 'asc' });
      const saveData = SaveDataManager.createSaveData(state.currentFile, cards);
      const jsonContent = JSON.stringify(saveData, null, 2);

      const result = await window.electronAPI.overwriteJson(jsonContent, state.currentJsonPath);
      if (result) {
        addLog(LogLevel.SUCCESS, `JSONファイルを上書き保存しました: ${result}`);
        dispatch({ type: 'SET_JSON_PATH', payload: result });
      } else {
        addLog(LogLevel.ERROR, 'JSONファイルの上書き保存に失敗しました');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
      addLog(LogLevel.ERROR, `JSON上書き保存エラー: ${errorMessage}`);
    }
  }, [state.currentFile, state.currentJsonPath, addLog]);

  const contextValue: AppContextType = {
    state: { ...state, cardManager },
    actions: {
      loadFile,
      loadJsonFile,
      saveJson,
      overwriteJson,
      updateCard,
      selectCard,
      setFilter,
      clearFilter,
      addLog,
      clearLogs,
      updateSettings,
      moveCard,
      moveCardToPosition,
      undo,
      redo,
    },
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}