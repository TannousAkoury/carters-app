import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ModalScreen() {
  return (
    <ThemedView style={styles.container}>
      <View style={styles.icon}>
        <Ionicons name="person-outline" size={34} color="#174f86" />
      </View>
      <ThemedText type="title">Your account</ThemedText>
      <ThemedText style={styles.copy}>
        Account sign-in and order history will be available here soon.
      </ThemedText>
      <Link href="/" dismissTo style={styles.link}>
        <ThemedText type="link">Continue shopping</ThemedText>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  icon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eaf3f4',
    marginBottom: 18,
  },
  copy: {
    maxWidth: 320,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
    opacity: 0.7,
  },
});
