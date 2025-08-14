import { Card, SaveData, SaveDataValidationResult, SAVE_DATA_VERSION } from '@/models';

export class SaveDataManager {
  static createSaveData(originalFile: string, cards: Card[], collapsedCardIds: string[]): SaveData {
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
      collapsedCardIds,
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
        
        // 新しいフィールドのバリデーション（バージョン1.1.0以降の場合）
        if (data.version === '1.1.0' || (data.version && data.version > '1.0.0')) {
          if (card.originalContent === undefined) {
            warnings.push(`カード${index + 1}: originalContentフィールドがありません（後方互換性のため警告のみ）`);
          }
          if (card.hasChanges === undefined) {
            warnings.push(`カード${index + 1}: hasChangesフィールドがありません（後方互換性のため警告のみ）`);
          }
        }
        
        // バージョン1.2.0以降の場合のstatusUpdatedAtチェック
        if (data.version === '1.2.0' || (data.version && data.version > '1.1.0')) {
          // statusUpdatedAtは任意フィールドなので警告のみ
          if (card.statusUpdatedAt !== undefined && card.statusUpdatedAt !== null) {
            const statusDate = new Date(card.statusUpdatedAt);
            if (isNaN(statusDate.getTime())) {
              warnings.push(`カード${index + 1}: statusUpdatedAtの日付形式が無効です`);
            }
          }
        }

        // バージョン1.3.0以降の場合の属性フィールドチェック
        if (data.version === '1.3.0' || (data.version && data.version > '1.2.0')) {
          if (!card.displayAttribute) {
            warnings.push(`カード${index + 1}: displayAttributeフィールドがありません（後方互換性のため警告のみ）`);
          } else if (!['heading', 'main', 'misc'].includes(card.displayAttribute)) {
            errors.push(`カード${index + 1}: displayAttributeは'heading'、'main'、'misc'のいずれかである必要があります`);
          }
          
          if (!card.semanticAttribute) {
            warnings.push(`カード${index + 1}: semanticAttributeフィールドがありません（後方互換性のため警告のみ）`);
          } else if (!['none', 'text', 'figure', 'table', 'test', 'question'].includes(card.semanticAttribute)) {
            errors.push(`カード${index + 1}: semanticAttributeは有効な値である必要があります`);
          }
          
          if (card.contents === undefined) {
            warnings.push(`カード${index + 1}: contentsフィールドがありません（後方互換性のため警告のみ）`);
          }
          
          if (card.contentsTag === undefined) {
            warnings.push(`カード${index + 1}: contentsTagフィールドがありません（後方互換性のため警告のみ）`);
          }
        }

        // バージョン1.4.0以降の場合の階層フィールドチェック
        if (data.version === '1.4.0' || (data.version && data.version > '1.3.0')) {
          if (typeof card.hierarchyLevel !== 'number' || card.hierarchyLevel < 1) {
            errors.push(`カード${index + 1}: hierarchyLevelは1以上の数値である必要があります`);
          }
          
          // parentIdが存在する場合の整合性チェック
          if (card.parentId) {
            const parentExists = data.cards.some((c: any) => c.id === card.parentId);
            if (!parentExists) {
              errors.push(`カード${index + 1}: parentId "${card.parentId}" に対応する親カードが存在しません`);
            }
          } else if (card.hierarchyLevel > 1) {
            errors.push(`カード${index + 1}: 階層レベル2以上のカードにはparentIdが必要です`);
          }
        }
      });
    }

    if (data.collapsedCardIds !== undefined) {
      if (!Array.isArray(data.collapsedCardIds)) {
        errors.push('collapsedCardIdsフィールドは配列である必要があります');
      } else {
        const invalidId = data.collapsedCardIds.find((id: any) => typeof id !== 'string');
        if (invalidId !== undefined) {
          errors.push('collapsedCardIdsフィールドの各要素は文字列である必要があります');
        }
      }
    } else if (data.version === '1.5.0' || (data.version && data.version > '1.4.0')) {
      warnings.push('collapsedCardIdsフィールドがありません（後方互換性のため警告のみ）');
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
          collapsedCardIds: Array.isArray(data.collapsedCardIds) ? data.collapsedCardIds : [],
          cards: data.cards.map((card: any) => ({
            ...card,
            createdAt: new Date(card.createdAt),
            updatedAt: new Date(card.updatedAt),
            // 後方互換性のため、古いデータに新しいフィールドがない場合はデフォルト値を設定
            originalContent: card.originalContent !== undefined ? card.originalContent : card.content,
            hasChanges: card.hasChanges !== undefined ? card.hasChanges : false,
            statusUpdatedAt: card.statusUpdatedAt ? new Date(card.statusUpdatedAt) : undefined,
            // バージョン1.3.0の新フィールド（デフォルト値: ②-(1)本文）
            displayAttribute: card.displayAttribute !== undefined ? card.displayAttribute : 'main',
            semanticAttribute: card.semanticAttribute !== undefined ? card.semanticAttribute : 'text',
            contents: card.contents !== undefined ? card.contents : card.content,
            contentsTag: card.contentsTag !== undefined ? card.contentsTag : '',
            // 属性別詳細情報
            figureId: card.figureId,
            figureData: card.figureData,
            tableId: card.tableId,
            tableData: card.tableData,
            testId: card.testId,
            testPrereq: card.testPrereq,
            testStep: card.testStep,
            testCons: card.testCons,
            testSpec: card.testSpec,
            qaId: card.qaId,
            question: card.question,
            answer: card.answer,
            // バージョン1.4.0の新フィールド（デフォルト値: トップ階層）
            hierarchyLevel: card.hierarchyLevel !== undefined ? card.hierarchyLevel : 1,
            parentId: card.parentId,
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