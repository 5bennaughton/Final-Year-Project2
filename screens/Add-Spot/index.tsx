import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { API_BASE } from '@/constants/constants';
import { requestJson } from '@/helpers/helpers';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type SpotPayload = {
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  description?: string | null;
  windDirStart?: number | null;
  windDirEnd?: number | null;
  isTidal?: boolean;
};

export default function AddSpot() {
  const router = useRouter();
  const { lat, lng } = useLocalSearchParams<{ lat?: string; lng?: string }>();

  // Parse the map coordinates passed from the long-press screen.
  const coords = useMemo(() => {
    const latitude = typeof lat === 'string' ? Number.parseFloat(lat) : NaN;
    const longitude = typeof lng === 'string' ? Number.parseFloat(lng) : NaN;

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }
    return { latitude, longitude };
  }, [lat, lng]);

  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  // Optional wind direction rules (stored as strings so the inputs stay controlled).
  const [windDirStartInput, setWindDirStartInput] = useState('');
  const [windDirEndInput, setWindDirEndInput] = useState('');
  // Basic tidal flag. Default is false (non-tidal).
  const [isTidal, setIsTidal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Convert a text input into a number or null.
   * - Empty string => null (means "not set")
   * - Non-number => undefined (means "invalid")
   */
  const parseOptionalNumber = (value: string): number | null | undefined => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number.parseFloat(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  /**
   * Creates a spot on the global map
   */
  const createSpot = async () => {
    setError(null);

    if (!coords) {
      setError('Missing coordinates from the map.');
      return;
    }

    const trimmedName = name.trim();
    const trimmedType = type.trim();

    if (!trimmedName || !trimmedType) {
      setError('Name and type are required.');
      return;
    }

    /**
     * Parse optional wind direction range (0-359).
     * We allow wrap-around ranges in the backend, but both values are required
     * if the user sets one of them.
     */
    const windDirStart = parseOptionalNumber(windDirStartInput);
    if (windDirStart === undefined) {
      setError('Wind direction start must be a number.');
      return;
    }

    const windDirEnd = parseOptionalNumber(windDirEndInput);
    if (windDirEnd === undefined) {
      setError('Wind direction end must be a number.');
      return;
    }

    // If one is provided, require the other.
    if (
      (windDirStart !== null && windDirEnd === null) ||
      (windDirStart === null && windDirEnd !== null)
    ) {
      setError('Please set both wind direction start and end.');
      return;
    }

    // If provided, make sure it is in a 0-359 range.
    if (windDirStart !== null && (windDirStart < 0 || windDirStart > 359)) {
      setError('Wind direction start must be between 0 and 359.');
      return;
    }
    if (windDirEnd !== null && (windDirEnd < 0 || windDirEnd > 359)) {
      setError('Wind direction end must be between 0 and 359.');
      return;
    }

    /**
     * Details object of each spot
     */
    const payload: SpotPayload = {
      name: trimmedName,
      type: trimmedType,
      latitude: coords.latitude,
      longitude: coords.longitude,
      description: description.trim() ? description.trim() : null,
      windDirStart,
      windDirEnd,
      isTidal,
    };

    setSaving(true);
    try {
      await requestJson(
        `${API_BASE}/global-spots/add-spot`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
        'Create spot failed'
      );
      router.back();
    } catch (err: any) {
      setError(err?.message ?? 'Create spot failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f7f6f2' }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: '700' }}>Add Spot</Text>

        <Button variant="outline" onPress={() => router.replace('/(tabs)/Map')}>
          <ButtonText>Back to Map</ButtonText>
        </Button>

        <View style={{ gap: 8 }}>
          <Text style={{ fontWeight: '600' }}>Name</Text>
          <Input variant="outline" size="md">
            <InputField
              placeholder="Spot name"
              value={name}
              onChangeText={setName}
              style={{ color: 'black' }}
              placeholderTextColor="#888"
            />
          </Input>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ fontWeight: '600' }}>Type</Text>
          <Input variant="outline" size="md">
            <InputField
              placeholder="kitesurf, wing, surf..."
              value={type}
              onChangeText={setType}
              style={{ color: 'black' }}
              placeholderTextColor="#888"
            />
          </Input>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ fontWeight: '600' }}>Description (optional)</Text>
          <TextInput
            placeholder="Short notes about the spot"
            placeholderTextColor="#888"
            value={description}
            onChangeText={setDescription}
            multiline
            style={{
              minHeight: 90,
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: 8,
              padding: 10,
              backgroundColor: 'white',
              textAlignVertical: 'top',
              color: 'black',
            }}
          />
        </View>

        {/* Optional wind direction range in degrees */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontWeight: '600' }}>Wind direction (optional)</Text>
          <Text style={{ color: '#666' }}>
            Put a range of degrees 0-359. Example: North (0) to SW (225)
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput
              placeholder="Start (0-359)"
              placeholderTextColor="#888"
              value={windDirStartInput}
              onChangeText={setWindDirStartInput}
              keyboardType="numeric"
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 8,
                padding: 10,
                backgroundColor: 'white',
                color: 'black',
              }}
            />
            <TextInput
              placeholder="End (0-359)"
              placeholderTextColor="#888"
              value={windDirEndInput}
              onChangeText={setWindDirEndInput}
              keyboardType="numeric"
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 8,
                padding: 10,
                backgroundColor: 'white',
                color: 'black',
              }}
            />
          </View>
        </View>

        {/* Tidal toggle */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontWeight: '600' }}>Tidal spot?</Text>
          <Pressable
            onPress={() => setIsTidal((prev) => !prev)}
            style={{
              alignSelf: 'flex-start',
              backgroundColor: isTidal ? '#1f6f5f' : '#e6e6e6',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: isTidal ? 'white' : '#333' }}>
              {isTidal ? 'Yes (Tidal)' : 'No (Not tidal)'}
            </Text>
          </Pressable>
        </View>

        {/*Displays the cords in lat/long, that is if it is not null*/}
        {coords ? (
          <Text style={{ color: '#777' }}>
            Coordinates: {coords.latitude.toFixed(5)},{' '}
            {coords.longitude.toFixed(5)}
          </Text>
        ) : (
          <Text style={{ color: 'red' }}>Missing coordinates.</Text>
        )}

        {error ? <Text style={{ color: 'red' }}>{error}</Text> : null}

        <Button onPress={createSpot} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <ButtonText>Create Spot</ButtonText>
          )}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
