import React from 'react';

export enum LogLevel {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  details?: string;
}

interface StatusLogProps {
  logs: LogEntry[];
  height?: number;
}

const LOG_COLORS = {
  [LogLevel.INFO]: '#6c757d',
  [LogLevel.SUCCESS]: '#28a745',
  [LogLevel.WARNING]: '#ffc107',
  [LogLevel.ERROR]: '#dc3545',
};

const LOG_ICONS = {
  [LogLevel.INFO]: 'ℹ️',
  [LogLevel.SUCCESS]: '✅',
  [LogLevel.WARNING]: '⚠️',
  [LogLevel.ERROR]: '❌',
};

export function StatusLog({ logs, height = 120 }: StatusLogProps) {
  return (
    <div style={{
      height: `${height}px`,
      borderTop: '1px solid #ddd',
      backgroundColor: '#f8f9fa',
      padding: '8px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        fontSize: '12px',
        fontWeight: 'bold',
        marginBottom: '4px',
        color: '#495057',
      }}>
        ステータスログ
      </div>
      
      <div style={{
        flex: 1,
        overflow: 'auto',
        backgroundColor: '#fff',
        border: '1px solid #ddd',
        borderRadius: '4px',
        padding: '4px',
        fontSize: '11px',
        fontFamily: 'Consolas, "Courier New", monospace',
      }}>
        {logs.length === 0 ? (
          <div style={{ color: '#6c757d', fontStyle: 'italic' }}>
            ログはありません
          </div>
        ) : (
          logs.slice().reverse().map((log, index) => (
            <div
              key={log.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                marginBottom: '2px',
                padding: '2px 4px',
                backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'transparent',
                borderRadius: '2px',
              }}
            >
              <span style={{
                marginRight: '6px',
                fontSize: '10px',
              }}>
                {LOG_ICONS[log.level]}
              </span>
              
              <span style={{
                marginRight: '8px',
                color: '#6c757d',
                fontSize: '10px',
                minWidth: '60px',
              }}>
                {log.timestamp.toLocaleTimeString()}
              </span>
              
              <span
                style={{
                  color: LOG_COLORS[log.level],
                  fontWeight: log.level === LogLevel.ERROR ? 'bold' : 'normal',
                  flex: 1,
                }}
              >
                {log.message}
                {log.details && (
                  <div style={{
                    marginTop: '2px',
                    fontSize: '10px',
                    color: '#6c757d',
                    paddingLeft: '8px',
                    borderLeft: '2px solid #e9ecef',
                  }}>
                    {log.details}
                  </div>
                )}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}