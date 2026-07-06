import { NextResponse } from "next/server";
import { readJson, writeJson } from "@/lib/json-store";

type Event = { id: string; name: string; sessionId: string; createdAt: string; properties?: Record<string, unknown> };
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" };
export async function POST(request: Request) {
  const body = await request.json();
  if (typeof body?.name !== "string" || typeof body?.sessionId !== "string") return NextResponse.json({ error: "name and sessionId are required" }, { status: 400, headers: cors });
  const events = await readJson<Event[]>("analytics-events.json", []);
  const event: Event = { id: crypto.randomUUID(), name: body.name, sessionId: body.sessionId, properties: body.properties ?? {}, createdAt: new Date().toISOString() };
  await writeJson("analytics-events.json", [...events.slice(-49999), event]);
  return NextResponse.json({ recorded: true }, { headers: cors });
}
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: cors }); }
