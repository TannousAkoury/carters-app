import * as SecureStore from "@/services/storage";
import { Platform } from "react-native";
import { fetchAdmin } from "@/services/admin-api";

const SESSION_KEY = "analytics_session_id";
const SESSION_LAST_KEY = "analytics_session_last_seen";
const DEVICE_KEY = "analytics_device_id";
const SESSION_TIMEOUT = 30 * 60 * 1000;

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function identity() {
  const now = Date.now();
  let deviceId = await SecureStore.getItemAsync(DEVICE_KEY);
  if (!deviceId) { deviceId = newId(); await SecureStore.setItemAsync(DEVICE_KEY, deviceId); }
  let sessionId = await SecureStore.getItemAsync(SESSION_KEY);
  const lastSeen = Number(await SecureStore.getItemAsync(SESSION_LAST_KEY) || 0);
  if (!sessionId || now - lastSeen > SESSION_TIMEOUT) { sessionId = newId(); await SecureStore.setItemAsync(SESSION_KEY, sessionId); }
  await SecureStore.setItemAsync(SESSION_LAST_KEY, String(now));
  return { deviceId, sessionId };
}
export async function trackEvent(name: string, properties: Record<string, unknown> = {}) {
  try { const ids = await identity(); await fetchAdmin("/api/analytics/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, properties: { ...properties, platform: Platform.OS }, ...ids }) }); }
  catch { /* Analytics must never interrupt shopping. */ }
}
