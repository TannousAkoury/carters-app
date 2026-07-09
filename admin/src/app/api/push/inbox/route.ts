import { NextResponse } from "next/server";
import { readJson } from "@/lib/json-store";
import type { PushMessage } from "@/lib/push";

export const dynamic = "force-dynamic";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" };
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const after = params.get("after") ?? "";
  const token = params.get("token") ?? "";
  const messages = await readJson<PushMessage[]>("push-messages.json", []);
  const visible = messages.filter((item) => !item.targetTokens?.length || (!!token && item.targetTokens.includes(token)));
  return NextResponse.json({ messages: after ? visible.filter((item) => item.createdAt > after) : visible.slice(-10) }, { headers: cors });
}
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: cors }); }
