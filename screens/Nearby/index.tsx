import PostList from '@/components/PostList';
import { getCurrentLocation } from '@/helpers/helpers';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchNearbySessions } from './nearby.api';
import type { GeoCoords } from './nearby.types';

/**
 * Parse a string radius input into a positive number.
 */
function parseRadiusKm(value: string): number | null {
  const parsed = Number.parseFloat(value.trim());
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

/**
 * Search for sessions within a radius of the user's current location.
 * Handles location permission, fetching, and error states.
 */
export default function NearbySessionsScreen() {
  const router = useRouter();
  const [radiusKm, setRadiusKm] = useState('10');
  const [posts, setPosts] = useState<any[]>([]);
  const [coords, setCoords] = useState<GeoCoords | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch nearby sessions from the API using the current location.
   */
  const runNearbySearch = async () => {
    const radius = parseRadiusKm(radiusKm);
    if (!radius) {
      setError('Enter a valid radius in kilometers.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const location = await getCurrentLocation();
      setCoords(location);

      const data = await fetchNearbySessions(
        location.latitude,
        location.longitude,
        radius
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
          <TextInput
            value={radiusKm}
            onChangeText={setRadiusKm}
            keyboardType="numeric"
            placeholder="10"
            placeholderTextColor="#888"
            style={styles.radiusInput}
          />
          <Pressable onPress={runNearbySearch} style={styles.searchButton}>
            <Text style={styles.searchButtonText}>Find Sessions</Text>
          </Pressable>
        </View>

        {coords ? (
          <Text style={styles.coordsText}>
            Using location: {coords.latitude.toFixed(4)},{' '}
            {coords.longitude.toFixed(4)}
          </Text>
        ) : null}

        <PostList
          posts={posts}
          loading={loading}
          error={error}
          emptyMessage="No nearby sessions found."
          onPressUser={(userId, name) =>
            router.push({
              pathname: '/user',
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
    flex: 1,
    backgroundColor: '#f7f6f2',
  },
  content: {
    padding: 20,
    gap: 16,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dcdcdc',
    backgroundColor: 'white',
  },
  backButtonText: {
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  formSection: {
    gap: 8,
  },
  fieldLabel: {
    fontWeight: '600',
  },
  radiusInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  searchButton: {
    backgroundColor: '#1f6f5f',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  searchButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  coordsText: {
    color: '#777',
  },
});
