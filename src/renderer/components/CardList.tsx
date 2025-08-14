import React, { useRef, useCallback } from 'react';
import { VariableSizeList as List } from 'react-window';
import { Card, CardUpdatePayload } from '@/models';
import { CardItem } from './CardItem';
import { useApp } from '../contexts/AppContext';

interface CardListProps {
  cards: Card[];
  height: number;
}

interface CardRowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    cards: Card[];
    selectedCardId: string | null;
    onSelect: (id: string) => void;
    onUpdate: (id: string, updates: CardUpdatePayload) => void;
    onUpdateAttribute: (id: string, displayAttribute: any, semanticAttribute: any) => void;
    onMoveCard: (cardId: string, direction: 'up' | 'down') => void;
    onMoveCardToPosition: (cardId: string, targetIndex: number) => void;
    onIndentCard: (cardId: string) => void;
    onOutdentCard: (cardId: string) => void;
    resetItemSize: (index: number) => void;
    resetAllItemSizes: () => void;
    updateItemSize: (index: number, height: number) => void;
  };
}

function CardRow({ index, style, data }: CardRowProps) {
  const { cards, selectedCardId, onSelect, onUpdate, onUpdateAttribute, onMoveCard, onMoveCardToPosition, onIndentCard, onOutdentCard, resetItemSize, resetAllItemSizes, updateItemSize } = data;
  const card = cards[index];
  const rowRef = React.useRef<HTMLDivElement>(null);

  // 実際のサイズを測定
  React.useEffect(() => {
    if (rowRef.current) {
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          updateItemSize(index, entry.contentRect.height);
        }
      });
      
      observer.observe(rowRef.current);
      
      // 初回測定
      const height = rowRef.current.offsetHeight;
      if (height > 0) {
        updateItemSize(index, height);
      }
      
      return () => observer.disconnect();
    }
  }, [index, updateItemSize]);

  return (
    <div 
      ref={rowRef}
      style={{
        ...style,
        padding: '0 12px',
      }}>
      <CardItem
        card={card}
        index={index}
        isSelected={selectedCardId === card.id}
        onSelect={onSelect}
        onUpdate={(id, updates) => {
          onUpdate(id, updates);
          // カード更新時にサイズをリセット
          resetItemSize(index);
        }}
        onUpdateAttribute={(id, displayAttribute, semanticAttribute) => {
          onUpdateAttribute(id, displayAttribute, semanticAttribute);
          // 属性更新時にサイズをリセット
          resetItemSize(index);
        }}
        onMoveCard={(cardId, direction) => {
          onMoveCard(cardId, direction);
          // カード移動時に全体サイズをリセット
          resetAllItemSizes();
        }}
        onMoveCardToPosition={(cardId, targetIndex) => {
          onMoveCardToPosition(cardId, targetIndex);
          // カード移動時に全体サイズをリセット
          resetAllItemSizes();
        }}
        onIndentCard={(cardId) => {
          onIndentCard(cardId);
          // 階層変更時に全体サイズをリセット
          resetAllItemSizes();
        }}
        onOutdentCard={(cardId) => {
          onOutdentCard(cardId);
          // 階層変更時に全体サイズをリセット
          resetAllItemSizes();
        }}
      />
    </div>
  );
}

