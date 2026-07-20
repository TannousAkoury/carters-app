import { NextResponse } from "next/server";
import { updateJson } from "@/lib/json-store";
import { requestClientKey, takeRateLimit } from "@/lib/rate-limit";

type Event = { id: string; name: string; sessionId: string; deviceId: string; createdAt: string; properties?: Record<string, unknown> };
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" };

function cleanProperties(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([key, item]) => key.length <= 80 && (item === null || ["string", "number", "boolean"].includes(typeof item)))
    .slice(0, 30)
    .map(([key, item]) => [key, typeof item === "string" ? item.slice(0, 500) : item]));
}

export async function POST(request: Request) {
  const limit = takeRateLimit(`analytics:${requestClientKey(request)}`, 180, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many analytics events." }, { status: 429, headers: { ...cors, "Retry-After": String(limit.retryAfterSeconds) } });
  const body = await request.json().catch(() => null);
  if (typeof body?.name !== "string" || typeof body?.sessionId !== "string") return NextResponse.json({ error: "name and sessionId are required" }, { status: 400, headers: cors });
  const event: Event = { id: crypto.randomUUID(), name: body.name.slice(0, 80), sessionId: body.sessionId.slice(0, 160), deviceId: typeof body.deviceId === "string" ? body.deviceId.slice(0, 160) : body.sessionId.slice(0, 160), properties: cleanProperties(body.properties), createdAt: new Date().toISOString() };
  await updateJson<Event[]>("analytics-events.json", [], (events) => [...events.slice(-49999), event]);
  return NextResponse.json({ recorded: true }, { headers: cors });
}
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: cors }); }
