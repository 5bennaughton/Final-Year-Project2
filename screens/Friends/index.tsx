import { Button, ButtonText } from "@/components/ui/button";
import { Input, InputField } from "@/components/ui/input";
import { API_BASE } from "@/constants/constants";
import { requestJson, useUserSearch, type UserResult } from "@/helpers/helpers";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const FRIENDS_BASE = `${API_BASE}/friends`;
const JSON_HEADERS = { "Content-Type": "application/json" };

type FriendRequest = {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: string;
  requesterName?: string;
  requesterEmail?: string;
};

// Prefer a human-readable name if the API provides it.
function getRequesterLabel(request: FriendRequest) {
  return request.requesterName || request.requesterEmail || request.requesterId;
}

export default function Friends() {
  const [query, setQuery] = useState("");
  const { results, searching, searchError, search, clearResults } = useUserSearch();

  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestMessage, setRequestMessage] = useState<string | null>(null);

  const [showFriends, setShowFriends] = useState(false);
  const [friends, setFriends] = useState<UserResult[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [friendsError, setFriendsError] = useState<string | null>(null);
  const [friendsMessage, setFriendsMessage] = useState<string | null>(null);

  const [showRequests, setShowRequests] = useState(false);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [requestsMessage, setRequestsMessage] = useState<string | null>(null);
  const [actingRequestId, setActingRequestId] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();

    if (!trimmed) {
      clearResults();
      return;
    }

    setRequestMessage(null);
    setRequestError(null);

    const handle = setTimeout(() => {
      search(trimmed);
    }, 350);
    return () => clearTimeout(handle);
  }, [query, clearResults, search]);

  // Search users by name.
  const searchUsers = async (value?: string) => {
    const trimmed = (value ?? query).trim();
  
    if (!trimmed) return;
    setRequestMessage(null);
    setRequestError(null);
    await search(trimmed);
  };

  // Send a friend request to another user.
  const sendFriendRequest = async (addresseeId: string) => {
    setRequestingId(addresseeId);
    setRequestError(null);
    setRequestMessage(null);

    try {
      await requestJson(
        `${FRIENDS_BASE}/requests`,
        {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify({ addresseeId }),
        },
        "Request failed"
      );
      setRequestMessage("Friend request sent.");
    } catch (err: any) {
      setRequestError(err?.message ?? "Request failed");
    } finally {
      setRequestingId(null);
    }
  };

  // Load accepted friends for the current user.
  const loadFriends = async () => {
    setLoadingFriends(true);
    setFriendsError(null);
    setFriendsMessage(null);

    try {
      const data = await requestJson(
        `${FRIENDS_BASE}/list`,
        {},
        "Fetch friends failed"
      );
      if (!data || !Array.isArray(data.friends)) {
        setFriends([]);
        setFriendsError("Unexpected response from server.");
        return;
      }

      setFriends(data.friends);

      if (data.friends.length === 0) {
        setFriendsMessage("No friends yet.");
      }
      
    } catch (err: any) {
      setFriendsError(err?.message ?? "Fetch friends failed");
    } finally {
      setLoadingFriends(false);
    }
  };

  // Toggle the friends list and load it when opening.
  const toggleFriends = async () => {
    if (showFriends) {
      setShowFriends(false);
      return;
    }
    setShowFriends(true);
    await loadFriends();
  };

  // Load pending incoming requests so the user can respond to them.
  const loadFriendRequests = async () => {
    setLoadingRequests(true);
    setRequestsError(null);
    setRequestsMessage(null);

    try {
      const data = await requestJson(
        `${FRIENDS_BASE}/list-requests?type=incoming`,
        {},
        "Fetch requests failed"
      );
      if (!data || !Array.isArray(data.requests)) {
        setRequests([]);
        setRequestsError("Unexpected response from server.");
        return;
      }
      setRequests(data.requests);
      if (data.requests.length === 0) {
        setRequestsMessage("No pending requests.");
      }
    } catch (err: any) {
      setRequestsError(err?.message ?? "Fetch requests failed");
    } finally {
      setLoadingRequests(false);
    }
  };

  // Toggle the request list and load it when opening.
  const toggleRequests = async () => {
    if (showRequests) {
      setShowRequests(false);
      return;
    }
    setShowRequests(true);
    await loadFriendRequests();
  };

  // Accept or decline a pending friend request by its id.
  const respondToRequest = async (requestId: string, action: "accept" | "decline") => {
    setActingRequestId(requestId);
    setRequestsError(null);
    setRequestsMessage(null);

    try {
      await requestJson(
        `${FRIENDS_BASE}/requests-re/${encodeURIComponent(requestId)}`,
        {
          method: "PATCH",
          headers: JSON_HEADERS,
          body: JSON.stringify({ action }),
        },
        "Request failed"
      );
      setRequests((prev) => prev.filter((request) => request.id !== requestId));
      setRequestsMessage(
        action === "accept" ? "Friend request accepted." : "Friend request declined."
      );
    } catch (err: any) {
      setRequestsError(err?.message ?? "Request failed");
    } finally {
      setActingRequestId(null);
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
              onSubmitEditing={() => searchUsers(query)}
              returnKeyType="search"
              autoCapitalize="words"
              style={{ color: "black" }}
              placeholderTextColor="gray"
            />
          </Input>
          {searching && <ActivityIndicator />}
          {searchError && <Text style={{ color: "red" }}>{searchError}</Text>}
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

        {/* Friends section */}
        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: "600" }}>Your friends</Text>
          <Button onPress={toggleFriends}>
            <ButtonText>{showFriends ? "Hide friends" : "Show friends"}</ButtonText>
          </Button>

          {showFriends && (
            <View style={{ gap: 10 }}>
              <Button onPress={loadFriends} disabled={loadingFriends}>
                {loadingFriends ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <ButtonText>Refresh friends</ButtonText>
                )}
              </Button>

              {friends.length === 0 && !loadingFriends && !friendsError && (
                <Text style={{ color: "#666" }}>No friends yet.</Text>
              )}

              {friends.map((friend) => (
                <View
                  key={friend.id}
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: "#ddd",
                    gap: 6,
                  }}
                >
                  <Text style={{ fontWeight: "600" }}>{friend.name}</Text>
                  <Text style={{ color: "#666" }}>{friend.email}</Text>
                </View>
              ))}

              {friendsMessage && <Text style={{ color: "green" }}>{friendsMessage}</Text>}
              {friendsError && <Text style={{ color: "red" }}>{friendsError}</Text>}
            </View>
          )}
        </View>

        {/* Friend requests section */}
        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: "600" }}>Friend requests</Text>
          <Button onPress={toggleRequests}>
            <ButtonText>{showRequests ? "Hide requests" : "Show requests"}</ButtonText>
          </Button>

          {showRequests && (
            <View style={{ gap: 10 }}>
              <Button onPress={loadFriendRequests} disabled={loadingRequests}>
                {loadingRequests ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <ButtonText>Refresh requests</ButtonText>
                )}
              </Button>

              {requests.length === 0 && !loadingRequests && !requestsError && (
                <Text style={{ color: "#666" }}>No pending requests.</Text>
              )}

              {requests.map((request) => {
                const isActing = actingRequestId === request.id;
                return (
                  <View
                    key={request.id}
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: "#ddd",
                      gap: 8,
                    }}
                  >
                    <Text style={{ fontWeight: "600" }}>{getRequesterLabel(request)}</Text>
                    <Text style={{ color: "#666" }}>Request id: {request.id}</Text>
                    <View style={{ gap: 10 }}>
                      <Button onPress={() => respondToRequest(request.id, "accept")} disabled={isActing}>
                        {isActing ? (
                          <ActivityIndicator color="white" />
                        ) : (
                          <ButtonText>Accept</ButtonText>
                        )}
                      </Button>
                      <Button onPress={() => respondToRequest(request.id, "decline")} disabled={isActing}>
                        {isActing ? (
                          <ActivityIndicator color="white" />
                        ) : (
                          <ButtonText>Decline</ButtonText>
                        )}
                      </Button>
                    </View>
                  </View>
                );
              })}

              {requestsMessage && <Text style={{ color: "green" }}>{requestsMessage}</Text>}
              {requestsError && <Text style={{ color: "red" }}>{requestsError}</Text>}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
