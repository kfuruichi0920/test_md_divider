import React, { useRef, useCallback } from 'react';
import { VariableSizeList as List } from 'react-window';
import { Card } from '@/models';
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
    onUpdate: (id: string, updates: any) => void;
    resetItemSize: (index: number) => void;
  };
}

function CardRow({ index, style, data }: CardRowProps) {
  const { cards, selectedCardId, onSelect, onUpdate, resetItemSize } = data;
  const card = cards[index];

  return (
    <div style={{
      ...style,
      padding: '0 12px',
    }}>
      <CardItem
        card={card}
        isSelected={selectedCardId === card.id}
        onSelect={onSelect}
        onUpdate={(id, updates) => {
          onUpdate(id, updates);
          // カード更新時にサイズをリセット
          resetItemSize(index);
        }}
      />
    </div>
  );
}

export function CardList({ cards, height }: CardListProps) {
  const { state, actions } = useApp();
  const listRef = useRef<List>(null);
  const itemSizes = useRef<number[]>([]);

  // カードのサイズを推定する関数
  const getItemSize = useCallback((index: number) => {
    // 基本サイズを計算
    const card = cards[index];
    if (!card) return 140;

    // キャッシュされたサイズがあれば使用
    if (itemSizes.current[index]) {
      return itemSizes.current[index];
    }

    // コンテンツの長さに基づいて推定サイズを計算
    const baseHeight = 100; // ヘッダーとフッター
    const lineHeight = 20;
    const contentLines = Math.max(1, Math.ceil(card.content.length / 50));
    const estimatedHeight = baseHeight + (contentLines * lineHeight);

    // 初期内容表示がある場合は追加の高さ
    const additionalHeight = card.hasChanges ? 80 : 0;

    const totalHeight = estimatedHeight + additionalHeight + 20; // マージン分

    // キャッシュに保存
    itemSizes.current[index] = totalHeight;
    return totalHeight;
  }, [cards]);

  // サイズをリセットする関数
  const resetItemSize = useCallback((index: number) => {
    if (itemSizes.current[index]) {
      delete itemSizes.current[index];
      if (listRef.current) {
        listRef.current.resetAfterIndex(index);
      }
    }
  }, []);

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
    resetItemSize,
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