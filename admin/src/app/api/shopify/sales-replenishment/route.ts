import { NextResponse } from "next/server";
import { requireAnyPermission, shopifyAdminGraphql, shopifyError } from "@/lib/shopify-admin";

export const dynamic = "force-dynamic";

type Money = { amount?: string; currencyCode?: string };
type InventoryLevel = { location?: { id?: string; name?: string }; quantities?: { name?: string; quantity?: number }[] };
type SoldLine = {
  id?: string;
  name?: string;
  title?: string;
  sku?: string | null;
  variantTitle?: string | null;
  currentQuantity?: number;
  image?: { url?: string; altText?: string | null } | null;
  discountedUnitPriceAfterAllDiscountsSet?: { shopMoney?: Money | null } | null;
  variant?: { id?: string } | null;
};
type SoldOrder = {
  id?: string;
  processedAt?: string | null;
  createdAt?: string;
  cancelledAt?: string | null;
  lineItems?: { nodes?: SoldLine[]; pageInfo?: { hasNextPage?: boolean } };
};
type StockDetails = { inventoryItemId: string; tracked: boolean; levels: { locationId: string; locationName: string; quantity: number }[] };
type SoldItemAccumulator = {
  key: string;
  variantId: string;
  title: string;
  variant: string;
  sku: string;
  image: { url?: string; altText?: string | null } | null;
  units: number;
  revenue: number;
  orderIds: Set<string>;
};
type CachedReport = { expiresAt: number; payload: Record<string, unknown> };

const reportCache = new Map<string, CachedReport>();
const reportCacheTtlMs = 30_000;

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const isoDate = (date: Date) => date.toISOString().slice(0, 10);

function defaultRange() {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 29);
  return { start: isoDate(start), end: isoDate(end) };
}

function zonedDateParts(value: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || "";
  return { year: read("year"), month: read("month"), day: read("day") };
}

