import { Input, InputField } from '@/components/ui/input';
import { appTheme, uiStyles } from '@/constants/theme';
import { useUserSearch } from '@/helpers/helpers';
import { buildSpotRouteParams } from '@/helpers/spotRoute';
import { searchGlobalSpots } from '@/screens/Spots/spots.api';
import type { Spot } from '@/screens/Spots/spots.types';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  fetchIncomingFriendRequests,
  respondToFriendRequest,
} from './friends.api';
import type { FriendRequest } from './friends.types';

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
  const [spotResults, setSpotResults] = useState<Spot[]>([]);
  const [searchingSpots, setSearchingSpots] = useState(false);
  const [spotError, setSpotError] = useState<string | null>(null);

  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [requestsMessage, setRequestsMessage] = useState<string | null>(null);
  const [actingRequestId, setActingRequestId] = useState<string | null>(null);

  /**
   * Debounce the user search input and clear results when empty.
   */
  useEffect(() => {
    let isMounted = true;
    const trimmed = query.trim();

    if (!trimmed) {
      clearResults();
      setSpotResults([]);
      setSearchingSpots(false);
      setSpotError(null);
      return () => {
        isMounted = false;
      };
    }

    const handle = setTimeout(() => {
      void search(trimmed);

      // Run spot search from the same input.
      setSearchingSpots(true);
      setSpotError(null);

      searchGlobalSpots(trimmed)
        .then((data) => {
          if (!isMounted) return;
          const items = Array.isArray(data?.spots) ? data.spots : [];
          setSpotResults(items);
        })
        .catch((err: any) => {
          if (!isMounted) return;
          setSpotResults([]);
          setSpotError(err?.message ?? 'Search spots failed');
        })
        .finally(() => {
          if (isMounted) {
            setSearchingSpots(false);
          }
        });
    }, 350);

    return () => {
      isMounted = false;
      clearTimeout(handle);
    };
  }, [query, clearResults, search]);

  /**
   * Search users by name using the existing query or a provided value.
   */
  const searchUsers = async (value?: string) => {
    const trimmed = (value ?? query).trim();

    if (!trimmed) return;
    await search(trimmed);

    try {
      setSearchingSpots(true);
      setSpotError(null);
      const data = await searchGlobalSpots(trimmed);
      const items = Array.isArray(data?.spots) ? data.spots : [];
      setSpotResults(items);
    } catch (err: any) {
      setSpotResults([]);
      setSpotError(err?.message ?? 'Search spots failed');
    } finally {
      setSearchingSpots(false);
    }
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
    } catch (err: any) {
      setRequestsError(err?.message ?? 'Fetch requests failed');
    } finally {
      setLoadingRequests(false);
    }
  };

  /**
   * Open the requests modal and refresh data.
   */
  const openRequestsModal = async () => {
    setShowRequestsModal(true);
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
        <View style={styles.headerRow}>
          <Text style={styles.title}>Search</Text>
          <Pressable onPress={openRequestsModal} style={styles.requestsButton}>
            <Text style={styles.requestsButtonText}>
              Requests ({requests.length})
            </Text>
          </Pressable>
        </View>

        {/* Search section */}
        <View style={styles.section}>
          <View style={styles.searchPillWrap}>
            <Input size="md" style={styles.searchPillInput}>
              <InputField
                placeholder="Search by name or spot"
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={() => searchUsers(query)}
                returnKeyType="search"
                autoCapitalize="words"
                style={styles.inputText}
                placeholderTextColor="gray"
              />
            </Input>
          </View>

          {searching || searchingSpots ? <ActivityIndicator /> : null}
          {searchError && <Text style={styles.errorText}>{searchError}</Text>}
          {spotError && <Text style={styles.errorText}>{spotError}</Text>}
          {query.trim().length > 0 &&
            results.length === 0 &&
            spotResults.length === 0 &&
            !searching &&
            !searchingSpots &&
            !searchError &&
            !spotError && (
              <Text style={styles.subtleText}>No results yet.</Text>
            )}

          {results.length > 0 && <Text style={styles.subtleLabel}>People</Text>}
          {results.map((user) => (
            <Pressable
              key={user.id}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/user',
                  params: { id: user.id },
                })
              }
              style={styles.listCard}
            >
              <Text style={styles.listCardTitle}>{user.name}</Text>
              <Text style={styles.listCardSubtle}>{user.email}</Text>
            </Pressable>
          ))}

          {spotResults.length > 0 && (
            <Text style={styles.subtleLabel}>Spots</Text>
          )}
          {spotResults.map((spot) => (
            <Pressable
              key={spot.id}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/spot-details',
                  params: buildSpotRouteParams(spot),
                })
              }
              style={styles.listCard}
            >
              <Text style={styles.listCardTitle}>{spot.name}</Text>
              <Text style={styles.listCardSubtle}>{spot.type}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Keep friend-request handling separate from the main search layout. */}
      <Modal
        visible={showRequestsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRequestsModal(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowRequestsModal(false)}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.sectionTitle}>Friend requests</Text>
              <Pressable
                onPress={() => setShowRequestsModal(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={loadFriendRequests}
              style={styles.refreshRequestsButton}
            >
              <Text style={styles.refreshRequestsText}>Refresh requests</Text>
            </Pressable>

            {loadingRequests ? <ActivityIndicator /> : null}
            {requestsError ? (
              <Text style={styles.errorText}>{requestsError}</Text>
            ) : null}
            {requestsMessage ? (
              <Text style={styles.successText}>{requestsMessage}</Text>
            ) : null}
            {requests.length === 0 && !loadingRequests && !requestsError ? (
              <Text style={styles.subtleText}>No pending requests.</Text>
            ) : null}

            {requests.map((request) => {
              const isActing = actingRequestId === request.id;
              return (
                <View key={request.id} style={styles.requestCard}>
                  <Text style={styles.listCardTitle}>
                    {getRequesterLabel(request)}
                  </Text>
                  <View style={styles.requestActionsRow}>
                    <Pressable
                      onPress={() => respondToRequest(request.id, 'accept')}
                      disabled={isActing}
                      style={styles.acceptRequestButton}
                    >
                      <Text style={styles.acceptRequestText}>Accept</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => respondToRequest(request.id, 'decline')}
                      disabled={isActing}
                      style={styles.declineRequestButton}
                    >
                      <Text style={styles.declineRequestText}>Decline</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...uiStyles.screen,
  },
  content: {
    ...uiStyles.screenContent,
    paddingBottom: 24,
  },
  title: {
    ...uiStyles.pageTitle,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  requestsButton: {
    borderWidth: 1,
    borderColor: appTheme.colors.borderSubtle,
    borderRadius: 999,
    backgroundColor: appTheme.colors.surfaceSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  requestsButtonText: {
    color: appTheme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    ...uiStyles.section,
  },
  sectionTitle: {
    ...uiStyles.sectionTitle,
  },
  searchPillWrap: {
    borderWidth: 1,
    borderColor: appTheme.colors.borderSubtle,
    borderRadius: appTheme.radius.pill,
    backgroundColor: appTheme.colors.surface,
    paddingHorizontal: appTheme.spacing.xs,
  },
  searchPillInput: {
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  inputText: {
    color: appTheme.colors.text,
  },
  errorText: {
    ...uiStyles.errorText,
  },
  successText: {
    ...uiStyles.successText,
  },
  subtleText: {
    ...uiStyles.subtleText,
  },
  subtleLabel: {
    color: '#4d5a55',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  listCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    gap: 6,
  },
  requestCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    gap: 8,
  },
  requestActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptRequestButton: {
    borderRadius: 8,
    backgroundColor: appTheme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  acceptRequestText: {
    color: appTheme.colors.white,
    fontSize: appTheme.fontSize.xs,
    fontWeight: '600',
  },
  declineRequestButton: {
    borderRadius: appTheme.radius.sm,
    borderWidth: 1,
    borderColor: appTheme.colors.borderSoft,
    backgroundColor: appTheme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  declineRequestText: {
    color: appTheme.colors.textSoft,
    fontSize: 12,
    fontWeight: '600',
  },
  listCardTitle: {
    fontWeight: '600',
  },
  listCardSubtle: {
    color: appTheme.colors.textMuted,
  },
  modalBackdrop: {
    ...uiStyles.modalBackdrop,
  },
  modalCard: {
    ...uiStyles.modalCard,
    maxHeight: '70%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  modalCloseButton: {
    borderRadius: appTheme.radius.sm,
    borderWidth: 1,
    borderColor: appTheme.colors.borderSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  modalCloseButtonText: {
    fontSize: 12,
    color: appTheme.colors.textSoft,
    fontWeight: '600',
  },
  refreshRequestsButton: {
    alignSelf: 'flex-start',
    borderRadius: appTheme.radius.sm,
    borderWidth: 1,
    borderColor: appTheme.colors.borderSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: appTheme.colors.surfaceMuted,
  },
  refreshRequestsText: {
    fontSize: 12,
    color: appTheme.colors.textSoft,
    fontWeight: '600',
  },
});
