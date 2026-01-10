import { API_BASE } from "@/constants/constants";
import { useState } from "react";
import { authFetch } from "../lib/auth";

const FRIENDS_BASE = `${API_BASE}/friends`;
const FUTURE_SESSIONS_BASE = `${API_BASE}/future-sessions`;
const JSON_HEADERS = { "Content-Type": "application/json" };

export type UserResult = {
  id: string;
  name: string;
  email: string;
};

export type SessionPost = {
  id: string;
  sport: string;
  time: string;
  location: string;
  notes?: string | null;
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

export function useListPosts(defaultUserId?: string) {
  const [posts, setPosts] = useState<SessionPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);

  const listPosts = async (userId?: string) => {
    setLoadingPosts(true);
    setPostsError(null);
    const targetUserId = userId?.trim() || defaultUserId?.trim();

    try {
      const baseUrl = `${FUTURE_SESSIONS_BASE}/list-posts`;
      const url = targetUserId ? `${baseUrl}/${encodeURIComponent(targetUserId)}` : baseUrl;
      const data = await requestJson(
        url,
        {
          method: "GET",
          headers: JSON_HEADERS,
        },
        "Fetch posts failed"
      );

      const items = Array.isArray(data?.posts) ? data.posts : [];
      setPosts(items);
    } catch (err: any) {
      setPosts([]);
      setPostsError(err?.message ?? "Fetch posts failed");
    } finally {
      setLoadingPosts(false);
    }
  };

  return { posts, loadingPosts, postsError, listPosts };
}
