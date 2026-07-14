import { NextResponse } from "next/server";
import { readJson } from "@/lib/json-store";
import { requireAdmin } from "@/lib/shopify-admin";

type Event = { name: string; sessionId: string; deviceId?: string; createdAt: string; properties?: { path?: string; platform?: string } };
type Device = { token: string };
export const dynamic = "force-dynamic";

const deviceOf = (event: Event) => event.deviceId || event.sessionId;
const isProduct = (event: Event) => event.name === "screen_view" && Boolean(event.properties?.path?.startsWith("/product/"));
const isCart = (event: Event) => event.name === "screen_view" && event.properties?.path === "/cart";
const percentChange = (current: number, previous: number) => previous ? Math.round(((current - previous) / previous) * 1000) / 10 : current ? 100 : 0;
const screenLabel = (path: string) => {
  if (path === "/") return "Home";
  if (path === "/cart") return "Cart";
  if (path === "/search") return "Search";
  if (path === "/account") return "Account";
  if (path === "/notifications") return "Notifications";
  if (path.startsWith("/product/")) return "Product details";
  if (path.startsWith("/collection/")) return "Collection";
  return path.split("/").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" / ") || "Unknown";
};

export async function GET(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const url = new URL(request.url);
  const requestedDays = Number(url.searchParams.get("days") || 30);
  const days = [7, 30, 90].includes(requestedDays) ? requestedDays : 30;
  const events = await readJson<Event[]>("analytics-events.json", []);
  const pushDevices = await readJson<Device[]>("push-devices.json", []);
  const end = Date.now();
  const start = end - days * 86400000;
  const previousStart = start - days * 86400000;
  const inPeriod = (event: Event, from: number, to: number) => { const time = new Date(event.createdAt).getTime(); return time >= from && time < to; };
  const recent = events.filter((event) => inPeriod(event, start, end));
  const previous = events.filter((event) => inPeriod(event, previousStart, start));

  const summarize = (period: Event[]) => {
    const views = period.filter((event) => event.name === "screen_view");
    const sessions = new Set(period.map((event) => event.sessionId));
    const devices = new Set(period.map(deviceOf));
    const productViews = views.filter(isProduct);
    const cartViews = views.filter(isCart);
    return { views, sessions: sessions.size, devices: devices.size, productViews: productViews.length, cartViews: cartViews.length };
  };
  const currentStats = summarize(recent);
  const previousStats = summarize(previous);
  const sessionViewCounts = new Map<string, number>();
  currentStats.views.forEach((event) => sessionViewCounts.set(event.sessionId, (sessionViewCounts.get(event.sessionId) || 0) + 1));
  const bouncedSessions = [...sessionViewCounts.values()].filter((value) => value === 1).length;
  const viewsPerSession = currentStats.sessions ? currentStats.views.length / currentStats.sessions : 0;
  const bounceRate = currentStats.sessions ? (bouncedSessions / currentStats.sessions) * 100 : 0;

  const daily = Array.from({ length: days }, (_, index) => {
    const date = new Date(start + index * 86400000);
    const key = date.toISOString().slice(0, 10);
    const dayEvents = recent.filter((event) => event.createdAt.slice(0, 10) === key);
    const views = dayEvents.filter((event) => event.name === "screen_view");
    return { date: key, label: date.toLocaleDateString("en", days > 30 ? { month: "short", day: "numeric" } : { weekday: "short", day: "numeric" }), devices: new Set(dayEvents.map(deviceOf)).size, sessions: new Set(dayEvents.map((event) => event.sessionId)).size, views: views.length, productViews: views.filter(isProduct).length, cartViews: views.filter(isCart).length };
  });

  const screenMap = new Map<string, { path: string; label: string; views: number; devices: Set<string> }>();
  currentStats.views.forEach((event) => {
    const path = event.properties?.path || "/unknown";
    const item = screenMap.get(path) || { path, label: screenLabel(path), views: 0, devices: new Set<string>() };
    item.views += 1; item.devices.add(deviceOf(event)); screenMap.set(path, item);
  });
  const screens = [...screenMap.values()].map((item) => ({ path: item.path, label: item.label, views: item.views, devices: item.devices.size, share: currentStats.views.length ? Math.round((item.views / currentStats.views.length) * 1000) / 10 : 0 })).sort((a, b) => b.views - a.views).slice(0, 10);

  const productMap = new Map<string, { path: string; views: number; devices: Set<string> }>();
  currentStats.views.filter(isProduct).forEach((event) => {
    const path = event.properties?.path || "/product/unknown";
    const item = productMap.get(path) || { path, views: 0, devices: new Set<string>() };
    item.views += 1; item.devices.add(deviceOf(event)); productMap.set(path, item);
  });
  const topProducts = [...productMap.values()].map((item) => { let label = item.path.split("/").pop() || "Product"; try { label = decodeURIComponent(label); } catch {} return { path: item.path, label: label.replaceAll("-", " "), views: item.views, devices: item.devices.size }; }).sort((a, b) => b.views - a.views).slice(0, 8);

  const platformMap = new Map<string, Set<string>>();
  recent.forEach((event) => { const platform = event.properties?.platform || "unknown"; const set = platformMap.get(platform) || new Set<string>(); set.add(deviceOf(event)); platformMap.set(platform, set); });
  const platforms = [...platformMap].map(([label, set]) => ({ label, value: set.size })).sort((a, b) => b.value - a.value);
  const firstSeen = new Map<string, number>();
  events.forEach((event) => { const id = deviceOf(event); const time = new Date(event.createdAt).getTime(); firstSeen.set(id, Math.min(firstSeen.get(id) || time, time)); });
  const currentDevices = new Set(recent.map(deviceOf));
  const newDevices = [...currentDevices].filter((id) => (firstSeen.get(id) || 0) >= start).length;
  const returningDevices = Math.max(0, currentDevices.size - newDevices);
  const productDevices = new Set(currentStats.views.filter(isProduct).map(deviceOf));
  const cartDevices = new Set(currentStats.views.filter(isCart).map(deviceOf));
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, value: currentStats.views.filter((event) => new Date(event.createdAt).getHours() === hour).length }));

  return NextResponse.json({
    // Legacy aliases keep the dashboard and marketing summary cards compatible.
    sessions: currentStats.devices,
    screenViews: currentStats.views.length,
    productViews: currentStats.productViews,
    cartViews: currentStats.cartViews,
    notificationDevices: pushDevices.length,
    purchases: null,
    days: daily.slice(-7).map((day) => ({ label: day.label, value: day.devices })),
    range: { days, start: new Date(start).toISOString(), end: new Date(end).toISOString() },
    metrics: { uniqueDevices: currentStats.devices, sessions: currentStats.sessions, screenViews: currentStats.views.length, productViews: currentStats.productViews, cartViews: currentStats.cartViews, viewsPerSession: Math.round(viewsPerSession * 10) / 10, bounceRate: Math.round(bounceRate * 10) / 10, activeDevices24h: new Set(events.filter((event) => new Date(event.createdAt).getTime() >= end - 86400000).map(deviceOf)).size, notificationOpens: recent.filter((event) => event.name === "notification_open").length, pushDevices: pushDevices.length },
    changes: { uniqueDevices: percentChange(currentStats.devices, previousStats.devices), sessions: percentChange(currentStats.sessions, previousStats.sessions), screenViews: percentChange(currentStats.views.length, previousStats.views.length), productViews: percentChange(currentStats.productViews, previousStats.productViews), cartViews: percentChange(currentStats.cartViews, previousStats.cartViews) },
    daily,
    screens,
    topProducts,
    platforms,
    audience: [{ label: "New devices", value: newDevices }, { label: "Returning devices", value: returningDevices }],
    funnel: [{ label: "Active devices", value: currentStats.devices, rate: 100 }, { label: "Viewed products", value: productDevices.size, rate: currentStats.devices ? Math.round((productDevices.size / currentStats.devices) * 100) : 0 }, { label: "Viewed cart", value: cartDevices.size, rate: currentStats.devices ? Math.round((cartDevices.size / currentStats.devices) * 100) : 0 }],
    hours,
    generatedAt: new Date().toISOString(),
    recordingSince: events[0]?.createdAt || null,
  });
}
