import { NextResponse } from "next/server";
import { requireAdmin, shopifyAdminGraphql, shopifyError } from "@/lib/shopify-admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const url = new URL(request.url);
  const after = url.searchParams.get("after");
  const search = url.searchParams.get("search")?.trim() || null;
  const query = `
    query inventory($first: Int!, $after: String, $query: String) {
      locations(first: 50, includeInactive: false) { nodes { id name isActive } }
      productVariants(first: $first, after: $after, query: $query, sortKey: TITLE) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id displayName title sku barcode price compareAtPrice inventoryQuantity inventoryPolicy updatedAt availableForSale
          product { id title status }
          inventoryItem {
            id tracked
            inventoryLevels(first: 20) { nodes { location { id name } quantities(names: ["available"]) { name quantity } } }
          }
        }
      }
    }
  `;
  try {
    const data = await shopifyAdminGraphql(query, { first: 50, after, query: search });
    const variants = (data?.productVariants?.nodes || []).map((variant: Record<string, unknown> & { product?: { id?: string; title?: string; status?: string }; inventoryItem?: { id?: string; tracked?: boolean; inventoryLevels?: { nodes?: { location?: { id?: string; name?: string }; quantities?: { name?: string; quantity?: number }[] }[] } } }) => ({
      id: variant.id,
      productId: variant.product?.id || "",
      name: variant.displayName || [variant.product?.title, variant.title].filter(Boolean).join(" — "),
      product: variant.product?.title || "Untitled product",
      variant: variant.title || "Default",
      sku: variant.sku || "",
      barcode: variant.barcode || "",
      price: variant.price || "0",
      compareAtPrice: variant.compareAtPrice || "",
      quantity: Number(variant.inventoryQuantity ?? 0),
      policy: variant.inventoryPolicy || "DENY",
      inventoryItemId: variant.inventoryItem?.id || "",
      tracked: Boolean(variant.inventoryItem?.tracked),
      levels: (variant.inventoryItem?.inventoryLevels?.nodes || []).map((level) => ({ locationId: level.location?.id || "", locationName: level.location?.name || "Location", quantity: Number(level.quantities?.find((quantity) => quantity.name === "available")?.quantity || 0) })),
      availableForSale: Boolean(variant.availableForSale),
      productStatus: variant.product?.status || "UNKNOWN",
      updatedAt: variant.updatedAt,
    }));
    return NextResponse.json({ inventory: variants, locations: data?.locations?.nodes || [], pageInfo: data?.productVariants?.pageInfo || { hasNextPage: false, endCursor: null } });
  } catch (error) {
    return shopifyError(error, { inventory: [], locations: [], pageInfo: { hasNextPage: false, endCursor: null } });
  }
}

export async function PUT(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const body = await request.json().catch(() => null);
  const productId = typeof body?.productId === "string" ? body.productId : "";
  const variantId = typeof body?.variantId === "string" ? body.variantId : "";
  const product = body?.product || {};
  const variant = body?.variant || {};
  const title = typeof product.title === "string" ? product.title.trim() : "";
  const status = typeof product.status === "string" ? product.status : "";
  const price = typeof variant.price === "string" ? variant.price.trim() : "";
  if (!productId || !variantId || !title) return NextResponse.json({ error: "Product, variant, and title are required." }, { status: 400 });
  if (!/^(ACTIVE|DRAFT|ARCHIVED)$/.test(status)) return NextResponse.json({ error: "Choose a valid product status." }, { status: 400 });
  if (!price || !Number.isFinite(Number(price)) || Number(price) < 0) return NextResponse.json({ error: "Enter a valid product price." }, { status: 400 });

  try {
    const productMutation = `mutation updateProduct($product: ProductUpdateInput!) { productUpdate(product: $product) { product { id title status } userErrors { field message } } }`;
    const productData = await shopifyAdminGraphql(productMutation, { product: { id: productId, title, status } });
    const productErrors = productData?.productUpdate?.userErrors || [];
    if (productErrors.length) throw new Error(productErrors.map((error: { message: string }) => error.message).join(" | "));

    const variantMutation = `mutation updateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) { productVariantsBulkUpdate(productId: $productId, variants: $variants) { productVariants { id } userErrors { field message } } }`;
    const variantInput = {
      id: variantId,
      price,
      compareAtPrice: typeof variant.compareAtPrice === "string" && variant.compareAtPrice.trim() ? variant.compareAtPrice.trim() : null,
      barcode: typeof variant.barcode === "string" && variant.barcode.trim() ? variant.barcode.trim() : null,
      inventoryPolicy: variant.inventoryPolicy === "CONTINUE" ? "CONTINUE" : "DENY",
      inventoryItem: {
        sku: typeof variant.sku === "string" ? variant.sku.trim() : "",
        tracked: Boolean(variant.tracked),
      },
    };
    const variantData = await shopifyAdminGraphql(variantMutation, { productId, variants: [variantInput] });
    const variantErrors = variantData?.productVariantsBulkUpdate?.userErrors || [];
    if (variantErrors.length) throw new Error(variantErrors.map((error: { message: string }) => error.message).join(" | "));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return shopifyError(error, {});
  }
}

type InventoryChange = { inventoryItemId: string; locationId: string; delta?: number; activateQuantity?: number };

export async function PATCH(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const body = await request.json().catch(() => null);
  const changes = Array.isArray(body?.changes) ? (body.changes as InventoryChange[]).slice(0, 250) : [];
  if (!changes.length) return NextResponse.json({ error: "Select at least one inventory change." }, { status: 400 });
  try {
    const activateMutation = `mutation activate($inventoryItemId: ID!, $locationId: ID!, $available: Int) { inventoryActivate(inventoryItemId: $inventoryItemId, locationId: $locationId, available: $available) { inventoryLevel { id } userErrors { field message } } }`;
    const adjustments: { inventoryItemId: string; locationId: string; delta: number }[] = [];
    for (const change of changes) {
      if (!change.inventoryItemId || !change.locationId) continue;
      if (Number.isInteger(change.activateQuantity)) {
        const data = await shopifyAdminGraphql(activateMutation, { inventoryItemId: change.inventoryItemId, locationId: change.locationId, available: Math.max(0, Number(change.activateQuantity)) });
        const errors = data?.inventoryActivate?.userErrors || [];
        if (errors.length) throw new Error(errors.map((error: { message: string }) => error.message).join(" | "));
      } else if (Number.isInteger(change.delta) && change.delta !== 0) adjustments.push({ inventoryItemId: change.inventoryItemId, locationId: change.locationId, delta: Number(change.delta) });
    }
    if (adjustments.length) {
      const mutation = `mutation adjust($input: InventoryAdjustQuantitiesInput!) { inventoryAdjustQuantities(input: $input) { inventoryAdjustmentGroup { createdAt } userErrors { field message } } }`;
      const data = await shopifyAdminGraphql(mutation, { input: { reason: "correction", name: "available", referenceDocumentUri: `carters-admin://inventory/bulk-${Date.now()}`, changes: adjustments } });
      const errors = data?.inventoryAdjustQuantities?.userErrors || [];
      if (errors.length) throw new Error(errors.map((error: { message: string }) => error.message).join(" | "));
    }
    return NextResponse.json({ ok: true, changed: changes.length });
  } catch (error) {
    return shopifyError(error, {});
  }
}
