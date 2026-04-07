import PostList from '@/components/PostList';
import { Button, ButtonText } from '@/components/ui/button';
import { appTheme, uiStyles } from '@/constants/theme';
import { getAuthUser } from '@/lib/auth';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
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
  KiteableForecastHour,
  KiteableForecastResult,
  SpotRatingSummary,
  SpotDetailsParams,
} from './spotDetails.types';

function getStatusChipColors(active: boolean) {
  return active
    ? {
        backgroundColor: appTheme.colors.successBg,
        borderColor: appTheme.colors.successBorder,
        textColor: appTheme.colors.successText,
      }
    : {
        backgroundColor: appTheme.colors.dangerBg,
        borderColor: appTheme.colors.dangerBorder,
        textColor: appTheme.colors.dangerText,
      };
}

const STAR_VALUES = [1, 2, 3, 4, 5] as const;

function formatDirectionModeLabel(mode?: string | null) {
  if (mode === 'clockwise') return 'Clockwise';
  if (mode === 'anticlockwise') return 'Anti-clockwise';
  return '-';
}

function formatForecastTimeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatForecastDayLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleDateString([], {
    weekday: 'short',
  });
}

function getForecastStatusLabel(hour: KiteableForecastHour) {
  if (hour.kiteable) return 'Kiteable';
  if (!hour.directionOk) return 'Direction fail';
  if (!hour.speedOk) return 'Wind fail';
  if (!hour.tideOk) return 'Tide fail';
  return 'No go';
}

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
    directionMode: routeDirectionMode,
    isTidal,
    tidePreference,
    tideWindowHours,
  } = useLocalSearchParams<SpotDetailsParams>();

  // List state for posts tied to this spot.
  const [posts, setPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<'user' | 'admin'>(
    'user'
  );
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
  const spotDirectionMode: DirectionMode =
    routeDirectionMode === 'anticlockwise' ? 'anticlockwise' : 'clockwise';

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
        const data = await fetchKiteableForecast(id, spotDirectionMode);

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
  }, [id, spotDirectionMode]);

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

    // Web needs a browser confirm here; otherwise the delete handler never runs.
    if (Platform.OS === 'web') {
      if (
        globalThis.confirm?.(
          'Delete this spot? This will remove the spot from the global map.'
        )
      ) {
        deleteSpot();
      }
      return;
    }

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
      pathname: '/(tabs)/add-spot',
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
        directionMode: spotDirectionMode,
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
  const windSpeedLabel =
    typeof kiteableNow?.speedKn === 'number'
      ? kiteableNow.speedKn.toFixed(1)
      : '--';
  const directionLabel =
    typeof kiteableNow?.directionDeg === 'number'
      ? `${kiteableNow.directionDeg}°`
      : '--';
  const ratingAverageLabel =
    typeof ratingSummary?.averageRating === 'number'
      ? ratingSummary.averageRating.toFixed(1)
      : '-';

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroHeaderRow}>
            <View style={styles.heroTextBlock}>
              <Text style={styles.heroEyebrow}>Spot details</Text>
              <Text style={styles.pageTitle}>{name ?? 'Spot Details'}</Text>
              <View style={styles.heroMetaRow}>
                <View style={styles.metaBadge}>
                  <Text style={styles.metaBadgeText}>
                    {type ?? 'Unknown type'}
                  </Text>
                </View>
                {spotOwnerId ? (
                  <Text style={styles.subtleText}>
                    {posterLoading
                      ? 'Posted by loading...'
                      : posterName
                        ? `Posted by ${posterName}`
                        : 'Posted by user'}
                  </Text>
                ) : null}
              </View>
            </View>

            <View
              style={[
                styles.heroStatusBadge,
                {
                  backgroundColor: kiteableNowChipColors.backgroundColor,
                  borderColor: kiteableNowChipColors.borderColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.heroStatusLabel,
                  { color: kiteableNowChipColors.textColor },
                ]}
              >
                Kiteable
              </Text>
              <Text
                style={[
                  styles.heroStatusValue,
                  { color: kiteableNowChipColors.textColor },
                ]}
              >
                {kiteableForecastLoading
                  ? '...'
                  : kiteableNow?.kiteable
                    ? 'Yes'
                    : 'No'}
              </Text>
            </View>
          </View>

          {description ? (
            <Text style={styles.heroDescription}>{description}</Text>
          ) : null}

          {posterError ? (
            <Text style={styles.posterErrorText}>{posterError}</Text>
          ) : null}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionEyebrow}>Current wind</Text>

          {kiteableForecastLoading ? (
            <Text style={styles.subtleText}>Checking current wind...</Text>
          ) : kiteableForecastError ? (
            <Text style={styles.errorText}>{kiteableForecastError}</Text>
          ) : kiteableNow ? (
            <View style={styles.conditionsWrap}>
              <View style={styles.windHeadlineRow}>
                <Text style={styles.windValue}>{windSpeedLabel}</Text>
                <Text style={styles.windUnit}>knots</Text>
              </View>

              <Text style={styles.windDirectionText}>{directionLabel}</Text>

              <View style={styles.quickStatsRow}>
                <View style={styles.quickStatCard}>
                  <Text style={styles.quickStatLabel}>Direction</Text>
                  <Text
                    style={[
                      styles.quickStatValue,
                      { color: directionChipColors.textColor },
                    ]}
                  >
                    {kiteableNow.directionOk ? 'Pass' : 'Fail'}
                  </Text>
                </View>
                <View style={styles.quickStatCard}>
                  <Text style={styles.quickStatLabel}>Speed</Text>
                  <Text
                    style={[
                      styles.quickStatValue,
                      { color: speedChipColors.textColor },
                    ]}
                  >
                    {kiteableNow.speedOk ? 'Pass' : 'Fail'}
                  </Text>
                </View>
                {isTidalSpot ? (
                  <View style={styles.quickStatCard}>
                    <Text style={styles.quickStatLabel}>Tide</Text>
                    <Text
                      style={[
                        styles.quickStatValue,
                        { color: tideChipColors.textColor },
                      ]}
                    >
                      {kiteableNow.tideOk ? 'Pass' : 'Fail'}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.ruleSummaryWrap}>
                <Text style={styles.ruleSummaryText}>
                  Wind range {kiteableForecast?.thresholds?.minWindKn ?? '-'} to{' '}
                  {kiteableForecast?.thresholds?.maxWindKn ?? '-'} kn
                </Text>
                <Text style={styles.ruleSummaryText}>
                  Direction range{' '}
                  {kiteableForecast?.thresholds?.windDirStart ?? '-'} to{' '}
                  {kiteableForecast?.thresholds?.windDirEnd ?? '-'}°
                </Text>
                <Text style={styles.ruleSummaryText}>
                  Rotation{' '}
                  {formatDirectionModeLabel(
                    kiteableForecast?.thresholds?.directionMode ??
                      spotDirectionMode
                  )}
                </Text>
                {isTidalSpot ? (
                  <Text style={styles.ruleSummaryText}>
                    Tide {kiteableForecast?.thresholds?.tideWindowHours ?? '-'}h
                    around {kiteableForecast?.thresholds?.tidePreference ?? '-'}{' '}
                    tide
                  </Text>
                ) : null}
              </View>

              {kiteableForecast?.note ? (
                <Text style={styles.noteText}>{kiteableForecast.note}</Text>
              ) : null}
            </View>
          ) : (
            <Text style={styles.subtleText}>No kiteable data yet.</Text>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionEyebrow}>Spot rating</Text>

          {ratingLoading ? (
            <Text style={styles.subtleText}>Loading rating...</Text>
          ) : (
            <>
              <View style={styles.ratingHeaderRow}>
                <Text style={styles.ratingNumber}>{ratingAverageLabel}</Text>
                <Text style={styles.ratingCountText}>
                  {ratingSummary?.ratingCount ?? 0}{' '}
                  {ratingSummary?.ratingCount === 1 ? 'rating' : 'ratings'}
                </Text>
              </View>

              <View style={styles.starRow}>
                {STAR_VALUES.map((value) => {
                  const selected = value <= (ratingSummary?.myRating ?? 0);
                  return (
                    <View key={value} style={styles.starButton}>
                      <Text
                        onPress={
                          ratingSubmitting ? undefined : () => rateSpot(value)
                        }
                        style={[
                          styles.starIcon,
                          selected
                            ? styles.starIconSelected
                            : styles.starIconOff,
                        ]}
                      >
                        ★
                      </Text>
                    </View>
                  );
                })}
              </View>

              <Text style={styles.subtleText}>
                Your rating: {ratingSummary?.myRating ?? 'Not rated yet'}
              </Text>

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
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Next 42 hours</Text>
            <Text style={styles.sectionHeaderMeta}>
              {kiteableForecast?.kiteableHours ?? 0}/
              {kiteableForecast?.requestedHours ?? 42} kiteable
            </Text>
          </View>

          {kiteableForecastLoading ? (
            <Text style={styles.subtleText}>Loading forecast...</Text>
          ) : kiteableForecastError ? (
            <Text style={styles.errorText}>{kiteableForecastError}</Text>
          ) : kiteableForecast?.forecast?.length ? (
            <ScrollView
              style={styles.forecastScrollArea}
              contentContainerStyle={styles.forecastGrid}
              nestedScrollEnabled
            >
              {kiteableForecast.forecast.map((hour) => {
                const hourColors = getStatusChipColors(hour.kiteable);

                return (
                  <View
                    key={hour.time}
                    style={[
                      styles.forecastTile,
                      {
                        backgroundColor: hourColors.backgroundColor,
                        borderColor: hourColors.borderColor,
                      },
                    ]}
                  >
                    <Text style={styles.forecastTileDay}>
                      {formatForecastDayLabel(hour.time)}
                    </Text>
                    <Text style={styles.forecastTileTime}>
                      {formatForecastTimeLabel(hour.time)}
                    </Text>
                    <Text style={styles.forecastTileSpeed}>
                      {hour.speedKn?.toFixed(1) ?? '-'} knots
                    </Text>
                    <Text style={styles.forecastTileMeta}>
                      {hour.directionDeg}°
                    </Text>
                    <Text
                      style={[
                        styles.forecastTileStatus,
                        { color: hourColors.textColor },
                      ]}
                    >
                      {getForecastStatusLabel(hour)}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          ) : (
            <Text style={styles.subtleText}>No forecast data yet.</Text>
          )}
        </View>

        {/* Upcoming posts list */}
        <View style={styles.sectionCard}>
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
    ...uiStyles.screen,
  },
  content: {
    ...uiStyles.screenContent,
  },
  heroCard: {
    ...uiStyles.largeSurfaceCard,
    gap: 14,
    borderColor: appTheme.colors.borderSoft,
    padding: 18,
  },
  heroHeaderRow: {
    gap: 14,
  },
  heroTextBlock: {
    gap: 8,
  },
  heroEyebrow: {
    ...uiStyles.eyebrowText,
  },
  sectionCard: {
    ...uiStyles.surfaceCard,
    gap: appTheme.spacing.md,
    padding: appTheme.spacing.lg,
    borderRadius: appTheme.radius.xl,
  },
  pageTitle: {
    ...uiStyles.heroTitle,
    fontSize: 34,
  },
  heroMetaRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: appTheme.colors.surfaceSoft,
  },
  metaBadgeText: {
    color: appTheme.colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  heroStatusBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 112,
  },
  heroStatusLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  heroStatusValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroDescription: {
    fontSize: 15,
    lineHeight: 22,
    color: appTheme.colors.text,
  },
  sectionEyebrow: {
    ...uiStyles.eyebrowText,
    color: appTheme.colors.accent,
  },
  sectionTitle: {
    ...uiStyles.pageTitle,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtleText: {
    ...uiStyles.subtleText,
  },
  posterErrorText: {
    color: appTheme.colors.textSubtle,
    fontSize: appTheme.fontSize.xs,
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
    color: appTheme.colors.accent,
  },
  starIconOff: {
    color: appTheme.colors.borderSoft,
  },
  conditionsWrap: {
    gap: 14,
  },
  windHeadlineRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  windValue: {
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -2,
    color: appTheme.colors.textStrong,
  },
  windUnit: {
    fontSize: 22,
    fontWeight: '700',
    color: appTheme.colors.accent,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  windDirectionText: {
    fontSize: 18,
    fontWeight: '700',
    color: appTheme.colors.textStrong,
  },
  quickStatsRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  quickStatCard: {
    flexGrow: 1,
    minWidth: 96,
    backgroundColor: appTheme.colors.surfaceMuted,
    borderRadius: appTheme.radius.lg,
    paddingHorizontal: appTheme.spacing.md,
    paddingVertical: appTheme.spacing.md,
  },
  quickStatLabel: {
    ...uiStyles.fieldLabel,
    color: appTheme.colors.textSubtle,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  ruleSummaryWrap: {
    gap: 6,
    paddingTop: 2,
  },
  ruleSummaryText: {
    color: appTheme.colors.textSoft,
    fontSize: 14,
  },
  noteText: {
    color: appTheme.colors.textSubtle,
    fontSize: 12,
  },
  ratingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  ratingNumber: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
    color: appTheme.colors.textStrong,
  },
  ratingCountText: {
    color: appTheme.colors.textSubtle,
    fontSize: 13,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  sectionHeaderMeta: {
    color: appTheme.colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  forecastScrollArea: {
    maxHeight: 340,
  },
  // Use cards instead of a long raw text list so the forecast feels closer to the reference layout.
  forecastGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    paddingRight: 4,
  },
  forecastTile: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    gap: 3,
  },
  forecastTileDay: {
    color: appTheme.colors.textSubtle,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  forecastTileTime: {
    color: appTheme.colors.textStrong,
    fontWeight: '700',
  },
  forecastTileSpeed: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -1,
    color: appTheme.colors.textStrong,
  },
  forecastTileMeta: {
    color: appTheme.colors.textSoft,
    fontSize: 12,
  },
  forecastTileStatus: {
    fontSize: 12,
    fontWeight: '700',
  },
  manageActions: {
    gap: 10,
  },
  errorText: {
    ...uiStyles.errorText,
  },
});
