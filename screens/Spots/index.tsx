import { API_BASE } from '@/constants/constants';
import { getCurrentLocation, requestJson } from '@/helpers/helpers';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

type Pin = {
  latitude: number;
  longitude: number;
};

type Spot = {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
};

export default function SpotsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialRegion, setInitialRegion] = useState<Region | null>(null);
  const [pendingSpot, setPendingSpot] = useState<Pin | null>(null);
  const [allSpots, setAllSpots] = useState<Spot[]>([]);
  const [visibleSpots, setVisibleSpots] = useState<Spot[]>([]);

  useEffect(() => {
    let isMounted = true;

    // Load the current location once so the map can center on the user.
    const loadLocation = async () => {
      try {
        const position = await getCurrentLocation();
        if (!isMounted) return;

        setInitialRegion({
          latitude: position.latitude,
          longitude: position.longitude,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        });
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message ?? 'Could not load location.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Fetch all spots once. We will filter them client-side.
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
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message ?? 'Fetch spots failed');
        }
      }
    };

    loadLocation();
    loadSpots();

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter the full list to only show pins inside the current map view.
  const updateVisibleSpots = (region: Region) => {
    const minLat = region.latitude - region.latitudeDelta / 2;
    const maxLat = region.latitude + region.latitudeDelta / 2;
    const minLng = region.longitude - region.longitudeDelta / 2;
    const maxLng = region.longitude + region.longitudeDelta / 2;

    const inView = allSpots.filter(
      (spot) =>
        spot.latitude >= minLat &&
        spot.latitude <= maxLat &&
        spot.longitude >= minLng &&
        spot.longitude <= maxLng
    );

    setVisibleSpots(inView);
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {loading ? (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          <ActivityIndicator />
          <Text style={{ color: '#666' }}>Loading your location...</Text>
        </View>
      ) : error ? (
        <View style={{ padding: 20 }}>
          <Text style={{ fontSize: 20, fontWeight: '700' }}>Spots Map</Text>
          <Text style={{ marginTop: 8, color: 'red' }}>{error}</Text>
        </View>
      ) : initialRegion ? (
        <View style={{ flex: 1 }}>
          <MapView
            style={{ flex: 1 }}
            mapType="satellite"
            initialRegion={initialRegion}
            showsUserLocation
            onRegionChangeComplete={updateVisibleSpots}
            onLongPress={(event) => {
              // Drop a temporary pin where the user long-presses.
              const { latitude, longitude } = event.nativeEvent.coordinate;
              setPendingSpot({ latitude, longitude });
            }}
          >
            {visibleSpots.map((spot) => (
              <Marker
                key={spot.id}
                coordinate={{
                  latitude: spot.latitude,
                  longitude: spot.longitude,
                }}
                title={spot.name}
                description={spot.type}
              />
            ))}
            {pendingSpot ? (
              <Marker coordinate={pendingSpot} title="New spot" />
            ) : null}
          </MapView>
          {pendingSpot ? (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/add-spot',
                  params: {
                    lat: String(pendingSpot.latitude),
                    lng: String(pendingSpot.longitude),
                  },
                })
              }
              style={{
                position: 'absolute',
                bottom: 20,
                alignSelf: 'center',
                backgroundColor: '#1f6f5f',
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 10,
              }}
            >
              <Text style={{ color: 'white', fontWeight: '600' }}>
                Add Spot
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={{ padding: 20 }}>
          <Text style={{ fontSize: 20, fontWeight: '700' }}>Spots Map</Text>
          <Text style={{ marginTop: 8, color: '#666' }}>
            Location unavailable.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}
