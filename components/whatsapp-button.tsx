import { Ionicons } from "@expo/vector-icons";
import { usePathname } from "expo-router";
import { Linking, Platform, StyleSheet, TouchableOpacity } from "react-native";
import { useLocalization } from "@/components/localization-context";

const WHATSAPP_URL = `https://wa.me/96171555886?text=${encodeURIComponent("Hello Carter's customer service, I need some help with my order.")}`;

export function WhatsAppButton() {
  const pathname = usePathname();
  const { t } = useLocalization();
  const hasCheckoutFooter = pathname === "/cart" || pathname.startsWith("/product/");

  const openChat = () => {
    Linking.openURL(WHATSAPP_URL).catch(() => undefined);
  };

  return (
    <TouchableOpacity
      style={[styles.button, hasCheckoutFooter && styles.aboveCheckout]}
      onPress={openChat}
      activeOpacity={0.85}
      accessibilityRole="link"
      accessibilityLabel={t("navigation.whatsapp")}
    >
      <Ionicons name="logo-whatsapp" size={29} color="#fff" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    zIndex: 490,
    right: 16,
    bottom: Platform.OS === "ios" ? 94 : 78,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#25D366",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  aboveCheckout: {
    bottom: Platform.OS === "ios" ? 174 : 154,
  },
});
