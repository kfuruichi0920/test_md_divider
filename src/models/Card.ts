export enum CardStatus {
  UNPROCESSED = 'unprocessed',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
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
}

export interface CardUpdatePayload {
  content?: string;
  status?: CardStatus;
  position?: number;
  displayOrder?: number;
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