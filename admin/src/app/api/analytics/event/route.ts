import { NextResponse } from "next/server";
import { readJson, writeJson } from "@/lib/json-store";

type Event = { id: string; name: string; sessionId: string; deviceId: string; createdAt: string; properties?: Record<string, unknown> };
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" };
export async function POST(request: Request) {
  const body = await request.json();
  if (typeof body?.name !== "string" || typeof body?.sessionId !== "string") return NextResponse.json({ error: "name and sessionId are required" }, { status: 400, headers: cors });
  const events = await readJson<Event[]>("analytics-events.json", []);
  const event: Event = { id: crypto.randomUUID(), name: body.name.slice(0, 80), sessionId: body.sessionId.slice(0, 160), deviceId: typeof body.deviceId === "string" ? body.deviceId.slice(0, 160) : body.sessionId.slice(0, 160), properties: body.properties && typeof body.properties === "object" ? body.properties : {}, createdAt: new Date().toISOString() };
  await writeJson("analytics-events.json", [...events.slice(-49999), event]);
  return NextResponse.json({ recorded: true }, { headers: cors });
}
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: cors }); }
