import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { appTheme, uiStyles } from '@/constants/theme';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, UrlTile } from '@/components/maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  createFutureSession,
  fetchAllSpots,
  fetchFriendsList,
  fetchLocationSuggestions as fetchLocationSuggestionResults,
} from './createSession.api';
import type {
  FriendResult,
  LocationCoords,
  LocationSuggestion,
  PostVisibility,
  SessionPayload,
  Sport,
  SpotSuggestion,
} from './createSession.types';

const SPORT_OPTIONS: readonly Sport[] = [
  'kitesurfing',
  'wingfoiling',
  'windsurfing',
  'surfing',
];
const VISIBILITY_OPTIONS: readonly PostVisibility[] = [
  'public',
  'private',
  'custom',
];
const IOS_PICKER_TEXT_COLOR = appTheme.colors.text;

function padDateTimePart(value: number) {
  return String(value).padStart(2, '0');
}

function formatWebDateTimeInputValue(value: Date) {
  return `${value.getFullYear()}-${padDateTimePart(
    value.getMonth() + 1
  )}-${padDateTimePart(value.getDate())}T${padDateTimePart(
    value.getHours()
  )}:${padDateTimePart(value.getMinutes())}`;
}

/**
 * Format a date into a short month/day label.
 */
function formatDate(value: Date) {
  return value.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a time into a localized hour/minute string.
 */
function formatTime(value: Date) {
  return value.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Combine the formatted date and time for display.
 */
function formatDateTime(value: Date) {
  return `${formatDate(value)} | ${formatTime(value)}`;
}

/**
 * Render the Create Session screen and manage form state.
 * Handles location autocomplete and date/time selection.
 */
export default function CreateSessionScreen() {
  const router = useRouter();
  const [sport, setSport] = useState<Sport | ''>('');
  const [dateTime, setDateTime] = useState<Date | null>(null);
  const [location, setLocation] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<
    LocationSuggestion[]
  >([]);
  const [locationSearching, setLocationSearching] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationCoords, setLocationCoords] = useState<LocationCoords | null>(
    null
  );
  const [spotSuggestions, setSpotSuggestions] = useState<SpotSuggestion[]>([]);
  const [allSpots, setAllSpots] = useState<SpotSuggestion[]>([]);
  // Stores the selected community spot id (when a user picks one).
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [selectedLocationLabel, setSelectedLocationLabel] = useState<
    string | null
  >(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [draftDateTime, setDraftDateTime] = useState<Date>(new Date());
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  // Post visibility controls (public/private/custom).
  const [postVisibility, setPostVisibility] =
    useState<PostVisibility>('public');
  // Friend list + selection for custom visibility.
  const [friends, setFriends] = useState<FriendResult[]>([]);
  const [selectedViewerIds, setSelectedViewerIds] = useState<string[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [friendsError, setFriendsError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);

  const canSubmit =
    Boolean(sport && dateTime && location.trim()) &&
    (postVisibility !== 'custom' || selectedViewerIds.length > 0);
  const formattedDateTime = dateTime ? formatDateTime(dateTime) : '';

  /**
   * Fetch all community spots once.
   * These are filtered client-side as the user types.
   */
  useEffect(() => {
    let isMounted = true;

    const loadSpots = async () => {
      try {
        const data = await fetchAllSpots();
        const items = Array.isArray(data?.spots) ? data.spots : [];
        if (isMounted) {
          setAllSpots(items);
        }
      } catch {
        if (isMounted) {
          setAllSpots([]);
        }
      }
    };

    loadSpots();

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Pull location suggestions from the backend proxy.
   * Normalizes response data and handles loading/error state.
   */
  const fetchLocationSuggestions = useCallback(async (query: string) => {
    setLocationSearching(true);
    setLocationError(null);

    try {
      const data = await fetchLocationSuggestionResults(query);
      const results = Array.isArray(data?.results) ? data.results : [];
      const parsed = results.filter(
        (item: any): item is LocationSuggestion =>
          typeof item?.label === 'string' &&
          typeof item?.lat === 'number' &&
          typeof item?.lon === 'number'
      );
      setLocationSuggestions(parsed);
    } catch (err: any) {
      setLocationSuggestions([]);
      setLocationError(err?.message ?? 'Location search failed');
    } finally {
      setLocationSearching(false);
    }
  }, []);

  /**
   * Debounce autocomplete requests based on the location input.
   */
  useEffect(() => {
    const trimmed = location.trim();
    if (trimmed.length < 2) {
      setLocationSuggestions([]);
      setSpotSuggestions([]);
      setLocationSearching(false);
      setLocationError(null);
      return;
    }

    if (selectedLocationLabel && trimmed === selectedLocationLabel) {
      setLocationSearching(false);
      return;
    }

    // Puts the input to lowercase
    const inputToLowercase = trimmed.toLowerCase();

    // Compared input to spots on the DB,
    // If the input is in spots in the DB, it returns those
    const matchedSpots = allSpots.filter((spot) =>
      spot.name.toLowerCase().includes(inputToLowercase)
    );

    // Only stores the first 6 ssuggestions
    setSpotSuggestions(matchedSpots.slice(0, 6));

    const handle = setTimeout(() => {
      fetchLocationSuggestions(trimmed);
    }, 350);

    return () => clearTimeout(handle);
  }, [allSpots, fetchLocationSuggestions, location, selectedLocationLabel]);

  // Keep the suggestions visible by scrolling when they appear.
  useEffect(() => {
    if (spotSuggestions.length === 0 && locationSuggestions.length === 0)
      return;
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [spotSuggestions.length, locationSuggestions.length]);

  /**
   * Load friends only when the user picks custom visibility.
   */
  useEffect(() => {
    if (postVisibility !== 'custom') {
      setSelectedViewerIds([]);
      return;
    }

    let isMounted = true;

    const loadFriends = async () => {
      setLoadingFriends(true);
      setFriendsError(null);

      try {
        const data = await fetchFriendsList();
        const items = Array.isArray(data?.friends) ? data.friends : [];
        if (isMounted) {
          setFriends(items);
          if (items.length === 0) {
            setFriendsError('No friends available for custom visibility.');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setFriends([]);
          setFriendsError(err?.message ?? 'Fetch friends failed');
        }
      } finally {
        if (isMounted) {
          setLoadingFriends(false);
        }
      }
    };

    loadFriends();

    return () => {
      isMounted = false;
    };
  }, [postVisibility]);

  /**
   * Update the location input and reset any selected coordinates.
   */
  function handleChangeLocation(value: string) {
    setLocation(value);
    setSelectedLocationLabel(null);
    setLocationCoords(null);
    setSelectedSpotId(null);
  }

  /**
   * Persist the selected suggestion and lock the map to its coordinates.
   */
  function handleSelectLocation(suggestion: LocationSuggestion) {
    setLocation(suggestion.label);
    setSelectedLocationLabel(suggestion.label);
    setLocationCoords({ latitude: suggestion.lat, longitude: suggestion.lon });
    setSelectedSpotId(null);
    setLocationSuggestions([]);
    setSpotSuggestions([]);
    setLocationSearching(false);
    setLocationError(null);
  }

  /**
   * Select a community spot and use its coordinates.
   */
  function handleSelectSpot(spot: SpotSuggestion) {
    setLocation(spot.name);
    setSelectedLocationLabel(spot.name);
    setLocationCoords({ latitude: spot.latitude, longitude: spot.longitude });
    setSelectedSpotId(spot.id);
    setLocationSuggestions([]);
    setSpotSuggestions([]);
    setLocationSearching(false);
    setLocationError(null);
  }

  /**
   * Toggle a friend in the custom visibility list.
   */
  function toggleViewer(userId: string) {
    setSelectedViewerIds((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      }
      return [...prev, userId];
    });
  }

  /**
   * Open the date/time picker and seed it with the current value.
   */
  function openDateTimePicker() {
    setDraftDateTime(dateTime ?? new Date());
    setPickerVisible(true);
  }

  /**
   * Close the date/time picker without saving changes.
   */
  function closeDateTimePicker() {
    setPickerVisible(false);
  }

  /**
   * Persist the draft date/time and close the picker.
   */
  function confirmDateTimePicker() {
    setDateTime(draftDateTime);
    setPickerVisible(false);
  }

  /**
   * Apply date changes to the draft date/time state.
   */
  function handleDraftDateChange(_event: DateTimePickerEvent, selected?: Date) {
    if (!selected) return;
    setDraftDateTime((prev) => {
      const next = new Date(prev);
      next.setFullYear(
        selected.getFullYear(),
        selected.getMonth(),
        selected.getDate()
      );
      return next;
    });
  }

  /**
   * Apply time changes to the draft date/time state.
   */
  function handleDraftTimeChange(_event: DateTimePickerEvent, selected?: Date) {
    if (!selected) return;
    setDraftDateTime((prev) => {
      const next = new Date(prev);
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      return next;
    });
  }

  function handleWebDraftDateTimeChange(value: string) {
    if (!value) return;

    const next = new Date(value);
    if (Number.isNaN(next.getTime())) return;

    setDraftDateTime(next);
  }

  /**
   * Checks that all required fields are filled (sport, date/time, location).
   * If any are missing/empty, it returns null.
   * If everything is valid, it returns an object with the cleaned values (trimmed strings).
   */
  function buildPayload(): SessionPayload | null {
    if (!sport || !dateTime || !location.trim()) {
      return null;
    }

    if (postVisibility === 'custom' && selectedViewerIds.length === 0) {
      return null;
    }

    return {
      sport,
      time: dateTime.toISOString(),
      location: location.trim(),
      latitude: locationCoords?.latitude ?? null,
      longitude: locationCoords?.longitude ?? null,
      // Include the spotId when the user chose a known spot.
      spotId: selectedSpotId ?? null,
      visibility: postVisibility,
      allowedViewerIds:
        postVisibility === 'custom' ? selectedViewerIds : undefined,
    };
  }

  /**
   * Create a future session and return to the profile page.
   * Validates the form and handles API errors.
   */
  async function createPost() {
    const payload = buildPayload();
    if (!payload) {
      setCreateError(
        'Please fill out sport, date/time, location, and visibility.'
      );
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      await createFutureSession(payload);
      router.back();
    } catch (e: any) {
      setCreateError(e?.message ?? 'Create session failed');
    } finally {
      setCreating(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        <View style={styles.headerSection}>
          <View style={styles.headerRow}>
            <Button
              onPress={() => router.back()}
              action="secondary"
              variant="outline"
              size="sm"
              style={styles.backButton}
            >
              <ButtonText style={styles.backButtonText}>Back</ButtonText>
            </Button>
            <Text style={styles.title}>Create Session</Text>
            <View style={styles.headerSpacer} />
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Sport</Text>
            <View style={styles.chipRow}>
              {SPORT_OPTIONS.map((option) => {
                const isSelected = sport === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setSport(option)}
                    style={({ pressed }) => [
                      styles.sportChip,
                      isSelected
                        ? styles.sportChipSelected
                        : styles.sportChipUnselected,
                      pressed && styles.sportChipPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.sportChipText,
                        isSelected
                          ? styles.sportChipTextSelected
                          : styles.sportChipTextUnselected,
                      ]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Date and time</Text>
            <Pressable
              onPress={openDateTimePicker}
              accessibilityRole="button"
              accessibilityLabel="Pick date and time"
            >
              <Input
                variant="outline"
                size="lg"
                pointerEvents="none"
                style={styles.inputRoot}
              >
                <InputField
                  placeholder="Select date and time"
                  value={formattedDateTime}
                  editable={false}
                  style={styles.inputField}
                  placeholderTextColor={appTheme.colors.textSubtle}
                />
              </Input>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Location</Text>
            <Input variant="outline" size="lg" style={styles.inputRoot}>
              <InputField
                placeholder="Beach or spot name"
                value={location}
                onChangeText={handleChangeLocation}
                autoCapitalize="words"
                style={styles.inputField}
                placeholderTextColor={appTheme.colors.textSubtle}
              />
            </Input>
            {locationSearching ? (
              <ActivityIndicator size="small" color={appTheme.colors.accent} />
            ) : null}
            {locationError ? (
              <Text style={styles.errorText}>{locationError}</Text>
            ) : null}

            {/**
             * If there are more then 0 spot suggestions then render the view below
             */}
            {spotSuggestions.length > 0 && (
              <View style={styles.suggestionsWrap}>
                <Text style={styles.suggestionsTitle}>Spot matches</Text>

                {/** Render the array of 'spotSuggestions' */}
                {spotSuggestions.map((spot, index) => (
                  <Pressable
                    key={`${spot.id}-${index}`}
                    onPress={() => handleSelectSpot(spot)}
                    style={[
                      styles.suggestionItem,
                      index % 2 === 0
                        ? styles.suggestionItemStriped
                        : styles.suggestionItemPlain,
                    ]}
                  >
                    <Text style={styles.suggestionPrimaryText}>
                      {spot.name}
                    </Text>

                    <Text style={styles.suggestionSecondaryText}>
                      {spot.type}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/**
             * If there are more then 0 location suggestions then render the view below
             */}
            {locationSuggestions.length > 0 && (
              <View style={styles.suggestionsWrap}>
                {/** Render the array of 'locationSuggestions' */}
                {locationSuggestions.map((suggestion, index) => (
                  <Pressable
                    key={`${suggestion.lat}-${suggestion.lon}-${suggestion.label}-${index}`}
                    onPress={() => handleSelectLocation(suggestion)}
                    style={[
                      styles.suggestionItem,
                      index % 2 === 0
                        ? styles.suggestionItemStriped
                        : styles.suggestionItemPlain,
                    ]}
                  >
                    <Text style={styles.suggestionLocationText}>
                      {suggestion.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/**If there are location coordinates, then render the map with x lat and long */}
            {locationCoords ? (
              <View style={styles.mapPreviewWrap}>
                <MapView
                  style={styles.mapPreview}
                  region={{
                    latitude: locationCoords.latitude,
                    longitude: locationCoords.longitude,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  pitchEnabled={false}
                  rotateEnabled={false}
                >
                  <UrlTile
                    urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    maximumZ={19}
                  />
                  <Marker coordinate={locationCoords} />
                </MapView>
              </View>
            ) : null}
          </View>

          {/* Post visibility controls */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Visibility</Text>
            <View style={styles.chipRow}>
              {VISIBILITY_OPTIONS.map((option) => {
                const isSelected = postVisibility === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setPostVisibility(option)}
                    style={[
                      styles.visibilityChip,
                      isSelected
                        ? styles.visibilityChipSelected
                        : styles.visibilityChipUnselected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.visibilityChipText,
                        isSelected
                          ? styles.visibilityChipTextSelected
                          : styles.visibilityChipTextUnselected,
                      ]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Only show the friend picker for custom visibility */}
            {postVisibility === 'custom' && (
              <View style={styles.customVisibilityWrap}>
                <Text style={styles.helperText}>
                  Choose friends who can see this post
                </Text>
                {loadingFriends ? (
                  <ActivityIndicator
                    size="small"
                    color={appTheme.colors.primary}
                  />
                ) : null}
                {friendsError ? (
                  <Text style={styles.errorText}>{friendsError}</Text>
                ) : null}
                {friends.map((friend) => {
                  const isSelected = selectedViewerIds.includes(friend.id);
                  return (
                    <Pressable
                      key={friend.id}
                      onPress={() => toggleViewer(friend.id)}
                      style={[
                        styles.friendItem,
                        isSelected
                          ? styles.friendItemSelected
                          : styles.friendItemUnselected,
                      ]}
                    >
                      <Text style={styles.friendName}>{friend.name}</Text>
                      <Text style={styles.friendHint}>
                        {isSelected ? 'Selected' : 'Tap to select'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          {createError ? (
            <Text style={styles.errorText}>{createError}</Text>
          ) : null}

          <Button
            onPress={createPost}
            disabled={!canSubmit || creating}
            size="lg"
            style={styles.submitButton}
          >
            {creating ? (
              <ActivityIndicator color="white" />
            ) : (
              <ButtonText style={styles.submitButtonText}>Post</ButtonText>
            )}
          </Button>
        </ScrollView>
      </View>
      <Modal visible={pickerVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Pick date and time</Text>
              <Pressable
                onPress={closeDateTimePicker}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>X</Text>
              </Pressable>
            </View>
            <Text style={styles.modalPreviewText}>
              {formatDateTime(draftDateTime)}
            </Text>
            {Platform.OS === 'web' ? (
              <View style={styles.pickerPanel}>
                <Text style={styles.webPickerLabel}>Date and time</Text>
                <input
                  type="datetime-local"
                  step={60}
                  value={formatWebDateTimeInputValue(draftDateTime)}
                  onChange={(event) =>
                    handleWebDraftDateTimeChange(event.currentTarget.value)
                  }
                  style={{
                    width: '100%',
                    minHeight: 52,
                    borderRadius: 12,
                    border: `1px solid ${appTheme.colors.border}`,
                    padding: '0 14px',
                    fontSize: 16,
                    fontFamily: 'inherit',
                    color: appTheme.colors.textStrong,
                    backgroundColor: appTheme.colors.surface,
                    boxSizing: 'border-box',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                  }}
                />
              </View>
            ) : (
              <View style={styles.pickerPanel}>
                <View style={styles.pickerDateWrap}>
                  <View pointerEvents="none" style={styles.pickerHighlight} />
                  <DateTimePicker
                    value={draftDateTime}
                    mode="date"
                    display="spinner"
                    textColor={
                      Platform.OS === 'ios' ? IOS_PICKER_TEXT_COLOR : undefined
                    }
                    onChange={handleDraftDateChange}
                    style={styles.datePicker}
                  />
                </View>
                <View style={styles.pickerTimeWrap}>
                  <View pointerEvents="none" style={styles.pickerHighlight} />
                  <DateTimePicker
                    value={draftDateTime}
                    mode="time"
                    display="spinner"
                    is24Hour={false}
                    textColor={
                      Platform.OS === 'ios' ? IOS_PICKER_TEXT_COLOR : undefined
                    }
                    onChange={handleDraftTimeChange}
                    style={styles.timePicker}
                  />
                </View>
              </View>
            )}
            <View style={styles.modalActionsRow}>
              <Button
                onPress={closeDateTimePicker}
                action="secondary"
                variant="outline"
                size="lg"
                style={styles.modalCancelButton}
              >
                <ButtonText style={styles.modalCancelButtonText}>
                  Cancel
                </ButtonText>
              </Button>
              <Button
                onPress={confirmDateTimePicker}
                size="lg"
                style={styles.modalDoneButton}
              >
                <ButtonText style={styles.modalDoneButtonText}>Done</ButtonText>
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...uiStyles.screen,
  },
  container: {
    flex: 1,
    paddingHorizontal: appTheme.spacing.xl,
    paddingTop: appTheme.spacing.md,
  },
  headerSection: {
    marginBottom: appTheme.spacing.xxl,
    gap: appTheme.spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    ...uiStyles.smallOutlineButton,
  },
  backButtonText: {
    ...uiStyles.smallOutlineButtonText,
    color: appTheme.colors.textStrong,
  },
  title: {
    ...uiStyles.pageTitle,
    fontSize: 24,
  },
  headerSpacer: {
    width: 64,
  },
  scrollContent: {
    gap: appTheme.spacing.xl,
    paddingBottom: 64,
  },
  card: {
    ...uiStyles.largeSurfaceCard,
    padding: appTheme.spacing.lg,
    gap: appTheme.spacing.md,
  },
  cardLabel: {
    ...uiStyles.fieldLabel,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: appTheme.spacing.sm,
  },
  sportChip: {
    ...uiStyles.pillButton,
  },
  sportChipSelected: {
    borderColor: appTheme.colors.primary,
    backgroundColor: appTheme.colors.primary,
  },
  sportChipUnselected: {
    borderColor: appTheme.colors.border,
    backgroundColor: appTheme.colors.surface,
  },
  sportChipPressed: {
    opacity: 0.9,
  },
  sportChipText: {
    ...uiStyles.pillButtonText,
    textTransform: 'capitalize',
  },
  sportChipTextSelected: {
    color: appTheme.colors.white,
  },
  sportChipTextUnselected: {
    color: appTheme.colors.textSoft,
  },
  inputRoot: {
    ...uiStyles.inputSurface,
  },
  inputField: {
    fontSize: appTheme.fontSize.md,
    color: appTheme.colors.textStrong,
  },
  errorText: {
    ...uiStyles.errorText,
  },
  suggestionsWrap: {
    overflow: 'hidden',
    ...uiStyles.inputSurface,
  },
  suggestionsTitle: {
    ...uiStyles.fieldLabel,
    color: appTheme.colors.primary,
    paddingHorizontal: appTheme.spacing.md,
    paddingVertical: appTheme.spacing.sm,
  },
  suggestionItem: {
    paddingHorizontal: appTheme.spacing.md,
    paddingVertical: 10,
  },
  suggestionItemStriped: {
    backgroundColor: appTheme.colors.surfaceTint,
  },
  suggestionItemPlain: {
    backgroundColor: appTheme.colors.surface,
  },
  suggestionPrimaryText: {
    fontSize: appTheme.fontSize.sm,
    fontWeight: '600',
    color: appTheme.colors.textStrong,
  },
  suggestionSecondaryText: {
    fontSize: appTheme.fontSize.xs,
    color: appTheme.colors.textMuted,
  },
  suggestionLocationText: {
    fontSize: appTheme.fontSize.sm,
    color: appTheme.colors.textStrong,
  },
  mapPreviewWrap: {
    height: 192,
    overflow: 'hidden',
    borderRadius: appTheme.radius.xl,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
  },
  mapPreview: {
    flex: 1,
  },
  visibilityChip: {
    ...uiStyles.pillButton,
  },
  visibilityChipSelected: {
    borderColor: appTheme.colors.primary,
    backgroundColor: appTheme.colors.primary,
  },
  visibilityChipUnselected: {
    borderColor: appTheme.colors.border,
    backgroundColor: appTheme.colors.surface,
  },
  visibilityChipText: {
    ...uiStyles.pillButtonText,
    textTransform: 'capitalize',
  },
  visibilityChipTextSelected: {
    color: appTheme.colors.white,
  },
  visibilityChipTextUnselected: {
    color: appTheme.colors.textSoft,
  },
  customVisibilityWrap: {
    gap: appTheme.spacing.sm,
  },
  helperText: {
    fontSize: appTheme.fontSize.xs,
    color: appTheme.colors.textMuted,
  },
  friendItem: {
    borderRadius: appTheme.radius.xl,
    borderWidth: 1,
    paddingHorizontal: appTheme.spacing.md,
    paddingVertical: appTheme.spacing.sm,
  },
  friendItemSelected: {
    borderColor: appTheme.colors.primary,
    backgroundColor: appTheme.colors.primarySoft,
  },
  friendItemUnselected: {
    borderColor: appTheme.colors.border,
    backgroundColor: appTheme.colors.surface,
  },
  friendName: {
    fontSize: appTheme.fontSize.sm,
    fontWeight: '600',
    color: appTheme.colors.textStrong,
  },
  friendHint: {
    fontSize: appTheme.fontSize.xs,
    color: appTheme.colors.textMuted,
  },
  submitButton: {
    borderRadius: appTheme.radius.xl,
    borderWidth: 1,
    borderColor: appTheme.colors.primary,
    backgroundColor: appTheme.colors.primary,
  },
  submitButtonText: {
    fontSize: appTheme.fontSize.md,
    fontWeight: '600',
    color: appTheme.colors.white,
  },
  modalBackdrop: {
    ...uiStyles.modalBackdrop,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    ...uiStyles.bottomSheet,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: appTheme.fontSize.lg,
    fontWeight: '600',
    color: appTheme.colors.textStrong,
  },
  closeButton: {
    height: 32,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: appTheme.radius.pill,
    backgroundColor: appTheme.colors.surfaceTint,
  },
  closeButtonText: {
    fontSize: appTheme.fontSize.xs,
    fontWeight: '600',
    color: appTheme.colors.textSoft,
  },
  modalPreviewText: {
    marginTop: 4,
    fontSize: appTheme.fontSize.sm,
    color: appTheme.colors.textMuted,
  },
  webPickerLabel: {
    ...uiStyles.fieldLabel,
  },
  pickerPanel: {
    marginTop: appTheme.spacing.lg,
    gap: appTheme.spacing.md,
    borderRadius: appTheme.radius.xl,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    backgroundColor: appTheme.colors.surfaceTint,
    padding: appTheme.spacing.md,
  },
  pickerDateWrap: {
    height: 160,
    justifyContent: 'center',
  },
  pickerTimeWrap: {
    height: 144,
    justifyContent: 'center',
  },
  pickerHighlight: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 36,
    borderRadius: appTheme.radius.lg,
    borderWidth: 1,
    top: '50%',
    transform: [{ translateY: -18 }],
    borderColor: appTheme.colors.accent,
    backgroundColor: 'rgba(242, 138, 84, 0.12)',
  },
  datePicker: {
    height: 160,
  },
  timePicker: {
    height: 140,
  },
  modalActionsRow: {
    marginTop: appTheme.spacing.lg,
    flexDirection: 'row',
    gap: appTheme.spacing.md,
  },
  modalCancelButton: {
    flex: 1,
    ...uiStyles.inputSurface,
  },
  modalCancelButtonText: {
    fontSize: appTheme.fontSize.sm,
    fontWeight: '600',
    color: appTheme.colors.textSoft,
  },
  modalDoneButton: {
    flex: 1,
    borderRadius: appTheme.radius.xl,
    borderWidth: 1,
    borderColor: appTheme.colors.primary,
    backgroundColor: appTheme.colors.primary,
  },
  modalDoneButtonText: {
    fontSize: appTheme.fontSize.sm,
    fontWeight: '600',
    color: appTheme.colors.white,
  },
});
