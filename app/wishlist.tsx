import { useWishlist } from "@/components/wishlist-context";
import { useCurrency } from "@/components/currency-context";
import { Ionicons } from "@expo/vector-icons";
import { useAppSettings } from "@/components/app-settings-context";
import { Stack, useRouter } from "expo-router";
import { ActivityIndicator, FlatList, Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLocalization } from "@/components/localization-context";
import { hasArabicText } from "@/services/locale";

export default function WishlistScreen() {
  const router = useRouter();
  const { items, ready, remove, clear } = useWishlist();
  const { formatMoney } = useCurrency();
  const { settings } = useAppSettings();
  const { t } = useLocalization();

  if (!settings.wishlist) return <SafeAreaView style={styles.screen}><Stack.Screen options={{ headerShown: false }} /><View style={styles.header}><TouchableOpacity onPress={() => router.back()} style={styles.iconButton}><Ionicons name="arrow-back" size={24} color="#002041" /></TouchableOpacity><View style={styles.headerCopy}><Text style={styles.title}>{t("wishlist.title")}</Text></View><View style={styles.iconButton} /></View><View style={styles.empty}><Text style={styles.emptyTitle}>{t("wishlist.unavailable")}</Text><Text style={styles.emptyText}>{t("wishlist.disabled")}</Text></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton} accessibilityLabel={t("common.back")}>
          <Ionicons name="arrow-back" size={24} color="#002041" />
        </TouchableOpacity>
        <View style={styles.headerCopy}><Text style={styles.title}>{t("wishlist.title")}</Text><Text style={styles.count}>{t(items.length === 1 ? "wishlist.savedOne" : "wishlist.savedMany", { count: items.length })}</Text></View>
        {items.length ? <TouchableOpacity onPress={clear} style={styles.clearButton}><Text style={styles.clearText}>{t("common.clear")}</Text></TouchableOpacity> : <View style={styles.iconButton} />}
      </View>

      {!ready ? <View style={styles.center}><ActivityIndicator color="#397ab5" /></View> : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={items.length ? styles.list : styles.emptyList}
          renderItem={({ item }) => {
            const amount = Number(item.price.replace(/[^0-9.]/g, ""));
            const oldAmount = item.oldPrice ? Number(item.oldPrice.replace(/[^0-9.]/g, "")) : null;
            return <TouchableOpacity style={styles.card} activeOpacity={0.86} onPress={() => router.push({ pathname: "/product/[handle]", params: { handle: item.handle } })}>
              <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
              <View style={styles.details}>
                <Text style={[styles.productTitle, hasArabicText(item.title) && styles.arabicText]} numberOfLines={2}>{item.title}</Text>
                <View style={styles.priceRow}><Text style={styles.price}>{formatMoney({ amount: String(amount), currencyCode: "USD" })}</Text>{oldAmount ? <Text style={styles.oldPrice}>{formatMoney({ amount: String(oldAmount), currencyCode: "USD" })}</Text> : null}</View>
                <Text style={styles.open}>{t("wishlist.viewProduct")}</Text>
              </View>
              <TouchableOpacity onPress={() => remove(item.id)} style={styles.remove} accessibilityLabel={t("wishlist.remove", { product: item.title })}>
                <Ionicons name="heart" size={22} color="#e0938e" />
              </TouchableOpacity>
            </TouchableOpacity>;
          }}
          ListEmptyComponent={<View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name="heart-outline" size={38} color="#397ab5" /></View><Text style={styles.emptyTitle}>{t("wishlist.empty")}</Text><Text style={styles.emptyText}>{t("wishlist.emptyHelp")}</Text><TouchableOpacity style={styles.shopButton} onPress={() => router.replace("/")}><Text style={styles.shopButtonText}>{t("cart.startShopping")}</Text></TouchableOpacity></View>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fffaf6" },
  arabicText: { writingDirection: "rtl" },
  header: { minHeight: 68, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#f0e3dc", backgroundColor: "#fff", paddingHorizontal: 12 },
  iconButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" }, headerCopy: { flex: 1, alignItems: "center" }, title: { color: "#002041", fontSize: 18, fontWeight: "900" }, count: { color: "#788294", fontSize: 11, marginTop: 2 }, clearButton: { width: 42, alignItems: "center" }, clearText: { color: "#c5524a", fontSize: 12, fontWeight: "800" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" }, list: { padding: 14, gap: 12, paddingBottom: 40 }, emptyList: { flexGrow: 1 },
  card: { minHeight: 126, flexDirection: "row", backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#f0e3dc", padding: 10 }, image: { width: 96, height: 106, borderRadius: 10, backgroundColor: "#f2f2f2" }, details: { flex: 1, paddingHorizontal: 12, paddingVertical: 5 }, productTitle: { color: "#18243b", fontSize: 14, lineHeight: 19, fontWeight: "800" }, priceRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 10 }, price: { color: "#d65a50", fontWeight: "900" }, oldPrice: { color: "#9a8f8b", fontSize: 12, textDecorationLine: "line-through" }, open: { color: "#397ab5", fontSize: 12, fontWeight: "800", marginTop: "auto" }, remove: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#fff4f2", alignItems: "center", justifyContent: "center" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 34 }, emptyIcon: { width: 78, height: 78, borderRadius: 39, backgroundColor: "#eaf3f8", alignItems: "center", justifyContent: "center", marginBottom: 20 }, emptyTitle: { color: "#002041", fontSize: 21, fontWeight: "900" }, emptyText: { color: "#738094", textAlign: "center", lineHeight: 21, marginTop: 8, maxWidth: 290 }, shopButton: { marginTop: 24, backgroundColor: "#002041", paddingHorizontal: 28, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" }, shopButtonText: { color: "#fff", fontWeight: "900" },
});
