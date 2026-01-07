import { Button, ButtonText } from "@/components/ui/button";
import { Input, InputField } from "@/components/ui/input";
import { API_BASE } from "@/constants/api";
import { authFetch } from "@/lib/auth";
import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const FRIENDS_BASE = `${API_BASE}/friends`;
const JSON_HEADERS = { "Content-Type": "application/json" };

type UserResult = {
  id: string;
  name: string;
  email: string;
};

/*
Safely parse a JSON response body. Returns null for empty or invalid JSON.
*/
async function readJson(res: Response) {
  const rawText = await res.text();
  if (!rawText) return null;

  try {
    return JSON.parse(rawText);
  } catch {
    return null;
  }
}

/*
Create a consistent error message from API responses.
*/
function getErrorMessage(data: any, res: Response, fallback: string) {
  return data?.message ?? data?.error ?? `${fallback} (${res.status})`;
}

/*
Auth-aware fetch that returns parsed JSON and throws on non-2xx responses.
*/
async function requestJson(url: string, init: RequestInit, fallback: string) {
  const res = await authFetch(url, init);
  const data = await readJson(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(data, res, fallback));
  }

  return data;
}

/*
Build the URL for searching users by name.
*/
function buildSearchUrl(query: string) {
  return `${FRIENDS_BASE}/search?q=${encodeURIComponent(query)}`;
}

export default function Friends() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestMessage, setRequestMessage] = useState<string | null>(null);

  const [requestId, setRequestId] = useState("");
  const [responding, setResponding] = useState(false);
  const [respondError, setRespondError] = useState<string | null>(null);
  const [respondMessage, setRespondMessage] = useState<string | null>(null);

  /*
  Search users by name.
  */
  const searchUsers = async () => {
    const trimmed = query.trim();

    if (!trimmed) {
      setSearchError("Enter a name to search.");
      return;
    }

    setSearching(true);
    setSearchError(null);
    setResults([]);
    setRequestMessage(null);
    setRequestError(null);

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

  /*
  Send a friend request to another user.
  */
  const sendFriendRequest = async (addresseeId: string) => {
    setRequestingId(addresseeId);
    setRequestError(null);
    setRequestMessage(null);

    try {
      await requestJson(`${FRIENDS_BASE}/requests`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ addresseeId }),
      }, "Request failed");
      setRequestMessage("Friend request sent.");
    } catch (err: any) {
      setRequestError(err?.message ?? "Request failed");
    } finally {
      setRequestingId(null);
    }
  };

  /*
  Accept or decline a pending friend request by its id.
  */
  const respondToRequest = async (action: "accept" | "decline") => {
    const trimmed = requestId.trim();

    if (!trimmed) {
      setRespondError("Request id is required.");
      return;
    }

    setResponding(true);
    setRespondError(null);
    setRespondMessage(null);

    try {
      await requestJson(
        `${FRIENDS_BASE}/requests/${encodeURIComponent(trimmed)}`,
        {
          method: "PATCH",
          headers: JSON_HEADERS,
          body: JSON.stringify({ action }),
        },
        "Request failed"
      );
      setRespondMessage(
        action === "accept" ? "Friend request accepted." : "Friend request declined."
      );
      setRequestId("");
    } catch (err: any) {
      setRespondError(err?.message ?? "Request failed");
    } finally {
      setResponding(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 20 }}>
      <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 24 }}>
        <Text style={{ fontSize: 20, fontWeight: "700" }}>Friends</Text>

        {/* Search section */}
        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: "600" }}>Search users</Text>
          <Input variant="outline" size="md">
            <InputField
              placeholder="Search by name"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="words"
              style={{ color: "black" }}
              placeholderTextColor="gray"
            />
          </Input>
          <Button onPress={searchUsers} >
            <ButtonText>Search</ButtonText>
          </Button>
          {searchError && <Text style={{ color: "red" }}>{searchError}</Text>}
        </View>

        {/* Results section */}
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: "600" }}>Results</Text>
          {results.length === 0 && !searching && !searchError && (
            <Text style={{ color: "#666" }}>No results yet.</Text>
          )}

          {results.map((user) => (
            <View
              key={user.id}
              style={{
                padding: 12,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "#ddd",
                gap: 6,
              }}
            >
              <Text style={{ fontWeight: "600" }}>{user.name}</Text>
              <Text style={{ color: "#666" }}>{user.email}</Text>
              <Button
                onPress={() => sendFriendRequest(user.id)}
                disabled={requestingId === user.id}
              >
                {requestingId === user.id ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <ButtonText>Add friend</ButtonText>
                )}
              </Button>
            </View>
          ))}
          {requestMessage && <Text style={{ color: "green" }}>{requestMessage}</Text>}
          {requestError && <Text style={{ color: "red" }}>{requestError}</Text>}
        </View>

        {/* Respond section */}
        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: "600" }}>Respond to request</Text>
          <Input variant="outline" size="md">
            <InputField
              placeholder="Request id"
              value={requestId}
              onChangeText={setRequestId}
              autoCapitalize="none"
              style={{ color: "black" }}
              placeholderTextColor="gray"
            />
          </Input>
          <View style={{ gap: 10 }}>
            <Button onPress={() => respondToRequest("accept")} disabled={responding}>
              {responding ? <ActivityIndicator color="white" /> : <ButtonText>Accept</ButtonText>}
            </Button>
            <Button onPress={() => respondToRequest("decline")} disabled={responding}>
              {responding ? <ActivityIndicator color="white" /> : <ButtonText>Decline</ButtonText>}
            </Button>
          </View>
          {respondMessage && <Text style={{ color: "green" }}>{respondMessage}</Text>}
          {respondError && <Text style={{ color: "red" }}>{respondError}</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
