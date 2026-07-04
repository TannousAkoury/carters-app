import { addToShopifyCart, createCheckout, getGiftOptions, getProduct, GiftChoice, GiftOptions, ProductDetails, ProductVariant } from "@/services/shopify";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as SecureStore from "expo-secure-store";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/components/cart-context";
import { useCurrency } from "@/components/currency-context";
import { salePercentage } from "@/utils/pricing";
import { ActivityIndicator, Image, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const SIZE_CHART = [
  ["Preemie", "Up to 43 cm", "Up to 2.3 kg"],
  ["Newborn", "43–55 cm", "2.3–3.6 kg"],
  ["3M", "55–61 cm", "3.6–5.7 kg"],
  ["6M", "61–67 cm", "5.7–7.5 kg"],
  ["9M", "67–72 cm", "7.5–9.3 kg"],
  ["12M", "72–76 cm", "9.3–11.1 kg"],
  ["18M", "76–81 cm", "11.1–12.5 kg"],
  ["24M", "81–86 cm", "12.5–13.6 kg"],
];

export default function ProductScreen() {
  const { setCount } = useCart();
  const { currency, toggleCurrency, formatMoney } = useCurrency();
  const router = useRouter();
  const params = useLocalSearchParams<{ handle: string; size?: string }>();
  const handle = Array.isArray(params.handle) ? params.handle[0] : params.handle;
  const requestedSize = Array.isArray(params.size) ? params.size[0] : params.size;
  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [selected, setSelected] = useState<ProductVariant | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [giftChoice, setGiftChoice] = useState<GiftChoice>("none");
  const [giftOptions, setGiftOptions] = useState<GiftOptions | null>(null);
  const [showSizeChart, setShowSizeChart] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    getProduct(handle).then((item) => {
      if (!mounted) return;
      setProduct(item);
      const requestedVariant = requestedSize
        ? item?.variants.find((variant) => variant.availableForSale && variant.selectedOptions.some((option) => option.name.toLowerCase() === "size" && option.value === requestedSize))
        : null;
      setSelected(requestedVariant ?? item?.variants.find((variant) => variant.availableForSale) ?? null);
    }).catch(() => mounted && setError("Unable to load this product.")).finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [handle, requestedSize]);

  useEffect(() => {
    getGiftOptions().then(setGiftOptions).catch(() => setGiftOptions(null));
  }, []);

  const hasSizes = useMemo(() => product?.variants.some((v) => v.selectedOptions.some((o) => o.name.toLowerCase() === "size")), [product]);
  const label = (variant: ProductVariant) => variant.selectedOptions.find((o) => o.name.toLowerCase() === "size")?.value ?? variant.title;
  const discount = salePercentage(selected?.money.amount, selected?.compareAtMoney?.amount);

  const buyNow = async () => {
    if (!selected) return;
    try {
      setBuying(true); setError("");
      const checkoutUrl = await createCheckout(selected.id, giftChoice, giftOptions?.boxVariantId);
      await WebBrowser.openBrowserAsync(checkoutUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
        controlsColor: "#002041",
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
      const cart = await addToShopifyCart(cartId, selected.id, giftChoice, giftOptions?.boxVariantId);
      await SecureStore.setItemAsync("shopify_cart_id", cart.id);
      setCount(cart.totalQuantity);
      setAdded(true);
      await new Promise((resolve) => setTimeout(resolve, 450));
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to add this item to your cart.");
    } finally { setAdding(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#06A2E4" /></View>;
  if (!product) return <View style={styles.center}><Text style={styles.error}>{error || "Product not found."}</Text></View>;

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.icon}><Ionicons name="arrow-back" size={24} color="#002041" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Product details</Text>
        <TouchableOpacity onPress={toggleCurrency} style={styles.currencySwitch}><Text style={styles.currencyText}>{currency} ⇄</Text></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <Image source={{ uri: product.image }} style={styles.image} resizeMode="cover" />
          {discount ? <Text style={styles.saleBadge}>-{discount}%</Text> : null}
        </View>
        <Text style={styles.title}>{product.title}</Text>
        <View style={styles.productPriceRow}>
          <Text style={[styles.price, discount !== null ? styles.salePrice : null]}>{formatMoney(selected?.money ?? product.variants[0]?.money)}</Text>
          {discount && selected?.compareAtMoney ? <Text style={styles.oldPrice}>{formatMoney(selected.compareAtMoney)}</Text> : null}
        </View>
        {selected?.sku ? <Text style={styles.sku}>SKU: {selected.sku}</Text> : null}
        <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>{hasSizes ? "Select a size" : "Select an option"}</Text>{hasSizes ? <TouchableOpacity onPress={() => setShowSizeChart(true)}><Text style={styles.sizeChartLink}>Size chart</Text></TouchableOpacity> : null}</View>
        <View style={styles.sizes}>
          {product.variants.map((variant) => (
            <TouchableOpacity key={variant.id} disabled={!variant.availableForSale} onPress={() => setSelected(variant)} style={[styles.size, selected?.id === variant.id && styles.sizeSelected, !variant.availableForSale && styles.sizeDisabled]}>
              <Text style={[styles.sizeText, selected?.id === variant.id && styles.sizeTextSelected]}>{label(variant)}</Text>
              {!variant.availableForSale ? <View pointerEvents="none" style={styles.outOfStockCross}><View style={[styles.crossLine, styles.crossForward]} /><View style={[styles.crossLine, styles.crossBackward]} /></View> : null}
            </TouchableOpacity>
          ))}
        </View>
        {giftOptions ? <View style={styles.giftSection}>
          <Text style={styles.giftSectionTitle}>Choose gift packaging <Text style={styles.optional}>(optional)</Text></Text>
          <View style={styles.giftChoices}>
            <TouchableOpacity onPress={() => setGiftChoice(giftChoice === "wrap" ? "none" : "wrap")} style={[styles.giftCard, giftChoice === "wrap" && styles.giftCardSelected]} accessibilityRole="radio" accessibilityState={{ checked: giftChoice === "wrap" }}>
              <Image source={require("../../assets/images/wrapgift.jpeg")} style={styles.giftImage} resizeMode="cover" />
              <View style={styles.giftCardCopy}><Text style={styles.giftTitle}>Gift wrap</Text><Text style={styles.giftPrice}>Free</Text></View>
              <Ionicons name={giftChoice === "wrap" ? "radio-button-on" : "radio-button-off"} size={21} color="#002041" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setGiftChoice(giftChoice === "box" ? "none" : "box")} style={[styles.giftCard, giftChoice === "box" && styles.giftCardSelected]} accessibilityRole="radio" accessibilityState={{ checked: giftChoice === "box" }}>
              <Image source={{ uri: giftOptions.boxImage }} style={styles.giftImage} resizeMode="cover" />
              <View style={styles.giftCardCopy}><Text style={styles.giftTitle}>Gift box</Text><Text style={styles.giftPrice}>{formatMoney(giftOptions.boxPrice)}</Text></View>
              <Ionicons name={giftChoice === "box" ? "radio-button-on" : "radio-button-off"} size={21} color="#002041" />
            </TouchableOpacity>
          </View>
        </View> : null}
        {product.description ? <Text style={styles.description}>{product.description}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity disabled={!selected || adding} onPress={addToCart} style={[styles.addCart, (!selected || adding) && styles.buyDisabled]}>
          {adding ? <ActivityIndicator color="#002041" /> : <Text style={styles.addCartText}>{added ? "Added to cart ✓" : "Add to cart"}</Text>}
        </TouchableOpacity>
        <TouchableOpacity disabled={!selected || buying} onPress={buyNow} style={[styles.buy, (!selected || buying) && styles.buyDisabled]}>
          {buying ? <ActivityIndicator color="#fff" /> : <Text style={styles.buyText}>Buy now · {formatMoney(selected?.money)}</Text>}
        </TouchableOpacity>
      </View>
      <Modal visible={showSizeChart} transparent animationType="slide" onRequestClose={() => setShowSizeChart(false)}>
        <View style={styles.modalBackdrop}><View style={styles.chartCard}>
          <View style={styles.chartHeader}><View><Text style={styles.chartTitle}>Baby size chart</Text><Text style={styles.chartSubtitle}>Use height and weight for the best fit.</Text></View><TouchableOpacity onPress={() => setShowSizeChart(false)} style={styles.closeButton}><Ionicons name="close" size={24} color="#002041" /></TouchableOpacity></View>
          <View style={[styles.chartRow, styles.chartLabels]}><Text style={styles.chartCell}>Size</Text><Text style={styles.chartCell}>Height</Text><Text style={styles.chartCell}>Weight</Text></View>
          {SIZE_CHART.map((row) => <View key={row[0]} style={styles.chartRow}>{row.map((cell) => <Text key={cell} style={styles.chartCell}>{cell}</Text>)}</View>)}
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" }, center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { height: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#eee", paddingHorizontal: 12 },
  icon: { width: 40, height: 40, alignItems: "center", justifyContent: "center" }, headerTitle: { color: "#002041", fontWeight: "800", fontSize: 17 }, currencySwitch: { minWidth: 48, height: 34, marginRight: 51, paddingHorizontal: 8, borderRadius: 17, backgroundColor: "#eef5f8", alignItems: "center", justifyContent: "center" }, currencyText: { color: "#002041", fontSize: 12, fontWeight: "900" },
  content: { paddingBottom: 28 }, image: { width: "100%", aspectRatio: 0.88, backgroundColor: "#f4f4f4" },
  saleBadge: { position: "absolute", left: 14, top: 14, color: "#fff", backgroundColor: "#d64545", paddingHorizontal: 10, paddingVertical: 6, fontSize: 12, fontWeight: "900" },
  title: { fontSize: 22, lineHeight: 29, fontWeight: "800", color: "#18243b", margin: 18, marginBottom: 7 }, productPriceRow: { flexDirection: "row", alignItems: "center", gap: 9, marginHorizontal: 18 }, price: { color: "#002041", fontSize: 19, fontWeight: "800" }, salePrice: { color: "#d64545" }, oldPrice: { color: "#9a8f8b", fontSize: 14, textDecorationLine: "line-through" }, sku: { color: "#657083", fontSize: 13, fontWeight: "700", marginHorizontal: 18, marginTop: 7 },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: 18, marginTop: 24, marginBottom: 11 }, sectionTitle: { fontSize: 14, fontWeight: "800", color: "#30343b" }, sizeChartLink: { color: "#006ca8", fontSize: 13, fontWeight: "900", textDecorationLine: "underline" }, sizes: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginHorizontal: 18 },
  size: { minWidth: 54, paddingHorizontal: 14, height: 42, borderWidth: 1, borderColor: "#ccd5df", alignItems: "center", justifyContent: "center", borderRadius: 5, overflow: "hidden" }, sizeSelected: { backgroundColor: "#002041", borderColor: "#002041" }, sizeDisabled: { backgroundColor: "#f3f4f5", borderColor: "#aeb7c1" }, sizeText: { color: "#26364d", fontWeight: "700" }, sizeTextSelected: { color: "#fff" },
  outOfStockCross: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" }, crossLine: { position: "absolute", width: "125%", height: 1.5, backgroundColor: "#8e98a5" }, crossForward: { transform: [{ rotate: "34deg" }] }, crossBackward: { transform: [{ rotate: "-34deg" }] },
  giftSection: { marginHorizontal: 18, marginTop: 22 }, giftSectionTitle: { color: "#30343b", fontSize: 14, fontWeight: "900", marginBottom: 10 }, optional: { color: "#7b8797", fontWeight: "600" }, giftChoices: { gap: 10 }, giftCard: { minHeight: 86, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#d7dfe7", borderRadius: 9, padding: 8, backgroundColor: "#fff" }, giftCardSelected: { borderWidth: 2, borderColor: "#002041", backgroundColor: "#f5f9fb" }, giftImage: { width: 72, height: 68, borderRadius: 6, backgroundColor: "#f2f2f2", marginRight: 12 }, giftCardCopy: { flex: 1 }, giftTitle: { color: "#002041", fontWeight: "900", fontSize: 15 }, giftPrice: { color: "#006ca8", fontSize: 13, fontWeight: "800", marginTop: 5 },
  description: { color: "#657083", lineHeight: 22, margin: 18, marginTop: 24 }, error: { color: "#c5524a", textAlign: "center", margin: 16 }, footer: { padding: 14, borderTopWidth: 1, borderTopColor: "#eee", gap: 9 }, addCart: { height: 50, borderRadius: 6, borderWidth: 1, borderColor: "#002041", alignItems: "center", justifyContent: "center" }, addCartText: { color: "#002041", fontSize: 15, fontWeight: "900" }, buy: { height: 54, borderRadius: 6, backgroundColor: "#002041", alignItems: "center", justifyContent: "center" }, buyDisabled: { opacity: 0.5 }, buyText: { color: "#fff", fontSize: 16, fontWeight: "900" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0, 24, 48, 0.45)", justifyContent: "flex-end" }, chartCard: { backgroundColor: "#fff", borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 30 }, chartHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }, chartTitle: { color: "#002041", fontSize: 20, fontWeight: "900" }, chartSubtitle: { color: "#657083", fontSize: 12, marginTop: 4 }, closeButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#f0f4f6", alignItems: "center", justifyContent: "center" }, chartRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e6eaee", paddingVertical: 9 }, chartLabels: { backgroundColor: "#eef5f8", borderBottomWidth: 0, borderRadius: 5 }, chartCell: { flex: 1, color: "#334258", fontSize: 12, textAlign: "center", fontWeight: "700" },
});
