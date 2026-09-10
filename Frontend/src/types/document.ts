export interface DocumentItem {
  id: string;
  user_id: string;
  title: string;
  filename: string;
  file_size: number;
  chunk_count: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentUploadResponse {
  documents: DocumentItem[];
  total: number;
  id?: string;
  user_id?: string;
  title?: string;
  filename?: string;
  file_size?: number;
  chunk_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface DocumentListResponse {
  documents: DocumentItem[];
  total: number;
}
