import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts, Jost_400Regular, Jost_500Medium, Jost_600SemiBold, Jost_700Bold, Jost_800ExtraBold, Jost_900Black } from "@expo-google-fonts/jost";
import * as SplashScreen from "expo-splash-screen";
import { Text, TextInput } from "react-native";
import { useEffect } from "react";
import "react-native-reanimated";

import { CartProvider } from "@/components/cart-context";
import { GlobalCartButton } from "@/components/global-cart-button";

export const unstable_settings = {
  anchor: "(tabs)",
};

SplashScreen.preventAutoHideAsync();

const shopifyTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: "#06A2E4",
    background: "#FFFFFF",
    card: "#FFFFFF",
    text: "#002041",
    border: "#E5E5E5",
  },
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Jost_400Regular, Jost_500Medium, Jost_600SemiBold, Jost_700Bold, Jost_800ExtraBold, Jost_900Black });

  useEffect(() => {
    if (!fontsLoaded) return;
    const text = Text as typeof Text & { defaultProps?: { style?: unknown } };
    const input = TextInput as typeof TextInput & { defaultProps?: { style?: unknown } };
    text.defaultProps = { ...text.defaultProps, style: [text.defaultProps?.style, { fontFamily: "Jost_400Regular" }] };
    input.defaultProps = { ...input.defaultProps, style: [input.defaultProps?.style, { fontFamily: "Jost_400Regular" }] };
    SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider value={shopifyTheme}>
      <CartProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="account"
            options={{ presentation: "modal", title: "Carter's Oshkosh B'Gosh Account" }}
          />
        </Stack>
        <GlobalCartButton />
      </CartProvider>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}
