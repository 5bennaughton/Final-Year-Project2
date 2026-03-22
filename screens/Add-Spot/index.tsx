import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import {
  buildSpotRouteParams,
  parseRouteBoolean,
  parseRouteNumber,
  parseRouteText,
} from '@/helpers/spotRoute';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createGlobalSpot, updateGlobalSpot } from './addSpot.api';
import type {
  AddSpotParams,
  SpotPayload,
  TidePreference,
} from './addSpot.types';

export default function AddSpot() {
  const router = useRouter();
  const {
    id,
    mode,
    name: routeName,
    type: routeType,
    description: routeDescription,
    lat,
    lng,
    windDirStart: routeWindDirStart,
    windDirEnd: routeWindDirEnd,
    isTidal: routeIsTidal,
    tidePreference: routeTidePreference,
    tideWindowHours: routeTideWindowHours,
  } = useLocalSearchParams<AddSpotParams>();

  const isEditMode =
    mode === 'edit' && typeof id === 'string' && id.trim().length > 0;

  // Parse the map coordinates passed from the long-press screen.
  const coords = useMemo(() => {
    const latitude = parseRouteNumber(lat);
    const longitude = parseRouteNumber(lng);

    if (latitude === null || longitude === null) {
      return null;
    }
    return { latitude, longitude };
  }, [lat, lng]);

  // The same screen handles both create and edit flows.
  // We hydrate the local form state from route params when editing.
  const [name, setName] = useState(parseRouteText(routeName));
  const [type, setType] = useState(parseRouteText(routeType));
  const [description, setDescription] = useState(parseRouteText(routeDescription));
  // Optional wind direction rules (stored as strings so the inputs stay controlled).
  const [windDirStartInput, setWindDirStartInput] = useState(
    routeWindDirStart ? parseRouteText(routeWindDirStart) : ''
  );
  const [windDirEndInput, setWindDirEndInput] = useState(
    routeWindDirEnd ? parseRouteText(routeWindDirEnd) : ''
  );
  // Basic tidal flag. Default is false (non-tidal).
  const [isTidal, setIsTidal] = useState(parseRouteBoolean(routeIsTidal) === true);
  // choose whether high or low tide is preferred.
  const [tidePreference, setTidePreference] = useState<TidePreference>(
    routeTidePreference === 'low' ? 'low' : 'high'
  );
  // Optional "near high/low tide" window (hours).
  const [tideWindowHoursInput, setTideWindowHoursInput] = useState(
    routeTideWindowHours ? parseRouteText(routeTideWindowHours) : ''
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goBack = () => {
    if (isEditMode) {
      router.back();
      return;
    }
    router.replace('/(tabs)/Map');
  };

  /**
   * Convert a text input into a number or null.
   * - Empty string -> null (means "not set")
   * - Non-number -> undefined (means "invalid")
   */
  const parseOptionalNumber = (value: string): number | null | undefined => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number.parseFloat(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  /**
   * Save the form.
   * This stays intentionally basic: one form, one payload builder,
   * and we choose create vs update based on the route mode.
   */
  const saveSpot = async () => {
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
    const windDirEnd = parseOptionalNumber(windDirEndInput);

    if (windDirStart === undefined || windDirEnd === undefined) {
      setError('Wind direction start/end must be a number.');
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

    // Tide window only matters when the spot is tidal.
    let tideWindowHours: number | null = null;

    if (isTidal) {
      const parsedTideWindow = parseOptionalNumber(tideWindowHoursInput);

      if (parsedTideWindow === undefined) {
        setError('Tide window must be a number.');
        return;
      }

      if (parsedTideWindow === null) {
        setError('Tide window is required for tidal spots.');
        return;
      }

      if (parsedTideWindow < 0) {
        setError('Tide window must be 0 or greater.');
        return;
      }
      tideWindowHours = parsedTideWindow;
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
      tidePreference: isTidal ? tidePreference : null,
      tideWindowHours,
    };

    setSaving(true);
    try {
      if (isEditMode && typeof id === 'string') {
        const updated = await updateGlobalSpot(id, payload);

        // After editing we replace the current screen with fresh route params
        // so the details screen shows the updated spot data immediately.
        router.replace({
          pathname: '/spot-details',
          params: buildSpotRouteParams(updated),
        });
      } else {
        await createGlobalSpot(payload);
        router.back();
      }
    } catch (err: any) {
      setError(
        err?.message ?? (isEditMode ? 'Update spot failed' : 'Create spot failed')
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{isEditMode ? 'Edit Spot' : 'Add Spot'}</Text>

        <Button onPress={goBack}>
          <ButtonText>{isEditMode ? 'Back to Details' : 'Back to Map'}</ButtonText>
        </Button>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Name</Text>
          <Input size="md">
            <InputField
              placeholder="Spot name"
              value={name}
              onChangeText={setName}
              style={styles.inputText}
              placeholderTextColor="#888"
            />
          </Input>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Type</Text>
          <Input size="md">
            <InputField
              placeholder="kitesurf, wing, surf..."
              value={type}
              onChangeText={setType}
              style={styles.inputText}
              placeholderTextColor="#888"
            />
          </Input>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Description (optional)</Text>
          <TextInput
            placeholder="Short notes about the spot"
            placeholderTextColor="#888"
            value={description}
            onChangeText={setDescription}
            multiline
            style={styles.descriptionInput}
          />
        </View>

        {/* Optional wind direction range in degrees */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Wind direction (optional)</Text>
          <View style={styles.row}>
            <TextInput
              placeholder="Start (0-359)"
              placeholderTextColor="#888"
              value={windDirStartInput}
              onChangeText={setWindDirStartInput}
              keyboardType="numeric"
              style={styles.halfInput}
            />
            <TextInput
              placeholder="End (0-359)"
              placeholderTextColor="#888"
              value={windDirEndInput}
              onChangeText={setWindDirEndInput}
              keyboardType="numeric"
              style={styles.halfInput}
            />
          </View>
        </View>

        {/* Tidal toggle */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Tidal spot?</Text>
          <Pressable
            onPress={() => setIsTidal((prev) => !prev)}
            style={[
              styles.toggleButton,
              isTidal ? styles.toggleButtonActive : styles.toggleButtonInactive,
            ]}
          >
            <Text
              style={[
                styles.toggleButtonText,
                isTidal
                  ? styles.toggleButtonTextActive
                  : styles.toggleButtonTextInactive,
              ]}
            >
              {isTidal ? 'Yes (Tidal)' : 'No (Not tidal)'}
            </Text>
          </Pressable>
        </View>

        {isTidal ? (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Tide preference</Text>
            <View style={styles.row}>
              <Pressable
                onPress={() => setTidePreference('high')}
                style={[
                  styles.toggleButton,
                  tidePreference === 'high'
                    ? styles.toggleButtonActive
                    : styles.toggleButtonInactive,
                ]}
              >
                <Text
                  style={[
                    styles.toggleButtonText,
                    tidePreference === 'high'
                      ? styles.toggleButtonTextActive
                      : styles.toggleButtonTextInactive,
                  ]}
                >
                  High tide
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setTidePreference('low')}
                style={[
                  styles.toggleButton,
                  tidePreference === 'low'
                    ? styles.toggleButtonActive
                    : styles.toggleButtonInactive,
                ]}
              >
                <Text
                  style={[
                    styles.toggleButtonText,
                    tidePreference === 'low'
                      ? styles.toggleButtonTextActive
                      : styles.toggleButtonTextInactive,
                  ]}
                >
                  Low tide
                </Text>
              </Pressable>
            </View>

            <Text style={styles.label}>Tide window hours</Text>
            <TextInput
              placeholder="Example: 2"
              placeholderTextColor="#888"
              value={tideWindowHoursInput}
              onChangeText={setTideWindowHoursInput}
              keyboardType="numeric"
              style={styles.fullInput}
            />
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button onPress={saveSpot} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <ButtonText>{isEditMode ? 'Save Spot' : 'Create Spot'}</ButtonText>
          )}
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
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontWeight: '600',
  },
  inputText: {
    color: 'black',
  },
  descriptionInput: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    backgroundColor: 'white',
    textAlignVertical: 'top',
    color: 'black',
  },
  helperText: {
    color: '#666',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  halfInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    backgroundColor: 'white',
    color: 'black',
  },
  fullInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    backgroundColor: 'white',
    color: 'black',
  },
  toggleButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#1f6f5f',
  },
  toggleButtonInactive: {
    backgroundColor: '#e6e6e6',
  },
  toggleButtonText: {},
  toggleButtonTextActive: {
    color: 'white',
  },
  toggleButtonTextInactive: {
    color: '#333',
  },
  errorText: {
    color: 'red',
  },
});
