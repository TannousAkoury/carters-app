import { NextResponse } from "next/server";
import { readJson, writeJson } from "@/lib/json-store";
import type { PushDevice } from "@/lib/push";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" };
export async function POST(request: Request) {
  const body = await request.json();
  if (typeof body?.token !== "string" || !body.token.startsWith("ExponentPushToken[")) return NextResponse.json({ error: "Invalid Expo push token" }, { status: 400, headers: cors });
  const devices = await readJson<PushDevice[]>("push-devices.json", []);
  const customerEmail = typeof body.customerEmail === "string" ? body.customerEmail.trim().toLowerCase() : undefined;
  const customerPhone = typeof body.customerPhone === "string" ? body.customerPhone.trim() : undefined;
  const next = [{ token: body.token, platform: body.platform, customerEmail, customerPhone, updatedAt: new Date().toISOString() }, ...devices.filter((item) => item.token !== body.token)];
  await writeJson("push-devices.json", next);
  return NextResponse.json({ registered: true }, { headers: cors });
}
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: cors }); }
