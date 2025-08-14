import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Card, CardStatus, DisplayAttribute, SemanticAttribute, CardUpdatePayload } from '@/models';
import { useApp } from '../contexts/AppContext';
import * as Diff from 'diff';
import { renderMarkdown } from '@/utils';

// 差分表示コンポーネント
interface DiffViewerProps {
  original: string;
  current: string;
  showAdded?: boolean;
  showRemoved?: boolean;
  addedStyle?: React.CSSProperties;
  removedStyle?: React.CSSProperties;
}

const DiffViewer = ({
  original,
  current,
  showAdded = true,
  showRemoved = false,
  addedStyle = { color: 'red', backgroundColor: '#ffdddd', fontWeight: 'bold' },
  removedStyle = { color: 'blue', backgroundColor: '#ddeeff', textDecoration: 'line-through' },
}: DiffViewerProps) => {
  const diffResult = useMemo(() => Diff.diffChars(original, current), [original, current]);

  return (
    <>
      {diffResult.map((part, index) => {
        if (part.added) {
          return showAdded ? <span key={index} style={addedStyle}>{part.value}</span> : null;
        }
        if (part.removed) {
          return showRemoved ? <span key={index} style={removedStyle}>{part.value}</span> : null;
        }
        return <span key={index}>{part.value}</span>;
      })}
    </>
  );
};

interface CardItemProps {
  card: Card;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onUpdate: (id: string, updates: CardUpdatePayload) => void;
  onUpdateAttribute?: (id: string, displayAttribute: DisplayAttribute, semanticAttribute: SemanticAttribute) => void;
  onMoveCard?: (cardId: string, direction: 'up' | 'down') => void;
  onMoveCardToPosition?: (cardId: string, targetIndex: number) => void;
  onIndentCard?: (cardId: string) => void;
  onOutdentCard?: (cardId: string) => void;
  index: number;
  onToggleCardDisplayMode?: (cardId: string) => void;
}

const STATUS_COLORS = {
  [CardStatus.UNPROCESSED]: '#ecfcfaff',
  [CardStatus.PROCESSING]: '#fff3cd',
  [CardStatus.PROCESSED]: '#d4edda',
};

const STATUS_LABELS = {
  [CardStatus.UNPROCESSED]: '未処理',
  [CardStatus.PROCESSING]: '処理中',
  [CardStatus.PROCESSED]: '処理済み',
};

const DISPLAY_ATTRIBUTE_LABELS = {
  [DisplayAttribute.HEADING]: '①見出し',
  [DisplayAttribute.MAIN_CONTENT]: '②本文',
  [DisplayAttribute.MISCELLANEOUS]: '③雑記',
};

const SEMANTIC_ATTRIBUTE_LABELS = {
  [SemanticAttribute.NONE]: '任意',
  [SemanticAttribute.TEXT]: '(1)本文',
  [SemanticAttribute.FIGURE]: '(2)図',
  [SemanticAttribute.TABLE]: '(3)表',
  [SemanticAttribute.TEST]: '(4)試験',
  [SemanticAttribute.QUESTION]: '(5)質問',
};

// 表示属性別の背景色
const DISPLAY_ATTRIBUTE_COLORS = {
  [DisplayAttribute.HEADING]: '#fff9c4',      // 薄い黄色（見出し）
  [DisplayAttribute.MAIN_CONTENT]: '#f0f9ff', // 薄い青（本文）
  [DisplayAttribute.MISCELLANEOUS]: '#f3e8ff', // 薄い紫（雑記）
};

