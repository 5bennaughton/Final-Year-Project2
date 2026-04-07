import PostList from '@/components/PostList';
import Slider from '@react-native-community/slider';
import { appTheme, uiStyles } from '@/constants/theme';
import { getCurrentLocation } from '@/helpers/helpers';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchNearbySessions } from './nearby.api';
import type { GeoCoords } from './nearby.types';

/**
 * The first half of the slider covers 1-30km for finer control nearby.
 * The second half covers 30-100km more quickly.
 */
function sliderToRadiusKm(value: number): number {
  if (value <= 50) {
    return Math.round(1 + (value / 50) * 29);
  }

  return Math.round(30 + ((value - 50) / 50) * 70);
}

function radiusKmToSlider(value: number): number {
  if (value <= 30) {
    return ((value - 1) / 29) * 50;
  }

  return 50 + ((value - 30) / 70) * 50;
}

/**
 * Search for sessions within a radius of the user's current location.
 * Handles location permission, fetching, and error states.
 */
export default function NearbySessionsScreen() {
  const router = useRouter();
  const [radiusKm, setRadiusKm] = useState(10);
  const [posts, setPosts] = useState<any[]>([]);
  const [, setCoords] = useState<GeoCoords | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch nearby sessions from the API using the current location.
   */
  const runNearbySearch = async () => {
    setLoading(true);
    setError(null);

    try {
      const location = await getCurrentLocation();
      setCoords(location);

      const data = await fetchNearbySessions(
        location.latitude,
        location.longitude,
        radiusKm
      );
      const items = Array.isArray(data?.posts) ? data.posts : [];
      setPosts(items);
    } catch (err: any) {
      setPosts([]);
      setError(err?.message ?? 'Fetch nearby sessions failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>

        <Text style={styles.title}>Nearby Sessions</Text>

        <View style={styles.formSection}>
          <Text style={styles.fieldLabel}>Radius (km)</Text>
          <View style={styles.sliderCard}>
            <Text style={styles.radiusValue}>{radiusKm} km</Text>
            <Slider
              minimumValue={0}
              maximumValue={100}
              step={1}
              minimumTrackTintColor={appTheme.colors.primary}
              maximumTrackTintColor={appTheme.colors.borderSoft}
              thumbTintColor={appTheme.colors.primary}
              value={radiusKmToSlider(radiusKm)}
              onValueChange={(value) => setRadiusKm(sliderToRadiusKm(value))}
            />
            <View style={styles.sliderRangeLabels}>
              <Text style={styles.sliderRangeText}>1 km</Text>
              <Text style={styles.sliderRangeText}>30 km</Text>
              <Text style={styles.sliderRangeText}>100 km</Text>
            </View>
          </View>
          <Pressable onPress={runNearbySearch} style={styles.searchButton}>
            <Text style={styles.searchButtonText}>Find Sessions</Text>
          </Pressable>
        </View>

        <PostList
          posts={posts}
          loading={loading}
          error={error}
          emptyMessage="No nearby sessions found."
          onPressUser={(userId, name) =>
            router.push({
              pathname: '/(tabs)/user',
              params: { id: userId, name: name ?? 'User' },
            })
          }
        />
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
  backButton: {
    alignSelf: 'flex-start',
    ...uiStyles.smallOutlineButton,
  },
  backButtonText: {
    ...uiStyles.smallOutlineButtonText,
  },
  title: {
    ...uiStyles.pageTitle,
  },
  formSection: {
    ...uiStyles.section,
  },
  fieldLabel: {
    fontWeight: '600',
  },
  sliderCard: {
    gap: 8,
    padding: 12,
    backgroundColor: appTheme.colors.surface,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 8,
  },
  radiusValue: {
    fontSize: 18,
    fontWeight: '700',
    color: appTheme.colors.textStrong,
  },
  sliderRangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderRangeText: {
    color: appTheme.colors.textMuted,
    fontSize: 12,
  },
  searchButton: {
    backgroundColor: appTheme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  searchButtonText: {
    color: appTheme.colors.white,
    fontWeight: '600',
  },
  coordsText: {
    color: appTheme.colors.textSubtle,
  },
});
