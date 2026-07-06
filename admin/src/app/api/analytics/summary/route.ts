import { NextResponse } from "next/server";
import { readJson } from "@/lib/json-store";

type Event = { name: string; sessionId: string; createdAt: string; properties?: { path?: string } };
type Device = { token: string };
export const dynamic = "force-dynamic";
export async function GET() {
  const events = await readJson<Event[]>("analytics-events.json", []);
  const devices = await readJson<Device[]>("push-devices.json", []);
  const cutoff = Date.now() - 30 * 86400000;
  const recent = events.filter((event) => new Date(event.createdAt).getTime() >= cutoff);
  const views = recent.filter((event) => event.name === "screen_view");
  const sessions = new Set(recent.map((event) => event.sessionId));
  const productViews = views.filter((event) => event.properties?.path?.startsWith("/product/")).length;
  const cartViews = views.filter((event) => event.properties?.path === "/cart").length;
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Date.now() - (6 - index) * 86400000); const key = date.toISOString().slice(0, 10);
    return { label: date.toLocaleDateString("en", { weekday: "short" }), value: new Set(views.filter((event) => event.createdAt.slice(0, 10) === key).map((event) => event.sessionId)).size };
  });
  return NextResponse.json({ range: "30 days", sessions: sessions.size, screenViews: views.length, productViews, cartViews, notificationDevices: devices.length, purchases: null, days });
}
