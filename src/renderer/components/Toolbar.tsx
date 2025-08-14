import React, { useCallback } from 'react';
import { CardStatus } from '@/models';
import { useApp } from '../contexts/AppContext';

export function Toolbar() {
  const { state, actions } = useApp();

  const handleFileOpen = useCallback(async () => {
    try {
      const filePath = await window.electronAPI.openFileDialog();
      if (filePath) {
        await actions.loadFile(filePath);
      }
    } catch (error) {
      console.error('ファイル選択エラー:', error);
    }
  }, [actions]);

  const handleStatusFilterChange = useCallback((status: CardStatus | '') => {
    actions.setFilter({
      status: status === '' ? undefined : (status as CardStatus),
    });
  }, [actions]);

  const handleSearchChange = useCallback((searchText: string) => {
    actions.setFilter({
      searchText: searchText === '' ? undefined : searchText,
    });
  }, [actions]);

  const handleClearFilter = useCallback(() => {
    actions.clearFilter();
  }, [actions]);

  const handleJsonLoad = useCallback(async () => {
    try {
      const filePath = await window.electronAPI.openJsonDialog();
      if (filePath) {
        await actions.loadJsonFile(filePath);
      }
    } catch (error) {
      console.error('JSON読み込みエラー:', error);
    }
  }, [actions]);

  const handleJsonSave = useCallback(async () => {
    await actions.saveJson();
  }, [actions]);

  const handleJsonOverwrite = useCallback(async () => {
    await actions.overwriteJson();
  }, [actions]);

  const handleFontFamilyChange = useCallback((fontFamily: string) => {
    actions.updateSettings({ fontFamily });
  }, [actions]);

  const handleFontSizeChange = useCallback((fontSize: number) => {
    actions.updateSettings({ fontSize });
  }, [actions]);

  const handleRenderModeChange = useCallback((mode: 'text' | 'markdown') => {
    actions.updateSettings({ renderMode: mode });
  }, [actions]);

  const handleCardDisplayModeChange = useCallback((mode: 'full' | 'single') => {
    actions.updateSettings({ cardDisplayMode: mode });
  }, [actions]);

  const cardCounts = {
    total: state.cards.length,
    unprocessed: state.cards.filter(c => c.status === CardStatus.UNPROCESSED).length,
    processing: state.cards.filter(c => c.status === CardStatus.PROCESSING).length,
    processed: state.cards.filter(c => c.status === CardStatus.PROCESSED).length,
  };

  return (
    <div style={{
      backgroundColor: '#f8f9fa',
      borderBottom: '1px solid #ddd',
    }}>
      {/* 1段目: ファイル操作 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 12px',
        borderBottom: '1px solid #e9ecef',
      }}>
        <button
          onClick={handleFileOpen}
          style={{
            padding: '8px 16px',
            backgroundColor: '#0066cc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px',
          }}
        >
          📄 TXT開く
        </button>

        <button
          onClick={handleJsonLoad}
          style={{
            padding: '8px 16px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px',
          }}
        >
          📂 JSON開く
        </button>

        {state.currentFile && (
          <>
            <button
              onClick={handleJsonSave}
              style={{
                padding: '8px 16px',
                backgroundColor: '#17a2b8',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px',
              }}
            >
              💾 JSON保存
            </button>

            <button
              onClick={handleJsonOverwrite}
              style={{
                padding: '8px 16px',
                backgroundColor: '#ffc107',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px',
              }}
            >
              📝 JSON上書保存
            </button>
          </>
        )}

        <button
          onClick={actions.undo}
          disabled={state.history.undoCount === 0}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: state.history.undoCount === 0 ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: '14px',
            opacity: state.history.undoCount === 0 ? 0.5 : 1,
          }}
        >
          ⏪戻る
        </button>

        <button
          onClick={actions.redo}
          disabled={state.history.redoCount === 0}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: state.history.redoCount === 0 ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: '14px',
            opacity: state.history.redoCount === 0 ? 0.5 : 1,
          }}
        >
          ⏩ 進む
        </button>
      </div>

      {/* 2段目: ファイルパス情報 */}
      {state.currentFile && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 12px',
          borderBottom: '1px solid #e9ecef',
          backgroundColor: '#f8f9fa',
        }}>
          <div style={{
            fontSize: '14px',
            color: '#666',
            maxWidth: '400px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            📁 {state.currentFile}
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '16px', fontSize: '13px' }}>
            <span>総数: <strong>{cardCounts.total}</strong></span>
            <span style={{ color: '#dc3545' }}>未処理: <strong>{cardCounts.unprocessed}</strong></span>
            <span style={{ color: '#ffc107' }}>処理中: <strong>{cardCounts.processing}</strong></span>
            <span style={{ color: '#28a745' }}>処理済み: <strong>{cardCounts.processed}</strong></span>
          </div>
        </div>
      )}

      {/* 3段目: フィルター操作 */}
      {state.currentFile && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 12px',
          backgroundColor: '#ffffff',
        }}>
          <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#495057' }}>
            🔍:
          </span>

          <select
            value={state.filter.status || ''}
            onChange={(e) => handleStatusFilterChange(e.target.value as CardStatus | '')}
            style={{
              padding: '6px 12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          >
            <option value="">すべての状態</option>
            <option value={CardStatus.UNPROCESSED}>未処理</option>
            <option value={CardStatus.PROCESSING}>処理中</option>
            <option value={CardStatus.PROCESSED}>処理済み</option>
          </select>

          <input
            type="text"
            placeholder="カード内容を検索..."
            value={state.filter.searchText || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            style={{
              padding: '6px 12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              minWidth: '250px',
              fontSize: '14px',
            }}
          />

          {(state.filter.status || state.filter.searchText) && (
            <button
              onClick={handleClearFilter}
              style={{
                padding: '6px 12px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              ✕ クリア
            </button>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#495057' }}>
              ⚙️:
            </span>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
              
              <select
                value={state.settings.renderMode}
                onChange={(e) => handleRenderModeChange(e.target.value as 'text' | 'markdown')}
                style={{
                  padding: '4px 8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '12px',
                }}
              >
                <option value="text">text</option>
                <option value="markdown">Markdown</option>
              </select>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
              
              <button
                onClick={() => handleCardDisplayModeChange(state.settings.cardDisplayMode === 'single' ? 'full' : 'single')}
                style={{
                  padding: '4px 8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  backgroundColor: '#f8f9fa',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                {state.settings.cardDisplayMode === 'single' ? '通常' : '1行'}
              </button>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
              フォント:
              <select
                value={state.settings.fontFamily}
                onChange={(e) => handleFontFamilyChange(e.target.value)}
                style={{
                  padding: '4px 8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '12px',
                }}
              >
                <option value="system-ui, -apple-system, sans-serif">システム</option>
                <option value="'Helvetica Neue', Arial, sans-serif">Arial</option>
                <option value="'Times New Roman', serif">Times New Roman</option>
                <option value="'Courier New', monospace">Courier New</option>
                <option value="'Hiragino Sans', 'Noto Sans JP', sans-serif">ヒラギノ角ゴ</option>
                <option value="'Yu Gothic', 'YuGothic', sans-serif">游ゴシック</option>
                <option value="'Meiryo', sans-serif">メイリオ</option>
                <option value="'MS Gothic', 'ＭＳ ゴシック', 'MS PGothic', 'ＭＳ Ｐゴシック', monospace">MSゴシック</option>
                <option value="'MS Mincho', 'ＭＳ 明朝', 'MS PMincho', 'ＭＳ Ｐ明朝', serif">MS明朝</option>
                <option value="'Noto Sans JP', sans-serif">Noto Sans JP</option>
                <option value="'Noto Serif JP', serif">Noto Serif JP</option>
                <option value="'Osaka', 'Osaka－等幅', sans-serif">Osaka</option>
                <option value="'IPAexGothic', sans-serif">IPAexゴシック</option>
                <option value="'IPAexMincho', serif">IPAex明朝</option>
              </select>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
              
              <select
                value={state.settings.fontSize}
                onChange={(e) => handleFontSizeChange(Number(e.target.value))}
                style={{
                  padding: '4px 8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '12px',
                }}
              >
                <option value="12">12px</option>
                <option value="13">13px</option>
                <option value="14">14px</option>
                <option value="15">15px</option>
                <option value="16">16px</option>
                <option value="18">18px</option>
                <option value="20">20px</option>
                <option value="22">22px</option>
                <option value="24">24px</option>
              </select>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
