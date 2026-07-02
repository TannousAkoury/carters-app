import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { Link } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ModalScreen() {
  const openShopifyAccount = (path: '/account/login' | '/account/register') => {
    WebBrowser.openBrowserAsync(`https://carters.com.lb${path}`, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
      controlsColor: '#174f86',
      toolbarColor: '#ffffff',
    });
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.icon}>
        <Ionicons name="person-outline" size={34} color="#174f86" />
      </View>
      <ThemedText type="title">Your account</ThemedText>
      <ThemedText style={styles.copy}>
        Sign in to view your orders, or create a Carter&apos;s Shopify account.
      </ThemedText>
      <TouchableOpacity style={styles.primaryButton} onPress={() => openShopifyAccount('/account/register')}>
        <ThemedText style={styles.primaryButtonText}>Create account</ThemedText>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryButton} onPress={() => openShopifyAccount('/account/login')}>
        <ThemedText style={styles.secondaryButtonText}>Sign in</ThemedText>
      </TouchableOpacity>
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
    marginTop: 10,
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
  primaryButton: {
    width: '100%',
    maxWidth: 340,
    height: 52,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#174f86',
    marginTop: 26,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    width: '100%',
    maxWidth: 340,
    height: 52,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#174f86',
    marginTop: 10,
  },
  secondaryButtonText: {
    color: '#174f86',
    fontSize: 16,
    fontWeight: '800',
  },
});
