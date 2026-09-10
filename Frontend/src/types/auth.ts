export interface User {
  id: string;
  email: string;
  name?: string | null;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
}

export interface MessageResponse {
  message: string;
  detail?: string;
}
