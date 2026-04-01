import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Callout, Marker, type Region } from '@/components/maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input, InputField } from '@/components/ui/input';
import { getCurrentLocation } from '@/helpers/helpers';
import { buildSpotRouteParams } from '@/helpers/spotRoute';
import { fetchGlobalSpots, searchGlobalSpots } from './spots.api';
import type { Pin, Spot } from './spots.types';

export default function SpotsScreen() {
  const router = useRouter();
  // Map ref so we can center the view when a user picks a suggestion.
  const mapRef = useRef<MapView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialRegion, setInitialRegion] = useState<Region | null>(null);
  const [pendingSpot, setPendingSpot] = useState<Pin | null>(null);
  const [allSpots, setAllSpots] = useState<Spot[]>([]);
  const [visibleSpots, setVisibleSpots] = useState<Spot[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Spot[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const loadSpots = useCallback(async () => {
    try {
      const data = await fetchGlobalSpots();
      const items = Array.isArray(data?.spots) ? data.spots : [];
      setAllSpots(items);
      // Show all markers right after a refresh. Region filtering still applies on map move.
      setVisibleSpots(items);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? 'Fetch spots failed');
    }
  }, []);

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
          latitudeDelta: 0.064,
          longitudeDelta: 0.064,
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

    loadLocation();
    loadSpots();

    return () => {
      isMounted = false;
    };
  }, [loadSpots]);

  // Refresh spots when screen becomes active again
  useFocusEffect(
    useCallback(() => {
      loadSpots();
      return () => {};
    }, [loadSpots])
  );

  // Run a basic search, and as the user types it will autosuggestß
  useEffect(() => {
    let isMounted = true;
    const query = searchQuery.trim();

    if (!query) {
      setSearchResults([]);
      setSearching(false);
      setSearchError(null);
      return () => {
        isMounted = false;
      };
    }

    const runSearch = async () => {
      setSearching(true);
      setSearchError(null);

      try {
        const data = await searchGlobalSpots(query);

        const items = Array.isArray(data?.spots) ? data.spots : [];

        if (isMounted) {
          setSearchResults(items);
        }
      } catch (err: any) {
        if (isMounted) {
          setSearchResults([]);
          setSearchError(err?.message ?? 'Search spots failed');
        }
      } finally {
        if (isMounted) {
          setSearching(false);
        }
      }
    };

    runSearch();

    return () => {
      isMounted = false;
    };
  }, [searchQuery]);

  // Center the map on a selected spot and hide suggestions.
  const handleSelectSpot = (spot: Spot) => {
    setSearchQuery(spot.name);
    setSearchResults([]);
    setSearchError(null);
    mapRef.current?.animateToRegion(
      {
        latitude: spot.latitude,
        longitude: spot.longitude,
        latitudeDelta: 0.016,
        longitudeDelta: 0.016,
      },
      350
    );
  };

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
    <SafeAreaView style={styles.screen}>
      {loading ? (
        <View style={styles.centeredState}>
          <ActivityIndicator />
          <Text style={styles.stateText}>Loading your location...</Text>
        </View>
      ) : error ? (
        <View style={styles.fallbackWrap}>
          <Text style={styles.fallbackTitle}>Spots Map</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : initialRegion ? (
        <View style={styles.mapWrap}>
          {/* Search bar + suggestions overlay */}
          <View style={styles.searchOverlay}>
            <Input variant="outline" size="md" style={styles.searchInput}>
              <InputField
                placeholder="Search spots by name"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="words"
                selectionColor="#1f6f5f"
                style={styles.searchInputText}
                placeholderTextColor="#777"
              />
            </Input>

            <Pressable onPress={loadSpots} style={styles.refreshButton}>
              <Text style={styles.refreshButtonText}>Refresh spots</Text>
            </Pressable>

            {searching && (
              <Text style={styles.searchStateText}>Searching...</Text>
            )}
            {searchError && (
              <Text style={styles.searchErrorText}>{searchError}</Text>
            )}

            {searchResults.length > 0 && (
              <View style={styles.suggestionsList}>
                {searchResults.map((spot) => (
                  <Pressable
                    key={spot.id}
                    onPress={() => handleSelectSpot(spot)}
                    style={styles.suggestionItem}
                  >
                    <Text style={styles.suggestionName}>{spot.name}</Text>
                    <Text style={styles.suggestionType}>{spot.type}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <MapView
            ref={mapRef}
            style={styles.map}
            mapType="satellite"
            initialRegion={initialRegion}
            showsUserLocation
            onRegionChangeComplete={updateVisibleSpots}
            onPress={() => {
              // Tap away to clear the temporary pin.
              if (pendingSpot) {
                setPendingSpot(null);
              }
              // Tap away to hide any search suggestions.
              setSearchResults([]);
            }}
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
              >
                {/* When user clicks a spot to open up details it will send all
                    The following params to the next screen 'spot-details'*/}
                <Callout
                  onPress={() =>
                    router.push({
                      pathname: '/spot-details',
                      params: buildSpotRouteParams(spot),
                    })
                  }
                >
                  <View style={styles.calloutContent}>
                    <Text style={styles.calloutTitle}>{spot.name}</Text>
                    <Text style={styles.calloutType}>{spot.type}</Text>
                    <Text style={styles.calloutAction}>View details</Text>
                  </View>
                </Callout>
              </Marker>
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
              style={styles.addSpotButton}
            >
              <Text style={styles.addSpotButtonText}>Add Spot</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.fallbackWrap}>
          <Text style={styles.fallbackTitle}>Spots Map</Text>
          <Text style={styles.fallbackSubtitle}>Location unavailable.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  stateText: {
    color: '#666',
  },
  fallbackWrap: {
    padding: 20,
  },
  fallbackTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  fallbackSubtitle: {
    marginTop: 8,
    color: '#666',
  },
  errorText: {
    marginTop: 8,
    color: 'red',
  },
  mapWrap: {
    flex: 1,
  },
  searchOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 2,
    gap: 6,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderColor: '#ddd',
  },
  searchInputText: {
    color: '#1A1A1A',
  },
  refreshButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  refreshButtonText: {
    color: '#1f6f5f',
    fontWeight: '600',
    fontSize: 12,
  },
  searchStateText: {
    color: '#666',
    fontSize: 12,
  },
  searchErrorText: {
    color: 'red',
    fontSize: 12,
  },
  suggestionsList: {
    backgroundColor: '#fff',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 10,
    maxHeight: 200,
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  suggestionName: {
    fontWeight: '600',
  },
  suggestionType: {
    color: '#666',
    fontSize: 12,
  },
  map: {
    flex: 1,
  },
  calloutContent: {
    maxWidth: 180,
    gap: 6,
  },
  calloutTitle: {
    fontWeight: '700',
  },
  calloutType: {
    color: '#666',
  },
  calloutAction: {
    color: '#1f6f5f',
    fontWeight: '600',
  },
  addSpotButton: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: '#1f6f5f',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  addSpotButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});
