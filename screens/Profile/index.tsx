
import { useAuth } from '@/Providers/AuthProvider';
import React from 'react';
import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const HomePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <SafeAreaView>
        <Text className='text-md font-bold'>
          Hello {user?.email || 'Guest'}
        </Text>  
    </SafeAreaView>
  );
}

export default HomePage;

