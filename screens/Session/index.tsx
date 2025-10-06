import LiveSession from '@/components/LiveSession';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { SessionInterface } from '@/helpers/types';
import React, { useState } from 'react';
import { View } from 'react-native';

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
      <View className="flex-1 justify-center items-center p-5">
        <Text className="text-4xl mb-2">🏄</Text>
        <Text className="text-2xl font-bold mb-6">Start a New Session</Text>
        <Button onPress={handleStart} className="px-8 py-4">
          <ButtonText className="text-lg">Start Session</ButtonText>
        </Button>

        {sessions.length > 0 && (
  <VStack className="mt-10 w-full px-5" space="lg">
    <Text className="text-2xl font-bold text-sky-900">Recent Sessions</Text>
    <VStack space="md">
      {sessions.slice(0, 3).map((session) => (
        <VStack 
          key={session.id} 
          className="bg-white p-5 rounded-xl shadow-md"
          space="sm"
        >
          <Text className="text-lg font-bold text-sky-900">
            {session.date.toLocaleDateString()}
          </Text>
          <Text className="text-sm text-gray-500">
            {session.date.toLocaleTimeString()}
          </Text>
          <HStack className="mt-2" space="xl">
            <VStack space="xs">
              <Text className="text-xs text-gray-500">Duration</Text>
              <Text className="text-base font-semibold text-sky-900">
                {Math.floor(session.duration / 60)}:{(session.duration % 60).toString().padStart(2, '0')}
              </Text>
            </VStack>
            <VStack space="xs">
              <Text className="text-xs text-gray-500">Distance</Text>
              <Text className="text-base font-semibold text-sky-900">
                {session.distance.toFixed(2)} km
              </Text>
            </VStack>
          </HStack>
        </VStack>
      ))}
    </VStack>
  </VStack>
)}
      </View>
  );
};

export default Session;