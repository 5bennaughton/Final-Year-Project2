import { HStack } from '@/components/ui/hstack';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// eslint-disable-next-line react/display-name
export default () => {
  return (
    <SafeAreaView style={styles.screen}>
      <HStack style={styles.row}>
        <Text style={styles.title}>Username</Text>
      </HStack>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
});
