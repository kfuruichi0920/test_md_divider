import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { Card, CardStatus, CardUpdatePayload, SaveData } from '@/models';
import { CardManager, SaveDataManager } from '@/services';
import { TextProcessor } from '@/utils';
import { LogEntry, LogLevel } from '../components/StatusLog';

interface AppState {
  cards: Card[];
  selectedCardId: string | null;
  isLoading: boolean;
  error: string | null;
  currentFile: string | null;
  filter: {
    status?: CardStatus;
    searchText?: string;
  };
  logs: LogEntry[];
}

type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CARDS'; payload: Card[] }
  | { type: 'SET_SELECTED_CARD'; payload: string | null }
  | { type: 'SET_CURRENT_FILE'; payload: string | null }
  | { type: 'SET_FILTER'; payload: Partial<AppState['filter']> }
  | { type: 'UPDATE_CARD'; payload: Card }
  | { type: 'ADD_LOG'; payload: LogEntry }
  | { type: 'CLEAR_LOGS' };

interface AppContextType {
  state: AppState;
  actions: {
    loadFile: (filePath: string) => Promise<void>;
    loadJsonFile: (filePath: string) => Promise<void>;
    saveJson: () => Promise<void>;
    updateCard: (id: string, updates: CardUpdatePayload) => void;
    selectCard: (id: string | null) => void;
    setFilter: (filter: Partial<AppState['filter']>) => void;
    clearFilter: () => void;
    addLog: (level: LogLevel, message: string, details?: string) => void;
    clearLogs: () => void;
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialState: AppState = {
  cards: [],
  selectedCardId: null,
  isLoading: false,
  error: null,
  currentFile: null,
  filter: {},
  logs: [],
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
    default:
      return state;
  }
}

const cardManager = new CardManager();

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const updateCardsList = useCallback(() => {
    const cards = cardManager.getAllCards({
      filter: state.filter,
      sortOrder: 'position',
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
    const updatedCard = cardManager.updateCard(id, updates);
    if (updatedCard) {
      dispatch({ type: 'UPDATE_CARD', payload: updatedCard });
      
      // 更新内容をログに記録
      const changes = Object.keys(updates).join(', ');
      addLog(LogLevel.INFO, `カード #${updatedCard.position + 1} を更新: ${changes}`);
    }
  }, [addLog]);

  const selectCard = useCallback((id: string | null) => {
    dispatch({ type: 'SET_SELECTED_CARD', payload: id });
  }, []);

  const setFilter = useCallback((filter: Partial<AppState['filter']>) => {
    dispatch({ type: 'SET_FILTER', payload: filter });
  }, []);

  const clearFilter = useCallback(() => {
    dispatch({ type: 'SET_FILTER', payload: {} });
  }, []);

  const clearLogs = useCallback(() => {
    dispatch({ type: 'CLEAR_LOGS' });
  }, []);

  const loadJsonFile = useCallback(async (filePath: string) => {
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
        const newCard = cardManager.createCard(cardData.content, cardData.position);
        if (cardData.status !== 'unprocessed') {
          cardManager.updateCard(newCard.id, { status: cardData.status });
        }
      });

      dispatch({ type: 'SET_CURRENT_FILE', payload: data.originalFile });
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
      } else {
        addLog(LogLevel.INFO, 'JSON保存がキャンセルされました');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
      addLog(LogLevel.ERROR, `JSON保存エラー: ${errorMessage}`);
    }
  }, [state.currentFile, addLog]);

  const contextValue: AppContextType = {
    state,
    actions: {
      loadFile,
      loadJsonFile,
      saveJson,
      updateCard,
      selectCard,
      setFilter,
      clearFilter,
      addLog,
      clearLogs,
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