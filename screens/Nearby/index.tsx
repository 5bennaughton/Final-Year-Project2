import PostList from '@/components/PostList';
import { API_BASE } from '@/constants/constants';
import { normalizePostCard, requestJson, type PostCardData } from '@/helpers/helpers';
import * as Location from 'expo-location';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const NEARBY_BASE = `${API_BASE}/future-sessions/nearby`;

type GeoCoords = {
  latitude: number;
  longitude: number;
};

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
 * Handles location permission, fetching, and simple error states.
 */
export default function NearbySessionsScreen() {
  const router = useRouter();
  const [radiusKm, setRadiusKm] = useState('10');
  const [posts, setPosts] = useState<PostCardData[]>([]);
  const [coords, setCoords] = useState<GeoCoords | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Ask for location permission and return current coordinates.
   */
  const getCurrentLocation = async (): Promise<GeoCoords> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission denied.');
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  };

  /**
   * Fetch nearby sessions from the API using the current location.
   */
  const fetchNearbySessions = async () => {
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

      const url = `${NEARBY_BASE}?lat=${encodeURIComponent(
        location.latitude
      )}&lng=${encodeURIComponent(location.longitude)}&radiusKm=${encodeURIComponent(
        radius
      )}`;
      const data = await requestJson(url, {}, 'Fetch nearby sessions failed');
      const items = Array.isArray(data?.posts) ? data.posts : [];

      const normalized = items.map((item: any, index: number) =>
        normalizePostCard(item, index)
      );

      setPosts(normalized);
    } catch (err: any) {
      setPosts([]);
      setError(err?.message ?? 'Fetch nearby sessions failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f7f6f2' }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Pressable
          onPress={() => router.back()}
          style={{
            alignSelf: 'flex-start',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#dcdcdc',
            backgroundColor: 'white',
          }}
        >
          <Text style={{ fontWeight: '600' }}>Back</Text>
        </Pressable>

        <Text style={{ fontSize: 22, fontWeight: '700' }}>Nearby Sessions</Text>

        <Text style={{ color: '#666' }}>
          Find future sessions within a radius of your current location.
        </Text>

        <View style={{ gap: 8 }}>
          <Text style={{ fontWeight: '600' }}>Radius (km)</Text>
          <TextInput
            value={radiusKm}
            onChangeText={setRadiusKm}
            keyboardType="numeric"
            placeholder="10"
            placeholderTextColor="#888"
            style={{
              backgroundColor: 'white',
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 8,
            }}
          />
          <Pressable
            onPress={fetchNearbySessions}
            style={{
              backgroundColor: '#1f6f5f',
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 8,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: 'white', fontWeight: '600' }}>
              Find Sessions
            </Text>
          </Pressable>
        </View>

        {coords ? (
          <Text style={{ color: '#777' }}>
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
