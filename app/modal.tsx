import { createShopifyCustomer, getShopifyCustomer, ShopifyCustomer, signInShopifyCustomer } from '@/services/shopify';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const TOKEN_KEY = 'shopify_customer_access_token';

export default function AccountScreen() {
  const [mode, setMode] = useState<'signin' | 'create'>('signin');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [customer, setCustomer] = useState<ShopifyCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    SecureStore.getItemAsync(TOKEN_KEY)
      .then(async (token) => token ? getShopifyCustomer(token) : null)
      .then(setCustomer)
      .catch(() => SecureStore.deleteItemAsync(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  const submit = async () => {
    if (!email.trim() || password.length < 5 || (mode === 'create' && (!firstName.trim() || !lastName.trim()))) {
      setError('Please complete every field. Password must contain at least 5 characters.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      if (mode === 'create') await createShopifyCustomer({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), password });
      const session = await signInShopifyCustomer(email.trim(), password);
      await SecureStore.setItemAsync(TOKEN_KEY, session.accessToken);
      const profile = await getShopifyCustomer(session.accessToken);
      setCustomer(profile);
      setPassword('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to access your Shopify account.');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setCustomer(null);
  };

  if (loading && !customer) return <View style={styles.center}><ActivityIndicator size="large" color="#174f86" /></View>;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.icon}><Ionicons name="person-outline" size={34} color="#174f86" /></View>
        {customer ? (
          <>
            <Text style={styles.title}>Hello, {customer.displayName}</Text>
            <Text style={styles.copy}>{customer.email}</Text>
            <View style={styles.summary}><Text style={styles.summaryNumber}>{customer.numberOfOrders}</Text><Text style={styles.summaryLabel}>Shopify orders</Text></View>
            <TouchableOpacity style={styles.secondaryButton} onPress={signOut}><Text style={styles.secondaryText}>Sign out</Text></TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.title}>{mode === 'create' ? 'Create your account' : 'Welcome back'}</Text>
            <Text style={styles.copy}>Your account is saved securely with Carter&apos;s Shopify store.</Text>
            <View style={styles.tabs}>
              <TouchableOpacity style={[styles.tab, mode === 'signin' && styles.tabActive]} onPress={() => { setMode('signin'); setError(''); }}><Text style={[styles.tabText, mode === 'signin' && styles.tabTextActive]}>Sign in</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.tab, mode === 'create' && styles.tabActive]} onPress={() => { setMode('create'); setError(''); }}><Text style={[styles.tabText, mode === 'create' && styles.tabTextActive]}>Create account</Text></TouchableOpacity>
            </View>
            {mode === 'create' ? <View style={styles.nameRow}><TextInput style={[styles.input, styles.nameInput]} placeholder="First name" value={firstName} onChangeText={setFirstName} /><TextInput style={[styles.input, styles.nameInput]} placeholder="Last name" value={lastName} onChangeText={setLastName} /></View> : null}
            <TextInput style={styles.input} placeholder="Email address" keyboardType="email-address" autoCapitalize="none" autoComplete="email" value={email} onChangeText={setEmail} />
            <TextInput style={styles.input} placeholder="Password" secureTextEntry autoComplete={mode === 'create' ? 'new-password' : 'current-password'} value={password} onChangeText={setPassword} />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TouchableOpacity style={styles.primaryButton} disabled={loading} onPress={submit}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{mode === 'create' ? 'Create account' : 'Sign in'}</Text>}</TouchableOpacity>
          </>
        )}
        <Link href="/" dismissTo style={styles.link}>Continue shopping</Link>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  container: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }, icon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eaf3f4', marginBottom: 18 },
  title: { color: '#0b1e42', fontSize: 25, fontWeight: '900', textAlign: 'center' }, copy: { color: '#657083', textAlign: 'center', maxWidth: 330, lineHeight: 21, marginTop: 9, marginBottom: 20 },
  tabs: { width: '100%', maxWidth: 360, flexDirection: 'row', backgroundColor: '#f3f6f8', borderRadius: 8, padding: 4, marginBottom: 16 }, tab: { flex: 1, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 6 }, tabActive: { backgroundColor: '#fff' }, tabText: { color: '#718096', fontWeight: '700' }, tabTextActive: { color: '#174f86', fontWeight: '900' },
  nameRow: { width: '100%', maxWidth: 360, flexDirection: 'row', gap: 10 }, nameInput: { flex: 1 }, input: { width: '100%', maxWidth: 360, height: 52, borderWidth: 1, borderColor: '#d7dfe7', borderRadius: 7, paddingHorizontal: 14, marginBottom: 11, color: '#17243a', backgroundColor: '#fff' },
  error: { width: '100%', maxWidth: 360, color: '#c5524a', lineHeight: 19, marginBottom: 12 }, primaryButton: { width: '100%', maxWidth: 360, height: 52, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#174f86' }, primaryText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  secondaryButton: { width: '100%', maxWidth: 340, height: 50, borderWidth: 1, borderColor: '#174f86', borderRadius: 7, alignItems: 'center', justifyContent: 'center', marginTop: 22 }, secondaryText: { color: '#174f86', fontWeight: '800' }, link: { color: '#174f86', fontWeight: '700', marginTop: 20, padding: 10 },
  summary: { width: 150, padding: 20, borderRadius: 12, backgroundColor: '#eaf3f4', alignItems: 'center' }, summaryNumber: { color: '#174f86', fontSize: 28, fontWeight: '900' }, summaryLabel: { color: '#657083', marginTop: 4, fontWeight: '700' },
});
