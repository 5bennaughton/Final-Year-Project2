import { useAuth } from '@/Providers/AuthProvider';
import LiveSession from '@/app/(session)/LiveSession';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { SessionInterface } from '@/helpers/types';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';

const Session: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [sessionActive, setSessionActive] = useState(false);
  const [sessions, setSessions] = useState<SessionInterface[]>([]);
  const [loading, setLoading] = useState(false);

  /**
   * Fetch sessions from the database
   */
  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user?.id)
        .order('date', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Convert date strings to Date objects
      const sessionsWithDates = data?.map(session => ({
        ...session,
        date: new Date(session.date),
        created_at: new Date(session.created_at),
      })) || [];

      setSessions(sessionsWithDates);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };
      

  /**
   * Starts a new session
   */
  const handleStart = () => {
    setSessionActive(true);
  };

  /**
   * Ends the current session and saves it to the supabase database
   */
  const handleSessionEnd = async (session: SessionInterface) => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .insert([
          {
            user_id: user?.id,
            duration: session.duration,
            distance: session.distance,
            date: session.date.toISOString(),
          },
        ])
        .select()
        .single();
        
      if (error) throw error;

      // Add the new session to local state
      setSessions(prev => [
        {
          ...session,
          date: new Date(data.date),
          created_at: new Date(data.created_at),
        },
        ...prev,
      ]);
      setSessionActive(false);
    } catch (error) {
      console.error('Error saving session:', error);
      alert('Failed to save session. Please try again.');
    }
  };

  if (sessionActive) {
    return <LiveSession onSessionEnd={handleSessionEnd} />;
  }

  /**
   * Handles pressing on a session to view the session details
   * @param sessionId ID of the session to view details for
   */
  const handleSessionPress = (sessionId: string) => {
    console.log('Session pressed');
    router.push({
      pathname: '/(session)/session',
      params: { id: sessionId },
    });
};

  return (
    <View className="flex-1 justify-center items-center p-5">
      <Text className="text-4xl mb-2">🏄</Text>
      <Text className="text-2xl text-black font-bold mb-6">Start a New Session</Text>

      <Button onPress={handleStart} size="xl">
        <ButtonText>Start Session</ButtonText>
      </Button>

      {/* Recent Sessions */}
      {sessions.length > 0 && (
        <VStack className="mt-10 w-full px-5" space="lg">
          <Text className="text-2xl font-bold text-sky-900">Recent Sessions</Text>

          <VStack space="md">
            {sessions.slice(0, 3).map((session) => (
              <TouchableOpacity
                key={session.id}
                activeOpacity={0.8}
                onPress={() => handleSessionPress(session.id!)}
              >
                <VStack className="bg-white p-5 rounded-xl shadow-md" space="sm">
                  <Text className="text-lg font-bold text-sky-900">
                    {new Date(session.date).toLocaleDateString()}
                  </Text>
                  <Text className="text-sm text-gray-500">
                    {new Date(session.date).toLocaleTimeString()}
                  </Text>

                  <HStack className="mt-2" space="xl">
                    <VStack space="xs">
                      <Text className="text-xs text-gray-500">Duration</Text>
                      <Text className="text-base font-semibold text-sky-900">
                        {Math.floor(session.duration / 60)}:
                        {(session.duration % 60).toString().padStart(2, '0')}
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
              </TouchableOpacity>
            ))}
          </VStack>
        </VStack>
      )}
    </View>
  );
}

export default Session;