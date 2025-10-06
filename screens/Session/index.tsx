import LiveSession from '@/components/LiveSession';
import { Button, ButtonText } from '@/components/ui/button';
import { SessionInterface } from '@/helpers/types';
import React, { useState } from 'react';
import { SafeAreaView, Text, View } from 'react-native';

const Session: React.FC = () => {
  const [sessionActive, setSessionActive] = useState(false);
  const [sessions, setSessions] = useState<SessionInterface[]>([]);

  const handleStart = () => {
    setSessionActive(true);
  };

  const handleSessionEnd = (session: SessionInterface) => {
    setSessions(prev => [session, ...prev]);
    setSessionActive(false);
    
  };

  if (sessionActive) {
    return <LiveSession onSessionEnd={handleSessionEnd} />;
  }

  return (
    <SafeAreaView className="flex-1 bg-sky-50">
      <View className="flex-1 justify-center items-center p-5">
        <Text className="text-4xl mb-2">🏄</Text>
        <Text className="text-2xl font-bold mb-6">Start a New Session</Text>
        <Button onPress={handleStart} className="px-8 py-4">
          <ButtonText className="text-lg">Start Session</ButtonText>
        </Button>

        {sessions.length > 0 && (
          <View className="mt-10 w-full">
            <Text className="text-xl font-bold mb-4">Recent Sessions</Text>
            {sessions.slice(0, 3).map((session) => (
              <View key={session.id} className="bg-white p-4 rounded-lg mb-3">
                <Text className="font-semibold">
                  {session.date.toLocaleDateString()}
                </Text>
                <Text>Distance: {session.distance.toFixed(2)} km</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default Session;