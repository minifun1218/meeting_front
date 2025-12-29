export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: UserRole;
  avatar?: string;
  createdAt: Date;
  lastLoginAt?: Date;
}

export enum UserRole {
  ADMIN = 'admin',
  HOST = 'host', 
  PARTICIPANT = 'participant',
  OBSERVER = 'observer'
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
  expiresAt: number;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
