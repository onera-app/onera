import { api } from './client';

export interface Note {
  id: string;
  user_id: string;
  encrypted_title: string;
  title_nonce: string;
  encrypted_content: string;
  content_nonce: string;
  folder_id: string | null;
  archived: boolean;
  created_at: number;
  updated_at: number;
}

export interface NoteCreate {
  id?: string;
  encrypted_title: string;
  title_nonce: string;
  encrypted_content: string;
  content_nonce: string;
  folder_id?: string;
}

export interface NoteUpdate {
  encrypted_title?: string;
  title_nonce?: string;
  encrypted_content?: string;
  content_nonce?: string;
  folder_id?: string;
  archived?: boolean;
}

export const notesApi = {
  getAll: (token: string, folderId?: string, archived = false) => {
    let endpoint = `/notes/?archived=${archived}`;
    if (folderId) {
      endpoint += `&folder_id=${folderId}`;
    }
    return api.get<Note[]>(endpoint, token);
  },

  get: (id: string, token: string) =>
    api.get<Note>(`/notes/${id}`, token),

  create: (data: NoteCreate, token: string) =>
    api.post<Note>('/notes/', data, token),

  update: (id: string, data: NoteUpdate, token: string) =>
    api.put<Note>(`/notes/${id}`, data, token),

  delete: (id: string, token: string) =>
    api.delete<{ status: string }>(`/notes/${id}`, token),
};
