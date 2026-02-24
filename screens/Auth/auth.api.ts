import { API_BASE } from '@/constants/constants';
import type { LoginBody, RegisterBody } from './auth.types';

export async function loginWithEmail(body: LoginBody) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.message ?? 'Login failed');
  }

  if (!data?.token) {
    throw new Error('Missing token in response');
  }

  return data;
}

export async function registerWithEmail(body: RegisterBody) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.message ?? 'Registration failed');
  }

  return data;
}
