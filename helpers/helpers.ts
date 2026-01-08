import { API_BASE } from "@/constants/constants";
import { useState } from "react";
import { authFetch } from "../lib/auth";

const FRIENDS_BASE = `${API_BASE}/friends`;

export type UserResult = {
  id: string;
  name: string;
  email: string;
};

function buildSearchUrl(query: string) {
  return `${FRIENDS_BASE}/search-users?q=${encodeURIComponent(query)}`;
}


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

export function useUserSearch() {
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const search = async (query: string) => {
    const trimmed = query.trim();

    if (!trimmed) {
      setSearchError("Enter a name to search.");
      return;
    }

    setSearching(true);
    setSearchError(null);
    setResults([]);

    try {
      const data = await requestJson(
        buildSearchUrl(trimmed),
        {},
        "Search failed"
      );
      if (!data || !Array.isArray(data.users)) {
        setResults([]);
        setSearchError("Unexpected response from server.");
        return;
      }
      setResults(data.users);
    } catch (err: any) {
      setSearchError(err?.message ?? "Search failed");
    } finally {
      setSearching(false);
    }
  };

  return { results, searching, searchError, search };
}

