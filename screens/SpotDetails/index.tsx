import PostList from '@/components/PostList';
import { Button, ButtonText } from '@/components/ui/button';
import { getAuthUser } from '@/lib/auth';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
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

const sectionCardStyle = {
  gap: 10,
  borderWidth: 1,
  borderColor: '#ddd',
  borderRadius: 12,
  backgroundColor: 'white',
  padding: 12,
};

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
 * Spot details screen with a simple "upcoming posts" list.
 */
export default function SpotDetails() {
  const router = useRouter();
  const {
    id,
    name,
    type,
    description,
    lat,
    lng,
    ownerId,
    userId,
    createdById,
  } = useLocalSearchParams<SpotDetailsParams>();

  // List state for posts tied to this spot.
  const [posts, setPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
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
  const canDeleteSpot = Boolean(
    id && currentUserId && spotOwnerId && currentUserId === spotOwnerId
  );

  useEffect(() => {
    let isMounted = true;

    getAuthUser()
      .then((user) => {
        if (isMounted) {
          setCurrentUserId(user?.id ?? null);
        }
      })
      .catch(() => {
        if (isMounted) {
          setCurrentUserId(null);
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
          // Clear the list on errors so UI stays simple.
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f7f6f2' }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        {/* Spot metadata */}
        <View style={sectionCardStyle}>
          <Text style={{ fontSize: 22, fontWeight: '700' }}>
            {name ?? 'Spot Details'}
          </Text>
          <Text style={{ color: '#666' }}>{type ?? 'Unknown type'}</Text>

          {description ? <Text>{description}</Text> : null}

          {spotOwnerId ? (
            <Text style={{ color: '#666' }}>
              {posterLoading
                ? 'Posted by: Loading...'
                : posterName
                  ? `Posted by: ${posterName}`
                  : 'Posted by: User'}
            </Text>
          ) : null}

          {posterError ? (
            <Text style={{ color: '#999', fontSize: 12 }}>{posterError}</Text>
          ) : null}

          {lat && lng ? (
            <Text style={{ color: '#777' }}>
              Coordinates: {Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}
            </Text>
          ) : null}
        </View>

        <View style={sectionCardStyle}>
          <Text style={{ fontSize: 18, fontWeight: '700' }}>Spot rating</Text>

          {ratingLoading ? (
            <Text style={{ color: '#666' }}>Loading rating...</Text>
          ) : (
            <>
              <Text style={{ color: '#555' }}>
                Average: {ratingSummary?.averageRating ?? '-'} (
                {ratingSummary?.ratingCount ?? 0}{' '}
                {ratingSummary?.ratingCount === 1 ? 'rating' : 'ratings'})
              </Text>
              <Text style={{ color: '#555' }}>
                Your rating: {ratingSummary?.myRating ?? 'Not rated yet'}
              </Text>

              {/**Looping through the stars to create 5 pressable stars
               * Mapping each one from 1-5
               */}
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {STAR_VALUES.map((value) => {
                  const selected = value <= (ratingSummary?.myRating ?? 0);
                  return (
                    <Pressable
                      key={value}
                      onPress={() => rateSpot(value)}
                      disabled={ratingSubmitting}
                      style={{ paddingVertical: 4, paddingHorizontal: 2 }}
                    >
                      {/**This is where the stars are rendered */}
                      <Text
                        style={{
                          fontSize: 28,
                          color: selected ? '#f2b01e' : '#d0d0d0',
                        }}
                      >
                        ★
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {ratingSubmitting ? (
                <Text style={{ color: '#666' }}>Saving your rating...</Text>
              ) : null}
            </>
          )}

          {ratingError ? (
            <Text style={{ color: 'red' }}>{ratingError}</Text>
          ) : null}
        </View>

        <View style={sectionCardStyle}>
          <Text style={{ fontSize: 18, fontWeight: '700' }}>
            Direction mode
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
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

        <View style={sectionCardStyle}>
          <Text style={{ fontSize: 18, fontWeight: '700' }}>Kiteable now</Text>

          {kiteableForecastLoading ? (
            <Text style={{ color: '#666' }}>Checking current wind...</Text>
          ) : kiteableForecastError ? (
            <Text style={{ color: 'red' }}>{kiteableForecastError}</Text>
          ) : kiteableNow ? (
            <View style={{ gap: 4 }}>
              <View
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: kiteableNowChipColors.backgroundColor,
                  borderColor: kiteableNowChipColors.borderColor,
                  borderWidth: 1,
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                }}
              >
                <Text
                  style={{
                    fontWeight: '700',
                    color: kiteableNowChipColors.textColor,
                  }}
                >
                  {kiteableNow.kiteable ? 'Kiteable: Yes' : 'Kiteable: No'}
                </Text>
              </View>

              <Text style={{ color: '#555' }}>
                Wind: {kiteableNow.speedKn ?? '-'} kn at{' '}
                {kiteableNow.directionDeg ?? '-'}°
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View
                  style={{
                    backgroundColor: directionChipColors.backgroundColor,
                    borderColor: directionChipColors.borderColor,
                    borderWidth: 1,
                    borderRadius: 999,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                  }}
                >
                  <Text
                    style={{
                      color: directionChipColors.textColor,
                      fontSize: 12,
                    }}
                  >
                    Direction {kiteableNow.directionOk ? 'Pass' : 'Fail'}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: speedChipColors.backgroundColor,
                    borderColor: speedChipColors.borderColor,
                    borderWidth: 1,
                    borderRadius: 999,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                  }}
                >
                  <Text
                    style={{ color: speedChipColors.textColor, fontSize: 12 }}
                  >
                    Speed {kiteableNow.speedOk ? 'Pass' : 'Fail'}
                  </Text>
                </View>
              </View>

              <Text style={{ color: '#555' }}>
                Wind range: {kiteableForecast?.thresholds?.minWindKn ?? '-'} to{' '}
                {kiteableForecast?.thresholds?.maxWindKn ?? '-'} kn
              </Text>
              <Text style={{ color: '#555' }}>
                Direction range:{' '}
                {kiteableForecast?.thresholds?.windDirStart ?? '-'} to{' '}
                {kiteableForecast?.thresholds?.windDirEnd ?? '-'}°
              </Text>
              <Text style={{ color: '#555' }}>
                Mode: {kiteableForecast?.thresholds?.directionMode ?? '-'}
              </Text>
              {kiteableForecast?.note ? (
                <Text style={{ color: '#777' }}>{kiteableForecast.note}</Text>
              ) : null}
            </View>
          ) : (
            <Text style={{ color: '#666' }}>No kiteable data yet.</Text>
          )}
        </View>

        <View style={sectionCardStyle}>
          <Text style={{ fontSize: 18, fontWeight: '700' }}>Next 42 hours</Text>

          {kiteableForecastLoading ? (
            <Text style={{ color: '#666' }}>Loading forecast...</Text>
          ) : kiteableForecastError ? (
            <Text style={{ color: 'red' }}>{kiteableForecastError}</Text>
          ) : kiteableForecast?.forecast?.length ? (
            <View style={{ gap: 4 }}>
              <Text style={{ color: '#555' }}>
                Kiteable hours: {kiteableForecast.kiteableHours ?? 0}/
                {kiteableForecast.requestedHours ?? 42}
              </Text>

              {/* Showing all 42 rows but as sscrollable. */}
              <ScrollView
                style={{
                  maxHeight: 220,
                  borderWidth: 1,
                  borderColor: '#eee',
                  borderRadius: 8,
                }}
                contentContainerStyle={{ padding: 8, gap: 6 }}
                nestedScrollEnabled
              >
                {kiteableForecast.forecast.map((hour, index) => (
                  <View
                    key={hour.time}
                    style={{
                      paddingVertical: 6,
                      paddingHorizontal: 8,
                      borderRadius: 6,
                      backgroundColor: index % 2 === 0 ? '#fafafa' : '#fff',
                    }}
                  >
                    <Text style={{ color: '#444', fontSize: 12 }}>
                      {hour.time} - {hour.kiteable ? 'Yes' : 'No'} -{' '}
                      {hour.speedKn} kn - {hour.directionDeg}°
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : (
            <Text style={{ color: '#666' }}>No forecast data yet.</Text>
          )}
        </View>

        {/* Upcoming posts list */}
        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 18, fontWeight: '700' }}>
            Upcoming posts
          </Text>

          <PostList
            posts={posts}
            loading={loadingPosts}
            error={postsError}
            emptyMessage="No upcoming posts yet."
            showComments={false}
          />
        </View>

        {deleteError ? (
          <Text style={{ color: 'red' }}>{deleteError}</Text>
        ) : null}

        {canDeleteSpot ? (
          <Button onPress={confirmDeleteSpot} disabled={deletingSpot}>
            <ButtonText>
              {deletingSpot ? 'Deleting...' : 'Delete Spot'}
            </ButtonText>
          </Button>
        ) : null}

        {/* Simple back button */}
        <Button onPress={() => router.push('/(tabs)/Map')}>
          <ButtonText>Back to Map</ButtonText>
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
