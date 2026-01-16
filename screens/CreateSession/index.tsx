import { Button, ButtonText } from "@/components/ui/button";
import { Input, InputField } from "@/components/ui/input";
import { API_BASE } from "@/constants/constants";
import { requestJson, type LocationSuggestion } from "@/helpers/helpers";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import MapView, { Marker, UrlTile } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

const SPORT_OPTIONS = ["kitesurfing", "wingfoiling", "windsurfing", "surfing"];
type Sport = (typeof SPORT_OPTIONS)[number];

const FUTURE_SESSIONS_BASE = `${API_BASE}/future-sessions`;
const JSON_HEADERS = { "Content-Type": "application/json" };
const GEO_AUTOCOMPLETE_URL = `${API_BASE}/geo/autocomplete`;
const AUTOCOMPLETE_MIN_CHARS = 2;
const AUTOCOMPLETE_DEBOUNCE_MS = 350;

const CARD_SHADOW_STYLE = {
  shadowColor: "#000",
  shadowOpacity: 0.35,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 10 },
  elevation: 6,
};

type SessionPayload = {
  sport: Sport;
  time: string;
  location: string;
};

type LocationCoords = {
  latitude: number;
  longitude: number;
};

function formatDate(value: Date) {
  return value.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatTime(value: Date) {
  return value.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateTime(value: Date) {
  return `${formatDate(value)} | ${formatTime(value)}`;
}

export default function CreateSessionScreen() {
  const router = useRouter();
  const [sport, setSport] = useState<Sport | "">("");
  const [dateTime, setDateTime] = useState<Date | null>(null);
  const [location, setLocation] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [locationSearching, setLocationSearching] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationCoords, setLocationCoords] = useState<LocationCoords | null>(null);
  const [selectedLocationLabel, setSelectedLocationLabel] = useState<string | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [draftDateTime, setDraftDateTime] = useState<Date>(new Date());
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const canSubmit = Boolean(sport && dateTime && location.trim());
  const formattedDateTime = dateTime ? formatDateTime(dateTime) : "";

  // Pull location suggestions from the backend proxy.
  const fetchLocationSuggestions = useCallback(async (query: string) => {
    setLocationSearching(true);
    setLocationError(null);

    try {
      const data = await requestJson(
        `${GEO_AUTOCOMPLETE_URL}?q=${encodeURIComponent(query)}`,
        {},
        "Location search failed"
      );
      const results = Array.isArray(data?.results) ? data.results : [];
      const parsed = results.filter(
        (item: any): item is LocationSuggestion =>
          typeof item?.label === "string" &&
          typeof item?.lat === "number" &&
          typeof item?.lon === "number"
      );
      setLocationSuggestions(parsed);
    } catch (err: any) {
      setLocationSuggestions([]);
      setLocationError(err?.message ?? "Location search failed");
    } finally {
      setLocationSearching(false);
    }
  }, []);

  useEffect(() => {
    const trimmed = location.trim();
    if (trimmed.length < AUTOCOMPLETE_MIN_CHARS) {
      setLocationSuggestions([]);
      setLocationSearching(false);
      setLocationError(null);
      return;
    }

    if (selectedLocationLabel && trimmed === selectedLocationLabel) {
      setLocationSearching(false);
      return;
    }

    const handle = setTimeout(() => {
      fetchLocationSuggestions(trimmed);
    }, AUTOCOMPLETE_DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [fetchLocationSuggestions, location, selectedLocationLabel]);

  function handleChangeLocation(value: string) {
    setLocation(value);
    setSelectedLocationLabel(null);
    setLocationCoords(null);
  }

  // Persist the selected suggestion and lock the map to its coordinates.
  function handleSelectLocation(suggestion: LocationSuggestion) {
    setLocation(suggestion.label);
    setSelectedLocationLabel(suggestion.label);
    setLocationCoords({ latitude: suggestion.lat, longitude: suggestion.lon });
    setLocationSuggestions([]);
    setLocationSearching(false);
    setLocationError(null);
  }

  function openDateTimePicker() {
    setDraftDateTime(dateTime ?? new Date());
    setPickerVisible(true);
  }

  function closeDateTimePicker() {
    setPickerVisible(false);
  }

  function confirmDateTimePicker() {
    setDateTime(draftDateTime);
    setPickerVisible(false);
  }

  function handleDraftDateChange(_event: DateTimePickerEvent, selected?: Date) {
    if (!selected) return;
    setDraftDateTime((prev) => {
      const next = new Date(prev);
      next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      return next;
    });
  }

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
    };
  }

  /**
   * Create a future session and return to the profile page.
   */
  async function createPost() {
    const payload = buildPayload();
    if (!payload) {
      setCreateError("Please fill out sport, date/time, and location.");
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      await requestJson(
        `${FUTURE_SESSIONS_BASE}/post-session`,
        {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify(payload),
        },
        "Create session failed"
      );
      router.back();
    } catch (e: any) {
      setCreateError(e?.message ?? "Create session failed");
    } finally {
      setCreating(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-[#14161A]">
      <View className="relative flex-1 overflow-hidden px-5 pt-3">
        <View
          pointerEvents="none"
          className="absolute -top-32 -right-16 h-72 w-72 rounded-full"
          style={{ backgroundColor: "rgba(245, 197, 66, 0.16)" }}
        />
        <View
          pointerEvents="none"
          className="absolute top-24 -left-24 h-80 w-80 rounded-full"
          style={{ backgroundColor: "rgba(82, 214, 194, 0.12)" }}
        />

        <View className="mb-6 gap-2">
          <View className="flex-row items-center justify-between">
            <Button
              onPress={() => router.back()}
              action="secondary"
              variant="outline"
              size="sm"
              className="border border-[#2F3540] bg-[#1E222A]"
            >
              <ButtonText className="text-xs font-semibold text-[#F6F7F8]">
                Back
              </ButtonText>
            </Button>
            <Text className="text-2xl font-bold text-[#F6F7F8]">Create Post</Text>
            <View className="w-16" />
          </View>
          <Text className="text-sm text-[#9BA3AE]">
            Set the details for your next session.
          </Text>
        </View>

        <ScrollView
          contentContainerClassName="gap-5 pb-16"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            className="rounded-3xl border border-[#2A2F37] bg-[#1E222A] p-4 gap-3"
            style={CARD_SHADOW_STYLE}
          >
            <Text className="text-xs font-semibold uppercase tracking-wider text-[#9BA3AE]">
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
                    className={`rounded-full border ${
                      isSelected
                        ? "border-[#F5C542] bg-[#F5C542]"
                        : "border-[#313742] bg-[#2A2F37]"
                    }`}
                  >
                    <ButtonText
                      className={`text-xs capitalize ${
                        isSelected ? "text-[#1A1A1A]" : "text-[#D7DBE0]"
                      }`}
                    >
                      {option}
                    </ButtonText>
                  </Button>
                );
              })}
            </View>
          </View>

          <View
            className="rounded-3xl border border-[#2A2F37] bg-[#1E222A] p-4 gap-3"
            style={CARD_SHADOW_STYLE}
          >
            <Text className="text-xs font-semibold uppercase tracking-wider text-[#9BA3AE]">
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
                className="rounded-2xl border border-[#313742] bg-[#2A2F37]"
              >
                <InputField
                  placeholder="Select date and time"
                  value={formattedDateTime}
                  editable={false}
                  className="text-base text-[#F6F7F8]"
                  placeholderTextColor="#6F7782"
                />
              </Input>
            </Pressable>
          </View>

          <View
            className="rounded-3xl border border-[#2A2F37] bg-[#1E222A] p-4 gap-3"
            style={CARD_SHADOW_STYLE}
          >
            <Text className="text-xs font-semibold uppercase tracking-wider text-[#9BA3AE]">
              Location
            </Text>
            <Input
              variant="outline"
              size="lg"
              className="rounded-2xl border border-[#313742] bg-[#2A2F37]"
            >
              <InputField
                placeholder="Beach or spot name"
                value={location}
                onChangeText={handleChangeLocation}
                autoCapitalize="words"
                className="text-base text-[#F6F7F8]"
                placeholderTextColor="#6F7782"
              />
            </Input>
            {locationSearching && (
              <ActivityIndicator size="small" color="#F5C542" />
            )}
            {locationError && <Text className="text-[#F26A5B]">{locationError}</Text>}
            {locationSuggestions.length > 0 && (
              <View className="overflow-hidden rounded-2xl border border-[#313742] bg-[#242A33]">
                {locationSuggestions.map((suggestion, index) => (
                  <Pressable
                    key={`${suggestion.lat}-${suggestion.lon}-${suggestion.label}-${index}`}
                    onPress={() => handleSelectLocation(suggestion)}
                    className={`px-3 py-2.5 ${
                      index % 2 === 0 ? "bg-[#1F242C]" : "bg-[#242A33]"
                    }`}
                  >
                    <Text className="text-sm text-[#E5E9EE]">{suggestion.label}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            {locationCoords ? (
              <View className="h-48 overflow-hidden rounded-2xl border border-[#313742]">
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
            ) : (
              <Text className="text-xs text-[#8C939E]">
                Select a suggestion to preview the map.
              </Text>
            )}
          </View>

          {createError && <Text className="text-[#F26A5B]">{createError}</Text>}

          <Button
            onPress={createPost}
            disabled={!canSubmit || creating}
            size="lg"
            className="rounded-2xl border border-[#F5C542] bg-[#F5C542]"
          >
            {creating ? (
              <ActivityIndicator color="#1A1A1A" />
            ) : (
              <ButtonText className="text-base font-semibold text-[#1A1A1A]">
                Post
              </ButtonText>
            )}
          </Button>
        </ScrollView>
      </View>
      <Modal visible={pickerVisible} transparent animationType="fade">
        <View className="flex-1 justify-end bg-black/70">
          <View className="rounded-t-3xl border border-[#2A2F37] bg-[#1A1E24] px-5 pb-6 pt-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-white">Pick date and time</Text>
              <Pressable
                onPress={closeDateTimePicker}
                className="h-8 w-8 items-center justify-center rounded-full bg-[#2A2F37]"
              >
                <Text className="text-xs font-semibold text-[#C7CDD7]">X</Text>
              </Pressable>
            </View>
            <Text className="mt-1 text-sm text-[#9BA3AE]">
              {formatDateTime(draftDateTime)}
            </Text>
            <View className="mt-4 gap-3 rounded-2xl border border-[#2D333D] bg-[#222832] p-3">
              <View className="h-40 justify-center">
                <View
                  pointerEvents="none"
                  className="absolute left-4 right-4 h-9 rounded-xl border"
                  style={{
                    top: "50%",
                    transform: [{ translateY: -18 }],
                    borderColor: "#F5C542",
                    backgroundColor: "rgba(245, 197, 66, 0.12)",
                  }}
                />
                <DateTimePicker
                  value={draftDateTime}
                  mode="date"
                  display="spinner"
                  textColor={Platform.OS === "ios" ? "#F6F7F8" : undefined}
                  onChange={handleDraftDateChange}
                  style={{ height: 160 }}
                />
              </View>
              <View className="h-36 justify-center">
                <View
                  pointerEvents="none"
                  className="absolute left-4 right-4 h-9 rounded-xl border"
                  style={{
                    top: "50%",
                    transform: [{ translateY: -18 }],
                    borderColor: "#F5C542",
                    backgroundColor: "rgba(245, 197, 66, 0.12)",
                  }}
                />
                <DateTimePicker
                  value={draftDateTime}
                  mode="time"
                  display="spinner"
                  is24Hour={false}
                  textColor={Platform.OS === "ios" ? "#F6F7F8" : undefined}
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
                className="flex-1 rounded-2xl border border-[#313742] bg-[#1E222A]"
              >
                <ButtonText className="text-sm font-semibold text-[#E1E5EB]">
                  Cancel
                </ButtonText>
              </Button>
              <Button
                onPress={confirmDateTimePicker}
                size="lg"
                className="flex-1 rounded-2xl border border-[#F5C542] bg-[#F5C542]"
              >
                <ButtonText className="text-sm font-semibold text-[#1A1A1A]">
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
