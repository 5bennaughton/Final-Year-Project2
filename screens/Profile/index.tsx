import { HStack } from '@/components/ui/hstack';
import { useAuth } from '@/Providers/AuthProvider';
import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <SafeAreaView>
      <HStack className='justify-between'>
        <Text className='text-md font-bold'>
          Hello {user?.email || 'Guest'}
        </Text>
      </HStack>
    </SafeAreaView>
  );
}