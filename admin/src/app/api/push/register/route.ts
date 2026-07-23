import { NextResponse } from "next/server";
import { updateJson } from "@/lib/json-store";
import type { PushDevice } from "@/lib/push";
import { requestClientKey, takeRateLimit } from "@/lib/rate-limit";
import { findActiveCustomerBlock } from "@/lib/customer-blocks";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" };
export async function POST(request: Request) {
  const limit = takeRateLimit(`push-register:${requestClientKey(request)}`, 30, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many registration attempts." }, { status: 429, headers: { ...cors, "Retry-After": String(limit.retryAfterSeconds) } });
  const body = await request.json().catch(() => null);
  if (typeof body?.token !== "string" || !/^Expo(?:nent)?PushToken\[[A-Za-z0-9_-]+\]$/.test(body.token) || body.token.length > 256) return NextResponse.json({ error: "Invalid Expo push token" }, { status: 400, headers: cors });
  const customerEmail = typeof body.customerEmail === "string" ? body.customerEmail.trim().toLowerCase().slice(0, 160) : undefined;
  const customerPhone = typeof body.customerPhone === "string" ? body.customerPhone.trim().slice(0, 40) : undefined;
  const platform = body.platform === "ios" || body.platform === "android" ? body.platform : undefined;
  if (await findActiveCustomerBlock({ email: customerEmail, phone: customerPhone })) return NextResponse.json({ error: "This customer account is restricted." }, { status: 403, headers: cors });
  await updateJson<string[]>("blocked-push-tokens.json", [], (tokens) => tokens.filter((token) => token !== body.token));
  await updateJson<PushDevice[]>("push-devices.json", [], (devices) => [
    { token: body.token, platform, customerEmail, customerPhone, updatedAt: new Date().toISOString() },
    ...devices.filter((item) => item.token !== body.token),
  ].slice(0, 10000));
  return NextResponse.json({ registered: true }, { headers: cors });
}
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: cors }); }
