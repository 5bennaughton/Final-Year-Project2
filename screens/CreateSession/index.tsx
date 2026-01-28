import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { API_BASE } from '@/constants/constants';
import { requestJson, type LocationSuggestion } from '@/helpers/helpers';
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
  Text,
  View,
} from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

const SPORT_OPTIONS = ['kitesurfing', 'wingfoiling', 'windsurfing', 'surfing'];
type Sport = (typeof SPORT_OPTIONS)[number];

const FUTURE_SESSIONS_BASE = `${API_BASE}/future-sessions`;
const JSON_HEADERS = { 'Content-Type': 'application/json' };
const GEO_AUTOCOMPLETE_URL = `${API_BASE}/geo/autocomplete`;

type SessionPayload = {
  sport: Sport;
  time: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  spotId?: string | null;
};

type LocationCoords = {
  latitude: number;
  longitude: number;
};

type SpotSuggestion = {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  description?: string | null;
};

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
  const scrollRef = useRef<ScrollView | null>(null);

  const canSubmit = Boolean(sport && dateTime && location.trim());
  const formattedDateTime = dateTime ? formatDateTime(dateTime) : '';

  /**
   * Fetch all community spots once.
   * These are filtered client-side as the user types.
   */
  useEffect(() => {
    let isMounted = true;

    const loadSpots = async () => {
      try {
        const data = await requestJson(
          `${API_BASE}/global-spots/display-spots`,
          {},
          'Fetch spots failed'
        );
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
      const data = await requestJson(
        `${GEO_AUTOCOMPLETE_URL}?q=${encodeURIComponent(query)}`,
        {},
        'Location search failed'
      );
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

  /**
   * Checks that all required fields are filled (sport, date/time, location).
   * If any are missing/empty, it returns null.
   * If everything is valid, it returns an object with the cleaned values (trimmed strings).
   */
  function buildPayload(): SessionPayload | null {
    if (!sport || !dateTime || !location.trim()) {
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
    };
  }

  /**
   * Create a future session and return to the profile page.
   * Validates the form and handles API errors.
   */
  async function createPost() {
    const payload = buildPayload();
    if (!payload) {
      setCreateError('Please fill out sport, date/time, and location.');
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      await requestJson(
        `${FUTURE_SESSIONS_BASE}/post-session`,
        {
          method: 'POST',
          headers: JSON_HEADERS,
          body: JSON.stringify(payload),
        },
        'Create session failed'
      );
      router.back();
    } catch (e: any) {
      setCreateError(e?.message ?? 'Create session failed');
    } finally {
      setCreating(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-[#f7f6f2]">
      <View className="flex-1 px-5 pt-3">
        <View className="mb-6 gap-2">
          <View className="flex-row items-center justify-between">
            <Button
              onPress={() => router.back()}
              action="secondary"
              variant="outline"
              size="sm"
              className="border border-[#ddd] bg-white"
            >
              <ButtonText className="text-xs font-semibold text-[#1A1A1A]">
                Back
              </ButtonText>
            </Button>
            <Text className="text-2xl font-bold text-[#1A1A1A]">
              Create Post
            </Text>
            <View className="w-16" />
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerClassName="gap-5 pb-16"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="rounded-3xl border border-[#ddd] bg-white p-4 gap-3">
            <Text className="text-xs font-semibold uppercase tracking-wider text-[#777]">
              Sport
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {SPORT_OPTIONS.map((option) => {
                const isSelected = sport === option;
                return (
                  <Button
                    key={option}
                    onPress={() => setSport(option)}
                    variant="solid"
                    size="sm"
                    className={`rounded-full border ${isSelected ? 'border-[#F5C542] bg-[#F5C542]' : 'border-[#ddd] bg-white'}`}
                  >
                    <ButtonText
                      className={`text-xs capitalize ${isSelected ? 'text-[#1A1A1A]' : 'text-[#333]'}`}
                    >
                      {option}
                    </ButtonText>
                  </Button>
                );
              })}
            </View>
          </View>

          <View className="rounded-3xl border border-[#ddd] bg-white p-4 gap-3">
            <Text className="text-xs font-semibold uppercase tracking-wider text-[#777]">
              Date and time
            </Text>
            <Pressable
              onPress={openDateTimePicker}
              accessibilityRole="button"
              accessibilityLabel="Pick date and time"
            >
              <Input
                variant="outline"
                size="lg"
                pointerEvents="none"
                className="rounded-2xl border border-[#ddd] bg-white"
              >
                <InputField
                  placeholder="Select date and time"
                  value={formattedDateTime}
                  editable={false}
                  className="text-base text-[#1A1A1A]"
                  placeholderTextColor="#888"
                />
              </Input>
            </Pressable>
          </View>

          <View className="rounded-3xl border border-[#ddd] bg-white p-4 gap-3">
            <Text className="text-xs font-semibold uppercase tracking-wider text-[#777]">
              Location
            </Text>
            <Input
              variant="outline"
              size="lg"
              className="rounded-2xl border border-[#ddd] bg-white"
            >
              <InputField
                placeholder="Beach or spot name"
                value={location}
                onChangeText={handleChangeLocation}
                autoCapitalize="words"
                className="text-base text-[#1A1A1A]"
                placeholderTextColor="#888"
              />
            </Input>
            {locationSearching && (
              <ActivityIndicator size="small" color="#F5C542" />
            )}
            {locationError && (
              <Text className="text-[#F26A5B]">{locationError}</Text>
            )}

            {/**
             * If there are more then 0 spot suggestions then render the view below
             */}
            {spotSuggestions.length > 0 && (
              <View className="overflow-hidden rounded-2xl border border-[#ddd] bg-white">
                <Text className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[#1f6f5f]">
                  Spot matches
                </Text>

                {/** Render the array of 'spotSuggestions' */}
                {spotSuggestions.map((spot, index) => (
                  <Pressable
                    key={`${spot.id}-${index}`}
                    onPress={() => handleSelectSpot(spot)}
                    className={`px-3 py-2.5 ${index % 2 === 0 ? 'bg-[#f6f6f6]' : 'bg-white'}`}
                  >
                    <Text className="text-sm font-semibold text-[#1A1A1A]">
                      {spot.name}
                    </Text>

                    <Text className="text-xs text-[#666]">{spot.type}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/**
             * If there are more then 0 location suggestions then render the view below
             */}
            {locationSuggestions.length > 0 && (
              <View className="overflow-hidden rounded-2xl border border-[#ddd] bg-white">
                {/** Render the array of 'locationSuggestions' */}
                {locationSuggestions.map((suggestion, index) => (
                  <Pressable
                    key={`${suggestion.lat}-${suggestion.lon}-${suggestion.label}-${index}`}
                    onPress={() => handleSelectLocation(suggestion)}
                    className={`px-3 py-2.5 ${index % 2 === 0 ? 'bg-[#f6f6f6]' : 'bg-white'}`}
                  >
                    <Text className="text-sm text-[#1A1A1A]">
                      {suggestion.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/**If there are location coordinates, then render the map with x lat and long */}
            {locationCoords ? (
              <View className="h-48 overflow-hidden rounded-2xl border border-[#ddd]">
                <MapView
                  style={{ flex: 1 }}
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

          {createError && <Text className="text-[#F26A5B]">{createError}</Text>}

          <Button
            onPress={createPost}
            disabled={!canSubmit || creating}
            size="lg"
            className="rounded-2xl border border-[#1f6f5f] bg-[#1f6f5f]"
          >
            {creating ? (
              <ActivityIndicator color="white" />
            ) : (
              <ButtonText className="text-base font-semibold text-white">
                Post
              </ButtonText>
            )}
          </Button>
        </ScrollView>
      </View>
      <Modal visible={pickerVisible} transparent animationType="fade">
        <View className="flex-1 justify-end bg-black/40">
          <View className="rounded-t-3xl border border-[#ddd] bg-white px-5 pb-6 pt-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-[#1A1A1A]">
                Pick date and time
              </Text>
              <Pressable
                onPress={closeDateTimePicker}
                className="h-8 w-8 items-center justify-center rounded-full bg-[#eee]"
              >
                <Text className="text-xs font-semibold text-[#333]">X</Text>
              </Pressable>
            </View>
            <Text className="mt-1 text-sm text-[#666]">
              {formatDateTime(draftDateTime)}
            </Text>
            <View className="mt-4 gap-3 rounded-2xl border border-[#ddd] bg-[#f7f7f7] p-3">
              <View className="h-40 justify-center">
                <View
                  pointerEvents="none"
                  className="absolute left-4 right-4 h-9 rounded-xl border"
                  style={{
                    top: '50%',
                    transform: [{ translateY: -18 }],
                    borderColor: '#F5C542',
                    backgroundColor: 'rgba(245, 197, 66, 0.12)',
                  }}
                />
                <DateTimePicker
                  value={draftDateTime}
                  mode="date"
                  display="spinner"
                  textColor={Platform.OS === 'ios' ? '#1A1A1A' : undefined}
                  onChange={handleDraftDateChange}
                  style={{ height: 160 }}
                />
              </View>
              <View className="h-36 justify-center">
                <View
                  pointerEvents="none"
                  className="absolute left-4 right-4 h-9 rounded-xl border"
                  style={{
                    top: '50%',
                    transform: [{ translateY: -18 }],
                    borderColor: '#F5C542',
                    backgroundColor: 'rgba(245, 197, 66, 0.12)',
                  }}
                />
                <DateTimePicker
                  value={draftDateTime}
                  mode="time"
                  display="spinner"
                  is24Hour={false}
                  textColor={Platform.OS === 'ios' ? '#1A1A1A' : undefined}
                  onChange={handleDraftTimeChange}
                  style={{ height: 140 }}
                />
              </View>
            </View>
            <View className="mt-4 flex-row gap-3">
              <Button
                onPress={closeDateTimePicker}
                action="secondary"
                variant="outline"
                size="lg"
                className="flex-1 rounded-2xl border border-[#ddd] bg-white"
              >
                <ButtonText className="text-sm font-semibold text-[#333]">
                  Cancel
                </ButtonText>
              </Button>
              <Button
                onPress={confirmDateTimePicker}
                size="lg"
                className="flex-1 rounded-2xl border border-[#1f6f5f] bg-[#1f6f5f]"
              >
                <ButtonText className="text-sm font-semibold text-white">
                  Done
                </ButtonText>
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
