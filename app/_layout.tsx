import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { Image as ExpoImage } from "expo-image";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { CartProvider } from "@/components/cart-context";
import { CurrencyProvider } from "@/components/currency-context";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { NotificationProvider } from "@/components/notification-context";
import { GlobalBottomNavigation } from "@/components/global-bottom-navigation";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { WishlistProvider } from "@/components/wishlist-context";
import { AppGate, AppSettingsProvider, useAppSettings } from "@/components/app-settings-context";

export const unstable_settings = {
  anchor: "(tabs)",
};

function AppContent() {
  const colorScheme = useColorScheme();
  const { settings } = useAppSettings();

  return (
    <AppGate><ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <CurrencyProvider>
        <WishlistProvider>
         <CartProvider>
          <NotificationProvider>
          <AnalyticsTracker />
          <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="account"
            options={{
              presentation: "modal",
              title: "Carter's Account",
              headerTitle: () => <ExpoImage source={{ uri: "https://carters.com.lb/cdn/shop/files/logo1.png?v=1707301645&width=330" }} style={{ width: 132, height: 38 }} contentFit="contain" accessibilityLabel="Carter's" />,
            }}
          />
          </Stack>
          <GlobalBottomNavigation />
          {settings.customerChat ? <WhatsAppButton /> : null}
          </NotificationProvider>
         </CartProvider>
        </WishlistProvider>
      </CurrencyProvider>
      <StatusBar style="auto" />
    </ThemeProvider></AppGate>
  );
}

export default function RootLayout() {
  return <AppSettingsProvider><AppContent /></AppSettingsProvider>;
}
