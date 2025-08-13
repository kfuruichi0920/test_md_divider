import React, { useEffect, useState } from 'react';
import { AppProvider, useApp } from '../contexts/AppContext';
import { FileDropZone } from './FileDropZone';
import { Toolbar } from './Toolbar';
import { CardList } from './CardList';

function AppContent() {
  const { state } = useApp();
  const [windowHeight, setWindowHeight] = useState(window.innerHeight);

  useEffect(() => {
    const handleResize = () => setWindowHeight(window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toolbarHeight = 80;
  const cardListHeight = windowHeight - toolbarHeight;

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
                <div>「ファイルを開く」ボタンをクリックしてください</div>
                <div style={{ fontSize: '14px', color: '#999', marginTop: '12px' }}>
                  対応形式: .txt, .md
                </div>
              </div>
            </div>
          ) : (
            <CardList cards={state.cards} height={cardListHeight} />
          )}
        </div>
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