import { Card, SaveData, SaveDataValidationResult, SAVE_DATA_VERSION } from '@/models';

export class SaveDataManager {
  static createSaveData(originalFile: string, cards: Card[]): SaveData {
    const now = new Date();
    return {
      version: SAVE_DATA_VERSION,
      originalFile,
      timestamp: now.toISOString(),
      cards: cards.map(card => ({
        ...card,
        createdAt: card.createdAt,
        updatedAt: card.updatedAt,
      })),
      metadata: {
        totalCards: cards.length,
        lastModified: now.toISOString(),
      },
    };
  }

  static validateSaveData(data: any): SaveDataValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 基本構造チェック
    if (!data || typeof data !== 'object') {
      errors.push('無効なJSONデータです');
      return { isValid: false, errors, warnings };
    }

    // 必須フィールドチェック
    if (!data.version) {
      errors.push('versionフィールドが必要です');
    }

    if (!data.originalFile) {
      errors.push('originalFileフィールドが必要です');
    }

    if (!data.timestamp) {
      errors.push('timestampフィールドが必要です');
    }

    if (!Array.isArray(data.cards)) {
      errors.push('cardsフィールドは配列である必要があります');
    } else {
      // カードデータの検証
      data.cards.forEach((card: any, index: number) => {
        if (!card.id) {
          errors.push(`カード${index + 1}: idフィールドが必要です`);
        }
        if (typeof card.position !== 'number') {
          errors.push(`カード${index + 1}: positionフィールドは数値である必要があります`);
        }
        if (!card.content) {
          warnings.push(`カード${index + 1}: contentが空です`);
        }
        if (!['unprocessed', 'processing', 'processed'].includes(card.status)) {
          errors.push(`カード${index + 1}: statusは'unprocessed'、'processing'、'processed'のいずれかである必要があります`);
        }
        if (!card.createdAt || !card.updatedAt) {
          errors.push(`カード${index + 1}: createdAt/updatedAtフィールドが必要です`);
        }
      });
    }

    // バージョンチェック
    if (data.version !== SAVE_DATA_VERSION) {
      warnings.push(`バージョンが異なります。期待値: ${SAVE_DATA_VERSION}, 実際の値: ${data.version}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  static parseSaveData(jsonString: string): { data: SaveData | null; validation: SaveDataValidationResult } {
    try {
      const data = JSON.parse(jsonString);
      const validation = this.validateSaveData(data);
      
      if (validation.isValid) {
        // Date オブジェクトに変換
        const saveData: SaveData = {
          ...data,
          cards: data.cards.map((card: any) => ({
            ...card,
            createdAt: new Date(card.createdAt),
            updatedAt: new Date(card.updatedAt),
          })),
        };
        return { data: saveData, validation };
      }
      
      return { data: null, validation };
    } catch (error) {
      return {
        data: null,
        validation: {
          isValid: false,
          errors: [`JSON解析エラー: ${error instanceof Error ? error.message : '不明なエラー'}`],
          warnings: [],
        },
      };
    }
  }

  static generateFilename(originalFile: string): string {
    const basename = originalFile.replace(/\.[^/.]+$/, '');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    return `${basename}_${timestamp}.json`;
  }
}