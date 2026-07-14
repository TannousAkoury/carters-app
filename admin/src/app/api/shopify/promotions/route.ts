import { NextResponse } from "next/server";
import { requireAdmin, shopifyAdminGraphql, shopifyError } from "@/lib/shopify-admin";

export const dynamic = "force-dynamic";

type Discount = {
  __typename?: string;
  title?: string;
  status?: string;
  startsAt?: string | null;
  endsAt?: string | null;
  asyncUsageCount?: number;
  usageLimit?: number | null;
  appliesOncePerCustomer?: boolean;
  codes?: { nodes?: { code?: string }[] };
  customerGets?: { value?: { percentage?: number; amount?: { amount?: string } } };
  minimumRequirement?: { greaterThanOrEqualToSubtotal?: { amount?: string } };
};

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
            ... on DiscountCodeBasic {
              title status startsAt endsAt asyncUsageCount usageLimit appliesOncePerCustomer
              codes(first: 1) { nodes { code } }
              customerGets { value { ... on DiscountPercentage { percentage } ... on DiscountAmount { amount { amount } } } }
              minimumRequirement { ... on DiscountMinimumSubtotal { greaterThanOrEqualToSubtotal { amount } } }
            }
            ... on DiscountCodeBxgy { title status startsAt endsAt asyncUsageCount usageLimit appliesOncePerCustomer codes(first: 1) { nodes { code } } }
            ... on DiscountCodeFreeShipping { title status startsAt endsAt asyncUsageCount usageLimit appliesOncePerCustomer codes(first: 1) { nodes { code } } }
            ... on DiscountAutomaticBasic {
              title status startsAt endsAt asyncUsageCount
              customerGets { value { ... on DiscountPercentage { percentage } ... on DiscountAmount { amount { amount } } } }
              minimumRequirement { ... on DiscountMinimumSubtotal { greaterThanOrEqualToSubtotal { amount } } }
            }
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
      const value = discount.customerGets?.value;
      const percentage = typeof value?.percentage === "number" ? value.percentage * 100 : null;
      const fixedAmount = Number(value?.amount?.amount);
      const type = discount.__typename?.replace(/^Discount/, "") || "Discount";
      return {
        id: node.id,
        title: discount.title || "Untitled promotion",
        type,
        code: discount.codes?.nodes?.[0]?.code || "Automatic",
        status: discount.status || "UNKNOWN",
        startsAt: discount.startsAt || null,
        endsAt: discount.endsAt || null,
        usageCount: Number(discount.asyncUsageCount || 0),
        valueType: percentage !== null ? "percentage" : "fixed",
        value: percentage !== null ? percentage : Number.isFinite(fixedAmount) ? fixedAmount : 0,
        minimumSubtotal: discount.minimumRequirement?.greaterThanOrEqualToSubtotal?.amount || "",
        usageLimit: discount.usageLimit ?? null,
        appliesOncePerCustomer: Boolean(discount.appliesOncePerCustomer),
        editable: ["CodeBasic", "AutomaticBasic", "CodeBxgy", "AutomaticBxgy", "CodeFreeShipping", "AutomaticFreeShipping"].includes(type),
        valueEditable: type === "CodeBasic" || type === "AutomaticBasic",
      };
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

