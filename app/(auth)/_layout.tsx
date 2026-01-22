import { Stack } from 'expo-router';

// eslint-disable-next-line react/display-name
export default () => {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="username" />
    </Stack>
  );
};