function periodFor(value: string, grouping: "day" | "month", timeZone: string) {
  const parts = zonedDateParts(value, timeZone);
  const key = grouping === "month" ? `${parts.year}-${parts.month}` : `${parts.year}-${parts.month}-${parts.day}`;
  const anchor = new Date(`${parts.year}-${parts.month}-${grouping === "month" ? "01" : parts.day}T12:00:00Z`);
  const label = new Intl.DateTimeFormat(undefined, grouping === "month" ? { month: "long", year: "numeric", timeZone: "UTC" } : { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(anchor);
  return { key, label };
}

export async function GET(request: Request) {
  const unauthorized = await requireAnyPermission(["Inventory"]);
  if (unauthorized) return unauthorized;
  const url = new URL(request.url);
  const grouping = url.searchParams.get("grouping") === "month" ? "month" : "day";
  const forceFresh = url.searchParams.get("fresh") === "1";
  const fallback = defaultRange();
  const start = datePattern.test(url.searchParams.get("start") || "") ? String(url.searchParams.get("start")) : fallback.start;
  const end = datePattern.test(url.searchParams.get("end") || "") ? String(url.searchParams.get("end")) : fallback.end;
  if (start > end) return NextResponse.json({ error: "The start date must be before the end date." }, { status: 400 });
  const exclusiveEnd = new Date(`${end}T00:00:00.000Z`);
  exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
  const cacheKey = `${grouping}|${start}|${end}`;
  const cached = reportCache.get(cacheKey);
  if (!forceFresh && cached && cached.expiresAt > Date.now()) return NextResponse.json(cached.payload, { headers: { "X-Sales-Report-Cache": "HIT" } });
  if (cached) reportCache.delete(cacheKey);

  const ordersQuery = `
    query soldOrders($after: String, $query: String!) {
      shop { ianaTimezone currencyCode }
      locations(first: 50, includeInactive: false) { nodes { id name isActive } }
      orders(first: 250, after: $after, query: $query, sortKey: PROCESSED_AT, reverse: true) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id createdAt processedAt cancelledAt
          lineItems(first: 50) {
            pageInfo { hasNextPage }
            nodes {
              id name title sku variantTitle currentQuantity
              image { url altText }
              discountedUnitPriceAfterAllDiscountsSet { shopMoney { amount currencyCode } }
              variant { id }
            }
          }
        }
      }
    }
  `;
  const stockQuery = `
    query soldItemStock($ids: [ID!]!) {
      nodes(ids: $ids) {
        ... on ProductVariant {
          id
          inventoryItem {
            id tracked
            inventoryLevels(first: 20) {
              nodes { location { id name } quantities(names: ["available"]) { name quantity } }
            }
          }
        }
      }
    }
  `;

  try {
    const aggregates = new Map<string, SoldItemAccumulator>();
    const periodLabels = new Map<string, string>();
    const allOrderIds = new Set<string>();
    const variantIds = new Set<string>();
    let currencyCode = "USD";
    let timeZone = "UTC";
    let locations: { id: string; name: string; isActive: boolean }[] = [];
    let after: string | null = null;
    let hasNextPage = true;
    let pages = 0;
    let lineItemsTruncated = false;

    while (hasNextPage && pages < 25) {
      const query = `processed_at:>='${new Date(`${start}T00:00:00.000Z`).toISOString()}' processed_at:<'${exclusiveEnd.toISOString()}' test:false`;
      const data = await shopifyAdminGraphql(ordersQuery, { after, query });
      pages += 1;
      timeZone = data?.shop?.ianaTimezone || timeZone;
      currencyCode = data?.shop?.currencyCode || currencyCode;
      if (!locations.length) locations = (data?.locations?.nodes || []).map((location: { id?: string; name?: string; isActive?: boolean }) => ({ id: location.id || "", name: location.name || "Location", isActive: Boolean(location.isActive) })).filter((location: { id: string }) => location.id);

      for (const order of (data?.orders?.nodes || []) as SoldOrder[]) {
        if (order.cancelledAt) continue;
        const orderId = order.id || "";
        const processedAt = order.processedAt || order.createdAt;
        if (!processedAt) continue;
        allOrderIds.add(orderId);
        if (order.lineItems?.pageInfo?.hasNextPage) lineItemsTruncated = true;
        const period = periodFor(processedAt, grouping, timeZone);
        periodLabels.set(period.key, period.label);
        for (const line of order.lineItems?.nodes || []) {
          const units = Math.max(0, Number(line.currentQuantity || 0));
          if (!units) continue;
          const variantId = line.variant?.id || "";
          if (variantId) variantIds.add(variantId);
          const identity = variantId || line.sku || line.name || line.id || "unknown";
          const key = `${period.key}|${identity}`;
          const existing = aggregates.get(key) || {
            key,
            variantId,
            title: line.title || line.name || "Unknown item",
            variant: line.variantTitle || "Default",
            sku: line.sku || "",
            image: line.image || null,
            units: 0,
            revenue: 0,
            orderIds: new Set<string>(),
          };
          existing.units += units;
          existing.revenue += Number(line.discountedUnitPriceAfterAllDiscountsSet?.shopMoney?.amount || 0) * units;
          if (orderId) existing.orderIds.add(orderId);
          currencyCode = line.discountedUnitPriceAfterAllDiscountsSet?.shopMoney?.currencyCode || currencyCode;
          aggregates.set(key, existing);
        }
      }
      hasNextPage = Boolean(data?.orders?.pageInfo?.hasNextPage);
      after = data?.orders?.pageInfo?.endCursor || null;
    }

    const stock = new Map<string, StockDetails>();
    const ids = [...variantIds];
    for (let index = 0; index < ids.length; index += 100) {
      const data = await shopifyAdminGraphql(stockQuery, { ids: ids.slice(index, index + 100) });
      for (const node of data?.nodes || []) {
        if (!node?.id || !node.inventoryItem) continue;
        const levels: InventoryLevel[] = node.inventoryItem.inventoryLevels?.nodes || [];
        stock.set(node.id, {
          inventoryItemId: node.inventoryItem.id || "",
          tracked: Boolean(node.inventoryItem.tracked),
          levels: levels.map((level) => ({ locationId: level.location?.id || "", locationName: level.location?.name || "Location", quantity: Number(level.quantities?.find((quantity) => quantity.name === "available")?.quantity || 0) })).filter((level) => level.locationId),
        });
      }
    }

    const groups = [...periodLabels.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([key, label]) => {
      const periodItems = [...aggregates.values()].filter((item) => item.key.startsWith(`${key}|`));
      const periodOrderIds = new Set(periodItems.flatMap((item) => [...item.orderIds]));
      const items = periodItems.sort((a, b) => b.units - a.units).map((item) => ({
        variantId: item.variantId,
        inventoryItemId: stock.get(item.variantId)?.inventoryItemId || "",
        tracked: Boolean(stock.get(item.variantId)?.tracked),
        title: item.title,
        variant: item.variant,
        sku: item.sku,
        image: item.image,
        units: item.units,
        revenue: Number(item.revenue.toFixed(2)),
        orders: item.orderIds.size,
        levels: stock.get(item.variantId)?.levels || [],
      }));
      return { key, label, units: items.reduce((sum, item) => sum + item.units, 0), revenue: Number(items.reduce((sum, item) => sum + item.revenue, 0).toFixed(2)), orders: periodOrderIds.size, items };
    }).filter((group) => group.items.length);
    const allItems = groups.flatMap((group) => group.items);
    const payload = {
      grouping,
      range: { start, end },
      currencyCode,
      timeZone,
      locations,
      groups,
      totals: {
        units: allItems.reduce((sum, item) => sum + item.units, 0),
        revenue: Number(allItems.reduce((sum, item) => sum + item.revenue, 0).toFixed(2)),
        orders: allOrderIds.size,
        variants: new Set(allItems.map((item) => item.variantId || `${item.sku}|${item.title}`)).size,
      },
      truncated: hasNextPage || lineItemsTruncated,
    };
    reportCache.set(cacheKey, { expiresAt: Date.now() + reportCacheTtlMs, payload });
    if (reportCache.size > 20) reportCache.delete(reportCache.keys().next().value as string);
    return NextResponse.json(payload, { headers: { "X-Sales-Report-Cache": "MISS" } });
  } catch (error) {
    return shopifyError(error, { groups: [], locations: [], totals: { units: 0, revenue: 0, orders: 0, variants: 0 }, truncated: false });
  }
}
