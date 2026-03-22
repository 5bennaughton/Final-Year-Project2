import PostList from '@/components/PostList';
import { Button, ButtonText } from '@/components/ui/button';
import { buildSpotRouteParams } from '@/helpers/spotRoute';
import { getAuthUser } from '@/lib/auth';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  deleteSpot as deleteGlobalSpot,
  fetchKiteableForecast,
  fetchSpotRating,
  fetchSpotOwner,
  fetchSpotPosts,
  submitSpotRating,
} from './spotDetails.api';
import type {
  DirectionMode,
  KiteableForecastResult,
  SpotRatingSummary,
  SpotDetailsParams,
} from './spotDetails.types';

function getStatusChipColors(active: boolean) {
  return active
    ? {
        backgroundColor: '#e4f6ee',
        borderColor: '#b9e7d2',
        textColor: '#1f6f5f',
      }
    : {
        backgroundColor: '#fdeaea',
        borderColor: '#f4caca',
        textColor: '#a33b3b',
      };
}

const STAR_VALUES = [1, 2, 3, 4, 5] as const;

/**
 * Spot details screen with a "upcoming posts" list.
 */
export default function SpotDetails() {
  const router = useRouter();
  const {
    id,
    name,
    type,
    description,
    ownerId,
    userId,
    createdById,
    lat,
    lng,
    windDirStart,
    windDirEnd,
    isTidal,
    tidePreference,
    tideWindowHours,
  } = useLocalSearchParams<SpotDetailsParams>();

  // List state for posts tied to this spot.
  const [posts, setPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<'user' | 'admin'>('user');
  const [deletingSpot, setDeletingSpot] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [posterName, setPosterName] = useState<string | null>(null);
  const [posterLoading, setPosterLoading] = useState(false);
  const [posterError, setPosterError] = useState<string | null>(null);
  const [kiteableForecast, setKiteableForecast] =
    useState<KiteableForecastResult | null>(null);
  const [kiteableForecastLoading, setKiteableForecastLoading] = useState(false);
  const [kiteableForecastError, setKiteableForecastError] = useState<
    string | null
  >(null);
  const [directionMode, setDirectionMode] =
    useState<DirectionMode>('anticlockwise');
  const [ratingSummary, setRatingSummary] = useState<SpotRatingSummary | null>(
    null
  );
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  // Owner id is passed via route params from the map screen (spot.createdBy, etc).
  const spotOwnerId = (ownerId ?? userId ?? createdById ?? '').toString();
  const canManageSpot = Boolean(
    id &&
      currentUserId &&
      (currentUserId === spotOwnerId || currentUserRole === 'admin')
  );

  useEffect(() => {
    let isMounted = true;

    getAuthUser()
      .then((user) => {
        if (isMounted) {
          setCurrentUserId(user?.id ?? null);
          setCurrentUserRole(user?.role === 'admin' ? 'admin' : 'user');
        }
      })
      .catch(() => {
        if (isMounted) {
          setCurrentUserId(null);
          setCurrentUserRole('user');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Fetch upcoming posts for this spot.
   * The backend filters time > now by default.
   */
  useEffect(() => {
    let isMounted = true;

    const loadPosts = async () => {
      // If we do not have a spot id, we cannot fetch posts.
      if (!id) {
        setPosts([]);
        return;
      }

      // Show a loader and clear any previous errors.
      setLoadingPosts(true);
      setPostsError(null);

      try {
        // Ask the backend for future posts for this spot.
        const data = await fetchSpotPosts(id);

        const items = Array.isArray(data?.posts) ? data.posts : [];

        if (isMounted) {
          setPosts(items);
        }
      } catch (err: any) {
        if (isMounted) {
          // Clear the list on errors so UI stays.
          setPosts([]);
          setPostsError(err?.message ?? 'Fetch spot posts failed');
        }
      } finally {
        if (isMounted) {
          // Always stop the loader.
          setLoadingPosts(false);
        }
      }
    };

    loadPosts();

    return () => {
      isMounted = false;
    };
  }, [id]);

  /**
   * Load average rating + current user's rating for this spot.
   */
  useEffect(() => {
    let isMounted = true;

    const loadRating = async () => {
      if (!id) {
        setRatingLoading(false);
        setRatingSummary(null);
        setRatingError(null);
        return;
      }

      setRatingLoading(true);
      setRatingError(null);

      try {
        const data = await fetchSpotRating(id);

        if (isMounted) {
          setRatingSummary((data ?? null) as SpotRatingSummary);
        }
      } catch (err: any) {
        if (isMounted) {
          setRatingSummary(null);
          setRatingError(err?.message ?? 'Fetch spot rating failed');
        }
      } finally {
        if (isMounted) {
          setRatingLoading(false);
        }
      }
    };

    loadRating();

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    let isMounted = true;

    const loadKiteableForecast = async () => {
      if (!id) {
        setKiteableForecast(null);
        setKiteableForecastError(null);
        return;
      }

      setKiteableForecastLoading(true);
      setKiteableForecastError(null);

      try {
        const data = await fetchKiteableForecast(id, directionMode);

        if (isMounted) {
          setKiteableForecast((data ?? null) as KiteableForecastResult);
        }
      } catch (err: any) {
        if (isMounted) {
          setKiteableForecast(null);
          setKiteableForecastError(
            err?.message ?? 'Fetch kiteable forecast failed'
          );
        }
      } finally {
        if (isMounted) {
          setKiteableForecastLoading(false);
        }
      }
    };

    loadKiteableForecast();

    return () => {
      isMounted = false;
    };
  }, [id, directionMode]);

  useEffect(() => {
    let isMounted = true;

    const loadDetails = async () => {
      if (!spotOwnerId) {
        setPosterName(null);
        setPosterError(null);
        return;
      }

      setPosterLoading(true);
      setPosterError(null);

      try {
        const data = await fetchSpotOwner(spotOwnerId);

        const name =
          typeof data?.user?.name === 'string'
            ? data.user.name
            : typeof data?.name === 'string'
              ? data.name
              : null;

        if (isMounted) {
          setPosterName(name);
        }
      } catch (err: any) {
        if (isMounted) {
          setPosterName(null);
          setPosterError(err?.message ?? 'Fetch spot owner failed');
        }
      } finally {
        if (isMounted) {
          setPosterLoading(false);
        }
      }
    };

    loadDetails();

    return () => {
      isMounted = false;
    };
  }, [spotOwnerId]);

  const confirmDeleteSpot = () => {
    if (!id || deletingSpot) return;

    Alert.alert(
      'Delete spot?',
      'This will remove the spot from the global map.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteSpot();
          },
        },
      ]
    );
  };

  const deleteSpot = async () => {
    if (!id) return;
    setDeletingSpot(true);
    setDeleteError(null);

    try {
      await deleteGlobalSpot(id);
      router.replace('/(tabs)/Map');
    } catch (err: any) {
      setDeleteError(err?.message ?? 'Delete spot failed');
    } finally {
      setDeletingSpot(false);
    }
  };

  /**
   * Reuse the existing Add Spot screen as the edit form.
   * This keeps the spot form basic by having only one UI to maintain.
   */
  const editSpot = () => {
    if (!id) return;

    router.push({
      pathname: '/add-spot',
      params: {
        mode: 'edit',
        id,
        name: (name ?? '').toString(),
        type: (type ?? '').toString(),
        description: (description ?? '').toString(),
        lat: (lat ?? '').toString(),
        lng: (lng ?? '').toString(),
        windDirStart: (windDirStart ?? '').toString(),
        windDirEnd: (windDirEnd ?? '').toString(),
        isTidal: (isTidal ?? '').toString(),
        tidePreference: (tidePreference ?? '').toString(),
        tideWindowHours: (tideWindowHours ?? '').toString(),
      },
    });
  };

  /**
   * Save the selected star value and refresh summary from server response.
   */
  const rateSpot = async (rating: number) => {
    if (!id || ratingSubmitting) return;

    setRatingSubmitting(true);
    setRatingError(null);

    try {
      const data = await submitSpotRating(id, rating);
      setRatingSummary((data ?? null) as SpotRatingSummary);
    } catch (err: any) {
      setRatingError(err?.message ?? 'Save spot rating failed');
    } finally {
      setRatingSubmitting(false);
    }
  };

  // The first forecast row is treated as "now" for this version.
  const kiteableNow = kiteableForecast?.forecast?.[0] ?? null;

  const kiteableNowChipColors = getStatusChipColors(
    Boolean(kiteableNow?.kiteable)
  );

  const directionChipColors = getStatusChipColors(
    Boolean(kiteableNow?.directionOk)
  );

  //This is just colouring for red and green for boolean
  const speedChipColors = getStatusChipColors(Boolean(kiteableNow?.speedOk));
  const tideChipColors = getStatusChipColors(Boolean(kiteableNow?.tideOk));
  const isTidalSpot = kiteableForecast?.thresholds?.isTidal === true;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Spot metadata */}
        <View style={styles.sectionCard}>
          <Text style={styles.pageTitle}>{name ?? 'Spot Details'}</Text>
          <Text style={styles.subtleText}>{type ?? 'Unknown type'}</Text>

          {description ? <Text>{description}</Text> : null}

          {spotOwnerId ? (
            <Text style={styles.subtleText}>
              {posterLoading
                ? 'Posted by: Loading...'
                : posterName
                  ? `Posted by: ${posterName}`
                  : 'Posted by: User'}
            </Text>
          ) : null}

          {posterError ? (
            <Text style={styles.posterErrorText}>{posterError}</Text>
          ) : null}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Spot rating</Text>

          {ratingLoading ? (
            <Text style={styles.subtleText}>Loading rating...</Text>
          ) : (
            <>
              <Text style={styles.metaText}>
                Average: {ratingSummary?.averageRating ?? '-'} (
                {ratingSummary?.ratingCount ?? 0}{' '}
                {ratingSummary?.ratingCount === 1 ? 'rating' : 'ratings'})
              </Text>
              <Text style={styles.metaText}>
                Your rating: {ratingSummary?.myRating ?? 'Not rated yet'}
              </Text>

              {/**Looping through the stars to create 5 pressable stars
               * Mapping each one from 1-5
               */}
              <View style={styles.starRow}>
                {STAR_VALUES.map((value) => {
                  const selected = value <= (ratingSummary?.myRating ?? 0);
                  return (
                    <Pressable
                      key={value}
                      onPress={() => rateSpot(value)}
                      disabled={ratingSubmitting}
                      style={styles.starButton}
                    >
                      {/**This is where the stars are rendered */}
                      <Text
                        style={[
                          styles.starIcon,
                          selected
                            ? styles.starIconSelected
                            : styles.starIconOff,
                        ]}
                      >
                        ★
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {ratingSubmitting ? (
                <Text style={styles.subtleText}>Saving your rating...</Text>
              ) : null}
            </>
          )}

          {ratingError ? (
            <Text style={styles.errorText}>{ratingError}</Text>
          ) : null}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Direction mode</Text>
          <View style={styles.directionButtonsRow}>
            <Button
              variant={directionMode === 'clockwise' ? 'solid' : 'outline'}
              onPress={() => setDirectionMode('clockwise')}
            >
              <ButtonText>Clockwise</ButtonText>
            </Button>
            <Button
              variant={directionMode === 'anticlockwise' ? 'solid' : 'outline'}
              onPress={() => setDirectionMode('anticlockwise')}
            >
              <ButtonText>Anti-clockwise</ButtonText>
            </Button>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Kiteable now</Text>

          {kiteableForecastLoading ? (
            <Text style={styles.subtleText}>Checking current wind...</Text>
          ) : kiteableForecastError ? (
            <Text style={styles.errorText}>{kiteableForecastError}</Text>
          ) : kiteableNow ? (
            <View style={styles.kiteableNowWrap}>
              <View
                style={[
                  styles.kiteableStatusChip,
                  {
                    backgroundColor: kiteableNowChipColors.backgroundColor,
                    borderColor: kiteableNowChipColors.borderColor,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.kiteableStatusText,
                    { color: kiteableNowChipColors.textColor },
                  ]}
                >
                  {kiteableNow.kiteable ? 'Kiteable: Yes' : 'Kiteable: No'}
                </Text>
              </View>

              <Text style={styles.metaText}>
                Wind: {kiteableNow.speedKn ?? '-'} kn at{' '}
                {kiteableNow.directionDeg ?? '-'}°
              </Text>
              <View style={styles.chipRow}>
                <View
                  style={[
                    styles.statusChip,
                    {
                      backgroundColor: directionChipColors.backgroundColor,
                      borderColor: directionChipColors.borderColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusChipText,
                      { color: directionChipColors.textColor },
                    ]}
                  >
                    Direction {kiteableNow.directionOk ? 'Pass' : 'Fail'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusChip,
                    {
                      backgroundColor: speedChipColors.backgroundColor,
                      borderColor: speedChipColors.borderColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusChipText,
                      { color: speedChipColors.textColor },
                    ]}
                  >
                    Speed {kiteableNow.speedOk ? 'Pass' : 'Fail'}
                  </Text>
                </View>
                {isTidalSpot ? (
                  <View
                    style={[
                      styles.statusChip,
                      {
                        backgroundColor: tideChipColors.backgroundColor,
                        borderColor: tideChipColors.borderColor,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        { color: tideChipColors.textColor },
                      ]}
                    >
                      Tide {kiteableNow.tideOk ? 'Pass' : 'Fail'}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.metaText}>
                Wind range: {kiteableForecast?.thresholds?.minWindKn ?? '-'} to{' '}
                {kiteableForecast?.thresholds?.maxWindKn ?? '-'} kn
              </Text>
              <Text style={styles.metaText}>
                Direction range:{' '}
                {kiteableForecast?.thresholds?.windDirStart ?? '-'} to{' '}
                {kiteableForecast?.thresholds?.windDirEnd ?? '-'}°
              </Text>
              <Text style={styles.metaText}>
                Mode: {kiteableForecast?.thresholds?.directionMode ?? '-'}
              </Text>
              {isTidalSpot ? (
                <>
                  <Text style={styles.metaText}>
                    Tide rule:{' '}
                    {kiteableForecast?.thresholds?.tideWindowHours ?? '-'}h
                    before and after{' '}
                    {kiteableForecast?.thresholds?.tidePreference ?? '-'} tide
                  </Text>
                </>
              ) : null}
              {kiteableForecast?.note ? (
                <Text style={styles.metaText}>{kiteableForecast.note}</Text>
              ) : null}
            </View>
          ) : (
            <Text style={styles.subtleText}>No kiteable data yet.</Text>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Next 42 hours</Text>

          {kiteableForecastLoading ? (
            <Text style={styles.subtleText}>Loading forecast...</Text>
          ) : kiteableForecastError ? (
            <Text style={styles.errorText}>{kiteableForecastError}</Text>
          ) : kiteableForecast?.forecast?.length ? (
            <View style={styles.kiteableNowWrap}>
              <Text style={styles.metaText}>
                Kiteable hours: {kiteableForecast.kiteableHours ?? 0}/
                {kiteableForecast.requestedHours ?? 42}
              </Text>

              {/* Showing all 42 rows but as sscrollable. */}
              <ScrollView
                style={styles.forecastList}
                contentContainerStyle={styles.forecastListContent}
                nestedScrollEnabled
              >
                {kiteableForecast.forecast.map((hour, index) => (
                  <View
                    key={hour.time}
                    style={[
                      styles.forecastRow,
                      index % 2 === 0
                        ? styles.forecastRowStriped
                        : styles.forecastRowPlain,
                    ]}
                  >
                    <Text style={styles.forecastRowText}>
                      {hour.time} - {hour.kiteable ? 'Yes' : 'No'} -{' '}
                      {hour.speedKn} kn - {hour.directionDeg}°
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : (
            <Text style={styles.subtleText}>No forecast data yet.</Text>
          )}
        </View>

        {/* Upcoming posts list */}
        <View style={styles.upcomingSection}>
          <Text style={styles.sectionTitle}>Upcoming posts</Text>

          <PostList
            posts={posts}
            loading={loadingPosts}
            error={postsError}
            emptyMessage="No upcoming posts yet."
            showComments={false}
          />
        </View>

        {deleteError ? (
          <Text style={styles.errorText}>{deleteError}</Text>
        ) : null}

        {canManageSpot ? (
          <View style={styles.manageActions}>
            <Button onPress={editSpot}>
              <ButtonText>Edit Spot</ButtonText>
            </Button>

            <Button onPress={confirmDeleteSpot} disabled={deletingSpot}>
              <ButtonText>
                {deletingSpot ? 'Deleting...' : 'Delete Spot'}
              </ButtonText>
            </Button>
          </View>
        ) : null}

        {/*back button */}
        <Button onPress={() => router.push('/(tabs)/Map')}>
          <ButtonText>Back to Map</ButtonText>
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f7f6f2',
  },
  content: {
    padding: 20,
    gap: 16,
  },
  sectionCard: {
    gap: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    backgroundColor: 'white',
    padding: 12,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtleText: {
    color: '#666',
  },
  posterErrorText: {
    color: '#999',
    fontSize: 12,
  },
  metaText: {
    color: '#555',
  },
  starRow: {
    flexDirection: 'row',
    gap: 4,
  },
  starButton: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  starIcon: {
    fontSize: 28,
  },
  starIconSelected: {
    color: '#f2b01e',
  },
  starIconOff: {
    color: '#d0d0d0',
  },
  directionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  kiteableNowWrap: {
    gap: 4,
  },
  kiteableStatusChip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  kiteableStatusText: {
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusChipText: {
    fontSize: 12,
  },
  forecastList: {
    maxHeight: 220,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
  },
  forecastListContent: {
    padding: 8,
    gap: 6,
  },
  forecastRow: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  forecastRowStriped: {
    backgroundColor: '#fafafa',
  },
  forecastRowPlain: {
    backgroundColor: '#fff',
  },
  forecastRowText: {
    color: '#444',
    fontSize: 12,
  },
  upcomingSection: {
    gap: 10,
  },
  manageActions: {
    gap: 10,
  },
  errorText: {
    color: 'red',
  },
});
