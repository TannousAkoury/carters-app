import { NextResponse } from "next/server";
import { requireAdmin, shopifyAdminGraphql, shopifyError } from "@/lib/shopify-admin";

export const dynamic = "force-dynamic";

type Discount = { __typename?: string; title?: string; status?: string; startsAt?: string | null; endsAt?: string | null; asyncUsageCount?: number; codes?: { nodes?: { code?: string }[] } };

export async function GET(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const url = new URL(request.url);
  const after = url.searchParams.get("after");
  const search = url.searchParams.get("search")?.trim() || null;
  const query = `
    query promotions($first: Int!, $after: String, $query: String) {
      discountNodes(first: $first, after: $after, query: $query, sortKey: UPDATED_AT, reverse: true) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          discount {
            __typename
            ... on DiscountCodeBasic { title status startsAt endsAt asyncUsageCount codes(first: 1) { nodes { code } } }
            ... on DiscountCodeBxgy { title status startsAt endsAt asyncUsageCount codes(first: 1) { nodes { code } } }
            ... on DiscountCodeFreeShipping { title status startsAt endsAt asyncUsageCount codes(first: 1) { nodes { code } } }
            ... on DiscountAutomaticBasic { title status startsAt endsAt asyncUsageCount }
            ... on DiscountAutomaticBxgy { title status startsAt endsAt asyncUsageCount }
            ... on DiscountAutomaticFreeShipping { title status startsAt endsAt asyncUsageCount }
          }
        }
      }
    }
  `;
  try {
    const data = await shopifyAdminGraphql(query, { first: 50, after, query: search });
    const promotions = (data?.discountNodes?.nodes || []).map((node: { id: string; discount?: Discount }) => {
      const discount = node.discount || {};
      return { id: node.id, title: discount.title || "Untitled promotion", type: discount.__typename?.replace(/^Discount/, "") || "Discount", code: discount.codes?.nodes?.[0]?.code || "Automatic", status: discount.status || "UNKNOWN", startsAt: discount.startsAt || null, endsAt: discount.endsAt || null, usageCount: Number(discount.asyncUsageCount || 0) };
    });
    return NextResponse.json({ promotions, pageInfo: data?.discountNodes?.pageInfo || { hasNextPage: false, endCursor: null } });
  } catch (error) {
    return shopifyError(error, { promotions: [], pageInfo: { hasNextPage: false, endCursor: null } });
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const method = body?.method === "automatic" ? "automatic" : "code";
  const valueType = body?.valueType === "fixed" ? "fixed" : "percentage";
  const value = Number(body?.value);
  if (!title || !Number.isFinite(value) || value <= 0) return NextResponse.json({ error: "Promotion title and a positive discount value are required." }, { status: 400 });
  if (valueType === "percentage" && value > 100) return NextResponse.json({ error: "Percentage discounts cannot exceed 100%." }, { status: 400 });
  if (method === "code" && (typeof body?.code !== "string" || !body.code.trim())) return NextResponse.json({ error: "A discount code is required." }, { status: 400 });
  const discountValue = valueType === "percentage" ? { percentage: value / 100 } : { discountAmount: { amount: value.toFixed(2), appliesOnEachItem: false } };
  const common = {
    title,
    startsAt: typeof body?.startsAt === "string" && body.startsAt ? body.startsAt : new Date().toISOString(),
    endsAt: typeof body?.endsAt === "string" && body.endsAt ? body.endsAt : null,
    minimumRequirement: Number(body?.minimumSubtotal) > 0 ? { subtotal: { greaterThanOrEqualToSubtotal: Number(body.minimumSubtotal).toFixed(2) } } : { quantity: { greaterThanOrEqualToQuantity: "1" } },
    customerGets: { value: discountValue, items: { all: true } },
  };
  try {
    if (method === "automatic") {
      const mutation = `mutation createAutomatic($input: DiscountAutomaticBasicInput!) { discountAutomaticBasicCreate(automaticBasicDiscount: $input) { automaticDiscountNode { id } userErrors { field message } } }`;
      const data = await shopifyAdminGraphql(mutation, { input: common });
      const errors = data?.discountAutomaticBasicCreate?.userErrors || [];
      if (errors.length) throw new Error(errors.map((error: { message: string }) => error.message).join(" | "));
      return NextResponse.json({ ok: true, id: data?.discountAutomaticBasicCreate?.automaticDiscountNode?.id });
    }
    const mutation = `mutation createCode($input: DiscountCodeBasicInput!) { discountCodeBasicCreate(basicCodeDiscount: $input) { codeDiscountNode { id } userErrors { field message } } }`;
    const data = await shopifyAdminGraphql(mutation, { input: { ...common, code: body.code.trim().toUpperCase(), context: { all: true }, appliesOncePerCustomer: Boolean(body.appliesOncePerCustomer), usageLimit: Number(body.usageLimit) > 0 ? Math.floor(Number(body.usageLimit)) : null } });
    const errors = data?.discountCodeBasicCreate?.userErrors || [];
    if (errors.length) throw new Error(errors.map((error: { message: string }) => error.message).join(" | "));
    return NextResponse.json({ ok: true, id: data?.discountCodeBasicCreate?.codeDiscountNode?.id });
  } catch (error) {
    return shopifyError(error, {});
  }
}

export async function DELETE(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const url = new URL(request.url);
  const id = url.searchParams.get("id") || "";
  const method = url.searchParams.get("method");
  if (!id || !["code", "automatic"].includes(method || "")) return NextResponse.json({ error: "Promotion id and method are required." }, { status: 400 });
  try {
    const automatic = method === "automatic";
    const mutation = automatic
      ? `mutation remove($id: ID!) { discountAutomaticDelete(id: $id) { deletedAutomaticDiscountId userErrors { field message } } }`
      : `mutation remove($id: ID!) { discountCodeDelete(id: $id) { deletedCodeDiscountId userErrors { field message } } }`;
    const data = await shopifyAdminGraphql(mutation, { id });
    const result = automatic ? data?.discountAutomaticDelete : data?.discountCodeDelete;
    if (result?.userErrors?.length) throw new Error(result.userErrors.map((error: { message: string }) => error.message).join(" | "));
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    return shopifyError(error, {});
  }
}
