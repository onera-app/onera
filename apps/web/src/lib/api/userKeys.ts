import { api } from './client';
import type { UserKeysPublicResponse, UserKeysCreateForm } from '@cortex/types';

export async function checkUserHasKeys(token: string): Promise<boolean> {
  const response = await api.get<{ has_keys: boolean }>('/user-keys/check', token);
  return response.has_keys;
}

export async function getUserKeys(token: string): Promise<UserKeysPublicResponse> {
  return api.get<UserKeysPublicResponse>('/user-keys', token);
}

export async function createUserKeys(
  token: string,
  form: UserKeysCreateForm
): Promise<UserKeysPublicResponse> {
  return api.post<UserKeysPublicResponse>('/user-keys', form, token);
}

export async function updateUserKeys(
  token: string,
  form: Partial<UserKeysCreateForm>
): Promise<UserKeysPublicResponse> {
  return api.post<UserKeysPublicResponse>('/user-keys/update', form, token);
}

export async function getPublicKeyByEmail(email: string): Promise<{ public_key: string }> {
  return api.get<{ public_key: string }>(`/user-keys/public/${encodeURIComponent(email)}`);
}
