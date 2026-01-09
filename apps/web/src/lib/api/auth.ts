import { api } from './client';
import type { User, LoginForm, SignupForm } from '@cortex/types';

interface AuthResponse {
  token: string;
  token_type: string;
  user: User;
}

export async function login(form: LoginForm): Promise<AuthResponse> {
  return api.post<AuthResponse>('/auth/login', form);
}

export async function signup(form: SignupForm): Promise<AuthResponse> {
  return api.post<AuthResponse>('/auth/signup', form);
}

export async function getMe(token: string): Promise<User> {
  return api.get<User>('/auth/me', token);
}

export async function logout(token: string): Promise<void> {
  return api.post<void>('/auth/logout', {}, token);
}
