import { NextResponse } from "next/server";
import { readJson } from "@/lib/json-store";

export type TestPushMessage = { id:string; title:string; message:string; url:string; createdAt:string };
export const dynamic = "force-dynamic";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" };
export async function GET(request: Request) {
  const after = new URL(request.url).searchParams.get("after") ?? "";
  const messages = await readJson<TestPushMessage[]>("push-messages.json", []);
  return NextResponse.json({ messages: after ? messages.filter((item) => item.createdAt > after) : messages.slice(-10) }, { headers: cors });
}
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: cors }); }
