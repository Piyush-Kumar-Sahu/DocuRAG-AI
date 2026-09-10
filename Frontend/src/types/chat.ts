export interface SourceCitation {
  document_id?: string;
  document_filename?: string;
  document_title?: string;
  page_number: number;
  chunk_index: number;
  distance: number;
  similarity_score: number;
  snippet: string;
}

export interface ChatSessionItem {
  id: string;
  user_id: string;
  document_id: string;
  document_ids?: string[];
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessageItem {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: SourceCitation[] | null;
  created_at: string;
}

export interface ChatQueryResponse {
  answer: string;
  sources: SourceCitation[];
  session_id: string;
  document_id: string;
  document_ids?: string[];
  user_query: string;
}
