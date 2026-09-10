import React, { useEffect, useRef, useState } from 'react';
import { Download, FileText, Bot, AlertCircle, ArrowLeft, Layers } from 'lucide-react';
import { ChatSessionItem, ChatMessageItem } from '../types/chat';
import { DocumentItem } from '../types/document';
import { ChatMessage } from './ChatMessage';
import { QuestionInput } from './QuestionInput';
import { AuthModal } from './AuthModal';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { usePendingUpload } from '../context/PendingUploadContext';

interface ChatWindowProps {
  session: ChatSessionItem;
  document?: DocumentItem | null;
  documents?: DocumentItem[];
  initialMessages?: ChatMessageItem[];
  onRefreshSessions?: () => void;
  onClearChat?: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  session,
  document,
  documents,
  initialMessages,
  onRefreshSessions,
  onClearChat,
}) => {
  const { isAuthenticated } = useAuth();
  const { setGuestMessages, clearGuestChat } = usePendingUpload();

  const [messages, setMessages] = useState<ChatMessageItem[]>(initialMessages || []);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(!session.id.startsWith('guest_'));
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Compute attached documents array
  const activeDocs: DocumentItem[] = documents && documents.length > 0
    ? documents
    : document
    ? [document]
    : [];

  const activeDocIds: string[] = session.document_ids && session.document_ids.length > 0
    ? session.document_ids
    : activeDocs.map((d) => d.id);

  const totalChunks = activeDocs.reduce((acc, d) => acc + (d.chunk_count || 0), 0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    if (session.id.startsWith('guest_')) {
      setIsLoadingMessages(false);
      return;
    }
    setIsLoadingMessages(true);
    setError(null);
    try {
      const msgs = await apiService.getSessionMessages(session.id);
      setMessages(msgs);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load chat messages.';
      setError(message);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      setMessages(initialMessages);
    } else {
      fetchMessages();
    }
  }, [session.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  const handleSendQuery = async (query: string) => {
    setError(null);
    setIsGenerating(true);

    const userMsgId = `user-${Date.now()}`;
    const optimisticUserMsg: ChatMessageItem = {
      id: userMsgId,
      session_id: session.id,
      role: 'user',
      content: query,
      created_at: new Date().toISOString(),
    };

    const newMessagesList = [...messages, optimisticUserMsg];
    setMessages(newMessagesList);
    if (session.id.startsWith('guest_')) {
      setGuestMessages(newMessagesList);
    }

    try {
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await apiService.sendQuery(
        session.id,
        query,
        activeDocIds.length > 0 ? activeDocIds : undefined,
        historyPayload
      );
      const assistantMsg: ChatMessageItem = {
        id: `assistant-${Date.now()}`,
        session_id: session.id,
        role: 'assistant',
        content: response.answer,
        sources: response.sources,
        created_at: new Date().toISOString(),
      };

      const finalMessages = [...newMessagesList, assistantMsg];
      setMessages(finalMessages);
      if (session.id.startsWith('guest_')) {
        setGuestMessages(finalMessages);
      }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        setError(axiosErr.response?.data?.detail || 'Failed to generate answer. Please check backend connection.');
      } else {
        const message = err instanceof Error ? err.message : 'Failed to generate answer. Please try again.';
        setError(message);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async () => {
    if (isExporting || messages.length === 0) return;

    // If not authenticated, login is required to export
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }

    setIsExporting(true);
    try {
      if (session.id.startsWith('guest_')) {
        // Claim the guest session for this authenticated user first
        const docIdsToClaim = activeDocIds.length > 0 ? activeDocIds : [document?.id || ''];
        const claimed = await apiService.claimGuestSession(
          docIdsToClaim,
          session.title,
          messages
        );
        clearGuestChat();
        await apiService.exportChat(claimed.id, session.title);
        if (onRefreshSessions) {
          onRefreshSessions();
        }
      } else {
        await apiService.exportChat(session.id, session.title);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Export failed.';
      alert(message);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePostAuthExport = async () => {
    setIsExporting(true);
    try {
      const docIdsToClaim = activeDocIds.length > 0 ? activeDocIds : [document?.id || ''];
      const claimed = await apiService.claimGuestSession(
        docIdsToClaim,
        session.title,
        messages
      );
      clearGuestChat();
      await apiService.exportChat(claimed.id, session.title);
      if (onRefreshSessions) {
        onRefreshSessions();
      }
    } catch (err: unknown) {
      console.error('Post-auth export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const renderHeaderTitle = () => {
    if (activeDocs.length > 1) {
      return (
        <div>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0 }}>
            {session.title || `${activeDocs.length} Documents Chat`}
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
            Querying {activeDocs.length} PDFs ({activeDocs.map((d) => d.filename || d.title).join(', ')}) &bull; {totalChunks} indexed chunks
          </p>
        </div>
      );
    }

    const singleDoc = activeDocs[0] || document;
    return (
      <div>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0 }}>
          {singleDoc?.title || session.title || 'Document Q&A'}
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
          {session.id.startsWith('guest_') ? 'Temporary Session' : session.title}
          {singleDoc ? ` \u2022 ${singleDoc.chunk_count} indexed chunks` : ''}
        </p>
      </div>
    );
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {onClearChat && (
            <button
              type="button"
              onClick={onClearChat}
              className="btn-secondary"
              style={{ padding: '6px 10px', fontSize: '0.8rem' }}
              title="Upload another PDF"
            >
              <ArrowLeft size={14} />
              <span>New Upload</span>
            </button>
          )}

          <div className="upload-icon-box" style={{ width: '36px', height: '36px', margin: 0 }}>
            {activeDocs.length > 1 ? <Layers size={18} /> : <FileText size={18} />}
          </div>
          {renderHeaderTitle()}
        </div>

        <button
          type="button"
          onClick={handleExport}
          className="btn-secondary"
          disabled={isExporting || messages.length === 0}
          style={{ fontSize: '0.825rem', padding: '7px 14px' }}
        >
          {isExporting ? (
            <div className="spinner spinner-blue" style={{ width: '14px', height: '14px' }} />
          ) : (
            <Download size={14} />
          )}
          <span>Export Chat as PDF</span>
        </button>
      </div>

      {error && (
        <div className="alert alert-error" style={{ margin: '16px 24px 0' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="chat-messages-area">
        {isLoadingMessages ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div className="spinner spinner-blue" style={{ width: '28px', height: '28px', borderWidth: '3px' }} />
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', margin: 'auto', maxWidth: '440px' }}>
            <div className="upload-icon-box" style={{ width: '54px', height: '54px', margin: '0 auto 16px' }}>
              <Bot size={28} />
            </div>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '6px' }}>
              {activeDocs.length > 1
                ? `Ask anything across all ${activeDocs.length} documents`
                : 'Ask anything about your document'}
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              {activeDocs.length > 1
                ? 'Ask comparative or document-specific questions to retrieve answers synthesized with exact document and page citations.'
                : 'Ask specific questions to retrieve grounded answers with exact page citations.'}
            </p>
          </div>
        ) : (
          messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
        )}

        {isGenerating && (
          <div className="chat-bubble-container assistant">
            <div className="chat-sender-label">
              <Bot size={13} style={{ color: 'var(--color-primary)' }} />
              <span>Assistant</span>
            </div>
            <div className="chat-bubble assistant" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="spinner spinner-blue" style={{ width: '16px', height: '16px' }} />
              <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                Retrieving relevant excerpts and generating grounded answer...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <QuestionInput
        onSend={handleSendQuery}
        disabled={isLoadingMessages}
        isGenerating={isGenerating}
      />

      {/* Auth Modal for Export Requirement */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        fileName={session.title}
        onAuthSuccess={handlePostAuthExport}
      />
    </div>
  );
};
