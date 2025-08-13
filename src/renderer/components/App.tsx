import React, { useEffect, useState } from 'react';
import { AppProvider, useApp } from '../contexts/AppContext';
import { FileDropZone } from './FileDropZone';
import { Toolbar } from './Toolbar';
import { CardList } from './CardList';
import { StatusLog } from './StatusLog';

function AppContent() {
  const { state } = useApp();
  const [windowHeight, setWindowHeight] = useState(window.innerHeight);
  const [statusLogHeight, setStatusLogHeight] = useState(120);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const handleResize = () => setWindowHeight(window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toolbarHeight = state.currentFile ? 100 : 50; // ファイルがある場合は2段構成
  const cardListHeight = windowHeight - toolbarHeight - statusLogHeight;

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;
    
    const newHeight = windowHeight - e.clientY;
    const minHeight = 80;
    const maxHeight = windowHeight - toolbarHeight - 200;
    
    setStatusLogHeight(Math.max(minHeight, Math.min(newHeight, maxHeight)));
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, windowHeight]);

  return (
    <FileDropZone>
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Toolbar />
        
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {state.isLoading ? (
            <div style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              color: '#666',
            }}>
              <div>
                <div style={{ marginBottom: '12px' }}>📄</div>
                <div>ファイルを読み込み中...</div>
              </div>
            </div>
          ) : state.error ? (
            <div style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              color: '#dc3545',
              textAlign: 'center',
              padding: '20px',
            }}>
              <div>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>エラーが発生しました</div>
                <div>{state.error}</div>
              </div>
            </div>
          ) : !state.currentFile ? (
            <div style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              color: '#666',
              textAlign: 'center',
            }}>
              <div>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>📄</div>
                <div style={{ marginBottom: '8px' }}>ファイルをドラッグ&ドロップするか</div>
                <div>「テキストファイルを開く」または「JSONファイルを開く」ボタンをクリックしてください</div>
                <div style={{ fontSize: '14px', color: '#999', marginTop: '12px' }}>
                  対応形式: .txt, .md, .json
                </div>
              </div>
            </div>
          ) : (
            <CardList cards={state.cards} height={cardListHeight} />
          )}
        </div>
        
        {/* リサイザーハンドル */}
        <div
          onMouseDown={handleMouseDown}
          style={{
            height: '4px',
            backgroundColor: isResizing ? '#0066cc' : '#ddd',
            cursor: 'ns-resize',
            borderTop: '1px solid #ccc',
            borderBottom: '1px solid #ccc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            color: '#666',
            transition: 'background-color 0.2s ease',
          }}
        >
          {isResizing ? '' : '⋯'}
        </div>
        
        <StatusLog logs={state.logs} height={statusLogHeight} />
      </div>
    </FileDropZone>
  );
}

export function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}