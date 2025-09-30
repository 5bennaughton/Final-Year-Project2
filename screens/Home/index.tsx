import { HStack } from '@/components/ui/hstack';
import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// eslint-disable-next-line react/display-name
export default () => {
  return (
    <SafeAreaView>
      <HStack className='justify-betweens '>
        <Text className='text-md font-bold'>Home Screen</Text>
      </HStack>
    </SafeAreaView>
  );
}
