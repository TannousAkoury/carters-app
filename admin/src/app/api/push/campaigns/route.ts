import { NextResponse } from "next/server";
import { readJson } from "@/lib/json-store";
import { requirePermission } from "@/lib/shopify-admin";

type Campaign = { id:string;title:string;message:string;url:string;createdAt:string;recipientCount:number;status:string };
type Event = { name:string;sessionId:string;properties?:{campaignId?:string;title?:string} };
export const dynamic = "force-dynamic";
export async function GET() {
  const unauthorized = await requirePermission("Marketing");
  if (unauthorized) return unauthorized;
  const campaigns = await readJson<Campaign[]>("push-messages.json", []);
  const events = await readJson<Event[]>("analytics-events.json", []);
  const result = campaigns.slice().reverse().map((campaign) => {
    const recipientCount = campaign.recipientCount ?? 0;
    const status = campaign.status ?? "test-queued";
    const opens = new Set(events.filter((event) => event.name === "notification_open" && (event.properties?.campaignId === campaign.id || (!event.properties?.campaignId && event.properties?.title === campaign.title))).map((event) => event.sessionId)).size;
    return { ...campaign, recipientCount, status, opens, openRate: recipientCount > 0 ? Math.round((opens / recipientCount) * 1000) / 10 : null };
  });
  return NextResponse.json({ campaigns: result });
}
