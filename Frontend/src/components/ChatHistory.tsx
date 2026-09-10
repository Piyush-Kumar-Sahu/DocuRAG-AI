import React, { useState } from 'react';
import { MessageSquare, Trash2, Layers, FileText } from 'lucide-react';
import { ChatSessionItem } from '../types/chat';
import { DocumentItem } from '../types/document';
import { apiService } from '../services/api';

interface ChatHistoryProps {
  sessions: ChatSessionItem[];
  documents: DocumentItem[];
  selectedSessionId: string | null;
  onSelectSession: (session: ChatSessionItem) => void;
  onDeleteSession: (sessionId: string) => void;
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({
  sessions,
  documents,
  selectedSessionId,
  onSelectSession,
  onDeleteSession,
}) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const getDocSummary = (session: ChatSessionItem) => {
    const docIds = session.document_ids && session.document_ids.length > 0
      ? session.document_ids
      : session.document_id
      ? [session.document_id]
      : [];

    if (docIds.length === 0) return 'Document Q&A';

    const docNames = docIds.map((id) => {
      const found = documents.find((d) => d.id === id);
      return found ? found.title : 'Document';
    });

    return docNames.join(', ');
  };

  const handleDelete = async (e: React.MouseEvent, sessionId: string, title: string) => {
    e.stopPropagation();
    if (!window.confirm(`Delete chat session "${title}"?`)) {
      return;
    }
    setDeletingId(sessionId);
    try {
      await apiService.deleteChatSession(sessionId);
      onDeleteSession(sessionId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete chat session.';
      alert(message);
    } finally {
      setDeletingId(null);
    }
  };

  if (sessions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--color-text-muted)' }}>
        <MessageSquare size={32} style={{ margin: '0 auto 10px', color: 'var(--color-text-light)' }} />
        <p style={{ fontSize: '0.875rem' }}>No chat sessions found.</p>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-light)', marginTop: '4px' }}>
          Select or upload documents to start a chat.
        </p>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      {sessions.map((session) => {
        const isSelected = session.id === selectedSessionId;
        const docSummary = getDocSummary(session);
        const isMultiDoc = session.document_ids && session.document_ids.length > 1;

        return (
          <div
            key={session.id}
            className={`item-card ${isSelected ? 'active' : ''}`}
            onClick={() => onSelectSession(session)}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1, minWidth: 0 }}>
              <div
                style={{
                  padding: '6px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: isSelected ? 'var(--color-primary)' : 'var(--color-bg-subtle)',
                  color: isSelected ? '#ffffff' : 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {isMultiDoc ? <Layers size={16} /> : <MessageSquare size={16} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: isSelected ? 'var(--color-primary)' : 'var(--color-navy)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={session.title}
                >
                  {session.title}
                </h4>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-text-muted)',
                    marginTop: '2px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={docSummary}
                >
                  📄 {docSummary}
                </div>
                <div
                  style={{
                    fontSize: '0.7rem',
                    color: 'var(--color-text-light)',
                    marginTop: '2px',
                  }}
                >
                  {formatDate(session.updated_at || session.created_at)}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn-danger-outline"
              style={{ padding: '6px', marginLeft: '6px' }}
              onClick={(e) => handleDelete(e, session.id, session.title)}
              disabled={deletingId === session.id}
              title="Delete chat session"
            >
              {deletingId === session.id ? (
                <div className="spinner spinner-blue" style={{ width: '12px', height: '12px' }} />
              ) : (
                <Trash2 size={13} />
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
};
