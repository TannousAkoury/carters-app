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
import { GlobalCartButton } from "@/components/global-cart-button";
import { CurrencyProvider } from "@/components/currency-context";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { NotificationProvider } from "@/components/notification-context";
import { GlobalNotificationButton } from "@/components/global-notification-button";
import { AnalyticsTracker } from "@/components/analytics-tracker";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <CurrencyProvider>
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
          <GlobalCartButton />
          <GlobalNotificationButton />
          <WhatsAppButton />
          </NotificationProvider>
        </CartProvider>
      </CurrencyProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
