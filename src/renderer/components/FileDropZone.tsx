import React, { useCallback, useState } from 'react';
import { useApp } from '../contexts/AppContext';

interface FileDropZoneProps {
  children: React.ReactNode;
}

export function FileDropZone({ children }: FileDropZoneProps) {
  const { actions } = useApp();
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const textFile = files.find(file => 
      file.type === 'text/plain' || 
      file.name.endsWith('.txt') || 
      file.name.endsWith('.md')
    );

    if (!textFile) {
      alert('テキストファイル（.txt, .md）を選択してください');
      return;
    }

    try {
      const content = await textFile.text();
      
      // ファイルパスの代わりにファイル名を使用（Electronのセキュリティ制限のため）
      await actions.loadFile(textFile.name);
      
      // 実際のコンテンツを直接処理
      // この部分は実際の実装では、ファイルパスではなくコンテンツを直接扱う必要があります
    } catch (error) {
      console.error('ファイル読み込みエラー:', error);
    }
  }, [actions]);

  const handleFileButtonClick = useCallback(async () => {
    try {
      const filePath = await window.electronAPI.openFileDialog();
      if (filePath) {
        await actions.loadFile(filePath);
      }
    } catch (error) {
      console.error('ファイル選択エラー:', error);
    }
  }, [actions]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        position: 'relative',
        height: '100%',
        backgroundColor: isDragOver ? '#e8f4fd' : 'transparent',
        border: isDragOver ? '2px dashed #0066cc' : 'none',
        transition: 'all 0.2s ease',
      }}
    >
      {children}
      
      {isDragOver && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 102, 204, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          pointerEvents: 'none',
        }}>
          <div style={{
            padding: '20px',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>📄</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
              ファイルをドロップしてください
            </div>
          </div>
        </div>
      )}
    </div>
  );
}