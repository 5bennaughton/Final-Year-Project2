import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { appTheme, uiStyles } from '@/constants/theme';
import {
  buildSpotRouteParams,
  parseRouteBoolean,
  parseRouteNumber,
  parseRouteText,
} from '@/helpers/spotRoute';
import Slider from '@react-native-community/slider';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createGlobalSpot, updateGlobalSpot } from './addSpot.api';
import type {
  AddSpotParams,
  DirectionMode,
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
    directionMode: routeDirectionMode,
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
  const [description, setDescription] = useState(
    parseRouteText(routeDescription)
  );
  // Optional wind direction rules (stored as strings so the inputs stay controlled).
  const [windDirStartInput, setWindDirStartInput] = useState(
    routeWindDirStart ? parseRouteText(routeWindDirStart) : ''
  );
  const [windDirEndInput, setWindDirEndInput] = useState(
    routeWindDirEnd ? parseRouteText(routeWindDirEnd) : ''
  );
  const [directionMode, setDirectionMode] = useState<DirectionMode>(
    routeDirectionMode === 'anticlockwise' ? 'anticlockwise' : 'clockwise'
  );
  // tidal flag. Default is false (non-tidal).
  const [isTidal, setIsTidal] = useState(
    parseRouteBoolean(routeIsTidal) === true
  );
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

  // Sliders need a real number, so empty values fall back to sensible defaults.
  const windDirStartValue = parseOptionalNumber(windDirStartInput) ?? 0;
  const windDirEndValue = parseOptionalNumber(windDirEndInput) ?? 180;
  const tideWindowHoursValue = Math.min(
    6,
    Math.max(0, parseOptionalNumber(tideWindowHoursInput) ?? 2)
  );

  const setWindDirection = (key: 'start' | 'end', value: number) => {
    const nextValue = String(Math.round(value));

    if (key === 'start') {
      setWindDirStartInput(nextValue);
      return;
    }

    setWindDirEndInput(nextValue);
  };

  const setTideWindowHours = (value: number) => {
    setTideWindowHoursInput(String(Math.round(value)));
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
      directionMode,
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
          pathname: '/(tabs)/spot-details',
          params: buildSpotRouteParams(updated),
        });
      } else {
        await createGlobalSpot(payload);
        router.back();
      }
    } catch (err: any) {
      setError(
        err?.message ??
          (isEditMode ? 'Update spot failed' : 'Create spot failed')
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>
          {isEditMode ? 'Edit Spot' : 'Add Spot'}
        </Text>

        <Button onPress={goBack}>
          <ButtonText>
            {isEditMode ? 'Back to Details' : 'Back to Map'}
          </ButtonText>
        </Button>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Name</Text>
          <Input size="md">
            <InputField
              placeholder="Spot name"
              value={name}
              onChangeText={setName}
              style={styles.inputText}
              placeholderTextColor={appTheme.colors.textSubtle}
            />
          </Input>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Sport</Text>
          <Input size="md">
            <InputField
              placeholder="kitesurfing"
              value={type}
              onChangeText={setType}
              style={styles.inputText}
              placeholderTextColor={appTheme.colors.textSubtle}
            />
          </Input>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            placeholder="Great kickers on high"
            placeholderTextColor={appTheme.colors.textSubtle}
            value={description}
            onChangeText={setDescription}
            multiline
            style={styles.descriptionInput}
          />
        </View>

        {/* Keep the same saved values, but make them visual instead of typed. */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Wind direction (optional)</Text>
          <View style={styles.windCard}>
            <View style={styles.windPreviewRow}>
              <View style={styles.compass}>
                <Text style={[styles.compassLabel, styles.compassNorth]}>
                  N
                </Text>
                <Text style={[styles.compassLabel, styles.compassEast]}>E</Text>
                <Text style={[styles.compassLabel, styles.compassSouth]}>
                  S
                </Text>
                <Text style={[styles.compassLabel, styles.compassWest]}>W</Text>

                <View
                  style={[
                    styles.compassHand,
                    { transform: [{ rotate: `${windDirStartValue}deg` }] },
                  ]}
                >
                  <View style={[styles.compassHandSegment, styles.startHand]} />
                </View>
                <View
                  style={[
                    styles.compassHand,
                    { transform: [{ rotate: `${windDirEndValue}deg` }] },
                  ]}
                >
                  <View style={[styles.compassHandSegment, styles.endHand]} />
                </View>
                <View style={styles.compassCenterDot} />
              </View>

              <View style={styles.windValues}>
                <Text style={styles.windValueText}>
                  Start: {windDirStartValue}°
                </Text>
                <Text style={styles.windValueText}>
                  End: {windDirEndValue}°
                </Text>
              </View>
            </View>

            <View style={styles.sliderGroup}>
              <Text style={styles.sliderLabel}>Start</Text>
              <Slider
                minimumValue={0}
                maximumValue={359}
                step={1}
                minimumTrackTintColor="#ff8c42"
                maximumTrackTintColor="#d8d8d8"
                thumbTintColor="#ff8c42"
                value={windDirStartValue}
                onValueChange={(value) => setWindDirection('start', value)}
              />
            </View>

            <View style={styles.sliderGroup}>
              <Text style={styles.sliderLabel}>End</Text>
              <Slider
                minimumValue={0}
                maximumValue={359}
                step={1}
                minimumTrackTintColor="#1f6f5f"
                maximumTrackTintColor="#d8d8d8"
                thumbTintColor="#1f6f5f"
                value={windDirEndValue}
                onValueChange={(value) => setWindDirection('end', value)}
              />
            </View>

            <View style={styles.switchRow}>
              <Switch
                value={directionMode === 'anticlockwise'}
                onValueChange={(value) =>
                  setDirectionMode(value ? 'anticlockwise' : 'clockwise')
                }
                trackColor={{
                  false: appTheme.colors.borderSoft,
                  true: appTheme.colors.primary,
                }}
                thumbColor={appTheme.colors.white}
                ios_backgroundColor={appTheme.colors.borderSoft}
              />
              <Text style={styles.switchStateText}>
                {directionMode === 'anticlockwise'
                  ? 'Anti-clockwise'
                  : 'Clockwise'}
              </Text>
            </View>
          </View>
        </View>

        {/* Tidal toggle */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Tidal spot?</Text>
          <View style={styles.switchRow}>
            <Switch
              value={isTidal}
              onValueChange={setIsTidal}
              trackColor={{ false: '#cfcfcf', true: '#1f6f5f' }}
              thumbColor="white"
              ios_backgroundColor="#cfcfcf"
            />
            <Text style={styles.switchStateText}>{isTidal ? 'Yes' : 'No'}</Text>
          </View>
        </View>

        {isTidal ? (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Tide preference</Text>
            <View style={styles.switchRow}>
              <Switch
                value={tidePreference === 'high'}
                onValueChange={(value) =>
                  setTidePreference(value ? 'high' : 'low')
                }
                trackColor={{ false: '#cfcfcf', true: '#1f6f5f' }}
                thumbColor="white"
                ios_backgroundColor="#cfcfcf"
              />
              <Text style={styles.switchStateText}>
                {tidePreference === 'high' ? 'High tide' : 'Low tide'}
              </Text>
            </View>

            <Text style={styles.label}>Tide window hours</Text>
            <View style={styles.sliderGroup}>
              {/* Reuse the same slider control as wind direction, but clamp it to 0-6 hours. */}
              <Text style={styles.windValueText}>
                {tideWindowHoursValue} hours
              </Text>
              <Slider
                minimumValue={0}
                maximumValue={6}
                step={1}
                minimumTrackTintColor="#1f6f5f"
                maximumTrackTintColor="#d8d8d8"
                thumbTintColor="#1f6f5f"
                value={tideWindowHoursValue}
                onValueChange={setTideWindowHours}
              />
            </View>
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
    ...uiStyles.screen,
  },
  content: {
    ...uiStyles.screenContent,
  },
  title: {
    ...uiStyles.pageTitle,
  },
  formGroup: {
    ...uiStyles.section,
    gap: appTheme.spacing.sm,
  },
  label: {
    ...uiStyles.fieldLabel,
  },
  inputText: {
    color: appTheme.colors.textStrong,
  },
  descriptionInput: {
    minHeight: 90,
    ...uiStyles.inputSurface,
    padding: 10,
    textAlignVertical: 'top',
    color: appTheme.colors.textStrong,
  },
  helperText: {
    color: appTheme.colors.textMuted,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  switchStateText: {
    fontSize: appTheme.fontSize.sm,
    fontWeight: '600',
    color: appTheme.colors.textSoft,
  },
  errorText: {
    ...uiStyles.errorText,
  },
  windCard: {
    ...uiStyles.surfaceCard,
    gap: 14,
    padding: 14,
  },
  windPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  compass: {
    width: 120,
    height: 120,
    borderWidth: 2,
    borderColor: appTheme.colors.borderSoft,
    borderRadius: 60,
    backgroundColor: appTheme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  compassLabel: {
    position: 'absolute',
    fontSize: 12,
    fontWeight: '700',
    color: appTheme.colors.textSubtle,
  },
  compassNorth: {
    top: 8,
  },
  compassEast: {
    right: 10,
  },
  compassSouth: {
    bottom: 8,
  },
  compassWest: {
    left: 10,
  },
  // Each hand stays centered and rotates around the middle of the compass.
  compassHand: {
    position: 'absolute',
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  compassHandSegment: {
    width: 4,
    height: 26,
    borderRadius: 999,
  },
  startHand: {
    backgroundColor: appTheme.colors.accent,
  },
  endHand: {
    backgroundColor: appTheme.colors.primary,
  },
  compassCenterDot: {
    width: 10,
    height: 10,
    borderRadius: appTheme.radius.pill,
    backgroundColor: appTheme.colors.textSoft,
  },
  windValues: {
    gap: 8,
    flex: 1,
  },
  windValueText: {
    fontSize: 16,
    fontWeight: '600',
    color: appTheme.colors.textStrong,
  },
  sliderGroup: {
    gap: 6,
  },
  sliderLabel: {
    ...uiStyles.fieldLabel,
    fontWeight: '600',
    textTransform: 'none',
    letterSpacing: 0,
    color: appTheme.colors.textSoft,
  },
});
