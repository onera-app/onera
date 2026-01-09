import { api } from './client';

export interface Prompt {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  content: string;
  created_at: number;
  updated_at: number;
}

export interface PromptCreate {
  name: string;
  description?: string;
  content: string;
}

export interface PromptUpdate {
  name?: string;
  description?: string;
  content?: string;
}

export const promptsApi = {
  getAll: (token: string) =>
    api.get<Prompt[]>('/prompts/', token),

  get: (id: string, token: string) =>
    api.get<Prompt>(`/prompts/${id}`, token),

  create: (data: PromptCreate, token: string) =>
    api.post<Prompt>('/prompts/', data, token),

  update: (id: string, data: PromptUpdate, token: string) =>
    api.put<Prompt>(`/prompts/${id}`, data, token),

  delete: (id: string, token: string) =>
    api.delete<{ status: string }>(`/prompts/${id}`, token),
};
