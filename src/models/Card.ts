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
}

export interface CardUpdatePayload {
  content?: string;
  status?: CardStatus;
  position?: number;
}

export type CardFilter = {
  status?: CardStatus;
  searchText?: string;
};

export type CardSortOrder = 'position' | 'createdAt' | 'updatedAt';

export interface CardListOptions {
  filter?: CardFilter;
  sortOrder?: CardSortOrder;
  sortDirection?: 'asc' | 'desc';
}