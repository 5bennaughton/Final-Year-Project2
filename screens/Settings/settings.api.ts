import { API_BASE } from '@/constants/constants';
import { authFetch } from '@/lib/auth';
import { requestJson } from '@/helpers/helpers';
import type { UpdateProfilePayload } from './settings.types';

export async function requestLogout() {
  await authFetch(`${API_BASE}/auth/logout`, { method: 'POST' });
}

export async function updateMyProfile(payload: UpdateProfilePayload) {
  return requestJson(
    `${API_BASE}/auth/me`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Update profile failed'
  );
}

export async function uploadAvatar(formData: FormData) {
  const res = await authFetch(`${API_BASE}/uploads/avatar`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.message ?? 'Upload failed');
  }

  return data;
}

export async function updateAvatarUrl(avatarUrl: string) {
  return requestJson(
    `${API_BASE}/auth/me`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatarUrl }),
    },
    'Update avatar failed'
  );
}

export async function requestDeleteAccount() {
  const res = await authFetch(`${API_BASE}/auth/me`, { method: 'DELETE' });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.message ?? 'Delete account failed');
  }

  return data;
}
