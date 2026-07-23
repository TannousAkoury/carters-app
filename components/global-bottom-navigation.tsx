import { useCart } from "@/components/cart-context";
import { useNotifications } from "@/components/notification-context";
import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

export function GlobalBottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { count: cartCount } = useCart();
  const { unread } = useNotifications();

  // The home screen already renders this same navigation inside its bounded layout.
  if (pathname === "/" || pathname === "/index" || pathname.startsWith("/(tabs)")) return null;

  const items: { id: string; label: string; icon: IconName; activeIcon: IconName; active: boolean; onPress: () => void }[] = [
    { id: "home", label: "Home", icon: "home-outline", activeIcon: "home", active: false, onPress: () => router.navigate("/") },
    { id: "shop", label: "Shop", icon: "bag-handle-outline", activeIcon: "bag-handle", active: pathname.startsWith("/collection/") || pathname.startsWith("/product/") || pathname === "/search", onPress: () => router.navigate({ pathname: "/collection/[handle]", params: { handle: "all-products", title: "All Products" } }) },
    { id: "cart", label: "Cart", icon: "cart-outline", activeIcon: "cart", active: pathname === "/cart", onPress: () => router.navigate("/cart") },
    { id: "notifications", label: "Notifications", icon: "notifications-outline", activeIcon: "notifications", active: pathname === "/notifications", onPress: () => router.navigate("/notifications") },
    { id: "account", label: "Account", icon: "person-outline", activeIcon: "person", active: pathname === "/account", onPress: () => router.navigate("/account") },
  ];

  return (
    <View style={styles.navigation} accessibilityRole="tablist">
      {items.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.item}
          onPress={item.onPress}
          accessibilityRole="tab"
          accessibilityState={{ selected: item.active }}
          accessibilityLabel={item.id === "notifications" ? `Notifications, ${unread} unread` : item.id === "cart" ? `Cart, ${cartCount} items` : item.label}
        >
          <View>
            <Ionicons name={item.active ? item.activeIcon : item.icon} size={22} color={item.active ? "#397ab5" : "#778491"} />
            {item.id === "cart" && cartCount > 0 ? <Badge value={cartCount} max={99} /> : null}
            {item.id === "notifications" && unread > 0 ? <Badge value={unread} max={9} /> : null}
          </View>
          <Text style={[styles.label, item.active && styles.activeLabel]} numberOfLines={1}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function Badge({ value, max }: { value: number; max: number }) {
  return <View style={styles.badge}><Text style={styles.badgeText}>{value > max ? `${max}+` : value}</Text></View>;
}

const styles = StyleSheet.create({
  navigation: {
    width: "100%",
    maxWidth: Platform.OS === "web" ? 480 : undefined,
    alignSelf: "center",
    flexDirection: "row",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e2e6e9",
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 22 : 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 18,
  },
  item: { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", gap: 4 },
  label: { color: "#778491", fontSize: 10, fontWeight: "700" },
  activeLabel: { color: "#397ab5", fontWeight: "900" },
  badge: { position: "absolute", right: -9, top: -6, minWidth: 17, height: 17, paddingHorizontal: 3, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#e0938e", borderWidth: 2, borderColor: "#fff" },
  badgeText: { color: "#fff", fontSize: 8, fontWeight: "900" },
});
