import { Card } from './Card';

export interface SaveData {
  version: string;
  originalFile: string;
  timestamp: string;
  cards: Card[];
  metadata?: {
    totalCards: number;
    lastModified: string;
    [key: string]: any;
  };
}

export interface SaveDataValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const SAVE_DATA_VERSION = '1.2.0';