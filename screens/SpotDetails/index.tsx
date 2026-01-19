import { Button, ButtonText } from '@/components/ui/button';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SpotDetails() {
  const router = useRouter();
  const { name, type, description, lat, lng } = useLocalSearchParams<{
    name?: string;
    type?: string;
    description?: string;
    lat?: string;
    lng?: string;
  }>();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f7f6f2' }}>
      <View style={{ padding: 20, gap: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: '700' }}>
          {name ?? 'Spot Details'}
        </Text>
        <Text style={{ color: '#666' }}>{type ?? 'Unknown type'}</Text>

        {description ? <Text>{description}</Text> : null}

        {lat && lng ? (
          <Text style={{ color: '#777' }}>
            Coordinates: {Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}
          </Text>
        ) : null}

        <Button variant="outline" onPress={() => router.push('/spots')}>
          <ButtonText>Back to Map</ButtonText>
        </Button>
      </View>
    </SafeAreaView>
  );
}
