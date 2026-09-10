import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DocumentItem } from '../types/document';
import { ChatSessionItem, ChatMessageItem } from '../types/chat';

interface PendingUploadContextType {
  // Guest chat state
  guestDocs: DocumentItem[];
  guestDoc: DocumentItem | null;
  guestSession: ChatSessionItem | null;
  guestMessages: ChatMessageItem[];
  setGuestChat: (docs: DocumentItem | DocumentItem[], session: ChatSessionItem, messages?: ChatMessageItem[]) => void;
  setGuestMessages: React.Dispatch<React.SetStateAction<ChatMessageItem[]>>;
  clearGuestChat: () => void;

  // Pending file fallback
  pendingFiles: File[];
  pendingFile: File | null;
  pendingTitle: string;
  setPendingUpload: (files: File | File[], title?: string) => void;
  clearPendingUpload: () => void;
}

const PendingUploadContext = createContext<PendingUploadContextType | undefined>(undefined);

const GUEST_DOCS_KEY = 'docurag_guest_docs';
const GUEST_DOC_KEY = 'docurag_guest_doc';
const GUEST_SESSION_KEY = 'docurag_guest_session';
const GUEST_MESSAGES_KEY = 'docurag_guest_messages';

export const PendingUploadProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [guestDocs, setGuestDocsState] = useState<DocumentItem[]>(() => {
    try {
      const storedDocs = sessionStorage.getItem(GUEST_DOCS_KEY);
      if (storedDocs) return JSON.parse(storedDocs);
      const storedSingle = sessionStorage.getItem(GUEST_DOC_KEY);
      if (storedSingle) return [JSON.parse(storedSingle)];
      return [];
    } catch {
      return [];
    }
  });

  const [guestSession, setGuestSessionState] = useState<ChatSessionItem | null>(() => {
    try {
      const stored = sessionStorage.getItem(GUEST_SESSION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [guestMessages, setGuestMessages] = useState<ChatMessageItem[]>(() => {
    try {
      const stored = sessionStorage.getItem(GUEST_MESSAGES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingTitle, setPendingTitle] = useState<string>('');

  const guestDoc = guestDocs.length > 0 ? guestDocs[0] : null;
  const pendingFile = pendingFiles.length > 0 ? pendingFiles[0] : null;

  useEffect(() => {
    try {
      if (guestDocs && guestDocs.length > 0) {
        sessionStorage.setItem(GUEST_DOCS_KEY, JSON.stringify(guestDocs));
        sessionStorage.setItem(GUEST_DOC_KEY, JSON.stringify(guestDocs[0]));
      } else {
        sessionStorage.removeItem(GUEST_DOCS_KEY);
        sessionStorage.removeItem(GUEST_DOC_KEY);
      }
    } catch {}
  }, [guestDocs]);

  useEffect(() => {
    try {
      if (guestSession) {
        sessionStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(guestSession));
      } else {
        sessionStorage.removeItem(GUEST_SESSION_KEY);
      }
    } catch {}
  }, [guestSession]);

  useEffect(() => {
    try {
      if (guestMessages && guestMessages.length > 0) {
        sessionStorage.setItem(GUEST_MESSAGES_KEY, JSON.stringify(guestMessages));
      } else {
        sessionStorage.removeItem(GUEST_MESSAGES_KEY);
      }
    } catch {}
  }, [guestMessages]);

  const setGuestChat = (
    docs: DocumentItem | DocumentItem[],
    session: ChatSessionItem,
    messages: ChatMessageItem[] = []
  ) => {
    const docArray = Array.isArray(docs) ? docs : [docs];
    setGuestDocsState(docArray);
    setGuestSessionState(session);
    setGuestMessages(messages);
  };

  const clearGuestChat = () => {
    setGuestDocsState([]);
    setGuestSessionState(null);
    setGuestMessages([]);
    try {
      sessionStorage.removeItem(GUEST_DOCS_KEY);
      sessionStorage.removeItem(GUEST_DOC_KEY);
      sessionStorage.removeItem(GUEST_SESSION_KEY);
      sessionStorage.removeItem(GUEST_MESSAGES_KEY);
    } catch {}
  };

  const setPendingUpload = (files: File | File[], title?: string) => {
    const fileArray = Array.isArray(files) ? files : [files];
    setPendingFiles(fileArray);
    if (title) {
      setPendingTitle(title);
    } else if (fileArray.length === 1) {
      setPendingTitle(fileArray[0].name.replace(/\.pdf$/i, ''));
    } else {
      setPendingTitle(`${fileArray.length} Documents`);
    }
  };

  const clearPendingUpload = () => {
    setPendingFiles([]);
    setPendingTitle('');
  };

  return (
    <PendingUploadContext.Provider
      value={{
        guestDocs,
        guestDoc,
        guestSession,
        guestMessages,
        setGuestChat,
        setGuestMessages,
        clearGuestChat,
        pendingFiles,
        pendingFile,
        pendingTitle,
        setPendingUpload,
        clearPendingUpload,
      }}
    >
      {children}
    </PendingUploadContext.Provider>
  );
};

export const usePendingUpload = (): PendingUploadContextType => {
  const context = useContext(PendingUploadContext);
  if (!context) {
    throw new Error('usePendingUpload must be used within a PendingUploadProvider');
  }
  return context;
};
