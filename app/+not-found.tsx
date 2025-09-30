import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>This screen doesnt exist.</Text>
      <Link href="/" style={styles.link}>
        <Text style={styles.linkText}>Go back to Home</Text>
      </Link>
    </View>
  );
}

export const screenOptions = {
  title: 'Oops!', // Sets the header title
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  text: {
    fontSize: 20,
    marginBottom: 16,
  },
  link: {
    padding: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  linkText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
