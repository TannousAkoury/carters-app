import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { CartProvider } from "@/components/cart-context";
import { GlobalCartButton } from "@/components/global-cart-button";
import { CurrencyProvider } from "@/components/currency-context";
import { WhatsAppButton } from "@/components/whatsapp-button";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <CurrencyProvider>
        <CartProvider>
          <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="account"
            options={{ presentation: "modal", title: "Carter's Oshkosh B'Gosh Account" }}
          />
          </Stack>
          <GlobalCartButton />
          <WhatsAppButton />
        </CartProvider>
      </CurrencyProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
