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
    const card: Card = {
      id: this.generateId(),
      position,
      content: content.trim(),
      status: CardStatus.UNPROCESSED,
      createdAt: now,
      updatedAt: now,
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

    const updatedCard: Card = {
      ...card,
      ...updates,
      updatedAt: new Date(),
    };

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

  private generateId(): string {
    return `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}