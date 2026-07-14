import { NextResponse } from "next/server";
import { requireAdmin, shopifyAdminGraphql } from "@/lib/shopify-admin";

type Money = { amount: string; currencyCode: string };
type CommerceOrder = {
  id: string;
  processedAt: string;
  cancelledAt?: string | null;
  totalPriceSet?: { shopMoney?: Money | null } | null;
  netPaymentSet?: { shopMoney?: Money | null } | null;
  customer?: { id: string; email?: string | null } | null;
  email?: string | null;
};

const DAY_MS = 86400000;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const requestedDays = Number(new URL(request.url).searchParams.get("days") || 30);
  const days = [7, 30, 90].includes(requestedDays) ? requestedDays : 30;
  const today = new Date();
  const end = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) + DAY_MS;
  const start = end - days * DAY_MS;
  const queryFilter = `processed_at:>='${new Date(start).toISOString()}' processed_at:<'${new Date(end).toISOString()}'`;
  const query = `
    query commerceOrders($first: Int!, $after: String, $query: String!) {
      orders(first: $first, after: $after, query: $query, sortKey: PROCESSED_AT) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          processedAt
          cancelledAt
          totalPriceSet { shopMoney { amount currencyCode } }
          netPaymentSet { shopMoney { amount currencyCode } }
          customer { id email }
          email
        }
      }
    }
  `;

  try {
    const orders: CommerceOrder[] = [];
    let after: string | null = null;
    let hasNextPage = true;
    let pages = 0;

    while (hasNextPage && pages < 20) {
      const data = await shopifyAdminGraphql(query, { first: 250, after, query: queryFilter });
      const connection = data?.orders as { nodes?: CommerceOrder[]; pageInfo?: { hasNextPage?: boolean; endCursor?: string | null } } | undefined;
      orders.push(...(connection?.nodes || []));
      hasNextPage = Boolean(connection?.pageInfo?.hasNextPage);
      after = connection?.pageInfo?.endCursor || null;
      pages += 1;
      if (hasNextPage && !after) break;
    }

    const activeOrders = orders.filter((order) => !order.cancelledAt);
    const customers = new Set<string>();
    let currencyCode = "USD";
    const daily = Array.from({ length: days }, (_, index) => {
      const date = new Date(start + index * DAY_MS);
      const key = date.toISOString().slice(0, 10);
      const dayOrders = activeOrders.filter((order) => order.processedAt.slice(0, 10) === key);
      const dayCustomers = new Set<string>();
      let sales = 0;
      let revenue = 0;

      for (const order of dayOrders) {
        const gross = order.totalPriceSet?.shopMoney;
        const net = order.netPaymentSet?.shopMoney;
        sales += Number(gross?.amount || 0);
        revenue += Number(net?.amount || 0);
        if (net?.currencyCode || gross?.currencyCode) currencyCode = net?.currencyCode || gross?.currencyCode || currencyCode;
        const customerKey = order.customer?.id || order.customer?.email || order.email || order.id;
        dayCustomers.add(customerKey);
        customers.add(customerKey);
      }

      return {
        date: key,
        label: date.toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" }),
        sales: Math.round(sales * 100) / 100,
        revenue: Math.round(revenue * 100) / 100,
        customers: dayCustomers.size,
        orders: dayOrders.length,
      };
    });

    return NextResponse.json({
      range: { days, start: new Date(start).toISOString(), end: new Date(end - 1).toISOString() },
      currencyCode,
      totals: {
        sales: daily.reduce((sum, day) => sum + day.sales, 0),
        revenue: Math.round(daily.reduce((sum, day) => sum + day.revenue, 0) * 100) / 100,
        customers: customers.size,
        orders: activeOrders.length,
      },
      daily,
      truncated: hasNextPage,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load Shopify commerce analytics." }, { status: 502 });
  }
}
