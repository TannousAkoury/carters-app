import { NextResponse } from "next/server";
import { readJson, writeJson } from "@/lib/json-store";

type Device = { token: string; platform?: string; updatedAt: string };
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" };
export async function POST(request: Request) {
  const body = await request.json();
  if (typeof body?.token !== "string" || !body.token.startsWith("ExponentPushToken[")) return NextResponse.json({ error: "Invalid Expo push token" }, { status: 400, headers: cors });
  const devices = await readJson<Device[]>("push-devices.json", []);
  const next = [{ token: body.token, platform: body.platform, updatedAt: new Date().toISOString() }, ...devices.filter((item) => item.token !== body.token)];
  await writeJson("push-devices.json", next);
  return NextResponse.json({ registered: true }, { headers: cors });
}
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: cors }); }
