import { NextResponse } from "next/server";
import { sendClientPush } from "@/lib/push";
import { requirePermission } from "@/lib/shopify-admin";

export async function POST(request: Request) {
  const unauthorized = await requirePermission("Marketing");
  if (unauthorized) return unauthorized;
  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const url = typeof body?.url === "string" ? body.url.trim() : "/notifications";
  if (!title || !message) return NextResponse.json({ error: "Title and message are required." }, { status: 400 });
  if (title.length > 65) return NextResponse.json({ error: "Notification titles must be 65 characters or fewer." }, { status: 400 });
  if (message.length > 180) return NextResponse.json({ error: "Notification messages must be 180 characters or fewer." }, { status: 400 });
  if (!url.startsWith("/") && !/^https:\/\//i.test(url)) return NextResponse.json({ error: "Use an app path or a secure HTTPS link." }, { status: 400 });
  const result = await sendClientPush({ title, message, url });
  if ("error" in result) return NextResponse.json(result.error, { status: result.status });
  return NextResponse.json(result);
}
