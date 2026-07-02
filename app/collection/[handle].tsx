import { getCollectionDetails, getProducts, type ShopifyCollectionDetails } from "@/services/shopify";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useVideoPlayer, VideoView } from "expo-video";
import { ActivityIndicator, FlatList, Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Product = {
  id: string;
  title: string;
  price: string;
  oldPrice: string | null;
  image: string;
  tag: "NEW" | "SALE" | null;
  handle?: string;
};

export default function CollectionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ handle: string; title?: string }>();
  const handle = Array.isArray(params.handle) ? params.handle[0] : params.handle;
  const title = Array.isArray(params.title) ? params.title[0] : params.title;
  const [products, setProducts] = useState<Product[]>([]);
  const [collection, setCollection] = useState<ShopifyCollectionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");

    Promise.all([getProducts(handle), getCollectionDetails(handle)])
      .then(([items, details]) => {
        if (mounted) { setProducts(items); setCollection(details); }
      })
      .catch(() => mounted && setError("Unable to load this collection right now."))
      .finally(() => mounted && setLoading(false));

    return () => { mounted = false; };
  }, [handle]);

  const videoPlayer = useVideoPlayer(collection?.bannerVideo ?? null, (player) => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.announcement}>
        <Text style={styles.announcementText}>FREE DELIVERY ON ORDERS ABOVE $150</Text>
      </View>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={23} color="#315f99" />
        </TouchableOpacity>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>COLLECTION</Text>
          <Text style={styles.title}>{title || handle}</Text>
        </View>
      </View>

      {collection?.bannerVideo ? (
        <VideoView
          style={styles.banner}
          player={videoPlayer}
          contentFit="cover"
          nativeControls
        />
      ) : collection?.bannerImage ? (
        <Image source={{ uri: collection.bannerImage }} style={styles.banner} resizeMode="cover" />
      ) : null}

      {!loading && !error ? (
        <View style={styles.toolbar}>
          <Text style={styles.resultCount}>{products.length} PRODUCTS</Text>
          <View style={styles.filterLabel}>
            <Ionicons name="options-outline" size={17} color="#174f86" />
            <Text style={styles.filterText}>FILTER & SORT</Text>
          </View>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4b7fb9" />
          <Text style={styles.status}>Loading products…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}><Text style={styles.error}>{error}</Text></View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          ListEmptyComponent={<Text style={styles.empty}>No products found in this collection.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.86}
              onPress={() => item.handle && router.push({ pathname: "/product/[handle]", params: { handle: item.handle } })}
            >
              <View style={styles.imageWrap}>
                <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
                {item.tag ? <Text style={styles.tag}>{item.tag}</Text> : null}
              </View>
              <Text style={styles.productTitle} numberOfLines={2}>{item.title}</Text>
              <View style={styles.priceRow}>
                <Text style={styles.price}>{item.price}</Text>
                {item.oldPrice ? <Text style={styles.oldPrice}>{item.oldPrice}</Text> : null}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  announcement: { height: 27, backgroundColor: "#174f86", alignItems: "center", justifyContent: "center" },
  announcementText: { color: "#fff", fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 15, paddingBottom: 18, gap: 13, borderBottomWidth: 1, borderBottomColor: "#e8e8e8" },
  back: { width: 38, height: 38, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  heading: { flex: 1 },
  eyebrow: { color: "#718096", fontSize: 9, fontWeight: "700", letterSpacing: 1.4 },
  title: { color: "#174f86", fontSize: 23, fontWeight: "800", marginTop: 3 },
  toolbar: { height: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 17, borderBottomWidth: 1, borderBottomColor: "#e8e8e8" },
  banner: { width: "100%", aspectRatio: 2.15, backgroundColor: "#f3f5f7" },
  resultCount: { color: "#667085", fontSize: 10, fontWeight: "700", letterSpacing: 0.6 },
  filterLabel: { flexDirection: "row", alignItems: "center", gap: 6 },
  filterText: { color: "#174f86", fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30 },
  status: { color: "#647086", marginTop: 12 },
  error: { color: "#c5524a", textAlign: "center", fontSize: 15 },
  grid: { paddingHorizontal: 10, paddingTop: 14, paddingBottom: 30 },
  row: { gap: 10 },
  card: { flex: 1, marginBottom: 22, maxWidth: "48.7%" },
  imageWrap: { aspectRatio: 0.82, overflow: "hidden", backgroundColor: "#f5f5f5" },
  image: { width: "100%", height: "100%" },
  tag: { position: "absolute", left: 7, top: 7, color: "#fff", backgroundColor: "#174f86", paddingHorizontal: 8, paddingVertical: 4, fontSize: 9, fontWeight: "900" },
  productTitle: { color: "#30343b", fontSize: 12, fontWeight: "600", lineHeight: 17, marginTop: 9 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 5 },
  price: { color: "#174f86", fontSize: 13, fontWeight: "800" },
  oldPrice: { color: "#9a8f8b", fontSize: 11, textDecorationLine: "line-through" },
  empty: { color: "#647086", textAlign: "center", marginTop: 80, width: "100%" },
});
