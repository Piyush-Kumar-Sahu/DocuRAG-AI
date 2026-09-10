import React, { useState, useEffect, useRef } from 'react';
import { FileText, MessageSquare, Plus, Upload, Layers } from 'lucide-react';
import { DocumentItem } from '../types/document';
import { ChatSessionItem } from '../types/chat';
import { apiService } from '../services/api';
import { DocumentList } from '../components/DocumentList';
import { ChatHistory } from '../components/ChatHistory';
import { PdfUploader } from '../components/PdfUploader';
import { ChatWindow } from '../components/ChatWindow';
import { usePendingUpload } from '../context/PendingUploadContext';
import { useAuth } from '../context/AuthContext';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const {
    guestDocs,
    guestDoc,
    guestSession,
    guestMessages,
    clearGuestChat,
    pendingFiles,
    pendingFile,
    pendingTitle,
    clearPendingUpload,
  } = usePendingUpload();

  const [activeTab, setActiveTab] = useState<'documents' | 'history'>('documents');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<DocumentItem[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSessionItem | null>(null);
  const [showUploader, setShowUploader] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessingPending, setIsProcessingPending] = useState<boolean>(false);
  const hasProcessedPending = useRef(false);
  const loadData = async () => {
    setIsLoading(true);
    try {
      const activeGuestDocs = guestDocs.length > 0 ? guestDocs : guestDoc ? [guestDoc] : [];
      if (activeGuestDocs.length > 0 && !hasProcessedPending.current) {
        hasProcessedPending.current = true;
        setIsProcessingPending(true);
        try {
          const docIds = activeGuestDocs.map((d) => d.id);
          const title = guestSession?.title || (activeGuestDocs.length === 1 ? activeGuestDocs[0].title : `${activeGuestDocs.length} Documents Chat`);
          const claimedSession = await apiService.claimGuestSession(
            docIds,
            title,
            guestMessages
          );
          clearGuestChat();
          const [docsRes, sessionsRes] = await Promise.all([
            apiService.listDocuments(),
            apiService.listChatSessions(),
          ]);
          setDocuments(docsRes.documents);
          setSessions(sessionsRes);
          setSelectedSession(claimedSession);
          const relatedDocs = docsRes.documents.filter((d) =>
            claimedSession.document_ids?.includes(d.id) || d.id === claimedSession.document_id
          );
          setSelectedDocs(relatedDocs);
          setIsLoading(false);
          setIsProcessingPending(false);
          return;
        } catch (claimErr) {
          console.error('Failed to claim guest session on dashboard:', claimErr);
          clearGuestChat();
        } finally {
          setIsProcessingPending(false);
        }
      }

      const [docsRes, sessionsRes] = await Promise.all([
        apiService.listDocuments(),
        apiService.listChatSessions(),
      ]);
      setDocuments(docsRes.documents);
      setSessions(sessionsRes);
      const activePendingFiles = pendingFiles.length > 0 ? pendingFiles : pendingFile ? [pendingFile] : [];
      if (activePendingFiles.length > 0 && !hasProcessedPending.current) {
        hasProcessedPending.current = true;
        setIsProcessingPending(true);
        try {
          const newDocs = await apiService.uploadDocuments(activePendingFiles, pendingTitle || undefined);
          setDocuments((prev) => [...newDocs, ...prev]);
          setSelectedDocs(newDocs);
          clearPendingUpload();

          const docIds = newDocs.map((d: DocumentItem) => d.id);
          const sessionTitle = newDocs.length === 1 ? `Chat on ${newDocs[0].title}` : `Chat on ${newDocs.length} Documents`;
          const newSession = await apiService.createChatSession(docIds, sessionTitle);
          setSessions((prev) => [newSession, ...prev]);
          setSelectedSession(newSession);
        } catch (uploadErr) {
          console.error('Failed to process preserved pending PDFs:', uploadErr);
          clearPendingUpload();
        } finally {
          setIsProcessingPending(false);
        }
      } else if (sessionsRes.length > 0) {
        const latestSession = sessionsRes[0];
        setSelectedSession(latestSession);
        const relatedDocs = docsRes.documents.filter((d) =>
          latestSession.document_ids?.includes(d.id) || d.id === latestSession.document_id
        );
        setSelectedDocs(relatedDocs);
      } else if (docsRes.documents.length > 0) {
        setSelectedDocs([docsRes.documents[0]]);
      } else {
        setShowUploader(true);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUploadSuccess = async (newDocs: DocumentItem[]) => {
    if (newDocs.length === 0) return;
    setDocuments((prev) => [...newDocs, ...prev]);
    setSelectedDocs(newDocs);
    setShowUploader(false);

    try {
      const docIds = newDocs.map((d) => d.id);
      const sessionTitle = newDocs.length === 1 ? `Chat on ${newDocs[0].title}` : `Chat on ${newDocs.length} Documents`;
      const newSession = await apiService.createChatSession(docIds, sessionTitle);
      setSessions((prev) => [newSession, ...prev]);
      setSelectedSession(newSession);
    } catch (e) {
      console.error('Failed to create initial session:', e);
    }
  };

  const handleSelectDocument = async (doc: DocumentItem) => {
    setSelectedDocs([doc]);
    setShowUploader(false);

    const existing = sessions.find((s) =>
      (s.document_ids && s.document_ids.includes(doc.id)) || s.document_id === doc.id
    );
    if (existing) {
      setSelectedSession(existing);
    } else {
      try {
        const newSession = await apiService.createChatSession(doc.id, `Chat on ${doc.title}`);
        setSessions((prev) => [newSession, ...prev]);
        setSelectedSession(newSession);
      } catch (e) {
        console.error('Failed to auto-create session:', e);
      }
    }
  };

  const handleCreateNewSession = async (docId: string) => {
    const doc = documents.find((d) => d.id === docId);
    if (!doc) return;
    try {
      const newSession = await apiService.createChatSession(
        docId,
        `New Chat - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      );
      setSessions((prev) => [newSession, ...prev]);
      setSelectedDocs([doc]);
      setSelectedSession(newSession);
      setShowUploader(false);
    } catch (e) {
      console.error('Failed to create new session:', e);
    }
  };

  const handleSelectSession = (session: ChatSessionItem) => {
    setSelectedSession(session);
    const relatedDocs = documents.filter((d) =>
      (session.document_ids && session.document_ids.includes(d.id)) || d.id === session.document_id
    );
    setSelectedDocs(relatedDocs);
    setShowUploader(false);
  };

  const handleDeleteDocument = (docId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    setSessions((prev) =>
      prev.filter((s) => {
        if (s.document_ids && s.document_ids.length > 0) {
          return !s.document_ids.includes(docId);
        }
        return s.document_id !== docId;
      })
    );
    if (selectedDocs.some((d) => d.id === docId)) {
      setSelectedDocs((prev) => prev.filter((d) => d.id !== docId));
      setSelectedSession(null);
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (selectedSession?.id === sessionId) {
      setSelectedSession(null);
    }
  };

  const primaryDoc = selectedDocs.length > 0 ? selectedDocs[0] : null;

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-navy)' }}>Document Hub</h3>
          <button
            type="button"
            className="btn-secondary"
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
            onClick={() => {
              setShowUploader(true);
              setSelectedSession(null);
            }}
          >
            <Upload size={13} />
            <span>Upload PDFs</span>
          </button>
        </div>

        <div className="sidebar-tabs">
          <button
            type="button"
            className={`sidebar-tab ${activeTab === 'documents' ? 'active' : ''}`}
            onClick={() => setActiveTab('documents')}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={14} />
              <span>Documents ({documents.length})</span>
            </span>
          </button>
          <button
            type="button"
            className={`sidebar-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <MessageSquare size={14} />
              <span>Chat History ({sessions.length})</span>
            </span>
          </button>
        </div>

        <div className="sidebar-content">
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
              <div className="spinner spinner-blue" style={{ width: '24px', height: '24px' }} />
            </div>
          ) : activeTab === 'documents' ? (
            <DocumentList
              documents={documents}
              selectedDocId={primaryDoc?.id || null}
              onSelectDocument={handleSelectDocument}
              onDeleteDocument={handleDeleteDocument}
              onCreateSession={handleCreateNewSession}
            />
          ) : (
            <ChatHistory
              sessions={sessions}
              documents={documents}
              selectedSessionId={selectedSession?.id || null}
              onSelectSession={handleSelectSession}
              onDeleteSession={handleDeleteSession}
            />
          )}
        </div>
      </aside>
      <main className="main-content">
        {isProcessingPending ? (
          <div style={{ margin: 'auto', textAlign: 'center', maxWidth: '440px', padding: '24px' }}>
            <div className="spinner spinner-blue" style={{ width: '36px', height: '36px', margin: '0 auto 16px', borderWidth: '3px' }} />
            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Processing your uploaded PDF(s)...</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              Restoring your document context and creating embeddings for chat.
            </p>
          </div>
        ) : showUploader ? (
          <div style={{ maxWidth: '640px', width: '100%', margin: '40px auto', padding: '0 20px' }}>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.4rem', marginBottom: '6px' }}>Upload Documents</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                Upload 1 to 3 text-based PDFs to generate embeddings and question across all documents.
              </p>
            </div>
            <PdfUploader onUploadSuccess={handleUploadSuccess} />
          </div>
        ) : selectedSession ? (
          <ChatWindow
            session={selectedSession}
            documents={selectedDocs}
            document={primaryDoc}
            onRefreshSessions={loadData}
          />
        ) : selectedDocs.length > 0 ? (
          <div style={{ margin: 'auto', textAlign: 'center', maxWidth: '440px', padding: '24px' }}>
            <div className="upload-icon-box" style={{ width: '56px', height: '56px', margin: '0 auto 16px' }}>
              {selectedDocs.length > 1 ? <Layers size={28} /> : <FileText size={28} />}
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>
              {selectedDocs.length === 1 ? selectedDocs[0].title : `${selectedDocs.length} Documents Selected`}
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '20px' }}>
              {selectedDocs.reduce((acc, d) => acc + (d.chunk_count || 0), 0)} indexed chunks ready for question answering.
            </p>
            <button
              type="button"
              className="btn-primary"
              style={{ width: 'auto', margin: '0 auto' }}
              onClick={() => {
                if (selectedDocs.length === 1) {
                  handleCreateNewSession(selectedDocs[0].id);
                } else {
                  handleUploadSuccess(selectedDocs);
                }
              }}
            >
              <Plus size={16} />
              <span>Start New Chat</span>
            </button>
          </div>
        ) : (
          <div style={{ maxWidth: '640px', width: '100%', margin: '40px auto', padding: '0 20px' }}>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.4rem', marginBottom: '6px' }}>
                Welcome{user?.name ? `, ${user.name}` : ' to DocuRAG'}
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                Upload 1 to 3 PDFs to start asking grounded questions with page citations.
              </p>
            </div>
            <PdfUploader onUploadSuccess={handleUploadSuccess} />
          </div>
        )}
      </main>
    </div>
  );
};
