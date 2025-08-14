import { Card, CardStatus, CardUpdatePayload, CardFilter, CardListOptions, DisplayAttribute, SemanticAttribute } from '@/models';

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
      // 属性情報（デフォルト：②-(1)本文）
      displayAttribute: DisplayAttribute.MAIN_CONTENT,
      semanticAttribute: SemanticAttribute.TEXT,
      contents: trimmedContent,
      contentsTag: '',
      // 階層管理情報（デフォルト：トップ階層）
      hierarchyLevel: 1,
      parentId: undefined,
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
      // 属性情報（デフォルト値または復元値）
      displayAttribute: cardData.displayAttribute || DisplayAttribute.MAIN_CONTENT,
      semanticAttribute: cardData.semanticAttribute || SemanticAttribute.TEXT,
      contents: cardData.contents || cardData.content.trim(),
      contentsTag: cardData.contentsTag || '',
      // 詳細情報（属性別）
      figureId: cardData.figureId,
      figureData: cardData.figureData,
      tableId: cardData.tableId,
      tableData: cardData.tableData,
      testId: cardData.testId,
      testPrereq: cardData.testPrereq,
      testStep: cardData.testStep,
      testCons: cardData.testCons,
      testSpec: cardData.testSpec,
      qaId: cardData.qaId,
      question: cardData.question,
      answer: cardData.answer,
      // 階層管理情報（デフォルト値または復元値）
      hierarchyLevel: cardData.hierarchyLevel !== undefined ? cardData.hierarchyLevel : 1,
      parentId: cardData.parentId,
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
      const newContent = updates.content.trim();
      updatedCard.content = newContent;
      updatedCard.hasChanges = newContent !== card.originalContent;
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
    // 階層整合性を保った移動メソッドを使用
    return this.moveCardWithHierarchyIntegrity(cardId, direction);
  }

  moveCardToPosition(cardId: string, targetIndex: number): boolean {
    // 階層整合性を保った移動メソッドを使用
    return this.moveCardGroupToPosition(cardId, targetIndex);
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

  // 属性管理メソッド
  updateCardAttribute(id: string, displayAttribute: DisplayAttribute, semanticAttribute: SemanticAttribute): Card | null {
    const card = this.cards.get(id);
    if (!card) {
      return null;
    }

    const updates: CardUpdatePayload = {
      displayAttribute,
      semanticAttribute,
    };

    // 属性変更時に不要なフィールドをクリア
    this.clearUnusedAttributeFields(updates, displayAttribute, semanticAttribute);

    return this.updateCard(id, updates);
  }

  // 属性に応じて不要なフィールドをクリア
  private clearUnusedAttributeFields(updates: CardUpdatePayload, displayAttribute: DisplayAttribute, semanticAttribute: SemanticAttribute): void {
    // すべての詳細情報フィールドをクリア
    updates.figureId = undefined;
    updates.figureData = undefined;
    updates.tableId = undefined;
    updates.tableData = undefined;
    updates.testId = undefined;
    updates.testPrereq = undefined;
    updates.testStep = undefined;
    updates.testCons = undefined;
    updates.testSpec = undefined;
    updates.qaId = undefined;
    updates.question = undefined;
    updates.answer = undefined;

    // 属性に応じて必要なフィールドのみ保持（クリアしない）
    switch (displayAttribute) {
      case DisplayAttribute.MAIN_CONTENT:
        switch (semanticAttribute) {
          case SemanticAttribute.FIGURE:
            delete updates.figureId;
            delete updates.figureData;
            break;
          case SemanticAttribute.TABLE:
            delete updates.tableId;
            delete updates.tableData;
            break;
          case SemanticAttribute.TEST:
            delete updates.testId;
            delete updates.testPrereq;
            delete updates.testStep;
            delete updates.testCons;
            delete updates.testSpec;
            break;
          case SemanticAttribute.QUESTION:
            delete updates.qaId;
            delete updates.question;
            delete updates.answer;
            break;
        }
        break;
    }
  }

  // 表示属性別の許可された意味属性を取得
  getAllowedSemanticAttributes(displayAttribute: DisplayAttribute): SemanticAttribute[] {
    switch (displayAttribute) {
      case DisplayAttribute.HEADING:
      case DisplayAttribute.MISCELLANEOUS:
        return [SemanticAttribute.NONE];
      case DisplayAttribute.MAIN_CONTENT:
        return [
          SemanticAttribute.TEXT,
          SemanticAttribute.FIGURE,
          SemanticAttribute.TABLE,
          SemanticAttribute.TEST,
          SemanticAttribute.QUESTION,
        ];
      default:
        return [SemanticAttribute.NONE];
    }
  }

  // 階層管理メソッド

  // 子カードを取得
  getChildCards(parentId: string): Card[] {
    try {
      if (!parentId) return [];
      return Array.from(this.cards.values())
        .filter(card => card && card.parentId === parentId)
        .sort((a, b) => a.displayOrder - b.displayOrder);
    } catch (error) {
      console.error('Error in getChildCards:', parentId, error);
      return [];
    }
  }

  // すべての子孫カードを取得（再帰的）
  getDescendantCards(parentId: string): Card[] {
    try {
      if (!parentId) return [];
      const children = this.getChildCards(parentId);
      const descendants: Card[] = [...children];
      
      children.forEach(child => {
        if (child && child.id) {
          descendants.push(...this.getDescendantCards(child.id));
        }
      });
      
      return descendants;
    } catch (error) {
      console.error('Error in getDescendantCards:', parentId, error);
      return [];
    }
  }

  // 親カードを取得
  getParentCard(cardId: string): Card | undefined {
    const card = this.cards.get(cardId);
    if (!card || !card.parentId) {
      return undefined;
    }
    return this.cards.get(card.parentId);
  }

  // カードを階層化（インデント）
  indentCard(cardId: string): boolean {
    const card = this.cards.get(cardId);
    if (!card) return false;

    // 同じ階層の前のカードを探す
    const allCards = this.getAllCards({ sortOrder: 'displayOrder', sortDirection: 'asc' });
    const currentIndex = allCards.findIndex(c => c.id === cardId);
    
    if (currentIndex <= 0) return false; // 最初のカードはインデントできない
    
    const previousCard = allCards[currentIndex - 1];
    
    // 前のカードと同じか1つ上の階層レベルである必要がある
    if (previousCard.hierarchyLevel < card.hierarchyLevel - 1) return false;
    
    // 古い階層レベルを保存
    const oldLevel = card.hierarchyLevel;
    const newLevel = previousCard.hierarchyLevel + 1;
    const levelDiff = newLevel - oldLevel;
    
    // インデント実行
    const updates: CardUpdatePayload = {
      hierarchyLevel: newLevel,
      parentId: previousCard.id,
    };
    
    this.updateCard(cardId, updates);
    
    // グループ機能：全子孫カードの階層レベルも同じだけ変更
    this.adjustGroupHierarchy(cardId, levelDiff);
    
    // 後続カードの階層を調整
    this.adjustFollowingCardsHierarchy(cardId, oldLevel, newLevel);
    
    return true;
  }

  // カードを階層解除（アウトデント）
  outdentCard(cardId: string): boolean {
    const card = this.cards.get(cardId);
    if (!card || card.hierarchyLevel <= 1) return false; // トップ階層はアウトデントできない

    const parentCard = this.getParentCard(cardId);
    if (!parentCard) return false;

    // 古い階層レベルを保存
    const oldLevel = card.hierarchyLevel;
    const newLevel = card.hierarchyLevel - 1;
    const levelDiff = newLevel - oldLevel; // マイナス値

    // アウトデント実行
    const updates: CardUpdatePayload = {
      hierarchyLevel: newLevel,
      parentId: parentCard.parentId, // 祖父カードのIDまたはundefined
    };
    
    this.updateCard(cardId, updates);
    
    // グループ機能：全子孫カードの階層レベルも同じだけ変更
    this.adjustGroupHierarchy(cardId, levelDiff);
    
    // 後続カードの階層を調整
    this.adjustFollowingCardsHierarchy(cardId, oldLevel, newLevel);
    
    return true;
  }

  // 階層グループごとの移動
  moveCardWithDescendants(cardId: string, direction: 'up' | 'down'): boolean {
    const card = this.cards.get(cardId);
    if (!card) return false;

    const descendants = this.getDescendantCards(cardId);
    const cardGroup = [card, ...descendants];
    const allCards = this.getAllCards({ sortOrder: 'displayOrder', sortDirection: 'asc' });
    
    const startIndex = allCards.findIndex(c => c.id === cardId);
    const endIndex = startIndex + cardGroup.length - 1;
    
    let targetIndex: number;
    if (direction === 'up') {
      if (startIndex === 0) return false; // 最初のグループは上に移動できない
      // 前のカードグループを探す
      let prevGroupStart = startIndex - 1;
      const prevCard = allCards[prevGroupStart];
      const prevDescendants = this.getDescendantCards(prevCard.id);
      const prevGroupSize = 1 + prevDescendants.length;
      prevGroupStart = startIndex - prevGroupSize;
      targetIndex = prevGroupStart;
    } else {
      if (endIndex >= allCards.length - 1) return false; // 最後のグループは下に移動できない
      // 次のカードグループを探す
      const nextCard = allCards[endIndex + 1];
      const nextDescendants = this.getDescendantCards(nextCard.id);
      const nextGroupSize = 1 + nextDescendants.length;
      targetIndex = endIndex + nextGroupSize + 1;
      if (targetIndex >= allCards.length) return false;
    }

    // グループごと移動
    const movedGroup = allCards.splice(startIndex, cardGroup.length);
    allCards.splice(targetIndex, 0, ...movedGroup);
    
    // displayOrderを再計算
    this.recalculateDisplayOrder(allCards);
    
    return true;
  }

  // 移動先の階層レベルを決定（階層整合性を保つ）
  private determineTargetHierarchyLevel(targetIndex: number, allCards: Card[]): { level: number; parentId: string | undefined } {
    // 移動先の前後のカードを確認
    const prevCard = targetIndex > 0 ? allCards[targetIndex - 1] : null;
    const nextCard = targetIndex < allCards.length ? allCards[targetIndex] : null;

    // 前のカードがある場合
    if (prevCard) {
      // 次のカードがある場合
      if (nextCard) {
        // 階層の連続性を保つための判定
        if (prevCard.hierarchyLevel < nextCard.hierarchyLevel) {
          // 前のカードが親、次のカードが子の場合は前のカードの子として配置
          if (nextCard.parentId === prevCard.id) {
            return { level: nextCard.hierarchyLevel, parentId: prevCard.id };
          }
        }
        
        // 階層レベルが同じまたは前の方が深い場合は、より浅い階層レベルに合わせる
        const targetLevel = Math.min(prevCard.hierarchyLevel, nextCard.hierarchyLevel);
        
        // 適切な親IDを決定
        if (targetLevel === 1) {
          return { level: 1, parentId: undefined };
        } else {
          // 前のカードまたは次のカードの親IDを使用（同じ階層レベルの場合）
          const parentId = prevCard.hierarchyLevel === targetLevel ? prevCard.parentId : nextCard.parentId;
          return { level: targetLevel, parentId };
        }
      } else {
        // 最後に挿入する場合は前のカードと同じ階層レベル
        return { level: prevCard.hierarchyLevel, parentId: prevCard.parentId };
      }
    } else if (nextCard) {
      // 最初に挿入する場合は次のカードと同じ階層レベル
      return { level: nextCard.hierarchyLevel, parentId: nextCard.parentId };
    }
    
    // デフォルトはトップ階層
    return { level: 1, parentId: undefined };
  }

  // 階層レベルの調整を行う
  private adjustCardHierarchy(card: Card, newLevel: number, newParentId: string | undefined): Card {
    const levelDiff = newLevel - card.hierarchyLevel;
    const updatedCard = { ...card, hierarchyLevel: newLevel, parentId: newParentId };
    
    // 子孫カードの階層レベルも調整
    const descendants = this.getDescendantCards(card.id);
    descendants.forEach(descendant => {
      const newDescendantLevel = Math.max(1, descendant.hierarchyLevel + levelDiff);
      const updatedDescendant = { ...descendant, hierarchyLevel: newDescendantLevel };
      
      // 階層レベル1になった場合は親IDをクリア
      if (newDescendantLevel === 1) {
        updatedDescendant.parentId = undefined;
      }
      
      this.cards.set(descendant.id, updatedDescendant);
    });
    
    return updatedCard;
  }

  // 階層変更時の後続カードへの影響を処理
  private adjustFollowingCardsHierarchy(cardId: string, oldLevel: number, newLevel: number): void {
    const allCards = this.getAllCards({ sortOrder: 'displayOrder', sortDirection: 'asc' });
    const cardIndex = allCards.findIndex(c => c.id === cardId);
    
    if (cardIndex === -1 || cardIndex >= allCards.length - 1) return;
    
    const levelDiff = newLevel - oldLevel;
    
    // 後続のカードを順次チェック
    for (let i = cardIndex + 1; i < allCards.length; i++) {
      const followingCard = allCards[i];
      
      // 次のカードが自分の階層より深い場合のみ調整
      if (followingCard.hierarchyLevel > oldLevel) {
        // 階層レベルを調整
        const adjustedLevel = Math.max(1, followingCard.hierarchyLevel + levelDiff);
        const updatedCard = { ...followingCard, hierarchyLevel: adjustedLevel, updatedAt: new Date() };
        
        // 階層レベル1になった場合は親IDをクリア
        if (adjustedLevel === 1) {
          updatedCard.parentId = undefined;
        } else {
          // 親IDの調整（必要に応じて）
          const parentCard = this.findParentForLevel(updatedCard, adjustedLevel, allCards, i);
          updatedCard.parentId = parentCard?.id;
        }
        
        this.cards.set(followingCard.id, updatedCard);
        allCards[i] = updatedCard; // 配列も更新
      } else if (followingCard.hierarchyLevel <= oldLevel) {
        // 同じまたはより浅い階層のカードが見つかったら処理終了
        break;
      }
    }
  }

  // 指定された階層レベルに適した親カードを検索
  private findParentForLevel(card: Card, targetLevel: number, allCards: Card[], currentIndex: number): Card | null {
    if (targetLevel <= 1) return null;
    
    // 現在の位置より前のカードから、階層レベル(targetLevel-1)の親を探す
    for (let i = currentIndex - 1; i >= 0; i--) {
      const potentialParent = allCards[i];
      if (potentialParent.hierarchyLevel === targetLevel - 1) {
        return potentialParent;
      }
      if (potentialParent.hierarchyLevel < targetLevel - 1) {
        // より浅い階層が見つかったら検索終了
        break;
      }
    }
    
    return null;
  }

  // グルーピング機能関連メソッド（機能追加10）

  // カードデータの整合性をチェック
  private validateCardData(card: Card): boolean {
    try {
      return !!(
        card &&
        typeof card.id === 'string' &&
        typeof card.hierarchyLevel === 'number' &&
        card.hierarchyLevel >= 1 &&
        typeof card.displayOrder === 'number'
      );
    } catch (error) {
      console.error('Card validation error:', error);
      return false;
    }
  }

  // 兄弟カードを取得
  getSiblingCards(cardId: string): Card[] {
    try {
      const card = this.cards.get(cardId);
      if (!card || !this.validateCardData(card)) return [];
      
      return Array.from(this.cards.values())
        .filter(c => this.validateCardData(c) && c.id !== cardId && c.parentId === card.parentId && c.hierarchyLevel === card.hierarchyLevel)
        .sort((a, b) => a.displayOrder - b.displayOrder);
    } catch (error) {
      console.error('Error in getSiblingCards:', cardId, error);
      return [];
    }
  }

  // カードのグループ情報を取得
  getCardGroupInfo(cardId: string): {
    parent: Card | null;
    children: Card[];
    descendants: Card[];
    siblings: Card[];
    isGroupRoot: boolean;
    groupSize: number;
  } {
    try {
      const card = this.cards.get(cardId);
      if (!card) {
        return {
          parent: null,
          children: [],
          descendants: [],
          siblings: [],
          isGroupRoot: false,
          groupSize: 0,
        };
      }

      const parent = card.parentId ? this.cards.get(card.parentId) || null : null;
      const children = this.getChildCards(cardId);
      const descendants = this.getDescendantCards(cardId);
      const siblings = this.getSiblingCards(cardId);
      const isGroupRoot = children.length > 0;
      const groupSize = 1 + descendants.length; // 自分 + 全子孫

      return {
        parent,
        children,
        descendants,
        siblings,
        isGroupRoot,
        groupSize,
      };
    } catch (error) {
      console.error('Error in getCardGroupInfo:', cardId, error);
      return {
        parent: null,
        children: [],
        descendants: [],
        siblings: [],
        isGroupRoot: false,
        groupSize: 0,
      };
    }
  }

  // グループ全体の階層レベルを変更（親カードの階層変更時に全子カードも連動）
  adjustGroupHierarchy(parentCardId: string, levelDiff: number): boolean {
    const groupInfo = this.getCardGroupInfo(parentCardId);
    if (groupInfo.descendants.length === 0) return true; // 子孫がいない場合は何もしない
    
    const now = new Date();
    let success = true;
    
    // 全子孫カードの階層レベルを調整
    groupInfo.descendants.forEach(descendant => {
      const newLevel = Math.max(1, descendant.hierarchyLevel + levelDiff);
      const updatedDescendant = { 
        ...descendant, 
        hierarchyLevel: newLevel, 
        updatedAt: now 
      };
      
      // 階層レベル1になった場合は親IDをクリア
      if (newLevel === 1) {
        updatedDescendant.parentId = undefined;
      }
      
      this.cards.set(descendant.id, updatedDescendant);
    });
    
    return success;
  }

  // グループ全体を移動（親カード移動時に全子カードも連動）
  moveGroupTogether(parentCardId: string, targetIndex: number): boolean {
    const groupInfo = this.getCardGroupInfo(parentCardId);
    if (groupInfo.groupSize === 1) {
      // 子孫がいない場合は通常の移動
      return this.moveCardToPosition(parentCardId, targetIndex);
    }
    
    // 既存のグループ移動機能を使用
    return this.moveCardGroupToPosition(parentCardId, targetIndex);
  }

  // カードとその子孫すべてを取得して移動準備
  private getCardGroupForMove(cardId: string): Card[] {
    const card = this.cards.get(cardId);
    if (!card) return [];
    
    const descendants = this.getDescendantCards(cardId);
    return [card, ...descendants];
  }

  // 階層整合性を保った移動メソッド
  moveCardWithHierarchyIntegrity(cardId: string, direction: 'up' | 'down'): boolean {
    const cardGroup = this.getCardGroupForMove(cardId);
    if (cardGroup.length === 0) return false;

    const allCards = this.getAllCards({ sortOrder: 'displayOrder', sortDirection: 'asc' });
    const currentIndex = allCards.findIndex(c => c.id === cardId);
    
    if (currentIndex === -1) return false;
    
    let targetIndex: number | undefined;
    if (direction === 'up' && currentIndex > 0) {
      // 上に移動：前のカード（グループ）を見つける
      let checkIndex = currentIndex - 1;
      while (checkIndex >= 0) {
        const prevCard = allCards[checkIndex];
        const prevDescendants = this.getDescendantCards(prevCard.id);
        const prevGroupSize = 1 + prevDescendants.length;
        
        // 前のグループの開始位置を特定
        const prevGroupStart = checkIndex - prevDescendants.length;
        targetIndex = prevGroupStart;
        break;
      }
      if (targetIndex === undefined) return false;
    } else if (direction === 'down' && currentIndex + cardGroup.length < allCards.length) {
      // 下に移動：次のカード（グループ）を見つける
      const currentGroupEnd = currentIndex + cardGroup.length - 1;
      let checkIndex = currentGroupEnd + 1;
      
      if (checkIndex < allCards.length) {
        const nextCard = allCards[checkIndex];
        const nextDescendants = this.getDescendantCards(nextCard.id);
        const nextGroupSize = 1 + nextDescendants.length;
        targetIndex = checkIndex + nextGroupSize;
        if (targetIndex > allCards.length) targetIndex = allCards.length;
      } else {
        return false;
      }
    } else {
      return false; // 移動できない
    }

    // targetIndexが未定義でないことを確認
    if (targetIndex === undefined) return false;

    // 移動実行
    return this.moveCardGroupToPosition(cardId, targetIndex);
  }

  // カードグループを指定位置に移動
  private moveCardGroupToPosition(cardId: string, targetIndex: number): boolean {
    const cardGroup = this.getCardGroupForMove(cardId);
    if (cardGroup.length === 0) return false;

    const allCards = this.getAllCards({ sortOrder: 'displayOrder', sortDirection: 'asc' });
    const currentIndex = allCards.findIndex(c => c.id === cardId);
    
    if (currentIndex === -1 || targetIndex < 0 || targetIndex > allCards.length) {
      return false;
    }
    
    // 移動先の階層レベルを決定
    const hierarchyInfo = this.determineTargetHierarchyLevel(targetIndex, allCards);
    
    // カードグループを配列から削除
    const movedGroup = allCards.splice(currentIndex, cardGroup.length);
    
    // 移動先に挿入
    const adjustedTargetIndex = targetIndex > currentIndex ? targetIndex - cardGroup.length : targetIndex;
    allCards.splice(adjustedTargetIndex, 0, ...movedGroup);
    
    // 移動したカードの階層レベルを調整
    const movedCard = movedGroup[0];
    const adjustedCard = this.adjustCardHierarchy(movedCard, hierarchyInfo.level, hierarchyInfo.parentId);
    
    // allCards配列内のカード情報も更新（recalculateDisplayOrderで上書きされないように）
    const movedCardIndex = allCards.findIndex(c => c.id === cardId);
    if (movedCardIndex !== -1) {
      allCards[movedCardIndex] = adjustedCard;
      
      // 子孫カードも更新
      const descendants = this.getDescendantCards(cardId);
      descendants.forEach(descendant => {
        const descendantIndex = allCards.findIndex(c => c.id === descendant.id);
        if (descendantIndex !== -1) {
          const updatedDescendant = this.cards.get(descendant.id);
          if (updatedDescendant) {
            allCards[descendantIndex] = updatedDescendant;
          }
        }
      });
    }
    
    // displayOrderを再計算
    this.recalculateDisplayOrder(allCards);
    
    return true;
  }

  private generateId(): string {
    return `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}