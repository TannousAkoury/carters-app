import { searchProducts, type HomepageProduct } from '@/services/shopify';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<HomepageProduct[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) { setProducts([]); setLoading(false); return; }
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      const results = await searchProducts(query);
      if (active) { setProducts(results); setLoading(false); }
    }, 350);
    return () => { active = false; clearTimeout(timer); };
  }, [query]);

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}><TouchableOpacity style={styles.back} onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#002041" /></TouchableOpacity><View style={styles.searchBox}><Ionicons name="search" size={19} color="#718096" /><TextInput style={styles.input} autoFocus placeholder="Search clothes, styles…" value={query} onChangeText={setQuery} returnKeyType="search" />{query ? <TouchableOpacity onPress={() => setQuery('')}><Ionicons name="close-circle" size={20} color="#9aa5b3" /></TouchableOpacity> : null}</View></View>
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color="#002041" /></View> : (
        <FlatList data={products} keyExtractor={(item) => item.id} numColumns={2} columnWrapperStyle={styles.row} contentContainerStyle={styles.grid} ListHeaderComponent={query.trim().length >= 2 ? <Text style={styles.count}>{products.length} RESULTS</Text> : null} ListEmptyComponent={<View style={styles.center}><Ionicons name="search-outline" size={48} color="#b3bdc8" /><Text style={styles.empty}>{query.trim().length < 2 ? 'Type at least 2 characters to search' : 'No products matched your search'}</Text></View>} renderItem={({ item }) => <TouchableOpacity style={styles.card} onPress={() => item.handle && router.push({ pathname: '/product/[handle]', params: { handle: item.handle } })}><Image source={{ uri: item.image }} style={styles.image} /><Text style={styles.productTitle} numberOfLines={2}>{item.title}</Text><Text style={styles.price}>{item.price}</Text></TouchableOpacity>} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' }, header: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee', gap: 8 }, back: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' }, searchBox: { flex: 1, height: 46, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 13, borderRadius: 23, backgroundColor: '#f1f5f7' }, input: { flex: 1, height: '100%', color: '#17243a', fontSize: 15 }, center: { flex: 1, minHeight: 260, alignItems: 'center', justifyContent: 'center', padding: 25 }, empty: { color: '#718096', marginTop: 12, textAlign: 'center' }, grid: { padding: 12, paddingBottom: 90 }, row: { gap: 12 }, count: { color: '#718096', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 12 }, card: { flex: 1, maxWidth: '48.5%', marginBottom: 22 }, image: { width: '100%', aspectRatio: 0.82, backgroundColor: '#f3f3f3' }, productTitle: { color: '#303b4d', fontSize: 12, fontWeight: '700', lineHeight: 17, marginTop: 8 }, price: { color: '#002041', fontWeight: '900', marginTop: 5 },
});
