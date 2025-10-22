import { Button, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { SessionInterface } from '@/helpers/types';
import { supabase } from '@/lib/supabase';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SessionDetail() {
  const { id } = useLocalSearchParams();
  const [session, setSession] = useState<SessionInterface | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Fetch session details when the component mounts or id changes
   */
  useEffect(() => {
    fetchSessionDetails();
  }, [id]);

  const fetchSessionDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setSession({
        ...data,
        date: new Date(data.date),
        created_at: new Date(data.created_at),
        route: data.route || [],
      });
    } catch (error) {
      console.error('Error fetching session:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center">
        <Text className="text-xl text-gray-500">Session not found</Text>
      </SafeAreaView>
    );
  }

  /**
   * Deletes the current session from the database
   */
  const handleDeleteSession = async () => {
    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      router.back();

    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Session Details',
          headerBackTitle: 'Back',
        }} 
      />
      <SafeAreaView className="flex-1 bg-sky-50">
        <VStack className="p-5" space="lg">
          <View className="bg-white p-6 rounded-xl shadow-md">
            <Text className="text-3xl font-bold text-sky-900 mb-2">
              🏄 Session
            </Text>
            <Text className="text-gray-500">
              {session.date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Text>
            <Text className="text-gray-500">
              {session.date.toLocaleTimeString()}
            </Text>
          </View>

          <VStack space="md">
            <View className="bg-white p-6 rounded-xl shadow-md">
              <Text className="text-sm text-gray-500 mb-2">Duration</Text>
              <Text className="text-4xl font-bold text-sky-900">
                {Math.floor(session.duration / 60)}:
                {(session.duration % 60).toString().padStart(2, '0')}
              </Text>
              <Text className="text-gray-500 mt-1">
                {Math.floor(session.duration / 60)} minutes
              </Text>
            </View>

            <View className="bg-white p-6 rounded-xl shadow-md">
              <Text className="text-sm text-gray-500 mb-2">Distance</Text>
              <Text className="text-4xl font-bold text-sky-900">
                {session.distance.toFixed(2)} km
              </Text>
            </View>

            <View className="bg-white p-6 rounded-xl shadow-md">
              <Text className="text-sm text-gray-500 mb-2">Average Speed</Text>
              <Text className="text-4xl font-bold text-sky-900">
                {session.duration > 0 
                  ? ((session.distance / (session.duration / 3600)).toFixed(1))
                  : '0.0'
                } km/h
              </Text>
            </View>
          </VStack>
        </VStack>
      <Button onPress={handleDeleteSession}>
        <ButtonText className="text-black-500 text-center">Delete Session</ButtonText>
      </Button>
      </SafeAreaView>
    </>
  );
}