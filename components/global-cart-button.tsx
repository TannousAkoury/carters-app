import { useCart } from '@/components/cart-context';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function GlobalCartButton() {
  const pathname = usePathname();
  const router = useRouter();
  const { count } = useCart();
  if (pathname === '/' || pathname === '/account' || pathname === '/cart') return null;
  return (
    <TouchableOpacity style={styles.button} onPress={() => router.push('/cart')} accessibilityLabel={`Cart, ${count} items`}>
      <Ionicons name="cart-outline" size={24} color="#174f86" />
      {count > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text></View> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { position: 'absolute', zIndex: 500, right: 13, top: Platform.OS === 'ios' ? 52 : 34, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 7 },
  badge: { position: 'absolute', right: -3, top: -4, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e0938e', borderWidth: 2, borderColor: '#fff' },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
});
