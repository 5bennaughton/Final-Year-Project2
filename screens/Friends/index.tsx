import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { useUserSearch } from '@/helpers/helpers';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  fetchFriendsList,
  fetchIncomingFriendRequests,
  respondToFriendRequest,
} from './friends.api';
import type { FriendRequest, UserResult } from './friends.types';

/**
 * Prefer a human-readable label if the API provides it.
 */
function getRequesterLabel(request: FriendRequest) {
  return request.requesterName || request.requesterEmail || request.requesterId;
}

/**
 * Render the Friends screen and manage search/request state.
 * Handles friend list loading and request actions.
 */
export default function Friends() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const { results, searching, searchError, search, clearResults } =
    useUserSearch();

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

  /**
   * Debounce the user search input and clear results when empty.
   */
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

  /**
   * Search users by name using the existing query or a provided value.
   */
  const searchUsers = async (value?: string) => {
    const trimmed = (value ?? query).trim();

    if (!trimmed) return;
    setRequestMessage(null);
    setRequestError(null);
    await search(trimmed);
  };

  /**
   * Load accepted friends for the current user.
   * Updates loading and empty-state messaging.
   */
  const loadFriends = async () => {
    setLoadingFriends(true);
    setFriendsError(null);
    setFriendsMessage(null);

    try {
      const data = await fetchFriendsList();
      if (!data || !Array.isArray(data.friends)) {
        setFriends([]);
        setFriendsError('Unexpected response from server.');
        return;
      }

      setFriends(data.friends);

      if (data.friends.length === 0) {
        setFriendsMessage('No friends yet.');
      }
    } catch (err: any) {
      setFriendsError(err?.message ?? 'Fetch friends failed');
    } finally {
      setLoadingFriends(false);
    }
  };

  /**
   * Toggle the friends list and load it when opening.
   * Avoids extra requests when closing.
   */
  const toggleFriends = async () => {
    if (showFriends) {
      setShowFriends(false);
      return;
    }
    setShowFriends(true);
    await loadFriends();
  };

  /**
   * Load pending incoming requests so the user can respond to them.
   * Updates loading and empty-state messaging.
   */
  const loadFriendRequests = async () => {
    setLoadingRequests(true);
    setRequestsError(null);
    setRequestsMessage(null);

    try {
      const data = await fetchIncomingFriendRequests();
      if (!data || !Array.isArray(data.requests)) {
        setRequests([]);
        setRequestsError('Unexpected response from server.');
        return;
      }
      setRequests(data.requests);
      if (data.requests.length === 0) {
        setRequestsMessage('No pending requests.');
      }
    } catch (err: any) {
      setRequestsError(err?.message ?? 'Fetch requests failed');
    } finally {
      setLoadingRequests(false);
    }
  };

  /**
   * Toggle the request list and load it when opening.
   * Avoids extra requests when closing.
   */
  const toggleRequests = async () => {
    if (showRequests) {
      setShowRequests(false);
      return;
    }
    setShowRequests(true);
    await loadFriendRequests();
  };

  /**
   * Accept or decline a pending friend request by its id.
   * Updates the list and shows a status message.
   */
  const respondToRequest = async (
    requestId: string,
    action: 'accept' | 'decline'
  ) => {
    setActingRequestId(requestId);
    setRequestsError(null);
    setRequestsMessage(null);

    try {
      await respondToFriendRequest(requestId, action);
      setRequests((prev) => prev.filter((request) => request.id !== requestId));
      setRequestsMessage(
        action === 'accept'
          ? 'Friend request accepted.'
          : 'Friend request declined.'
      );
    } catch (err: any) {
      setRequestsError(err?.message ?? 'Request failed');
    } finally {
      setActingRequestId(null);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Friends</Text>

        {/* Search section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Search users</Text>
          <Input size="md">
            <InputField
              placeholder="Search by name"
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => searchUsers(query)}
              returnKeyType="search"
              autoCapitalize="words"
              style={styles.inputText}
              placeholderTextColor="gray"
            />
          </Input>
          {searching && <ActivityIndicator />}
          {searchError && <Text style={styles.errorText}>{searchError}</Text>}
          {results.length === 0 && !searching && !searchError && (
            <Text style={styles.subtleText}>No results yet.</Text>
          )}
          {results.map((user) => (
            <Pressable
              key={user.id}
              onPress={() =>
                router.push({
                  pathname: '/user',
                  params: { id: user.id },
                })
              }
              style={styles.listCard}
            >
              <Text style={styles.listCardTitle}>{user.name}</Text>
              <Text style={styles.listCardSubtle}>{user.email}</Text>
            </Pressable>
          ))}
          {requestMessage && (
            <Text style={styles.successText}>{requestMessage}</Text>
          )}
          {requestError && <Text style={styles.errorText}>{requestError}</Text>}
        </View>

        {/* Friends section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your friends</Text>
          <Button onPress={toggleFriends}>
            <ButtonText>
              {showFriends ? 'Hide friends' : 'Show friends'}
            </ButtonText>
          </Button>

          {showFriends && (
            <View style={styles.section}>
              <Button onPress={loadFriends} disabled={loadingFriends}>
                {loadingFriends ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <ButtonText>Refresh friends</ButtonText>
                )}
              </Button>

              {friends.length === 0 && !loadingFriends && !friendsError && (
                <Text style={styles.subtleText}>No friends yet.</Text>
              )}

              {friends.map((friend) => (
                <View key={friend.id} style={styles.listCard}>
                  <Text style={styles.listCardTitle}>{friend.name}</Text>
                  <Text style={styles.listCardSubtle}>{friend.email}</Text>
                </View>
              ))}

              {friendsMessage && (
                <Text style={styles.successText}>{friendsMessage}</Text>
              )}
              {friendsError && (
                <Text style={styles.errorText}>{friendsError}</Text>
              )}
            </View>
          )}
        </View>

        {/* Friend requests section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Friend requests</Text>
          <Button onPress={toggleRequests}>
            <ButtonText>
              {showRequests ? 'Hide requests' : 'Show requests'}
            </ButtonText>
          </Button>

          {showRequests && (
            <View style={styles.section}>
              <Button onPress={loadFriendRequests} disabled={loadingRequests}>
                {loadingRequests ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <ButtonText>Refresh requests</ButtonText>
                )}
              </Button>

              {requests.length === 0 && !loadingRequests && !requestsError && (
                <Text style={styles.subtleText}>No pending requests.</Text>
              )}

              {requests.map((request) => {
                const isActing = actingRequestId === request.id;
                return (
                  <View key={request.id} style={styles.requestCard}>
                    <Text style={styles.listCardTitle}>
                      {getRequesterLabel(request)}
                    </Text>
                    <Text style={styles.listCardSubtle}>
                      Request id: {request.id}
                    </Text>
                    <View style={styles.section}>
                      <Button
                        onPress={() => respondToRequest(request.id, 'accept')}
                        disabled={isActing}
                      >
                        {isActing ? (
                          <ActivityIndicator color="white" />
                        ) : (
                          <ButtonText>Accept</ButtonText>
                        )}
                      </Button>
                      <Button
                        onPress={() => respondToRequest(request.id, 'decline')}
                        disabled={isActing}
                      >
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

              {requestsMessage && (
                <Text style={styles.successText}>{requestsMessage}</Text>
              )}
              {requestsError && (
                <Text style={styles.errorText}>{requestsError}</Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 20,
  },
  content: {
    gap: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  inputText: {
    color: 'black',
  },
  errorText: {
    color: 'red',
  },
  successText: {
    color: 'green',
  },
  subtleText: {
    color: '#666',
  },
  listCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    gap: 6,
  },
  requestCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    gap: 8,
  },
  listCardTitle: {
    fontWeight: '600',
  },
  listCardSubtle: {
    color: '#666',
  },
});
