import { NextResponse } from "next/server";
import { readJson, writeJson } from "@/lib/json-store";

type Device = { token: string };
type Campaign = { id:string;title:string;message:string;url:string;createdAt:string;recipientCount:number;status:"test-queued"|"submitted"|"failed" };
export async function POST(request: Request) {
  const body = await request.json();
  if (!body?.title || !body?.message) return NextResponse.json({ error: "Title and message are required" }, { status: 400 });
  const devices = await readJson<Device[]>("push-devices.json", []);
  const campaigns = await readJson<Campaign[]>("push-messages.json", []);
  const campaign: Campaign = { id: crypto.randomUUID(), title: body.title, message: body.message, url: body.url || "/notifications", createdAt: new Date().toISOString(), recipientCount: devices.length, status: devices.length ? "submitted" : "test-queued" };
  if (!devices.length) {
    await writeJson("push-messages.json", [...campaigns.slice(-99), campaign]);
    return NextResponse.json({ sent: 0, queued: true, campaignId: campaign.id, mode: "local-test" });
  }
  const messages = devices.map(({ token }) => ({ to: token, sound: "default", title: campaign.title, body: campaign.message, data: { url: campaign.url, campaignId: campaign.id } }));
  const response = await fetch("https://exp.host/--/api/v2/push/send", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json", "Accept-Encoding": "gzip, deflate" }, body: JSON.stringify(messages) });
  const result = await response.json();
  campaign.status = response.ok ? "submitted" : "failed";
  await writeJson("push-messages.json", [...campaigns.slice(-99), campaign]);
  if (!response.ok) return NextResponse.json(result, { status: response.status });
  return NextResponse.json({ sent: devices.length, campaignId: campaign.id, tickets: result.data });
}
