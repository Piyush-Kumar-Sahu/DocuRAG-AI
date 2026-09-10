import React, { useState } from 'react';
import { FileText, Trash2, MessageSquarePlus, Clock } from 'lucide-react';
import { DocumentItem } from '../types/document';
import { apiService } from '../services/api';

interface DocumentListProps {
  documents: DocumentItem[];
  selectedDocId: string | null;
  onSelectDocument: (doc: DocumentItem) => void;
  onDeleteDocument: (docId: string) => void;
  onCreateSession: (docId: string) => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  selectedDocId,
  onSelectDocument,
  onDeleteDocument,
  onCreateSession,
}) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, docId: string, title: string) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${title}" and all its vector embeddings?`)) {
      return;
    }
    setDeletingId(docId);
    try {
      await apiService.deleteDocument(docId);
      onDeleteDocument(docId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete document.';
      alert(message);
    } finally {
      setDeletingId(null);
    }
  };

  if (documents.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--color-text-muted)' }}>
        <FileText size={32} style={{ margin: '0 auto 10px', color: 'var(--color-text-light)' }} />
        <p style={{ fontSize: '0.875rem' }}>No documents uploaded yet.</p>
      </div>
    );
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      {documents.map((doc) => {
        const isSelected = doc.id === selectedDocId;
        return (
          <div
            key={doc.id}
            className={`item-card ${isSelected ? 'active' : ''}`}
            onClick={() => onSelectDocument(doc)}
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
                <FileText size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: isSelected ? 'var(--color-primary)' : 'var(--color-navy)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={doc.title}
                >
                  {doc.title}
                </h4>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.75rem',
                    color: 'var(--color-text-muted)',
                    marginTop: '2px',
                  }}
                >
                  <span>{doc.chunk_count} chunks</span>
                  <span>&bull;</span>
                  <span>{formatFileSize(doc.file_size)}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '6px', fontSize: '0.75rem' }}
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateSession(doc.id);
                }}
                title="Start new chat with this document"
              >
                <MessageSquarePlus size={14} />
              </button>
              <button
                type="button"
                className="btn-danger-outline"
                style={{ padding: '6px' }}
                onClick={(e) => handleDelete(e, doc.id, doc.title)}
                disabled={deletingId === doc.id}
                title="Delete document and vector embeddings"
              >
                {deletingId === doc.id ? (
                  <div className="spinner spinner-blue" style={{ width: '12px', height: '12px' }} />
                ) : (
                  <Trash2 size={14} />
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
