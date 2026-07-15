import { NextResponse } from "next/server";
import { requireAdmin, shopifyAdminGraphql } from "@/lib/shopify-admin";

type Money = { amount: string; currencyCode: string };
type CommerceOrder = {
  id: string;
  processedAt: string;
  cancelledAt?: string | null;
  totalPriceSet?: { shopMoney?: Money | null } | null;
  netPaymentSet?: { shopMoney?: Money | null } | null;
  totalRefundedSet?: { shopMoney?: Money | null } | null;
  totalDiscountsSet?: { shopMoney?: Money | null } | null;
  displayFinancialStatus?: string | null;
  displayFulfillmentStatus?: string | null;
  sourceName?: string | null;
  lineItems?: { nodes?: { title: string; quantity: number; discountedTotalSet?: { shopMoney?: Money | null } | null }[] } | null;
  customer?: { id: string; email?: string | null; displayName?: string | null; state?: string | null } | null;
  email?: string | null;
};

const DAY_MS = 86400000;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const requestedStart = url.searchParams.get("start");
  const requestedEnd = url.searchParams.get("end");
  const today = new Date();
  let end = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) + DAY_MS;
  let days = [7, 30, 90].includes(Number(url.searchParams.get("days"))) ? Number(url.searchParams.get("days")) : 30;
  let start = end - days * DAY_MS;
  if (requestedStart && requestedEnd && /^\d{4}-\d{2}-\d{2}$/.test(requestedStart) && /^\d{4}-\d{2}-\d{2}$/.test(requestedEnd)) {
    start = Date.parse(`${requestedStart}T00:00:00.000Z`);
    end = Date.parse(`${requestedEnd}T00:00:00.000Z`) + DAY_MS;
    days = Math.round((end - start) / DAY_MS);
    if (!Number.isFinite(start) || !Number.isFinite(end) || days < 1 || days > 1095) return NextResponse.json({ error: "Choose a valid report range of up to 1095 days." }, { status: 400 });
  }
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
          totalRefundedSet { shopMoney { amount currencyCode } }
          totalDiscountsSet { shopMoney { amount currencyCode } }
          displayFinancialStatus
          displayFulfillmentStatus
          sourceName
          lineItems(first: 50) { nodes { title quantity discountedTotalSet { shopMoney { amount currencyCode } } } }
          customer { id email displayName state }
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
    const customerOrders = new Map<string, number>();
    const customerMap = new Map<string, { id: string; name: string; email: string; orders: number; totalSpent: number; lastOrderAt: string; accountState: string; sourceCounts: Record<string, number> }>();
    const productMap = new Map<string, { title: string; quantity: number; sales: number }>();
    const fulfillmentMap = new Map<string, number>();
    const financialMap = new Map<string, number>();
    const sourceMap = new Map<string, number>();
    let currencyCode = "USD";
    for (const order of activeOrders) {
      const customerKey = order.customer?.id || order.customer?.email || order.email || order.id;
      customerOrders.set(customerKey, (customerOrders.get(customerKey) || 0) + 1);
      const customer = customerMap.get(customerKey) || { id: customerKey, name: order.customer?.displayName || order.customer?.email || order.email || "Guest customer", email: order.customer?.email || order.email || "", orders: 0, totalSpent: 0, lastOrderAt: order.processedAt, accountState: order.customer?.state || "DISABLED", sourceCounts: {} };
      customer.orders += 1;
      customer.totalSpent += Number(order.totalPriceSet?.shopMoney?.amount || 0);
      if (order.processedAt > customer.lastOrderAt) customer.lastOrderAt = order.processedAt;
      const customerSource = order.sourceName || "web";
      customer.sourceCounts[customerSource] = (customer.sourceCounts[customerSource] || 0) + 1;
      customerMap.set(customerKey, customer);
      const fulfillment = order.displayFulfillmentStatus || "UNFULFILLED";
      const financial = order.displayFinancialStatus || "UNKNOWN";
      const source = order.sourceName || "Online store";
      fulfillmentMap.set(fulfillment, (fulfillmentMap.get(fulfillment) || 0) + 1);
      financialMap.set(financial, (financialMap.get(financial) || 0) + 1);
      sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
      for (const line of order.lineItems?.nodes || []) {
        const item = productMap.get(line.title) || { title: line.title, quantity: 0, sales: 0 };
        item.quantity += line.quantity;
        item.sales += Number(line.discountedTotalSet?.shopMoney?.amount || 0);
        productMap.set(line.title, item);
      }
    }
    const daily = Array.from({ length: days }, (_, index) => {
      const date = new Date(start + index * DAY_MS);
      const key = date.toISOString().slice(0, 10);
      const dayOrders = activeOrders.filter((order) => order.processedAt.slice(0, 10) === key);
      const dayCustomers = new Set<string>();
      let sales = 0;
      let revenue = 0;
      let refunds = 0;
      let discounts = 0;
      let itemsSold = 0;

      for (const order of dayOrders) {
        const gross = order.totalPriceSet?.shopMoney;
        const net = order.netPaymentSet?.shopMoney;
        sales += Number(gross?.amount || 0);
        revenue += Number(net?.amount || 0);
        refunds += Number(order.totalRefundedSet?.shopMoney?.amount || 0);
        discounts += Number(order.totalDiscountsSet?.shopMoney?.amount || 0);
        itemsSold += (order.lineItems?.nodes || []).reduce((sum, line) => sum + line.quantity, 0);
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
        refunds: Math.round(refunds * 100) / 100,
        discounts: Math.round(discounts * 100) / 100,
        itemsSold,
        averageOrderValue: dayOrders.length ? Math.round((sales / dayOrders.length) * 100) / 100 : 0,
      };
    });

    const totalSales = Math.round(daily.reduce((sum, day) => sum + day.sales, 0) * 100) / 100;
    const totalOrders = activeOrders.length;
    const breakdown = (map: Map<string, number>) => [...map].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);

    return NextResponse.json({
      range: { days, start: new Date(start).toISOString(), end: new Date(end - 1).toISOString() },
      currencyCode,
      totals: {
        sales: totalSales,
        revenue: Math.round(daily.reduce((sum, day) => sum + day.revenue, 0) * 100) / 100,
        customers: customers.size,
        orders: totalOrders,
        refunds: Math.round(daily.reduce((sum, day) => sum + day.refunds, 0) * 100) / 100,
        discounts: Math.round(daily.reduce((sum, day) => sum + day.discounts, 0) * 100) / 100,
        itemsSold: daily.reduce((sum, day) => sum + day.itemsSold, 0),
        averageOrderValue: totalOrders ? Math.round((totalSales / totalOrders) * 100) / 100 : 0,
      },
      daily,
      topProducts: [...productMap.values()].map((item) => ({ ...item, sales: Math.round(item.sales * 100) / 100 })).sort((a, b) => b.sales - a.sales || b.quantity - a.quantity).slice(0, 20),
      fulfillment: breakdown(fulfillmentMap),
      financial: breakdown(financialMap),
      sources: breakdown(sourceMap),
      customerTypes: [
        { label: "One-time customers", value: [...customerOrders.values()].filter((count) => count === 1).length },
        { label: "Repeat customers", value: [...customerOrders.values()].filter((count) => count > 1).length },
      ],
      topCustomers: [...customerMap.values()].map(({ sourceCounts, ...customer }) => { const orderSource = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "web";const accountType = customer.accountState === "ENABLED" ? "Registered account" : customer.accountState === "INVITED" ? "Account invited" : customer.accountState === "DECLINED" ? "Invite declined" : "Guest / checkout";return { ...customer, accountType, orderSource: orderSource === "web" ? "Online store" : orderSource.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()), totalSpent: Math.round(customer.totalSpent * 100) / 100, averageOrderValue: customer.orders ? Math.round((customer.totalSpent / customer.orders) * 100) / 100 : 0 } }).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 100),
      truncated: hasNextPage,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load Shopify commerce analytics." }, { status: 502 });
  }
}
