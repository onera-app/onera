import { api } from './client';
import type { ChatListItem, EncryptedChat, CreateChatForm, UpdateChatForm } from '@cortex/types';

export async function getChats(token: string): Promise<ChatListItem[]> {
  return api.get<ChatListItem[]>('/chats', token);
}

export async function getChat(token: string, chatId: string): Promise<EncryptedChat> {
  return api.get<EncryptedChat>(`/chats/${chatId}`, token);
}

export async function createChat(
  token: string,
  form: CreateChatForm
): Promise<EncryptedChat> {
  return api.post<EncryptedChat>('/chats/new', form, token);
}

export async function updateChat(
  token: string,
  chatId: string,
  form: UpdateChatForm
): Promise<EncryptedChat> {
  return api.put<EncryptedChat>(`/chats/${chatId}`, form, token);
}

export async function deleteChat(token: string, chatId: string): Promise<void> {
  return api.delete<void>(`/chats/${chatId}`, token);
}
