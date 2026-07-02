import { getShopifyCart, ShopifyCart, updateShopifyCartLine } from '@/services/shopify';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useCart } from '@/components/cart-context';
import { ActivityIndicator, FlatList, Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const money = (value?: { amount: string; currencyCode: string }) => value ? `${value.currencyCode === 'USD' ? '$' : `${value.currencyCode} `}${Number(value.amount).toFixed(2)}` : '';

export default function CartScreen() {
  const { setCount } = useCart();
  const router = useRouter();
  const [cart, setCart] = useState<ShopifyCart | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState('');
  const [error, setError] = useState('');

  const loadCart = useCallback(async () => {
    try {
      setLoading(true); setError('');
      const id = await SecureStore.getItemAsync('shopify_cart_id');
      const nextCart = id ? await getShopifyCart(id) : null;
      setCart(nextCart); setCount(nextCart?.totalQuantity ?? 0);
    } catch { setError('Unable to load your cart.'); }
    finally { setLoading(false); }
  }, [setCount]);
  useFocusEffect(useCallback(() => { loadCart(); }, [loadCart]));

  const changeQuantity = async (lineId: string, quantity: number) => {
    if (!cart) return;
    try { setUpdating(lineId); const nextCart = await updateShopifyCartLine(cart.id, lineId, quantity); setCart(nextCart); setCount(nextCart.totalQuantity); }
    catch { setError('Unable to update this item.'); }
    finally { setUpdating(''); }
  };

  const checkout = () => cart && WebBrowser.openBrowserAsync(cart.checkoutUrl, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET, controlsColor: '#174f86', toolbarColor: '#fff' });

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}><TouchableOpacity style={styles.back} onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#174f86" /></TouchableOpacity><Text style={styles.title}>Your cart</Text><Text style={styles.count}>{cart?.totalQuantity ?? 0}</Text></View>
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color="#174f86" /></View> : !cart?.lines.edges.length ? <View style={styles.center}><Ionicons name="bag-outline" size={52} color="#9ba8b6" /><Text style={styles.emptyTitle}>Your cart is empty</Text><TouchableOpacity style={styles.shopButton} onPress={() => router.replace('/')}><Text style={styles.shopText}>Start shopping</Text></TouchableOpacity></View> : (
        <>
          <FlatList data={cart.lines.edges} keyExtractor={({ node }) => node.id} contentContainerStyle={styles.list} renderItem={({ item: { node } }) => (
            <View style={styles.line}><Image source={{ uri: node.merchandise.product.featuredImage?.url }} style={styles.image} /><View style={styles.info}><Text style={styles.productTitle}>{node.merchandise.product.title}</Text><Text style={styles.variant}>{node.merchandise.title}</Text><Text style={styles.price}>{money(node.merchandise.price)}</Text><View style={styles.actions}><TouchableOpacity style={styles.qtyButton} onPress={() => changeQuantity(node.id, node.quantity - 1)}><Ionicons name={node.quantity === 1 ? 'trash-outline' : 'remove'} size={17} color="#174f86" /></TouchableOpacity><Text style={styles.quantity}>{updating === node.id ? '…' : node.quantity}</Text><TouchableOpacity style={styles.qtyButton} onPress={() => changeQuantity(node.id, node.quantity + 1)}><Ionicons name="add" size={17} color="#174f86" /></TouchableOpacity></View></View></View>
          )} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.footer}><View style={styles.totalRow}><Text style={styles.subtotal}>Subtotal</Text><Text style={styles.total}>{money(cart.cost.subtotalAmount)}</Text></View><Text style={styles.note}>Shipping and taxes are calculated at checkout.</Text><TouchableOpacity style={styles.checkout} onPress={checkout}><Text style={styles.checkoutText}>Secure checkout</Text></TouchableOpacity></View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' }, header: { height: 62, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#eee' }, back: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }, title: { flex: 1, textAlign: 'center', color: '#174f86', fontSize: 19, fontWeight: '900' }, count: { width: 42, textAlign: 'center', color: '#174f86', fontWeight: '800' }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 }, emptyTitle: { color: '#22324a', fontSize: 20, fontWeight: '800', marginTop: 15 }, shopButton: { backgroundColor: '#174f86', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 7, marginTop: 20 }, shopText: { color: '#fff', fontWeight: '900' },
  list: { padding: 15 }, line: { flexDirection: 'row', gap: 14, paddingBottom: 16, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#eee' }, image: { width: 95, height: 116, backgroundColor: '#f3f3f3', borderRadius: 5 }, info: { flex: 1 }, productTitle: { color: '#26364d', fontWeight: '800', lineHeight: 20 }, variant: { color: '#758194', marginTop: 5 }, price: { color: '#174f86', fontWeight: '900', marginTop: 8 }, actions: { flexDirection: 'row', alignItems: 'center', marginTop: 12 }, qtyButton: { width: 36, height: 34, borderWidth: 1, borderColor: '#ccd5df', alignItems: 'center', justifyContent: 'center' }, quantity: { width: 38, textAlign: 'center', fontWeight: '800' }, footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#e7e7e7' }, totalRow: { flexDirection: 'row', justifyContent: 'space-between' }, subtotal: { color: '#303b4d', fontSize: 17, fontWeight: '700' }, total: { color: '#174f86', fontSize: 20, fontWeight: '900' }, note: { color: '#7a8494', fontSize: 11, marginTop: 7 }, checkout: { height: 54, backgroundColor: '#174f86', borderRadius: 7, alignItems: 'center', justifyContent: 'center', marginTop: 15 }, checkoutText: { color: '#fff', fontSize: 16, fontWeight: '900' }, error: { color: '#c5524a', textAlign: 'center', padding: 8 },
});
