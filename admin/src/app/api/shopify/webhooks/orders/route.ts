import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { readJson, writeJson } from "@/lib/json-store";
import { sendClientPush, type PushDevice } from "@/lib/push";

type ShopifyOrderWebhook = {
  id?: number | string;
  name?: string;
  email?: string;
  contact_email?: string;
  phone?: string;
  cancelled_at?: string | null;
  customer?: { email?: string; phone?: string } | null;
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
  const rawBody = await request.text();
  if (!verifyShopifyWebhook(rawBody, request.headers)) {
    return NextResponse.json({ error: "Invalid Shopify webhook signature" }, { status: 401 });
  }

  const topic = request.headers.get("x-shopify-topic") ?? "";
  const order = JSON.parse(rawBody) as ShopifyOrderWebhook;
  const status = order.cancelled_at || topic.includes("cancel") ? "cancelled" : "confirmed";
  const orderName = order.name || `#${order.id ?? "order"}`;
  const customerEmail = (order.contact_email || order.email || order.customer?.email || "").trim().toLowerCase();
  const customerPhone = normalizePhone(order.phone || order.customer?.phone || "");
  const devices = await readJson<PushDevice[]>("push-devices.json", []);
  const matchingDevices = devices.filter((device) => {
    const emailMatches = customerEmail && device.customerEmail?.toLowerCase() === customerEmail;
    const phoneMatches = customerPhone && normalizePhone(device.customerPhone || "") === customerPhone;
    return emailMatches || phoneMatches;
  });

  const title = status === "cancelled" ? "Order canceled" : "Order confirmed";
  const message = status === "cancelled"
    ? `Your order ${orderName} has been canceled.`
    : `Your order ${orderName} is confirmed. We will keep you updated.`;
  const result = await sendClientPush({
    title,
    message,
    url: "/account",
    devices,
    targetTokens: matchingDevices.map((device) => device.token),
    kind: "order",
    storeInInbox: matchingDevices.length > 0,
  });

  const logs = await readJson<OrderNotificationLog[]>("order-notifications.json", []);
  await writeJson("order-notifications.json", [...logs.slice(-499), {
    id: crypto.randomUUID(),
    orderId: String(order.id ?? ""),
    orderName,
    topic,
    customerEmail: customerEmail || undefined,
    recipientCount: matchingDevices.length,
    createdAt: new Date().toISOString(),
  }]);

  if ("error" in result) return NextResponse.json(result.error, { status: result.status });
  return NextResponse.json({ ok: true, status, recipients: matchingDevices.length, campaignId: result.campaignId });
}

function verifyShopifyWebhook(rawBody: string, headers: Headers) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) return true;
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
