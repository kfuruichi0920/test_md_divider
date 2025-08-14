import { Card, CardStatus, CardUpdatePayload, CardFilter, CardListOptions } from '@/models';

export class CardManager {
  private cards: Map<string, Card> = new Map();
  private listeners: Set<() => void> = new Set();

  addListener(listener: () => void): void {
    this.listeners.add(listener);
  }

  removeListener(listener: () => void): void {
    this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  createCard(content: string, position: number): Card {
    const now = new Date();
    const trimmedContent = content.trim();
    const card: Card = {
      id: this.generateId(),
      position,
      content: trimmedContent,
      status: CardStatus.UNPROCESSED,
      createdAt: now,
      updatedAt: now,
      originalContent: trimmedContent,
      hasChanges: false,
      statusUpdatedAt: undefined,
      originalPosition: position,
      displayOrder: position,
    };

    this.cards.set(card.id, card);
    this.notifyListeners();
    return card;
  }

  createCardFromData(cardData: Partial<Card> & { content: string; position: number; originalContent: string }): Card {
    const now = new Date();
    const card: Card = {
      id: cardData.id || this.generateId(),
      position: cardData.position,
      content: cardData.content.trim(),
      status: cardData.status || CardStatus.UNPROCESSED,
      createdAt: cardData.createdAt || now,
      updatedAt: cardData.updatedAt || now,
      originalContent: cardData.originalContent.trim(),
      hasChanges: cardData.content.trim() !== cardData.originalContent.trim(),
      statusUpdatedAt: cardData.statusUpdatedAt,
      originalPosition: cardData.originalPosition !== undefined ? cardData.originalPosition : cardData.position,
      displayOrder: cardData.displayOrder !== undefined ? cardData.displayOrder : cardData.position,
    };

    this.cards.set(card.id, card);
    this.notifyListeners();
    return card;
  }

  getCard(id: string): Card | undefined {
    return this.cards.get(id);
  }

  getAllCards(options?: CardListOptions): Card[] {
    let cardList = Array.from(this.cards.values());

    if (options?.filter) {
      cardList = this.filterCards(cardList, options.filter);
    }

    if (options?.sortOrder) {
      cardList = this.sortCards(cardList, options.sortOrder, options.sortDirection);
    }

    return cardList;
  }

  updateCard(id: string, updates: CardUpdatePayload): Card | null {
    const card = this.cards.get(id);
    if (!card) {
      return null;
    }

    const now = new Date();
    const updatedCard: Card = {
      ...card,
      ...updates,
      updatedAt: now,
    };

    // コンテンツが変更された場合、hasChangesフラグを更新
    if (updates.content !== undefined) {
      updatedCard.hasChanges = updates.content !== card.originalContent;
    }

    // 状態が変更された場合、statusUpdatedAtを設定
    if (updates.status !== undefined && updates.status !== card.status) {
      updatedCard.statusUpdatedAt = now;
    }

    this.cards.set(id, updatedCard);
    this.notifyListeners();
    return updatedCard;
  }

  deleteCard(id: string): boolean {
    const deleted = this.cards.delete(id);
    if (deleted) {
      this.notifyListeners();
    }
    return deleted;
  }

  clear(): void {
    this.cards.clear();
    this.notifyListeners();
  }

  getCardCount(): number {
    return this.cards.size;
  }

  getStatusCounts(): Record<CardStatus, number> {
    const counts = {
      [CardStatus.UNPROCESSED]: 0,
      [CardStatus.PROCESSING]: 0,
      [CardStatus.PROCESSED]: 0,
    };

    for (const card of this.cards.values()) {
      counts[card.status]++;
    }

    return counts;
  }

  private filterCards(cards: Card[], filter: CardFilter): Card[] {
    return cards.filter(card => {
      if (filter.status && card.status !== filter.status) {
        return false;
      }

      if (filter.searchText) {
        const searchText = filter.searchText.toLowerCase();
        if (!card.content.toLowerCase().includes(searchText)) {
          return false;
        }
      }

      return true;
    });
  }

  private sortCards(cards: Card[], sortOrder: string, direction: 'asc' | 'desc' = 'asc'): Card[] {
    return cards.sort((a, b) => {
      let comparison = 0;

      switch (sortOrder) {
        case 'position':
          comparison = a.position - b.position;
          break;
        case 'displayOrder':
          comparison = a.displayOrder - b.displayOrder;
          break;
        case 'createdAt':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'updatedAt':
          comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
          break;
        default:
          return 0;
      }

      return direction === 'desc' ? -comparison : comparison;
    });
  }

  moveCard(cardId: string, direction: 'up' | 'down'): boolean {
    const card = this.cards.get(cardId);
    if (!card) return false;

    const allCards = this.getAllCards({ sortOrder: 'displayOrder', sortDirection: 'asc' });
    const currentIndex = allCards.findIndex(c => c.id === cardId);
    
    if (currentIndex === -1) return false;
    
    let targetIndex: number;
    if (direction === 'up' && currentIndex > 0) {
      targetIndex = currentIndex - 1;
    } else if (direction === 'down' && currentIndex < allCards.length - 1) {
      targetIndex = currentIndex + 1;
    } else {
      return false; // 移動できない
    }

    // カードの位置を入れ替え
    const movedCard = allCards[currentIndex];
    const targetCard = allCards[targetIndex];
    
    // 配列内で位置を交換
    allCards[currentIndex] = targetCard;
    allCards[targetIndex] = movedCard;
    
    // 全カードのdisplayOrderを再計算
    this.recalculateDisplayOrder(allCards);
    
    return true;
  }

  moveCardToPosition(cardId: string, targetIndex: number): boolean {
    const allCards = this.getAllCards({ sortOrder: 'displayOrder', sortDirection: 'asc' });
    const currentIndex = allCards.findIndex(c => c.id === cardId);
    
    if (currentIndex === -1 || targetIndex < 0 || targetIndex >= allCards.length) {
      return false;
    }
    
    if (currentIndex === targetIndex) {
      return true; // 同じ位置なので何もしない
    }
    
    // 配列から要素を削除し、新しい位置に挿入
    const movedCard = allCards.splice(currentIndex, 1)[0];
    allCards.splice(targetIndex, 0, movedCard);
    
    // 全カードのdisplayOrderを再計算
    this.recalculateDisplayOrder(allCards);
    
    return true;
  }

  // 全カードのdisplayOrderを再計算
  private recalculateDisplayOrder(cards: Card[]): void {
    const now = new Date();
    cards.forEach((card, index) => {
      const updatedCard = { ...card, displayOrder: index, updatedAt: now };
      this.cards.set(card.id, updatedCard);
    });
    this.notifyListeners();
  }

  // 表示順序番号を生成
  getDisplayOrderNumber(card: Card): string {
    // 元の位置と現在の位置が異なる場合は変更マークを追加
    if (card.displayOrder !== card.originalPosition) {
      return `${card.displayOrder + 1} (元: ${card.originalPosition + 1})`;
    } else {
      return (card.displayOrder + 1).toString();
    }
  }

  private generateId(): string {
    return `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}