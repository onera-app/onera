import { api } from './client';

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  created_at: number;
  updated_at: number;
}

export interface FolderCreate {
  name: string;
  parent_id?: string;
}

export interface FolderUpdate {
  name?: string;
  parent_id?: string;
}

export const foldersApi = {
  getAll: (token: string) =>
    api.get<Folder[]>('/folders/', token),

  get: (id: string, token: string) =>
    api.get<Folder>(`/folders/${id}`, token),

  create: (data: FolderCreate, token: string) =>
    api.post<Folder>('/folders/', data, token),

  update: (id: string, data: FolderUpdate, token: string) =>
    api.put<Folder>(`/folders/${id}`, data, token),

  delete: (id: string, token: string) =>
    api.delete<{ status: string }>(`/folders/${id}`, token),
};
