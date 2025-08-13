import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { Card, CardStatus, CardUpdatePayload } from '@/models';
import { CardManager } from '@/services';
import { TextProcessor } from '@/utils';

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
}

type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CARDS'; payload: Card[] }
  | { type: 'SET_SELECTED_CARD'; payload: string | null }
  | { type: 'SET_CURRENT_FILE'; payload: string | null }
  | { type: 'SET_FILTER'; payload: Partial<AppState['filter']> }
  | { type: 'UPDATE_CARD'; payload: Card };

interface AppContextType {
  state: AppState;
  actions: {
    loadFile: (filePath: string) => Promise<void>;
    updateCard: (id: string, updates: CardUpdatePayload) => void;
    selectCard: (id: string | null) => void;
    setFilter: (filter: Partial<AppState['filter']>) => void;
    clearFilter: () => void;
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

  const loadFile = useCallback(async (filePath: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const content = await window.electronAPI.readFile(filePath);
      if (!content) {
        throw new Error('ファイルの読み込みに失敗しました');
      }

      const validation = TextProcessor.validateTextFile(content);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      cardManager.clear();

      const paragraphs = TextProcessor.splitIntoParagraphs(content);
      paragraphs.forEach(paragraph => {
        cardManager.createCard(paragraph.content, paragraph.position);
      });

      dispatch({ type: 'SET_CURRENT_FILE', payload: filePath });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : '不明なエラーが発生しました' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const updateCard = useCallback((id: string, updates: CardUpdatePayload) => {
    const updatedCard = cardManager.updateCard(id, updates);
    if (updatedCard) {
      dispatch({ type: 'UPDATE_CARD', payload: updatedCard });
    }
  }, []);

  const selectCard = useCallback((id: string | null) => {
    dispatch({ type: 'SET_SELECTED_CARD', payload: id });
  }, []);

  const setFilter = useCallback((filter: Partial<AppState['filter']>) => {
    dispatch({ type: 'SET_FILTER', payload: filter });
  }, []);

  const clearFilter = useCallback(() => {
    dispatch({ type: 'SET_FILTER', payload: {} });
  }, []);

  const contextValue: AppContextType = {
    state,
    actions: {
      loadFile,
      updateCard,
      selectCard,
      setFilter,
      clearFilter,
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