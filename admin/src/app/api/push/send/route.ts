import { NextResponse } from "next/server";
import { sendClientPush } from "@/lib/push";

export async function POST(request: Request) {
  const body = await request.json();
  if (!body?.title || !body?.message) return NextResponse.json({ error: "Title and message are required" }, { status: 400 });
  const result = await sendClientPush({ title: body.title, message: body.message, url: body.url || "/notifications" });
  if ("error" in result) return NextResponse.json(result.error, { status: result.status });
  return NextResponse.json(result);
}