export function CardList({ cards, height }: CardListProps) {
  const { state, actions } = useApp();
  const listRef = useRef<List>(null);
  const itemSizes = useRef<number[]>([]);
  const previousCardsLength = useRef(cards.length);

  // カードのサイズを推定する関数
  const getItemSize = useCallback((index: number) => {
    // 基本サイズを計算
    const card = cards[index];
    if (!card) return 140;

    // キャッシュされたサイズがあれば使用
    if (itemSizes.current[index]) {
      return itemSizes.current[index];
    }

    // 設定からフォントサイズを取得
    const fontSize = state.settings.fontSize || 14;
    const lineHeight = fontSize * 1.5;
    
    // ヘッダー部分の高さ（番号、状態選択、ボタンなど）
    const headerHeight = 40;
    
    // フッター部分の高さ（タイムスタンプ）
    const footerHeight = card.statusUpdatedAt ? 40 : 25;
    
    // コンテンツの行数を計算（改行を考慮）
    const lines = card.content.split('\n');
    let totalLines = 0;
    
    // 各行について、文字数による折り返しも計算
    const approximateCharsPerLine = Math.floor(400 / (fontSize * 0.6)); // 幅400pxでの概算文字数
    
    lines.forEach(line => {
      if (line.length === 0) {
        totalLines += 1; // 空行
      } else {
        const wrappedLines = Math.ceil(line.length / approximateCharsPerLine);
        totalLines += Math.max(1, wrappedLines);
      }
    });
    
    // 最小行数を保証
    totalLines = Math.max(3, totalLines+2 );
    
    // コンテンツ高さを計算
    const contentHeight = totalLines * lineHeight;
    
    // 初期内容表示がある場合の追加高さ
    let originalContentHeight = 0;
    if (card.hasChanges) {
      const originalLines = card.originalContent.split('\n');
      let originalTotalLines = 0;
      
      originalLines.forEach(line => {
        if (line.length === 0) {
          originalTotalLines += 1;
        } else {
          const wrappedLines = Math.ceil(line.length / approximateCharsPerLine);
          originalTotalLines += Math.max(1, wrappedLines);
        }
      });
      
      // 初期内容のヘッダー（20px）+ コンテンツ + パディング
      originalContentHeight = 20 + (originalTotalLines * fontSize * 1.8) + 16;
    }

    // 属性別の詳細情報編集エリアの高さ計算
    let attributeContentHeight = 0;
    
    // 共通フィールド（contents, contents-tag）は常に表示
    let commonFieldsHeight = 
      40 + // タイトル部分
      20 + 60 + // Contents（ラベル + テキストエリア）
      20 + 30 + // Contents Tag（ラベル + input）
      16; // パディング
    attributeContentHeight += commonFieldsHeight;

    // 属性別の追加フィールド
    if (card.displayAttribute === 'main') {
      switch (card.semanticAttribute) {
        case 'figure':
          // Figure ID + Figure Data
          attributeContentHeight += 
            40 + // タイトル部分
            20 + 30 + // Figure ID（ラベル + input）
            20 + 80 + // Figure Data（ラベル + textarea）
            16; // パディング
          break;
        case 'table':
          // Table ID + Table Data
          attributeContentHeight += 
            40 + // タイトル部分
            20 + 30 + // Table ID（ラベル + input）
            20 + 80 + // Table Data（ラベル + textarea）
            16; // パディング
          break;
        case 'test':
          // Test ID + 4つのテキストエリア
          attributeContentHeight += 
            40 + // タイトル部分
            20 + 30 + // Test ID（ラベル + input）
            (20 + 60) * 4 + // 4つのテキストエリア（ラベル + textarea各60px）
            16; // パディング
          break;
        case 'question':
          // QA ID + Question + Answer
          attributeContentHeight += 
            40 + // タイトル部分
            20 + 30 + // QA ID（ラベル + input）
            20 + 80 + // Question（ラベル + textarea）
            20 + 80 + // Answer（ラベル + textarea）
            16; // パディング
          break;
      }
    }
    
    // 総高さを計算
    const totalHeight = headerHeight + contentHeight + originalContentHeight + attributeContentHeight + footerHeight + 24; // 24はマージン

    // キャッシュに保存
    itemSizes.current[index] = totalHeight;
    return totalHeight;
  }, [cards, state.settings.fontSize]);

  // サイズをリセットする関数
  const resetItemSize = useCallback((index: number) => {
    if (itemSizes.current[index]) {
      delete itemSizes.current[index];
      if (listRef.current) {
        listRef.current.resetAfterIndex(index);
      }
    }
  }, []);

  // 全てのアイテムサイズをリセットする関数
  const resetAllItemSizes = useCallback(() => {
    itemSizes.current = [];
    if (listRef.current) {
      listRef.current.resetAfterIndex(0);
    }
  }, []);

  // 実際のカードサイズを測定してキャッシュを更新
  const updateItemSize = useCallback((index: number, actualHeight: number) => {
    if (itemSizes.current[index] !== actualHeight) {
      itemSizes.current[index] = actualHeight;
      if (listRef.current) {
        listRef.current.resetAfterIndex(index);
      }
    }
  }, []);

  // カード配列が変更された時にサイズをリセット
  React.useEffect(() => {
    if (cards.length !== previousCardsLength.current) {
      resetAllItemSizes();
      previousCardsLength.current = cards.length;
    }
  }, [cards.length, resetAllItemSizes]);

  // フォント設定が変更された時にサイズをリセット
  React.useEffect(() => {
    resetAllItemSizes();
  }, [state.settings.fontSize, state.settings.fontFamily, resetAllItemSizes]);

  if (cards.length === 0) {
    return (
      <div style={{
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#666',
        fontSize: '16px',
      }}>
        {state.currentFile ? 'カードがありません' : 'ファイルを選択してください'}
      </div>
    );
  }

  const itemData = {
    cards,
    selectedCardId: state.selectedCardId,
    onSelect: actions.selectCard,
    onUpdate: actions.updateCard,
    onUpdateAttribute: actions.updateCardAttribute,
    onMoveCard: actions.moveCard,
    onMoveCardToPosition: actions.moveCardToPosition,
    onIndentCard: actions.indentCard,
    onOutdentCard: actions.outdentCard,
    resetItemSize,
    resetAllItemSizes,
    updateItemSize,
  };

  return (
    <List
      ref={listRef}
      height={height}
      width="100%"
      itemCount={cards.length}
      itemSize={getItemSize}
      itemData={itemData}
      overscanCount={3}
      estimatedItemSize={140}
    >
      {CardRow}
    </List>
  );
}