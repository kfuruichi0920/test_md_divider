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

  const cardCounts = {
    total: state.cards.length,
    unprocessed: state.cards.filter(c => c.status === CardStatus.UNPROCESSED).length,
    processing: state.cards.filter(c => c.status === CardStatus.PROCESSING).length,
    processed: state.cards.filter(c => c.status === CardStatus.PROCESSED).length,
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px',
      backgroundColor: '#f8f9fa',
      borderBottom: '1px solid #ddd',
      flexWrap: 'wrap',
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
        }}
      >
        ファイルを開く
      </button>

      {state.currentFile && (
        <>
          <div style={{
            fontSize: '14px',
            color: '#666',
            maxWidth: '200px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {state.currentFile}
          </div>

          <div style={{ height: '20px', width: '1px', backgroundColor: '#ddd' }} />

          <select
            value={state.filter.status || ''}
            onChange={(e) => handleStatusFilterChange(e.target.value as CardStatus | '')}
            style={{
              padding: '6px 12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
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
              minWidth: '200px',
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
              }}
            >
              フィルターをクリア
            </button>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '16px', fontSize: '14px' }}>
            <span>総数: <strong>{cardCounts.total}</strong></span>
            <span style={{ color: '#dc3545' }}>未処理: <strong>{cardCounts.unprocessed}</strong></span>
            <span style={{ color: '#ffc107' }}>処理中: <strong>{cardCounts.processing}</strong></span>
            <span style={{ color: '#28a745' }}>処理済み: <strong>{cardCounts.processed}</strong></span>
          </div>
        </>
      )}
    </div>
  );
}