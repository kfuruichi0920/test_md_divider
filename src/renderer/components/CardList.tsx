import React from 'react';
import { FixedSizeList as List } from 'react-window';
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
  };
}

function CardRow({ index, style, data }: CardRowProps) {
  const { cards, selectedCardId, onSelect, onUpdate } = data;
  const card = cards[index];

  return (
    <div style={style}>
      <CardItem
        card={card}
        isSelected={selectedCardId === card.id}
        onSelect={onSelect}
        onUpdate={onUpdate}
      />
    </div>
  );
}

export function CardList({ cards, height }: CardListProps) {
  const { state, actions } = useApp();

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
  };

  return (
    <List
      height={height}
      width="100%"
      itemCount={cards.length}
      itemSize={120}
      itemData={itemData}
      overscanCount={5}
    >
      {CardRow}
    </List>
  );
}