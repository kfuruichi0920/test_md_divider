export interface ParagraphInfo {
  content: string;
  position: number;
}

export class TextProcessor {
  static splitIntoParagraphs(text: string): ParagraphInfo[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const paragraphs: ParagraphInfo[] = [];
    
    // 連続する改行（\n\n以上）で分割
    const rawParagraphs = text.split(/\n\s*\n/);
    
    let position = 0;
    
    for (const rawParagraph of rawParagraphs) {
      const content = this.cleanParagraph(rawParagraph);
      
      // 空のコンテンツは除外
      if (content.length > 0) {
        paragraphs.push({
          content,
          position: position++,
        });
      }
    }
    
    return paragraphs;
  }
  
  private static cleanParagraph(paragraph: string): string {
    return paragraph
      .trim() // 先頭・末尾の空白を除去
      .replace(/\n+/g, '\n') // 連続する改行を1つに
      .replace(/[ \t]+/g, ' '); // 連続するスペース・タブを1つのスペースに
  }
  
  static validateTextFile(content: string): { isValid: boolean; error?: string } {
    if (!content) {
      return { isValid: false, error: 'ファイルが空です' };
    }
    
    // UTF-8以外の文字が含まれているかチェック
    try {
      const encoder = new TextEncoder();
      const decoder = new TextDecoder('utf-8', { fatal: true });
      const encoded = encoder.encode(content);
      decoder.decode(encoded);
    } catch (error) {
      return { isValid: false, error: 'UTF-8でエンコードされていません' };
    }
    
    // ファイルサイズチェック（文字数で概算）
    if (content.length > 10 * 1024 * 1024) { // 約10MB
      return { isValid: false, error: 'ファイルサイズが大きすぎます（10MB以下にしてください）' };
    }
    
    return { isValid: true };
  }
  
  static getTextStatistics(content: string): {
    characterCount: number;
    lineCount: number;
    paragraphCount: number;
    wordCount: number;
  } {
    if (!content) {
      return {
        characterCount: 0,
        lineCount: 0,
        paragraphCount: 0,
        wordCount: 0,
      };
    }
    
    const paragraphs = this.splitIntoParagraphs(content);
    const lines = content.split('\n');
    
    // 日本語を考慮した単語数カウント（簡易版）
    const wordCount = content
      .replace(/[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '')
      .split(/[\s\u3000]+/)
      .filter(word => word.length > 0).length;
    
    return {
      characterCount: content.length,
      lineCount: lines.length,
      paragraphCount: paragraphs.length,
      wordCount,
    };
  }
}