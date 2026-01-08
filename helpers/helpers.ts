import { authFetch } from "../lib/auth";

// Safely parse a JSON response body. Returns null for empty or invalid JSON.
export async function readJson(res: Response) {
  const rawText = await res.text();
  if (!rawText) return null;

  try {
    return JSON.parse(rawText);
  } catch {
    return null;
  }
}

// Create a consistent error message from API responses.
export function getErrorMessage(data: any, res: Response, fallback: string) {
  return data?.message ?? data?.error ?? `${fallback} (${res.status})`;
}

// Auth-aware fetch that returns parsed JSON and throws on non-2xx responses.
export async function requestJson(url: string, init: RequestInit, fallback: string) {
  const res = await authFetch(url, init);
  const data = await readJson(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(data, res, fallback));
  }

  return data;
}