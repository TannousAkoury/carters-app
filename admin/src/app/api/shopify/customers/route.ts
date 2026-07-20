import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/shopify-admin";
import { loyaltySnapshot, type LoyaltyAccount } from "@/lib/loyalty";

export const dynamic = "force-dynamic";

type ShopifyCustomerNode = {
  id: string;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  state?: string | null;
  numberOfOrders?: number | string | null;
  amountSpent?: { amount: string; currencyCode: string } | null;
  defaultAddress?: { city?: string | null; province?: string | null; country?: string | null } | null;
  lastOrder?: { createdAt?: string | null; processedAt?: string | null } | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type ShopifyCustomerEdge = {
  cursor: string;
  node: ShopifyCustomerNode;
};

function shopifyDomain() {
  const value =
    process.env.SHOPIFY_ADMIN_DOMAIN ||
    process.env.SHOPIFY_DOMAIN ||
    process.env.NEXT_PUBLIC_SHOPIFY_DOMAIN ||
    "";
  return value.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function formatLocation(address?: ShopifyCustomerNode["defaultAddress"]) {
  return [address?.city, address?.province, address?.country].filter(Boolean).join(", ") || "—";
}

function normalizeCustomerId(value: string) {
  return value.trim().split("/").at(-1) || "";
}

function findLoyaltyAccount(node: ShopifyCustomerNode, accounts: LoyaltyAccount[]) {
  const customerId = normalizeCustomerId(node.id);
  const email = (node.email || "").trim().toLowerCase();
  return accounts.find((account) => (customerId && normalizeCustomerId(account.customerId) === customerId) || (email && account.email.trim().toLowerCase() === email));
}

function mapCustomer(node: ShopifyCustomerNode, loyaltyAccount?: LoyaltyAccount, transactions: Awaited<ReturnType<typeof loyaltySnapshot>>["transactions"] = []) {
  const accountTransactions = loyaltyAccount ? transactions.filter((transaction) => transaction.accountId === loyaltyAccount.id) : [];
  const earnedPoints = accountTransactions.filter((transaction) => transaction.points > 0).reduce((sum, transaction) => sum + transaction.points, 0);
  const redeemedPoints = Math.abs(accountTransactions.filter((transaction) => transaction.type === "redemption").reduce((sum, transaction) => sum + transaction.points, 0));
  return {
    id: node.id,
    name: node.displayName || [node.firstName, node.lastName].filter(Boolean).join(" ") || "Unnamed customer",
    firstName: node.firstName || "",
    lastName: node.lastName || "",
    email: node.email || "",
    phone: node.phone || "",
    location: formatLocation(node.defaultAddress),
    orders: Number(node.numberOfOrders ?? 0),
    totalSpent: node.amountSpent,
    status: node.state || "UNKNOWN",
    lastOrderAt: node.lastOrder?.processedAt || node.lastOrder?.createdAt || null,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    loyalty: loyaltyAccount ? {
      enrolled: true,
      points: loyaltyAccount.points,
      lifetimePoints: loyaltyAccount.lifetimePoints,
      updatedAt: loyaltyAccount.updatedAt,
      transactionCount: accountTransactions.length,
      earnedPoints,
      redeemedPoints,
      lastActivityAt: accountTransactions[0]?.createdAt || loyaltyAccount.updatedAt,
      lastEarnedAt: accountTransactions.find((transaction) => transaction.type === "earn")?.createdAt || null,
    } : { enrolled: false, points: 0, lifetimePoints: 0, updatedAt: null, transactionCount: 0, earnedPoints: 0, redeemedPoints: 0, lastActivityAt: null, lastEarnedAt: null },
  };
}

function permissionMessage(message: string) {
  if (/access denied.*customers/i.test(message)) {
    return "Access denied for Shopify customers. Add read_customers and write_customers Admin API scopes to your Shopify custom app, save it, reinstall/update the app, copy the new Admin API access token, then restart the admin server.";
  }
  if (/access denied.*orders|lastOrder/i.test(message)) {
    return "Access denied for Shopify order data. Add read_orders Admin API scope if you want to filter customers by last purchase date, then reinstall/update the app, copy the new Admin API access token, and restart the admin server.";
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
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.errors?.length) {
    const shopifyError = payload?.errors?.[0]?.message || `Shopify returned HTTP ${response.status}`;
    throw new Error(permissionMessage(shopifyError));
  }

  return payload?.data;
}

function jsonError(error: unknown, status = 500) {
  return NextResponse.json(
    {
      configured: true,
      error: error instanceof Error ? error.message : "Shopify request failed.",
      customers: [],
    },
    { status },
  );
}

export async function GET(request: Request) {
  const unauthorized = await requirePermission("Customers");
  if (unauthorized) return unauthorized;
  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim() ?? "";
  const after = url.searchParams.get("after");
  const createdFrom = url.searchParams.get("createdFrom")?.trim() ?? "";
  const createdTo = url.searchParams.get("createdTo")?.trim() ?? "";
  const validDate = (value: string) => { if (!value) return true;if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;const parsed = new Date(`${value}T00:00:00.000Z`);return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value };
  if (!validDate(createdFrom) || !validDate(createdTo) || (createdFrom && createdTo && createdFrom > createdTo)) return NextResponse.json({ error: "Choose a valid customer creation date range." }, { status: 400 });
  const queryParts = [search];
  if (createdFrom) queryParts.push(`created_at:>=${createdFrom}T00:00:00Z`);
  if (createdTo) { const exclusiveEnd = new Date(`${createdTo}T00:00:00.000Z`);exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);queryParts.push(`created_at:<${exclusiveEnd.toISOString()}`) }
  const customerQuery = queryParts.filter(Boolean).join(" ");
  const sortKey = createdFrom || createdTo ? "CREATED_AT" : "UPDATED_AT";

  const query = `
    query getCustomers($first: Int!, $after: String, $query: String) {
      customers(first: $first, after: $after, query: $query, sortKey: ${sortKey}, reverse: true) {
        pageInfo { hasNextPage endCursor }
        edges {
          cursor
          node {
            id
            displayName
            firstName
            lastName
            email
            phone
            state
            numberOfOrders
            amountSpent { amount currencyCode }
            defaultAddress { city province country }
            lastOrder { createdAt processedAt }
            createdAt
            updatedAt
          }
        }
      }
    }
  `;

  let data;
  try {
    data = await shopifyGraphql(query, { first: 50, after, query: customerQuery || null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return jsonError(error, message.startsWith("Set a real") ? 503 : 502);
  }

  const connection = data?.customers;
  const loyalty = await loyaltySnapshot();
  const customers = ((connection?.edges ?? []) as ShopifyCustomerEdge[]).map(({ node }) => mapCustomer(node, findLoyaltyAccount(node, loyalty.accounts), loyalty.transactions));

  return NextResponse.json({
    configured: true,
    customers,
    loyaltySettings: loyalty.settings,
    pageInfo: connection?.pageInfo ?? { hasNextPage: false, endCursor: null },
  });
}

export async function PATCH(request: Request) {
  const unauthorized = await requirePermission("Customers");
  if (unauthorized) return unauthorized;
  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Customer id is required." }, { status: 400 });

  const input: Record<string, string> = { id };
  for (const field of ["firstName", "lastName", "email", "phone"]) {
    if (typeof body?.[field] === "string") input[field] = body[field].trim();
  }

  const mutation = `
    mutation updateCustomer($input: CustomerInput!) {
      customerUpdate(input: $input) {
        customer {
          id
          displayName
          firstName
          lastName
          email
          phone
          state
          numberOfOrders
          amountSpent { amount currencyCode }
          defaultAddress { city province country }
          lastOrder { createdAt processedAt }
          createdAt
          updatedAt
        }
        userErrors { field message }
      }
    }
  `;

  try {
    const data = await shopifyGraphql(mutation, { input });
    const result = data?.customerUpdate;
    if (result?.userErrors?.length) throw new Error(result.userErrors.map((error: { message: string }) => error.message).join(" | "));
    return NextResponse.json({ customer: mapCustomer(result.customer) });
  } catch (error) {
    return jsonError(error, 502);
  }
}

export async function DELETE(request: Request) {
  const unauthorized = await requirePermission("Customers");
  if (unauthorized) return unauthorized;
  const url = new URL(request.url);
  const id = url.searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "Customer id is required." }, { status: 400 });

  const mutation = `
    mutation deleteCustomer($id: ID!) {
      customerDelete(input: { id: $id }) {
        deletedCustomerId
        userErrors { field message }
      }
    }
  `;

  try {
    const data = await shopifyGraphql(mutation, { id });
    const result = data?.customerDelete;
    if (result?.userErrors?.length) throw new Error(result.userErrors.map((error: { message: string }) => error.message).join(" | "));
    return NextResponse.json({ deletedCustomerId: result?.deletedCustomerId });
  } catch (error) {
    return jsonError(error, 502);
  }
}
