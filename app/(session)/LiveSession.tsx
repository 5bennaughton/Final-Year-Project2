import { Button, ButtonText } from '@/components/ui/button';
import useDistanceTracker from '@/helpers/distanceTracker';
import Timer from '@/helpers/timer';
import { SessionInterface } from '@/helpers/types';
import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface LiveSessionProps {
  onSessionEnd: (session: SessionInterface) => void;
}

const LiveSession: React.FC<LiveSessionProps> = ({ onSessionEnd }) => {
  const [duration, setDuration] = useState(0);
  const intervalRef = useRef<number | null>(null);

  const {
    totalDistance,
    isTracking,
    error,
    startTracking,
    stopTracking,
    resetDistance,
  } = useDistanceTracker();

  useEffect(() => {
    startTracking();
    intervalRef.current = setInterval(() => setDuration(prev => prev + 1), 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      stopTracking();
    };
  }, []);

  const handleStopSession = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    stopTracking();

    const session: SessionInterface = {
      id: Date.now().toString(),
      duration,
      distance: Number(totalDistance) / 1000, // meters to km
      date: new Date(),
      route: [], // not tracking route
    };

    onSessionEnd(session);
  };

  return (
    <SafeAreaView className="flex-1 bg-sky-50">
      <View className="flex-1 p-5 justify-center items-center">
        <Text className="text-3xl font-bold text-sky-900 mb-10 text-center">
          🏄 Session Active
        </Text>

        <View className="w-full mb-10 gap-4">
          <View className="bg-white p-5 rounded-xl shadow-sm">
            <Text className="text-sm text-gray-600 mb-1">Duration</Text>
            <Text className="text-3xl font-bold text-sky-900">
              <Timer seconds={duration} />
            </Text>
          </View>

          <View className="bg-white p-5 rounded-xl shadow-sm">
            <Text className="text-sm text-gray-600 mb-1">Distance</Text>
            <Text className="text-3xl font-bold text-sky-900">
              {(Number(totalDistance) / 1000).toFixed(2)} km
            </Text>
          </View>
        </View>

        {error && (
          <Text className="text-red-500 mb-4">{error}</Text>
        )}

        <View className="w-full max-w-xs">
          <Button 
            onPress={handleStopSession} 
            className="bg-red-500 py-5 rounded-2xl"
          >
            <ButtonText className="text-white text-xl font-bold">
              Stop Session
            </ButtonText>
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default LiveSession;