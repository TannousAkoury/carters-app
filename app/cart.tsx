import { getShopifyCart, markShopifyCartAsAppOrder, ShopifyCart, updateShopifyCartLine } from '@/services/shopify';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useCart } from '@/components/cart-context';
import { useCurrency } from '@/components/currency-context';
import { salePercentage } from '@/utils/pricing';
import { ActivityIndicator, FlatList, Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function CartScreen() {
  const { setCount } = useCart();
  const { currency, toggleCurrency, formatMoney } = useCurrency();
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

  const checkout = async () => {
    if (!cart) return;
    try {
      setLoading(true);
      await markShopifyCartAsAppOrder(cart.id);
      await WebBrowser.openBrowserAsync(cart.checkoutUrl, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET, controlsColor: '#002041', toolbarColor: '#fff' });
    } catch { setError('Unable to prepare checkout. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}><TouchableOpacity style={styles.back} onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#002041" /></TouchableOpacity><Text style={styles.title}>Your cart</Text><TouchableOpacity onPress={toggleCurrency} style={styles.currencySwitch}><Text style={styles.currencyText}>{currency} ⇄</Text></TouchableOpacity></View>
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color="#002041" /></View> : !cart?.lines.edges.length ? <View style={styles.center}><Ionicons name="bag-outline" size={52} color="#9ba8b6" /><Text style={styles.emptyTitle}>Your cart is empty</Text><TouchableOpacity style={styles.shopButton} onPress={() => router.replace('/')}><Text style={styles.shopText}>Start shopping</Text></TouchableOpacity></View> : (
        <>
          <FlatList data={cart.lines.edges} keyExtractor={({ node }) => node.id} contentContainerStyle={styles.list} renderItem={({ item: { node } }) => {
            const discount = salePercentage(node.merchandise.price.amount, node.merchandise.compareAtPrice?.amount);
            return <View style={styles.line}><View><Image source={{ uri: node.merchandise.product.featuredImage?.url }} style={styles.image} />{discount ? <Text style={styles.saleBadge}>-{discount}%</Text> : null}</View><View style={styles.info}><Text style={styles.productTitle}>{node.merchandise.product.title}</Text><Text style={styles.variant}>{node.merchandise.title}</Text><View style={styles.priceRow}><Text style={[styles.price, discount !== null ? styles.salePrice : null]}>{formatMoney(node.merchandise.price)}</Text>{discount && node.merchandise.compareAtPrice ? <Text style={styles.oldPrice}>{formatMoney(node.merchandise.compareAtPrice)}</Text> : null}</View>{node.attributes.map((attribute) => <View key={`${attribute.key}-${attribute.value}`} style={styles.giftRow}><Ionicons name="gift-outline" size={18} color="#002041" /><Text style={styles.giftText}>{attribute.key === 'Gift packaging' ? attribute.value : `${attribute.key}: ${attribute.value}`}</Text></View>)}<View style={styles.actions}><TouchableOpacity style={styles.qtyButton} onPress={() => changeQuantity(node.id, node.quantity - 1)}><Ionicons name={node.quantity === 1 ? 'trash-outline' : 'remove'} size={17} color="#002041" /></TouchableOpacity><Text style={styles.quantity}>{updating === node.id ? '…' : node.quantity}</Text><TouchableOpacity style={styles.qtyButton} onPress={() => changeQuantity(node.id, node.quantity + 1)}><Ionicons name="add" size={17} color="#002041" /></TouchableOpacity></View></View></View>;
          }} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.footer}><View style={styles.totalRow}><Text style={styles.subtotal}>Subtotal</Text><Text style={styles.total}>{formatMoney(cart.cost.subtotalAmount)}</Text></View><Text style={styles.note}>Shipping and taxes are calculated at checkout. Checkout may show the store’s base currency.</Text><TouchableOpacity style={styles.checkout} onPress={checkout}><Text style={styles.checkoutText}>Secure checkout</Text></TouchableOpacity></View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' }, header: { height: 62, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#eee' }, back: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }, title: { flex: 1, textAlign: 'center', color: '#002041', fontSize: 19, fontWeight: '900' }, currencySwitch: { minWidth: 48, height: 34, paddingHorizontal: 8, borderRadius: 17, backgroundColor: '#eef5f8', alignItems: 'center', justifyContent: 'center' }, currencyText: { color: '#002041', fontSize: 12, fontWeight: '900' }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 }, emptyTitle: { color: '#22324a', fontSize: 20, fontWeight: '800', marginTop: 15 }, shopButton: { backgroundColor: '#002041', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 7, marginTop: 20 }, shopText: { color: '#fff', fontWeight: '900' },
  list: { padding: 15 }, line: { flexDirection: 'row', gap: 14, paddingBottom: 16, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#eee' }, image: { width: 95, height: 116, backgroundColor: '#f3f3f3', borderRadius: 5 }, saleBadge: { position: 'absolute', left: 5, top: 5, color: '#fff', backgroundColor: '#d64545', paddingHorizontal: 6, paddingVertical: 3, fontSize: 9, fontWeight: '900' }, info: { flex: 1 }, productTitle: { color: '#26364d', fontWeight: '800', lineHeight: 20 }, variant: { color: '#758194', marginTop: 5 }, priceRow: { flexDirection: 'row', alignItems: 'center', gap: 7 }, price: { color: '#002041', fontWeight: '900', marginTop: 8 }, salePrice: { color: '#d64545' }, oldPrice: { color: '#9a8f8b', fontSize: 11, marginTop: 8, textDecorationLine: 'line-through' }, giftRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }, giftText: { color: '#002041', fontSize: 13, fontWeight: '800' }, actions: { flexDirection: 'row', alignItems: 'center', marginTop: 12 }, qtyButton: { width: 36, height: 34, borderWidth: 1, borderColor: '#ccd5df', alignItems: 'center', justifyContent: 'center' }, quantity: { width: 38, textAlign: 'center', fontWeight: '800' }, footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#e7e7e7' }, totalRow: { flexDirection: 'row', justifyContent: 'space-between' }, subtotal: { color: '#303b4d', fontSize: 17, fontWeight: '700' }, total: { color: '#002041', fontSize: 20, fontWeight: '900' }, note: { color: '#7a8494', fontSize: 11, marginTop: 7 }, checkout: { height: 54, backgroundColor: '#002041', borderRadius: 7, alignItems: 'center', justifyContent: 'center', marginTop: 15 }, checkoutText: { color: '#fff', fontSize: 16, fontWeight: '900' }, error: { color: '#c5524a', textAlign: 'center', padding: 8 },
});
