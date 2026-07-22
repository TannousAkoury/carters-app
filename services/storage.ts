import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

function webStorage() {
  return typeof window === "undefined" ? null : window.localStorage;
}

export async function getItemAsync(key: string): Promise<string | null> {
  if (Platform.OS !== "web") return SecureStore.getItemAsync(key);

  try {
    return webStorage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  if (Platform.OS !== "web") {
    await SecureStore.setItemAsync(key, value);
    return;
  }

  try {
    webStorage()?.setItem(key, value);
  } catch {
    // Storage can be unavailable in private browsing or restricted contexts.
  }
}

export async function deleteItemAsync(key: string): Promise<void> {
  if (Platform.OS !== "web") {
    await SecureStore.deleteItemAsync(key);
    return;
  }

  try {
    webStorage()?.removeItem(key);
  } catch {
    // Storage can be unavailable in private browsing or restricted contexts.
  }
}
