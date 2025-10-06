import { SessionInterface } from '@/helpers/types';
import { useAuth } from '@/Providers/AuthProvider';
import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const HomePage: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionInterface[]>([]);

  const handleSessionEnd = (session: SessionInterface) => {
    setSessions(previousSessions => [session, ...previousSessions]);
    console.log('Session ended:', session);
  }; 

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  };

  
  
  
  return (
    <SafeAreaView>
        <Text className='text-md font-bold'>
          Hello {user?.email || 'Guest'}
        </Text>

         <View className="flex-1 p-5">
      
      <ScrollView className="mt-5">
        <Text className="text-2xl font-bold mb-3">Session History</Text>
        {sessions.length === 0 ? (
          <Text className="italic text-gray-600">No sessions yet</Text>
        ) : (
          sessions.map((session) => (
            <View key={session.id} className="bg-gray-100 p-4 mb-3 rounded-lg">
              <Text className="font-bold mb-1">
                {session.date.toLocaleDateString()} {session.date.toLocaleTimeString()}
              </Text>
              <Text>Duration: {formatDuration(session.duration)}</Text>
              <Text>Distance: {session.distance} km</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
       
    </SafeAreaView>
  );
}

export default HomePage;