import { addToShopifyCart, createCheckout, getProduct, ProductDetails, ProductVariant } from "@/services/shopify";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as SecureStore from "expo-secure-store";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function ProductScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ handle: string }>();
  const handle = Array.isArray(params.handle) ? params.handle[0] : params.handle;
  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [selected, setSelected] = useState<ProductVariant | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    getProduct(handle).then((item) => {
      if (!mounted) return;
      setProduct(item);
      setSelected(item?.variants.find((v) => v.availableForSale) ?? null);
    }).catch(() => mounted && setError("Unable to load this product.")).finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [handle]);

  const hasSizes = useMemo(() => product?.variants.some((v) => v.selectedOptions.some((o) => o.name.toLowerCase() === "size")), [product]);
  const label = (variant: ProductVariant) => variant.selectedOptions.find((o) => o.name.toLowerCase() === "size")?.value ?? variant.title;

  const buyNow = async () => {
    if (!selected) return;
    try {
      setBuying(true); setError("");
      const checkoutUrl = await createCheckout(selected.id);
      await WebBrowser.openBrowserAsync(checkoutUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
        controlsColor: "#174f86",
        toolbarColor: "#ffffff",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to start checkout.");
    } finally { setBuying(false); }
  };

  const addToCart = async () => {
    if (!selected) return;
    try {
      setAdding(true); setError(""); setAdded(false);
      const cartId = await SecureStore.getItemAsync("shopify_cart_id");
      const cart = await addToShopifyCart(cartId, selected.id);
      await SecureStore.setItemAsync("shopify_cart_id", cart.id);
      setAdded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to add this item to your cart.");
    } finally { setAdding(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4b7fb9" /></View>;
  if (!product) return <View style={styles.center}><Text style={styles.error}>{error || "Product not found."}</Text></View>;

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.icon}><Ionicons name="arrow-back" size={24} color="#174f86" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Product details</Text>
        <View style={styles.icon} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Image source={{ uri: product.image }} style={styles.image} resizeMode="cover" />
        <Text style={styles.title}>{product.title}</Text>
        <Text style={styles.price}>{selected?.price ?? product.variants[0]?.price}</Text>
        <Text style={styles.sectionTitle}>{hasSizes ? "Select a size" : "Select an option"}</Text>
        <View style={styles.sizes}>
          {product.variants.map((variant) => (
            <TouchableOpacity key={variant.id} disabled={!variant.availableForSale} onPress={() => setSelected(variant)} style={[styles.size, selected?.id === variant.id && styles.sizeSelected, !variant.availableForSale && styles.sizeDisabled]}>
              <Text style={[styles.sizeText, selected?.id === variant.id && styles.sizeTextSelected]}>{label(variant)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {product.description ? <Text style={styles.description}>{product.description}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity disabled={!selected || adding} onPress={addToCart} style={[styles.addCart, (!selected || adding) && styles.buyDisabled]}>
          {adding ? <ActivityIndicator color="#174f86" /> : <Text style={styles.addCartText}>{added ? "Added to cart ✓" : "Add to cart"}</Text>}
        </TouchableOpacity>
        <TouchableOpacity disabled={!selected || buying} onPress={buyNow} style={[styles.buy, (!selected || buying) && styles.buyDisabled]}>
          {buying ? <ActivityIndicator color="#fff" /> : <Text style={styles.buyText}>Buy now · {selected?.price ?? ""}</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" }, center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { height: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#eee", paddingHorizontal: 12 },
  icon: { width: 40, height: 40, alignItems: "center", justifyContent: "center" }, headerTitle: { color: "#174f86", fontWeight: "800", fontSize: 17 },
  content: { paddingBottom: 28 }, image: { width: "100%", aspectRatio: 0.88, backgroundColor: "#f4f4f4" },
  title: { fontSize: 22, lineHeight: 29, fontWeight: "800", color: "#18243b", margin: 18, marginBottom: 7 }, price: { color: "#174f86", fontSize: 19, fontWeight: "800", marginHorizontal: 18 },
  sectionTitle: { marginHorizontal: 18, marginTop: 24, marginBottom: 11, fontSize: 14, fontWeight: "800", color: "#30343b" }, sizes: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginHorizontal: 18 },
  size: { minWidth: 54, paddingHorizontal: 14, height: 42, borderWidth: 1, borderColor: "#ccd5df", alignItems: "center", justifyContent: "center", borderRadius: 5 }, sizeSelected: { backgroundColor: "#174f86", borderColor: "#174f86" }, sizeDisabled: { opacity: 0.35 }, sizeText: { color: "#26364d", fontWeight: "700" }, sizeTextSelected: { color: "#fff" },
  description: { color: "#657083", lineHeight: 22, margin: 18, marginTop: 24 }, error: { color: "#c5524a", textAlign: "center", margin: 16 }, footer: { padding: 14, borderTopWidth: 1, borderTopColor: "#eee", gap: 9 }, addCart: { height: 50, borderRadius: 6, borderWidth: 1, borderColor: "#174f86", alignItems: "center", justifyContent: "center" }, addCartText: { color: "#174f86", fontSize: 15, fontWeight: "900" }, buy: { height: 54, borderRadius: 6, backgroundColor: "#174f86", alignItems: "center", justifyContent: "center" }, buyDisabled: { opacity: 0.5 }, buyText: { color: "#fff", fontSize: 16, fontWeight: "900" },
});
