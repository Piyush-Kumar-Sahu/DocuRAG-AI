import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, ArrowRight, MessageSquare, Plus, Layers } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePendingUpload } from '../context/PendingUploadContext';
import { PdfUploader } from '../components/PdfUploader';
import { ChatWindow } from '../components/ChatWindow';
import { DocumentItem } from '../types/document';
import { ChatSessionItem } from '../types/chat';
import { apiService } from '../services/api';

export const Home: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const { guestDocs, guestSession, guestMessages, setGuestChat, clearGuestChat } = usePendingUpload();
  const [recentDocs, setRecentDocs] = useState<DocumentItem[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      setIsLoadingDocs(true);
      apiService
        .listDocuments()
        .then((res) => setRecentDocs(res.documents.slice(0, 3)))
        .catch(() => {})
        .finally(() => setIsLoadingDocs(false));
    }
  }, [isAuthenticated]);

  const handleUploadSuccess = async (docs: DocumentItem[]) => {
    if (docs.length === 0) return;
    const docIds = docs.map((d) => d.id);
    const sessionTitle = docs.length === 1 ? `Chat on ${docs[0].title}` : `Chat on ${docs.length} Documents`;
    if (isAuthenticated) {
      try {
        await apiService.createChatSession(docIds, sessionTitle);
        navigate('/app');
      } catch {
        navigate('/app');
      }
    } else {
      const session: ChatSessionItem = {
        id: `guest_sess_${docs[0].id}`,
        user_id: 'guest',
        document_id: docs[0].id,
        document_ids: docIds,
        title: sessionTitle,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setGuestChat(docs, session, []);
    }
  };
  const handleStartNewChat = () => {
    clearGuestChat();
  };
  if (!isAuthenticated && guestDocs.length > 0 && guestSession) {
    const totalChunks = guestDocs.reduce((acc, d) => acc + (d.chunk_count || 0), 0);
    return (
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 20px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-navy)', margin: 0 }}>
              {guestSession.title}
            </h1>
            <p style={{ fontSize: '0.825rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
              Anonymous session &bull; {guestDocs.length} {guestDocs.length === 1 ? 'document' : 'documents'} ({totalChunks} indexed chunks) &bull; Ask cross-document questions freely
            </p>
          </div>
          <button
            type="button"
            onClick={handleStartNewChat}
            className="btn-secondary"
            style={{ fontSize: '0.825rem', padding: '6px 12px' }}
          >
            <Plus size={14} />
            <span>Upload New PDFs</span>
          </button>
        </div>
        <ChatWindow
          session={guestSession}
          documents={guestDocs}
          initialMessages={guestMessages}
          onClearChat={handleStartNewChat}
        />
      </div>
    );
  }
  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', padding: '40px 20px 80px' }}>
      <div style={{ textAlign: 'center', marginBottom: '36px' }}>
        <h1
          style={{
            fontSize: '2.4rem',
            fontWeight: 700,
            color: 'var(--color-navy)',
            marginBottom: '10px',
            letterSpacing: '-0.02em',
          }}
        >
          Chat with 1 to 3 PDFs
        </h1>
        <p
          style={{
            fontSize: '1.05rem',
            color: 'var(--color-text-muted)',
            maxWidth: '600px',
            margin: '0 auto 20px',
            lineHeight: 1.5,
          }}
        >
          Upload up to 3 PDF documents simultaneously. Search, compare, and get grounded answers synthesized across all your documents with exact page citations.
        </p>

        {isAuthenticated && user && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--color-primary-light)',
              border: '1px solid var(--color-primary-border)',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.85rem',
              color: 'var(--color-primary)',
              fontWeight: 500,
            }}
          >
            <span>Welcome back, {user.email}</span>
            <Link to="/app" style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
              <span>Go to Workspace</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </div>
      <div
        style={{
          backgroundColor: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: '32px 28px',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '48px',
        }}
      >
        <PdfUploader onUploadSuccess={handleUploadSuccess} />
      </div>
      {isAuthenticated && recentDocs.length > 0 && (
        <div style={{ marginBottom: '48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--color-navy)' }}>Your Recent Documents</h3>
            <Link to="/app" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              View All &rarr;
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
            {recentDocs.map((doc) => (
              <div
                key={doc.id}
                className="item-card"
                onClick={() => navigate('/app')}
                style={{ padding: '14px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div
                    style={{
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--color-bg-subtle)',
                      color: 'var(--color-primary)',
                    }}
                  >
                    <FileText size={18} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h4
                      style={{
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        color: 'var(--color-navy)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {doc.title}
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {doc.chunk_count} chunks indexed
                    </span>
                  </div>
                </div>
                <ArrowRight size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </div>
      )}
      <div>
        <h3
          style={{
            fontSize: '1.15rem',
            textAlign: 'center',
            marginBottom: '20px',
            color: 'var(--color-navy)',
          }}
        >
          How It Works
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div
            style={{
              backgroundColor: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
            }}
          >
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'var(--color-primary)',
                display: 'block',
                marginBottom: '6px',
              }}
            >
              STEP 1
            </span>
            <h4 style={{ fontSize: '0.95rem', marginBottom: '6px', color: 'var(--color-navy)' }}>
              Upload 1–3 PDFs
            </h4>
            <p style={{ fontSize: '0.825rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
              Drag &amp; drop 1 to 3 PDF documents together. The engine indexes and extracts text chunks from all files.
            </p>
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
            }}
          >
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'var(--color-primary)',
                display: 'block',
                marginBottom: '6px',
              }}
            >
              STEP 2
            </span>
            <h4 style={{ fontSize: '0.95rem', marginBottom: '6px', color: 'var(--color-navy)' }}>
              Ask Questions
            </h4>
            <p style={{ fontSize: '0.825rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
              Ask comparative or specific questions. Semantic vector search retrieves relevant passages across all uploaded PDFs.
            </p>
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
            }}
          >
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'var(--color-primary)',
                display: 'block',
                marginBottom: '6px',
              }}
            >
              STEP 3
            </span>
            <h4 style={{ fontSize: '0.95rem', marginBottom: '6px', color: 'var(--color-navy)' }}>
              Cross-Doc Citations
            </h4>
            <p style={{ fontSize: '0.825rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
              Receive unified, grounded answers with exact document filename and page number citations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
