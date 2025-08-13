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
        borderBottom: state.currentFile ? '1px solid #e9ecef' : 'none',
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
          📄 テキストファイルを開く
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
          📂 JSONファイルを開く
        </button>

        {state.currentFile && (
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
            💾 JSONファイルを保存
          </button>
        )}

        {state.currentFile && (
          <>
            <div style={{ height: '20px', width: '1px', backgroundColor: '#ddd' }} />
            <div style={{
              fontSize: '14px',
              color: '#666',
              maxWidth: '300px',
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
          </>
        )}
      </div>

      {/* 2段目: フィルター操作 */}
      {state.currentFile && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 12px',
        }}>
          <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#495057' }}>
            🔍 フィルター:
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
                fontSize: '14px',
              }}
            >
              ✕ クリア
            </button>
          )}
        </div>
      )}
    </div>
  );
}