export function CardItem({ card, isSelected, onSelect, onUpdate, onUpdateAttribute, onMoveCard, onMoveCardToPosition, onIndentCard, onOutdentCard, index, onToggleCardDisplayMode }: CardItemProps) {
  const { state, actions } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(card.content);
  const [isEditingAttribute, setIsEditingAttribute] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const summaryLine = (card.contents || '').split('\n')[0];
  const hasChildren = state.cardManager.getChildCards(card.id).length > 0;
  const isCollapsed = state.collapsedCardIds.has(card.id);
  const cardDisplayMode = state.cardDisplayModes[card.id] || state.settings.cardDisplayMode;
  const handleToggleCollapse = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    actions.toggleCollapse(card.id);
  }, [actions, card.id]);

  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      
      // 現在の高さ設定をクリア
      textarea.style.height = '0px';
      textarea.style.overflowY = 'hidden';
      
      // 正確なscrollHeightを取得するために少し待つ
      requestAnimationFrame(() => {
        const scrollHeight = textarea.scrollHeight;
        const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || state.settings.fontSize * 1.5;
        const minLines = 3;
        const minHeight = Math.max(60, lineHeight * minLines);
        
        // パディングとボーダーを考慮
        const computedStyle = getComputedStyle(textarea);
        const paddingTop = parseInt(computedStyle.paddingTop) || 0;
        const paddingBottom = parseInt(computedStyle.paddingBottom) || 0;
        const borderTop = parseInt(computedStyle.borderTopWidth) || 0;
        const borderBottom = parseInt(computedStyle.borderBottomWidth) || 0;
        const totalPadding = paddingTop + paddingBottom + borderTop + borderBottom;
        
        const newHeight = Math.max(minHeight, scrollHeight + totalPadding);
        textarea.style.height = `${newHeight}px`;
        
        // 内容が多い場合のみスクロールを有効化
        if (scrollHeight > newHeight - totalPadding) {
          textarea.style.overflowY = 'auto';
        } else {
          textarea.style.overflowY = 'hidden';
        }
      });
    }
  }, [state.settings.fontSize]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
      // テキストエリアの高さを内容に合わせて調整
      adjustTextareaHeight();
    }
  }, [isEditing]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      adjustTextareaHeight();
    }
  }, [editContent, isEditing]);

  // フォントサイズ変更時にも高さを調整
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const timer = setTimeout(() => adjustTextareaHeight(), 10);
      return () => clearTimeout(timer);
    }
  }, [state.settings.fontSize, state.settings.fontFamily, isEditing]);

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

  const handleDisplayAttributeChange = useCallback((displayAttribute: DisplayAttribute) => {
    if (onUpdateAttribute && state.cardManager) {
      const allowedSemanticAttributes = state.cardManager.getAllowedSemanticAttributes(displayAttribute);
      const currentSemantic = allowedSemanticAttributes.includes(card.semanticAttribute) 
        ? card.semanticAttribute 
        : allowedSemanticAttributes[0];
      onUpdateAttribute(card.id, displayAttribute, currentSemantic);
    }
  }, [card.id, card.semanticAttribute, onUpdateAttribute, state.cardManager]);

  const handleSemanticAttributeChange = useCallback((semanticAttribute: SemanticAttribute) => {
    if (onUpdateAttribute) {
      onUpdateAttribute(card.id, card.displayAttribute, semanticAttribute);
    }
  }, [card.id, card.displayAttribute, onUpdateAttribute]);

  const handleIndent = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onIndentCard) {
      onIndentCard(card.id);
    }
  }, [card.id, onIndentCard]);

  const handleOutdent = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOutdentCard) {
      onOutdentCard(card.id);
    }
  }, [card.id, onOutdentCard]);

  const handleClick = useCallback(() => {
    onSelect(card.id);
  }, [card.id, onSelect]);

  const handleMoveUp = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onMoveCard) {
      onMoveCard(card.id, 'up');
    }
  }, [card.id, onMoveCard]);

  const handleMoveDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onMoveCard) {
      onMoveCard(card.id, 'down');
    }
  }, [card.id, onMoveCard]);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', card.id);
    e.dataTransfer.setData('card/index', index.toString());
    e.dataTransfer.effectAllowed = 'move';
    
    // ドラッグ中のカードを少し透明にする
    if (e.target instanceof HTMLElement) {
      e.target.style.cursor = 'grabbing';
      setTimeout(() => {
        if (e.target instanceof HTMLElement) {
          e.target.style.opacity = '0.5';
        }
      }, 0);
    }
  }, [card.id, index]);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    // ドラッグ終了時に元の状態に戻す
    if (e.target instanceof HTMLElement) {
      e.target.style.cursor = 'grab';
      e.target.style.opacity = '1';
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const draggedCardId = e.dataTransfer.getData('text/plain');
    const draggedIndex = parseInt(e.dataTransfer.getData('card/index'), 10);
    
    if (draggedCardId !== card.id && onMoveCardToPosition && !isNaN(draggedIndex)) {
      onMoveCardToPosition(draggedCardId, index);
    }
  }, [card.id, index, onMoveCardToPosition]);

  // 属性別の詳細情報を編集可能エリアとして表示する関数
  const renderAttributeSpecificContent = useCallback(() => {
    if (!onUpdate) return null;

    const commonFieldStyle = {
      width: '98%',
      padding: '4px 8px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '12px',
      fontFamily: state.settings.fontFamily,
      marginBottom: '6px',
      resize: 'vertical' as const,
    };

    const labelStyle = {
      fontSize: '12px',
      fontWeight: 'bold' as const,
      color: '#555',
      marginBottom: '2px',
      display: 'block',
    };

    const containerStyle = {
      marginTop: '12px',
      padding: '8px',
      backgroundColor: '#f8f9fa',
      border: '1px solid #e9ecef',
      borderRadius: '6px',
    };

    // 共通フィールド（contents, contents-tag）
    const commonFields = (
      <div style={containerStyle}>
        <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 'bold', color: '#495057' }}>
          📝 詳細情報
        </div>
        
        <label style={labelStyle}>Contents:</label>
        <textarea
          value={card.contents || ''}
          onChange={(e) => onUpdate(card.id, { contents: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          style={{ ...commonFieldStyle, minHeight: '60px' }}
          placeholder="コンテンツを入力してください"
        />

        <label style={labelStyle}>Contents Tag:</label>
        <input
          type="text"
          value={card.contentsTag || ''}
          onChange={(e) => onUpdate(card.id, { contentsTag: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          style={commonFieldStyle}
          placeholder="タグを入力してください"
        />
      </div>
    );

    // 属性別の追加フィールド
    let specificFields = null;

    if (card.displayAttribute === DisplayAttribute.MAIN_CONTENT) {
      switch (card.semanticAttribute) {
        case SemanticAttribute.FIGURE:
          specificFields = (
            <div style={containerStyle}>
              <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 'bold', color: '#495057' }}>
                🖼️ 図情報
              </div>
              
              <label style={labelStyle}>Figure ID:</label>
              <input
                type="text"
                value={card.figureId || ''}
                onChange={(e) => onUpdate(card.id, { figureId: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                style={commonFieldStyle}
                placeholder="図IDを入力してください"
              />

              <label style={labelStyle}>Figure Data:</label>
              <textarea
                value={card.figureData || ''}
                onChange={(e) => onUpdate(card.id, { figureData: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                style={{ ...commonFieldStyle, minHeight: '80px' }}
                placeholder="図データを入力してください"
              />
            </div>
          );
          break;

        case SemanticAttribute.TABLE:
          specificFields = (
            <div style={containerStyle}>
              <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 'bold', color: '#495057' }}>
                📊 表情報
              </div>
              
              <label style={labelStyle}>Table ID:</label>
              <input
                type="text"
                value={card.tableId || ''}
                onChange={(e) => onUpdate(card.id, { tableId: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                style={commonFieldStyle}
                placeholder="表IDを入力してください"
              />

              <label style={labelStyle}>Table Data:</label>
              <textarea
                value={card.tableData || ''}
                onChange={(e) => onUpdate(card.id, { tableData: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                style={{ ...commonFieldStyle, minHeight: '80px' }}
                placeholder="表データを入力してください"
              />
            </div>
          );
          break;

        case SemanticAttribute.TEST:
          specificFields = (
            <div style={containerStyle}>
              <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 'bold', color: '#495057' }}>
                🧪 試験情報
              </div>
              
              <label style={labelStyle}>Test ID:</label>
              <input
                type="text"
                value={card.testId || ''}
                onChange={(e) => onUpdate(card.id, { testId: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                style={commonFieldStyle}
                placeholder="試験IDを入力してください"
              />

              <label style={labelStyle}>Test Prerequisite:</label>
              <textarea
                value={card.testPrereq || ''}
                onChange={(e) => onUpdate(card.id, { testPrereq: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                style={{ ...commonFieldStyle, minHeight: '60px' }}
                placeholder="前提条件を入力してください"
              />

              <label style={labelStyle}>Test Step:</label>
              <textarea
                value={card.testStep || ''}
                onChange={(e) => onUpdate(card.id, { testStep: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                style={{ ...commonFieldStyle, minHeight: '60px' }}
                placeholder="手順を入力してください"
              />

              <label style={labelStyle}>Test Constraints:</label>
              <textarea
                value={card.testCons || ''}
                onChange={(e) => onUpdate(card.id, { testCons: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                style={{ ...commonFieldStyle, minHeight: '60px' }}
                placeholder="制約を入力してください"
              />

              <label style={labelStyle}>Test Specification:</label>
              <textarea
                value={card.testSpec || ''}
                onChange={(e) => onUpdate(card.id, { testSpec: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                style={{ ...commonFieldStyle, minHeight: '60px' }}
                placeholder="仕様を入力してください"
              />
            </div>
          );
          break;

        case SemanticAttribute.QUESTION:
          specificFields = (
            <div style={containerStyle}>
              <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 'bold', color: '#495057' }}>
                ❓ QA情報
              </div>
              
              <label style={labelStyle}>QA ID:</label>
              <input
                type="text"
                value={card.qaId || ''}
                onChange={(e) => onUpdate(card.id, { qaId: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                style={commonFieldStyle}
                placeholder="QA IDを入力してください"
              />

              <label style={labelStyle}>Question:</label>
              <textarea
                value={card.question || ''}
                onChange={(e) => onUpdate(card.id, { question: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                style={{ ...commonFieldStyle, minHeight: '80px' }}
                placeholder="質問を入力してください"
              />

              <label style={labelStyle}>Answer:</label>
              <textarea
                value={card.answer || ''}
                onChange={(e) => onUpdate(card.id, { answer: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                style={{ ...commonFieldStyle, minHeight: '80px' }}
                placeholder="回答を入力してください"
              />
            </div>
          );
          break;
      }
    }

    return (
      <div>
        {commonFields}
        {specificFields}
      </div>
    );
  }, [card, onUpdate, state.settings.fontFamily]);

  // 階層インデント計算
  const hierarchyIndent = (card.hierarchyLevel - 1) * 24; // 24pxずつインデント
  const maxVisibleLevel = 1; // レベル1まで画面内に収める
  const needsHorizontalScroll = card.hierarchyLevel > maxVisibleLevel;

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        border: isSelected ? '2px solid #0066cc' : '1px solid #ddd',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '12px',
        marginLeft: `${Math.min(hierarchyIndent, (maxVisibleLevel - 1) * 24)}px`,
        marginRight: '12px',
        backgroundColor: DISPLAY_ATTRIBUTE_COLORS[card.displayAttribute],
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative',
        boxSizing: 'border-box',
        // 階層レベル2以降は横スクロール対応
        ...(needsHorizontalScroll && {
          transform: `translateX(${hierarchyIndent - (maxVisibleLevel - 1) * 24}px)`,
          minWidth: '300px',
        }),
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
          {hasChildren && (
            <button
              onClick={handleToggleCollapse}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                border: '1px solid #ddd',
                backgroundColor: '#f8f9fa',
                cursor: 'pointer',
                padding: '2px 4px',
                borderRadius: '4px',
                fontSize: '12px',
              }}
              title={isCollapsed ? '展開' : '折りたたみ'}
            >
              <span
                style={{
                  display: 'inline-block',
                  transition: 'transform 0.3s ease',
                  transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)',
                }}
              >
                ▶
              </span>
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div
              draggable
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              style={{
                fontSize: '12px',
                color: '#666',
                fontWeight: 'bold',
                cursor: 'grab',
                padding: '4px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                backgroundColor: '#f8f9fa',
                userSelect: 'none',
              }}
              title="ドラッグして順序を変更"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              #{state.cardManager.getDisplayOrderNumber(card)} [Lv.{card.hierarchyLevel}]
              {/* グループ情報表示（機能追加10） */}
              {(() => {
                try {
                  const groupInfo = state.cardManager.getCardGroupInfo(card.id);
                  if (groupInfo && groupInfo.isGroupRoot && groupInfo.groupSize > 1) {
                    return <span style={{ color: '#666', fontSize: '12px' }}> (G:{groupInfo.groupSize})</span>;
                  }
                } catch (error) {
                  console.warn('Error getting group info for card:', card.id, error);
                }
                return null;
              })()}
            </div>
            
            {/* インデント/アウトデント操作ボタン */}
            {onIndentCard && onOutdentCard && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1px',
              }}>
                <button
                  onClick={handleIndent}
                  disabled={index === 0}
                  style={{
                    width: '16px',
                    height: '12px',
                    padding: '0',
                    backgroundColor: index === 0 ? '#f5f5f5' : '#e3f2fd',
                    border: '1px solid #ccc',
                    borderRadius: '2px',
                    cursor: index === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: index === 0 ? '#ccc' : '#1976d2',
                  }}
                  title="インデント（階層を下げる）"
                >
                  →
                </button>
                <button
                  onClick={handleOutdent}
                  disabled={card.hierarchyLevel <= 1}
                  style={{
                    width: '16px',
                    height: '12px',
                    padding: '0',
                    backgroundColor: card.hierarchyLevel <= 1 ? '#f5f5f5' : '#fff3e0',
                    border: '1px solid #ccc',
                    borderRadius: '2px',
                    cursor: card.hierarchyLevel <= 1 ? 'not-allowed' : 'pointer',
                    fontSize: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: card.hierarchyLevel <= 1 ? '#ccc' : '#f57c00',
                  }}
                  title="アウトデント（階層を上げる）"
                >
                  ←
                </button>
              </div>
            )}
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
          {onMoveCard && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1px',
            }}>
              <button
                onClick={handleMoveUp}
                style={{
                  width: '18px',
                  height: '14px',
                  padding: '0',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #ccc',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  fontSize: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#666',
                }}
                title="上に移動"
              >
                ▲
              </button>
              <button
                onClick={handleMoveDown}
                style={{
                  width: '18px',
                  height: '14px',
                  padding: '0',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #ccc',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  fontSize: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#666',
                }}
                title="下に移動"
              >
                ▼
              </button>
            </div>
          )}
        </div>
        
        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
        }}>
          {onToggleCardDisplayMode && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleCardDisplayMode(card.id); }}
              style={{
                padding: '2px 6px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                backgroundColor: '#f8f9fa',
                cursor: 'pointer',
                fontSize: '11px',
              }}
              title="表示切替"
            >
              {cardDisplayMode === 'single' ? '通常' : '1行'}
            </button>
          )}
          {onUpdateAttribute && (
            <>
              <select
                value={card.displayAttribute}
                onChange={(e) => handleDisplayAttributeChange(e.target.value as DisplayAttribute)}
                onClick={(e) => e.stopPropagation()}
                style={{
                  padding: '4px 8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '11px',
                  minWidth: '60px',
                }}
                title="表示属性"
              >
                {Object.entries(DISPLAY_ATTRIBUTE_LABELS).map(([attr, label]) => (
                  <option key={attr} value={attr}>
                    {label}
                  </option>
                ))}
              </select>

              {state.cardManager && (
                <select
                  value={card.semanticAttribute}
                  onChange={(e) => handleSemanticAttributeChange(e.target.value as SemanticAttribute)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    padding: '4px 8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '11px',
                    minWidth: '60px',
                  }}
                  title="意味属性"
                >
                  {state.cardManager.getAllowedSemanticAttributes(card.displayAttribute).map((attr) => (
                    <option key={attr} value={attr}>
                      {SEMANTIC_ATTRIBUTE_LABELS[attr]}
                    </option>
                  ))}
                </select>
              )}
            </>
          )}
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
          </select>        </div>
      </div>

      {isEditing ? (
        <div>
          <textarea
            ref={textareaRef}
            value={editContent}
            onChange={(e) => {
              setEditContent(e.target.value);
              // 入力時にリアルタイムで高さ調整
              requestAnimationFrame(() => adjustTextareaHeight());
            }}
            onKeyDown={handleKeyDown}
            onInput={() => {
              // onInputイベントでも高さ調整
              requestAnimationFrame(() => adjustTextareaHeight());
            }}
            style={{
              width: '100%',
              minHeight: '60px',
              maxHeight: '400px',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              resize: 'vertical',
              fontFamily: state.settings.fontFamily,
              fontSize: `${state.settings.fontSize}px`,
              lineHeight: '1.5',
              overflow: 'hidden',
              boxSizing: 'border-box',
              wordWrap: 'break-word',
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
          <div
            style={{
              whiteSpace: cardDisplayMode === 'single' ? 'nowrap' : 'pre-wrap',
              lineHeight: '1.5',
              fontFamily: state.settings.fontFamily,
              fontSize: `${state.settings.fontSize}px`,
              wordWrap: 'break-word',
              overflow: 'hidden',
              textOverflow: cardDisplayMode === 'single' ? 'ellipsis' : undefined,
            }}
          >
            {cardDisplayMode === 'single'
              ? summaryLine
              : state.settings.renderMode === 'markdown'
                ? <div dangerouslySetInnerHTML={{ __html: renderMarkdown(card.content) }} />
                : card.hasChanges
                  ? <DiffViewer original={card.originalContent} current={card.content} />
                  : card.content}
          </div>

          {cardDisplayMode !== 'single' && card.hasChanges && (
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
              <div
                style={{
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.4',
                  fontFamily: state.settings.fontFamily,
                  fontSize: `${Math.max(state.settings.fontSize - 1, 11)}px`,
                  color: '#6c757d',
                  wordWrap: 'break-word',
                  overflow: 'hidden',
                }}
              >
                {state.settings.renderMode === 'markdown' ? (
                  <div dangerouslySetInnerHTML={{ __html: renderMarkdown(card.originalContent) }} />
                ) : (
                  <DiffViewer
                    original={card.originalContent}
                    current={card.content}
                    showAdded={false}
                    showRemoved={true}
                  />
                )}
              </div>
            </div>
          )}

          {cardDisplayMode !== 'single' && renderAttributeSpecificContent()}
        </div>
      )}

      {cardDisplayMode !== 'single' && (
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
      )}
    </div>
  );
}