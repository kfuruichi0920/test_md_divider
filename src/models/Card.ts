export enum CardStatus {
  UNPROCESSED = 'unprocessed',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
}

export enum DisplayAttribute {
  HEADING = 'heading',      // ①見出し
  MAIN_CONTENT = 'main',    // ②本文  
  MISCELLANEOUS = 'misc',   // ③雑記
}

export enum SemanticAttribute {
  // 表示属性①の場合: 任意
  NONE = 'none',
  // 表示属性②の場合
  TEXT = 'text',            // (1)本文
  FIGURE = 'figure',        // (2)図
  TABLE = 'table',          // (3)表
  TEST = 'test',            // (4)試験
  QUESTION = 'question',    // (5)質問
  // 表示属性③の場合: 任意 (NONEを使用)
}

export interface Card {
  id: string;
  position: number;
  content: string;
  status: CardStatus;
  createdAt: Date;
  updatedAt: Date;
  originalContent: string;
  hasChanges: boolean;
  statusUpdatedAt?: Date;
  originalPosition: number;
  displayOrder: number;
  // 属性情報
  displayAttribute: DisplayAttribute;
  semanticAttribute: SemanticAttribute;
  // 基本情報（全属性共通）
  contents: string;  // = content (既存フィールドとの整合性のため別名定義)
  contentsTag: string;
  // 詳細情報（属性別）
  figureId?: string;
  figureData?: string;
  tableId?: string;
  tableData?: string;
  testId?: string;
  testPrereq?: string;
  testStep?: string;
  testCons?: string;
  testSpec?: string;
  qaId?: string;
  question?: string;
  answer?: string;
  // 階層管理情報
  hierarchyLevel: number;  // 階層レベル（1がトップ階層）
  parentId?: string;       // 親カードのID（トップ階層の場合はundefined）
}

export interface CardUpdatePayload {
  content?: string;
  status?: CardStatus;
  position?: number;
  displayOrder?: number;
  // 属性情報
  displayAttribute?: DisplayAttribute;
  semanticAttribute?: SemanticAttribute;
  contents?: string;
  contentsTag?: string;
  // 詳細情報（属性別）
  figureId?: string;
  figureData?: string;
  tableId?: string;
  tableData?: string;
  testId?: string;
  testPrereq?: string;
  testStep?: string;
  testCons?: string;
  testSpec?: string;
  qaId?: string;
  question?: string;
  answer?: string;
  // 階層管理情報
  hierarchyLevel?: number;
  parentId?: string;
}

export type CardFilter = {
  status?: CardStatus;
  searchText?: string;
};

export type CardSortOrder = 'position' | 'displayOrder' | 'createdAt' | 'updatedAt';

export interface CardListOptions {
  filter?: CardFilter;
  sortOrder?: CardSortOrder;
  sortDirection?: 'asc' | 'desc';
}