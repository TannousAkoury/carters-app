import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { readJson, updateJson } from "@/lib/json-store";
import { sendClientPush, type PushDevice } from "@/lib/push";
import { awardPaidOrder, reverseOrderPoints } from "@/lib/loyalty";

type ShopifyOrderWebhook = {
  id?: number | string;
  name?: string;
  email?: string;
  contact_email?: string;
  phone?: string;
  cancelled_at?: string | null;
  financial_status?: string;
  total_price?: string;
  current_total_price?: string;
  currency?: string;
  line_items?: { quantity?: number }[];
  customer?: { id?: number|string; email?: string; phone?: string; first_name?: string; last_name?: string } | null;
};

type OrderNotificationLog = {
  id: string;
  orderId: string;
  orderName: string;
  topic: string;
  customerEmail?: string;
  recipientCount: number;
  createdAt: string;
};

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!process.env.SHOPIFY_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Shopify webhook verification is not configured" }, { status: 503 });
  }
  const rawBody = await request.text();
  if (!verifyShopifyWebhook(rawBody, request.headers)) {
    return NextResponse.json({ error: "Invalid Shopify webhook signature" }, { status: 401 });
  }

  const topic = request.headers.get("x-shopify-topic") ?? "";
  let order: ShopifyOrderWebhook;
  try { order = JSON.parse(rawBody) as ShopifyOrderWebhook; }
  catch { return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 }); }
  const status = order.cancelled_at || topic.includes("cancel") ? "cancelled" : "confirmed";
  const orderName = order.name || `#${order.id ?? "order"}`;
  const customerEmail = (order.contact_email || order.email || order.customer?.email || "").trim().toLowerCase();
  const customerPhone = normalizePhone(order.phone || order.customer?.phone || "");
  const orderId=String(order.id??"");
  const customerName=[order.customer?.first_name,order.customer?.last_name].filter(Boolean).join(" ")||customerEmail||"Customer";
  const paid=topic==="orders/paid"||order.financial_status==="paid"||order.financial_status==="partially_paid";
  const itemCount=(order.line_items||[]).reduce((sum,item)=>sum+Math.max(0,Math.floor(Number(item.quantity)||0)),0);
  let loyalty:{status:string;points:number;balance?:number}={status:"not-applicable",points:0};
  if(process.env.SHOPIFY_WEBHOOK_SECRET){
    if(order.cancelled_at||topic.includes("cancel"))loyalty=await reverseOrderPoints(orderId,orderName);
    else if(paid)loyalty=await awardPaidOrder({orderId,orderName,customerId:String(order.customer?.id||""),email:customerEmail,name:customerName,itemCount});
  }else if(paid)loyalty={status:"webhook-secret-required",points:0};
  const devices = await readJson<PushDevice[]>("push-devices.json", []);
  const matchingDevices = devices.filter((device) => {
    const emailMatches = customerEmail && device.customerEmail?.toLowerCase() === customerEmail;
    const phoneMatches = customerPhone && normalizePhone(device.customerPhone || "") === customerPhone;
    return emailMatches || phoneMatches;
  });

  const title = status === "cancelled" ? "Order canceled" : "Order confirmed";
  const message = status === "cancelled"
    ? `Your order ${orderName} has been canceled.`
    : loyalty.status==="awarded"?`Your order ${orderName} is confirmed. You earned ${loyalty.points} reward point${loyalty.points===1?"":"s"}.`:`Your order ${orderName} is confirmed. We will keep you updated.`;
  const result = await sendClientPush({
    title,
    message,
    url: "/account",
    devices,
    targetTokens: matchingDevices.map((device) => device.token),
    kind: "order",
    storeInInbox: matchingDevices.length > 0,
  });

  const log: OrderNotificationLog = {
    id: crypto.randomUUID(),
    orderId,
    orderName,
    topic,
    customerEmail: customerEmail || undefined,
    recipientCount: matchingDevices.length,
    createdAt: new Date().toISOString(),
  };
  await updateJson<OrderNotificationLog[]>("order-notifications.json", [], (logs) => [...logs.slice(-499), log]);

  if ("error" in result) return NextResponse.json(result.error, { status: result.status });
  return NextResponse.json({ ok: true, status, recipients: matchingDevices.length, campaignId: result.campaignId, loyalty });
}

function verifyShopifyWebhook(rawBody: string, headers: Headers) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) return false;
  const signature = headers.get("x-shopify-hmac-sha256");
  if (!signature) return false;
  const digest = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  const expected = Buffer.from(digest);
  const actual = Buffer.from(signature);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}
