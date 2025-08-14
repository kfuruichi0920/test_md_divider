import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardStatus } from '@/models';
import { useApp } from '../contexts/AppContext';

interface CardItemProps {
  card: Card;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onUpdate: (id: string, updates: { content?: string; status?: CardStatus }) => void;
}

const STATUS_COLORS = {
  [CardStatus.UNPROCESSED]: '#f0f0f0',
  [CardStatus.PROCESSING]: '#fff3cd',
  [CardStatus.PROCESSED]: '#d4edda',
};

const STATUS_LABELS = {
  [CardStatus.UNPROCESSED]: '未処理',
  [CardStatus.PROCESSING]: '処理中',
  [CardStatus.PROCESSED]: '処理済み',
};

export function CardItem({ card, isSelected, onSelect, onUpdate }: CardItemProps) {
  const { state } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(card.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
    setEditContent(card.content);
  }, [card.content]);

  const handleSave = useCallback(() => {
    if (editContent.trim() !== card.content) {
      onUpdate(card.id, { content: editContent.trim() });
    }
    setIsEditing(false);
  }, [card.id, card.content, editContent, onUpdate]);

  const handleCancel = useCallback(() => {
    setEditContent(card.content);
    setIsEditing(false);
  }, [card.content]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  }, [handleSave, handleCancel]);

  const handleStatusChange = useCallback((status: CardStatus) => {
    onUpdate(card.id, { status });
  }, [card.id, onUpdate]);

  const handleClick = useCallback(() => {
    onSelect(card.id);
  }, [card.id, onSelect]);

  return (
    <div
      style={{
        border: isSelected ? '2px solid #0066cc' : '1px solid #ddd',
        borderRadius: '8px',
        padding: '12px',
        margin: '8px 0',
        backgroundColor: STATUS_COLORS[card.status],
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative',
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <div style={{
            fontSize: '12px',
            color: '#666',
            fontWeight: 'bold',
          }}>
            #{card.position + 1}
          </div>
          {card.hasChanges && (
            <span style={{
              fontSize: '10px',
              color: '#0066cc',
              fontWeight: 'bold',
              backgroundColor: '#e3f2fd',
              padding: '2px 6px',
              borderRadius: '10px',
              border: '1px solid #0066cc',
            }}>
              変更済み
            </span>
          )}
        </div>
        
        <select
          value={card.status}
          onChange={(e) => handleStatusChange(e.target.value as CardStatus)}
          onClick={(e) => e.stopPropagation()}
          style={{
            padding: '4px 8px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '12px',
          }}
        >
          {Object.entries(STATUS_LABELS).map(([status, label]) => (
            <option key={status} value={status}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {isEditing ? (
        <div>
          <textarea
            ref={textareaRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              minHeight: '60px',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              resize: 'vertical',
              fontFamily: state.settings.fontFamily,
              fontSize: `${state.settings.fontSize}px`,
            }}
          />
          <div style={{
            marginTop: '8px',
            display: 'flex',
            gap: '8px',
          }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSave();
              }}
              style={{
                padding: '4px 12px',
                backgroundColor: '#0066cc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              保存
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCancel();
              }}
              style={{
                padding: '4px 12px',
                backgroundColor: '#666',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              キャンセル
            </button>
          </div>
          <div style={{
            fontSize: '11px',
            color: '#666',
            marginTop: '4px',
          }}>
            Ctrl+Enter: 保存 / Escape: キャンセル
          </div>
        </div>
      ) : (
        <div>
          <div style={{
            whiteSpace: 'pre-wrap',
            lineHeight: '1.5',
            fontFamily: state.settings.fontFamily,
            fontSize: `${state.settings.fontSize}px`,
          }}>
            {card.content}
          </div>
          
          {card.hasChanges && (
            <div style={{
              marginTop: '12px',
              padding: '8px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              borderLeft: '4px solid #6c757d',
            }}>
              <div style={{
                fontSize: '12px',
                color: '#6c757d',
                fontWeight: 'bold',
                marginBottom: '4px',
              }}>
                📝 初期内容:
              </div>
              <div style={{
                whiteSpace: 'pre-wrap',
                lineHeight: '1.4',
                fontFamily: state.settings.fontFamily,
                fontSize: `${Math.max(state.settings.fontSize - 1, 11)}px`,
                color: '#6c757d',
              }}>
                {card.originalContent}
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{
        fontSize: '11px',
        color: '#999',
        marginTop: '8px',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: card.statusUpdatedAt ? '4px' : '0',
        }}>
          <span>作成: {card.createdAt.toLocaleString()}</span>
          {card.updatedAt.getTime() !== card.createdAt.getTime() && (
            <span style={{ color: '#0066cc', fontWeight: 'bold' }}>
              更新: {card.updatedAt.toLocaleString()}
            </span>
          )}
        </div>
        {card.statusUpdatedAt && (
          <div style={{
            fontSize: '10px',
            color: '#28a745',
            fontWeight: 'bold',
          }}>
            状態更新: {card.statusUpdatedAt.toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}