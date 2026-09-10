import axios, { AxiosError } from 'axios';
import { User, AuthToken, MessageResponse } from '../types/auth';
import { DocumentItem, DocumentListResponse } from '../types/document';
import { ChatSessionItem, ChatMessageItem, ChatQueryResponse } from '../types/chat';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 600000,
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('auth-logout'));
      }
    }
    return Promise.reject(error);
  }
);

export const apiService = {
  async register(name: string, email: string, password: string): Promise<User> {
    const response = await apiClient.post<User>('/auth/register', { name, email, password });
    return response.data;
  },

  async login(email: string, password: string): Promise<AuthToken> {
    const response = await apiClient.post<AuthToken>('/auth/login', { email, password });
    return response.data;
  },

  async requestOTP(email: string, purpose: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET'): Promise<MessageResponse> {
    const response = await apiClient.post<MessageResponse>('/auth/request-otp', { email, purpose });
    return response.data;
  },

  async verifyOTP(email: string, otp_code: string, purpose: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET'): Promise<MessageResponse> {
    const response = await apiClient.post<MessageResponse>('/auth/verify-otp', { email, otp_code, purpose });
    return response.data;
  },

  async resetPassword(email: string, otp_code: string, new_password: string): Promise<MessageResponse> {
    const response = await apiClient.post<MessageResponse>('/auth/reset-password', {
      email,
      otp_code,
      new_password,
    });
    return response.data;
  },

  async getMe(): Promise<User> {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },

  // Document APIs
  async uploadDocument(file: File, title?: string): Promise<DocumentItem> {
    const formData = new FormData();
    formData.append('files', file);
    if (title) {
      formData.append('title', title);
    }
    const response = await apiClient.post<DocumentItem>('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async uploadDocuments(files: File[], title?: string): Promise<DocumentItem[]> {
    const formData = new FormData();
    for (const f of files) {
      formData.append('files', f);
    }
    if (title) {
      formData.append('title', title);
    }
    const response = await apiClient.post<{ documents: DocumentItem[]; total: number }>('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.documents || [];
  },

  async listDocuments(): Promise<DocumentListResponse> {
    const response = await apiClient.get<DocumentListResponse>('/documents/');
    return response.data;
  },

  async getDocument(documentId: string): Promise<DocumentItem> {
    const response = await apiClient.get<DocumentItem>(`/documents/${documentId}`);
    return response.data;
  },

  async deleteDocument(documentId: string): Promise<MessageResponse> {
    const response = await apiClient.delete<MessageResponse>(`/documents/${documentId}`);
    return response.data;
  },
  async createChatSession(documentIds: string | string[], title?: string): Promise<ChatSessionItem> {
    const docIdsList = Array.isArray(documentIds) ? documentIds : [documentIds];
    const response = await apiClient.post<ChatSessionItem>('/chat/sessions', {
      document_ids: docIdsList,
      document_id: docIdsList[0],
      title: title || 'New Chat',
    });
    return response.data;
  },
  async listChatSessions(documentId?: string): Promise<ChatSessionItem[]> {
    const params = documentId ? { document_id: documentId } : {};
    const response = await apiClient.get<ChatSessionItem[]>('/chat/sessions', { params });
    return response.data;
  },
  async getChatSession(sessionId: string): Promise<ChatSessionItem> {
    const response = await apiClient.get<ChatSessionItem>(`/chat/sessions/${sessionId}`);
    return response.data;
  },
  async getSessionMessages(sessionId: string): Promise<ChatMessageItem[]> {
    const response = await apiClient.get<ChatMessageItem[]>(`/chat/sessions/${sessionId}/messages`);
    return response.data;
  },
  async sendQuery(
    sessionId: string,
    query: string,
    documentIds?: string | string[],
    chatHistory?: { role: string; content: string }[]
  ): Promise<ChatQueryResponse> {
    const payload: {
      query: string;
      document_id?: string;
      document_ids?: string[];
      chat_history?: { role: string; content: string }[];
    } = { query };
    if (documentIds) {
      if (Array.isArray(documentIds)) {
        payload.document_ids = documentIds;
        payload.document_id = documentIds[0];
      } else {
        payload.document_id = documentIds;
        payload.document_ids = [documentIds];
      }
    }
    if (chatHistory && chatHistory.length > 0) {
      payload.chat_history = chatHistory;
    }
    const response = await apiClient.post<ChatQueryResponse>(`/chat/sessions/${sessionId}/query`, payload);
    return response.data;
  },
  async claimGuestSession(
    guestDocumentIds: string | string[],
    title: string,
    messages: { role: string; content: string; sources?: any }[],
    documents?: DocumentItem[]
  ): Promise<ChatSessionItem> {
    const docIdsList = Array.isArray(guestDocumentIds) ? guestDocumentIds : [guestDocumentIds];
    const response = await apiClient.post<ChatSessionItem>('/chat/claim-guest-session', {
      guest_document_ids: docIdsList,
      guest_document_id: docIdsList[0],
      title: title || 'Imported Chat',
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        sources: m.sources || null,
      })),
      documents: documents || null,
    });
    return response.data;
  },
  async deleteChatSession(sessionId: string): Promise<MessageResponse> {
    const response = await apiClient.delete<MessageResponse>(`/chat/sessions/${sessionId}`);
    return response.data;
  },
  async exportChat(sessionId: string, defaultTitle: string = 'document_chat'): Promise<void> {
    const response = await apiClient.get(`/chat/sessions/${sessionId}/export`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeName = (defaultTitle || 'document_chat').replace(/[^a-zA-Z0-9_-]/g, '_');
    link.download = `${safeName}_export.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};

