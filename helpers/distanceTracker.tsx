import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';

const useDistanceTracker = () => {
  const [totalDistance, setTotalDistance] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastPositionRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  const startTracking = async () => {
    try {
      // Request permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission to access location was denied');
        return;
      }

      // Reset tracking state
      setTotalDistance(0);
      lastPositionRef.current = null;
      setError(null);

      // Start watching position
      locationSubscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000, // Update every second
          distanceInterval: 1, // Update every meter
        },
        (location) => {
          const { latitude, longitude } = location.coords;

          if (lastPositionRef.current) {
            const distance = calculateDistance(
              lastPositionRef.current.latitude,
              lastPositionRef.current.longitude,
              latitude,
              longitude
            );

            // Only add if distance is reasonable (filter out GPS noise)
            if (distance > 0 && distance < 100) {
              setTotalDistance((prev) => prev + distance);
            }
          }

          lastPositionRef.current = { latitude, longitude };
        }
      );

      setIsTracking(true);
    } catch (err: any) {
      setError(err?.message?.toString() || 'Unknown error');
      console.error('Error starting tracking:', err);
    }
  };

  const stopTracking = () => {
    if (locationSubscriptionRef.current) {
      locationSubscriptionRef.current.remove();
      locationSubscriptionRef.current = null;
    }
    setIsTracking(false);
    lastPositionRef.current = null;
  };

  const resetDistance = () => {
    setTotalDistance(0);
    lastPositionRef.current = null;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
      }
    };
  }, []);

  return {
    totalDistance,
    isTracking,
    error,
    startTracking,
    stopTracking,
    resetDistance,
  };
};

export default useDistanceTracker;