export async function PATCH(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const type = typeof body?.type === "string" ? body.type : "";
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const method = body?.method === "automatic" ? "automatic" : "code";
  const valueType = body?.valueType === "fixed" ? "fixed" : "percentage";
  const value = Number(body?.value);
  const supportedTypes = ["CodeBasic", "AutomaticBasic", "CodeBxgy", "AutomaticBxgy", "CodeFreeShipping", "AutomaticFreeShipping"];
  const basic = type === "CodeBasic" || type === "AutomaticBasic";
  if (!id || !title || !supportedTypes.includes(type)) return NextResponse.json({ error: "This promotion type cannot be edited from the admin yet." }, { status: 400 });
  if (basic && (!Number.isFinite(value) || value <= 0)) return NextResponse.json({ error: "A positive discount value is required." }, { status: 400 });
  if (basic && valueType === "percentage" && value > 100) return NextResponse.json({ error: "Percentage discounts cannot exceed 100%." }, { status: 400 });
  if (method === "code" && (typeof body?.code !== "string" || !body.code.trim())) return NextResponse.json({ error: "A discount code is required." }, { status: 400 });

  const discountValue = valueType === "percentage" ? { percentage: value / 100 } : { discountAmount: { amount: value.toFixed(2), appliesOnEachItem: false } };
  const minimumSubtotal = Number(body?.minimumSubtotal);
  const minimumRequirement = minimumSubtotal > 0
    ? { subtotal: { greaterThanOrEqualToSubtotal: minimumSubtotal.toFixed(2) } }
    : { quantity: { greaterThanOrEqualToQuantity: null }, subtotal: { greaterThanOrEqualToSubtotal: null } };
  const commonDetails = {
    title,
    startsAt: typeof body?.startsAt === "string" && body.startsAt ? body.startsAt : new Date().toISOString(),
    endsAt: typeof body?.endsAt === "string" && body.endsAt ? body.endsAt : null,
  };
  const basicDetails = {
    ...commonDetails,
    minimumRequirement,
    customerGets: { value: discountValue },
  };
  const codeDetails = {
    ...commonDetails,
    code: body.code.trim().toUpperCase(),
    appliesOncePerCustomer: Boolean(body.appliesOncePerCustomer),
    usageLimit: Number(body.usageLimit) > 0 ? Math.floor(Number(body.usageLimit)) : null,
  };

  try {
    if (type === "AutomaticBasic") {
      const mutation = `mutation updateAutomatic($id: ID!, $input: DiscountAutomaticBasicInput!) { discountAutomaticBasicUpdate(id: $id, automaticBasicDiscount: $input) { automaticDiscountNode { id } userErrors { field message } } }`;
      const data = await shopifyAdminGraphql(mutation, { id, input: basicDetails });
      const errors = data?.discountAutomaticBasicUpdate?.userErrors || [];
      if (errors.length) throw new Error(errors.map((error: { message: string }) => error.message).join(" | "));
      return NextResponse.json({ ok: true, id });
    }
    if (type === "CodeBasic") {
      const mutation = `mutation updateCode($id: ID!, $input: DiscountCodeBasicInput!) { discountCodeBasicUpdate(id: $id, basicCodeDiscount: $input) { codeDiscountNode { id } userErrors { field message } } }`;
      const data = await shopifyAdminGraphql(mutation, { id, input: { ...basicDetails, ...codeDetails } });
      const errors = data?.discountCodeBasicUpdate?.userErrors || [];
      if (errors.length) throw new Error(errors.map((error: { message: string }) => error.message).join(" | "));
      return NextResponse.json({ ok: true, id });
    }
    if (type === "AutomaticBxgy") {
      const mutation = `mutation updateAutomaticBxgy($id: ID!, $input: DiscountAutomaticBxgyInput!) { discountAutomaticBxgyUpdate(id: $id, automaticBxgyDiscount: $input) { automaticDiscountNode { id } userErrors { field message } } }`;
      const data = await shopifyAdminGraphql(mutation, { id, input: commonDetails });
      const errors = data?.discountAutomaticBxgyUpdate?.userErrors || [];
      if (errors.length) throw new Error(errors.map((error: { message: string }) => error.message).join(" | "));
      return NextResponse.json({ ok: true, id });
    }
    if (type === "CodeBxgy") {
      const mutation = `mutation updateCodeBxgy($id: ID!, $input: DiscountCodeBxgyInput!) { discountCodeBxgyUpdate(id: $id, bxgyCodeDiscount: $input) { codeDiscountNode { id } userErrors { field message } } }`;
      const data = await shopifyAdminGraphql(mutation, { id, input: codeDetails });
      const errors = data?.discountCodeBxgyUpdate?.userErrors || [];
      if (errors.length) throw new Error(errors.map((error: { message: string }) => error.message).join(" | "));
      return NextResponse.json({ ok: true, id });
    }
    if (type === "AutomaticFreeShipping") {
      const mutation = `mutation updateAutomaticShipping($id: ID!, $input: DiscountAutomaticFreeShippingInput!) { discountAutomaticFreeShippingUpdate(id: $id, freeShippingAutomaticDiscount: $input) { automaticDiscountNode { id } userErrors { field message } } }`;
      const data = await shopifyAdminGraphql(mutation, { id, input: commonDetails });
      const errors = data?.discountAutomaticFreeShippingUpdate?.userErrors || [];
      if (errors.length) throw new Error(errors.map((error: { message: string }) => error.message).join(" | "));
      return NextResponse.json({ ok: true, id });
    }
    const mutation = `mutation updateCodeShipping($id: ID!, $input: DiscountCodeFreeShippingInput!) { discountCodeFreeShippingUpdate(id: $id, freeShippingCodeDiscount: $input) { codeDiscountNode { id } userErrors { field message } } }`;
    const data = await shopifyAdminGraphql(mutation, { id, input: codeDetails });
    const errors = data?.discountCodeFreeShippingUpdate?.userErrors || [];
    if (errors.length) throw new Error(errors.map((error: { message: string }) => error.message).join(" | "));
    return NextResponse.json({ ok: true, id });
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
