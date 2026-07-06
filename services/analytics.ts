import * as SecureStore from "expo-secure-store";
import { fetchAdmin } from "@/services/admin-api";

const SESSION_KEY = "analytics_session_id";
async function sessionId() {
  let id = await SecureStore.getItemAsync(SESSION_KEY);
  if (!id) { id = `${Date.now()}-${Math.random().toString(36).slice(2)}`; await SecureStore.setItemAsync(SESSION_KEY, id); }
  return id;
}
export async function trackEvent(name: string, properties: Record<string, unknown> = {}) {
  try { await fetchAdmin("/api/analytics/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, properties, sessionId: await sessionId() }) }); }
  catch { /* Analytics must never interrupt shopping. */ }
}
