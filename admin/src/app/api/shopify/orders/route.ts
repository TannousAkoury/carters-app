import { NextResponse } from "next/server";
import { requireAnyPermission, requirePermission } from "@/lib/shopify-admin";

export const dynamic = "force-dynamic";

type Money = { amount: string; currencyCode: string };
type ShopifyOrder = {
  id: string;
  name: string;
  createdAt: string;
  processedAt?: string | null;
  displayFinancialStatus?: string | null;
  displayFulfillmentStatus?: string | null;
  canMarkAsPaid?: boolean | null;
  cancelledAt?: string | null;
  note?: string | null;
  tags?: string[] | null;
  email?: string | null;
  currentTotalPriceSet?: { shopMoney?: Money | null } | null;
  customer?: { displayName?: string | null; email?: string | null } | null;
  shippingAddress?: { firstName?: string | null; lastName?: string | null; address1?: string | null; address2?: string | null; city?: string | null; province?: string | null; zip?: string | null; country?: string | null; phone?: string | null } | null;
  lineItems?: { nodes?: { name: string; quantity: number; sku?: string | null; variantTitle?: string | null; image?: { url?: string | null; altText?: string | null } | null }[] } | null;
};

function shopifyDomain() {
  const value =
    process.env.SHOPIFY_ADMIN_DOMAIN ||
    process.env.SHOPIFY_DOMAIN ||
    process.env.NEXT_PUBLIC_SHOPIFY_DOMAIN ||
    "";
  return value.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function permissionMessage(message: string) {
  if (/access denied|not authorized|permission/i.test(message)) {
    return "Shopify denied order access. Add read_orders and write_orders, plus read_merchant_managed_fulfillment_orders and write_merchant_managed_fulfillment_orders for fulfillment, then update the custom app access token and restart the admin server.";
  }
  return message;
}

async function shopifyGraphql(query: string, variables: Record<string, unknown>) {
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  const domain = shopifyDomain();
  const apiVersion = process.env.SHOPIFY_ADMIN_API_VERSION || process.env.SHOPIFY_API_VERSION || "2025-10";

  if (!token || token === "replace_with_your_shopify_admin_api_token" || !domain) {
    throw new Error("Set a real Shopify Admin API token in SHOPIFY_ADMIN_ACCESS_TOKEN.");
  }

  const response = await fetch(`https://${domain}/admin/api/${apiVersion}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.errors?.length) {
    const message = payload?.errors?.map((error: { message?: string }) => error.message).filter(Boolean).join(" | ") || `Shopify returned HTTP ${response.status}`;
    throw new Error(permissionMessage(message));
  }
  return payload?.data;
}

function mapOrder(order: ShopifyOrder) {
  const address = order.shippingAddress;
  return {
    id: order.id,
    name: order.name,
    createdAt: order.processedAt || order.createdAt,
    financialStatus: order.displayFinancialStatus || "UNKNOWN",
    fulfillmentStatus: order.displayFulfillmentStatus || "UNFULFILLED",
    canMarkAsPaid: Boolean(order.canMarkAsPaid),
    cancelledAt: order.cancelledAt || null,
    note: order.note || "",
    tags: order.tags || [],
    total: order.currentTotalPriceSet?.shopMoney || null,
    customer: order.customer?.displayName || order.customer?.email || "Guest customer",
    email: order.email || order.customer?.email || "",
    destination: [address?.city, address?.province, address?.country].filter(Boolean).join(", ") || "—",
    shippingAddress: {
      firstName: address?.firstName || "",
      lastName: address?.lastName || "",
      address1: address?.address1 || "",
      address2: address?.address2 || "",
      city: address?.city || "",
      province: address?.province || "",
      zip: address?.zip || "",
      country: address?.country || "",
      phone: address?.phone || "",
    },
    items: order.lineItems?.nodes || [],
  };
}

export async function GET(request: Request) {
  const unauthorized = await requireAnyPermission(["Dashboard", "Orders"]);
  if (unauthorized) return unauthorized;
  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim() || "";
  const status = url.searchParams.get("status")?.trim() || "all";
  const after = url.searchParams.get("after");
  const searchFilter = search ? (search.startsWith("#") ? `name:${search.slice(1)}` : search) : "";
  const queryFilter = [status === "pending" ? "status:open" : "", searchFilter].filter(Boolean).join(" ") || null;
  const query = `
    query getOrders($first: Int!, $after: String, $query: String) {
      orders(first: $first, after: $after, query: $query, sortKey: PROCESSED_AT, reverse: true) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          name
          createdAt
          processedAt
          displayFinancialStatus
          displayFulfillmentStatus
          canMarkAsPaid
          cancelledAt
          note
          tags
          email
          currentTotalPriceSet { shopMoney { amount currencyCode } }
          customer { displayName email }
          shippingAddress { firstName lastName address1 address2 city province zip country phone }
          lineItems(first: 50) { nodes { name quantity sku variantTitle image { url altText } } }
        }
      }
      pendingOrders: ordersCount(query: "status:open", limit: null) { count precision }
    }
  `;

  try {
    const data = await shopifyGraphql(query, { first: 50, after, query: queryFilter });
    return NextResponse.json({
      configured: true,
      orders: ((data?.orders?.nodes || []) as ShopifyOrder[]).map(mapOrder),
      pageInfo: data?.orders?.pageInfo || { hasNextPage: false, endCursor: null },
      counts: { pending: Number(data?.pendingOrders?.count || 0), pendingPrecision: data?.pendingOrders?.precision || "EXACT" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Shopify request failed.";
    return NextResponse.json(
      { configured: !message.startsWith("Set a real"), error: message, orders: [], pageInfo: { hasNextPage: false, endCursor: null }, counts: { pending: 0, pendingPrecision: "EXACT" } },
      { status: message.startsWith("Set a real") ? 503 : 502 },
    );
  }
}

export async function PATCH(request: Request) {
  const unauthorized = await requirePermission("Orders");
  if (unauthorized) return unauthorized;
  const body = await request.json().catch(() => null);
  if (typeof body?.id !== "string" || !body.id) return NextResponse.json({ error: "Order id is required." }, { status: 400 });
  const shippingAddress = body.shippingAddress && typeof body.shippingAddress === "object"
    ? Object.fromEntries(["firstName", "lastName", "address1", "address2", "city", "province", "zip", "country", "phone"].flatMap((key) => typeof body.shippingAddress[key] === "string" ? [[key, body.shippingAddress[key].trim()]] : []))
    : undefined;
  const input: Record<string, unknown> = {
    id: body.id,
    email: typeof body.email === "string" ? body.email.trim() : undefined,
    note: typeof body.note === "string" ? body.note.trim() : undefined,
    tags: typeof body.tags === "string" ? body.tags.split(",").map((tag: string) => tag.trim()).filter(Boolean) : undefined,
    shippingAddress: shippingAddress && Object.keys(shippingAddress).length ? shippingAddress : undefined,
  };
  Object.keys(input).forEach((key) => input[key] === undefined && delete input[key]);
  const mutation = `
    mutation updateOrder($input: OrderInput!) {
      orderUpdate(input: $input) {
        order {
          id name createdAt processedAt displayFinancialStatus displayFulfillmentStatus canMarkAsPaid cancelledAt note tags email
          currentTotalPriceSet { shopMoney { amount currencyCode } }
          customer { displayName email }
          shippingAddress { firstName lastName address1 address2 city province zip country phone }
          lineItems(first: 50) { nodes { name quantity sku variantTitle image { url altText } } }
        }
        userErrors { field message }
      }
    }
  `;
  try {
    const data = await shopifyGraphql(mutation, { input });
    const result = data?.orderUpdate;
    if (result?.userErrors?.length) throw new Error(result.userErrors.map((error: { message: string }) => error.message).join(" | "));
    return NextResponse.json({ order: mapOrder(result.order) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update order." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const unauthorized = await requirePermission("Orders");
  if (unauthorized) return unauthorized;
  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const action = body?.action;
  const ids: string[] = Array.isArray(body?.ids) ? [...new Set<string>((body.ids as unknown[]).filter((value: unknown): value is string => typeof value === "string" && Boolean(value)))] : [];
  if (action !== "mark_paid" && action !== "fulfill" && action !== "bulk_fulfill") return NextResponse.json({ error: "Choose a valid order action." }, { status: 400 });
  if ((action === "bulk_fulfill" && !ids.length) || (action !== "bulk_fulfill" && !id)) return NextResponse.json({ error: "Select at least one order." }, { status: 400 });
  if (ids.length > 50) return NextResponse.json({ error: "Fulfill up to 50 orders per API batch." }, { status: 400 });

  try {
    if (action === "mark_paid") {
      const mutation = `mutation markPaid($input: OrderMarkAsPaidInput!) { orderMarkAsPaid(input: $input) { order { id name displayFinancialStatus } userErrors { field message } } }`;
      const data = await shopifyGraphql(mutation, { input: { id } });
      const errors = data?.orderMarkAsPaid?.userErrors || [];
      if (errors.length) throw new Error(errors.map((error: { message: string }) => error.message).join(" | "));
      return NextResponse.json({ ok: true, action, order: data?.orderMarkAsPaid?.order });
    }

    const fulfillOne = async (orderId: string) => {
      const query = `query fulfillmentOrders($id: ID!) { order(id: $id) { fulfillmentOrders(first: 50) { nodes { id status supportedActions { action } } } } }`;
      const data = await shopifyGraphql(query, { id: orderId });
      const fulfillmentOrders = (data?.order?.fulfillmentOrders?.nodes || []).filter((order: { supportedActions?: { action?: string }[] }) => order.supportedActions?.some((supported) => supported.action === "CREATE_FULFILLMENT"));
      if (!fulfillmentOrders.length) throw new Error("No items are ready to fulfill.");
      const mutation = `mutation fulfill($fulfillment: FulfillmentInput!) { fulfillmentCreate(fulfillment: $fulfillment) { fulfillment { id status } userErrors { field message } } }`;
      let groups = 0;
      for (const fulfillmentOrder of fulfillmentOrders as { id: string }[]) {
        const result = await shopifyGraphql(mutation, { fulfillment: { lineItemsByFulfillmentOrder: [{ fulfillmentOrderId: fulfillmentOrder.id }], notifyCustomer: Boolean(body?.notifyCustomer) } });
        const errors = result?.fulfillmentCreate?.userErrors || [];
        if (errors.length) throw new Error(errors.map((error: { message: string }) => error.message).join(" | "));
        groups += 1;
      }
      return groups;
    };

    if (action === "fulfill") return NextResponse.json({ ok: true, action, fulfilled: await fulfillOne(id) });

    const failed: { id: string; error: string }[] = [];
    let fulfilledOrders = 0;
    let fulfillmentGroups = 0;
    for (const orderId of ids) {
      try {
        fulfillmentGroups += await fulfillOne(orderId);
        fulfilledOrders += 1;
      } catch (error) {
        failed.push({ id: orderId, error: error instanceof Error ? error.message : "Unable to fulfill order." });
      }
    }
    return NextResponse.json({ ok: failed.length === 0, action, fulfilledOrders, fulfillmentGroups, failed }, { status: failed.length ? 207 : 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update order status." }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  const unauthorized = await requirePermission("Orders");
  if (unauthorized) return unauthorized;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Order id is required." }, { status: 400 });
  const mutation = `
    mutation cancelOrder($orderId: ID!, $refundMethod: OrderCancelRefundMethodInput!, $restock: Boolean!, $reason: OrderCancelReason!, $staffNote: String) {
      orderCancel(orderId: $orderId, refundMethod: $refundMethod, restock: $restock, reason: $reason, staffNote: $staffNote) {
        job { id done }
        orderCancelUserErrors { field message code }
      }
    }
  `;
  try {
    const data = await shopifyGraphql(mutation, {
      orderId: id,
      refundMethod: { originalPaymentMethodsRefund: false },
      restock: true,
      reason: "OTHER",
      staffNote: "Cancelled from Carter's App Studio admin.",
    });
    const result = data?.orderCancel;
    if (result?.orderCancelUserErrors?.length) throw new Error(result.orderCancelUserErrors.map((error: { message: string }) => error.message).join(" | "));
    return NextResponse.json({ ok: true, job: result?.job || null });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to cancel order." }, { status: 502 });
  }
}
