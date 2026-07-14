import { NextResponse } from "next/server";
import { requireAdmin, shopifyAdminGraphql, shopifyError } from "@/lib/shopify-admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const url = new URL(request.url);
  const after = url.searchParams.get("after");
  const search = url.searchParams.get("search")?.trim() || null;
  const locationId = url.searchParams.get("locationId")?.trim() || null;
  const limit = Math.min(250, Math.max(1, Number(url.searchParams.get("limit")) || 50));
  const locationsQuery = locationId ? "" : "locations(first: 50, includeInactive: false) { nodes { id name isActive } }";
  const inventoryLevelsQuery = locationId
    ? "inventoryLevel(locationId: $locationId) { location { id name } quantities(names: [\"available\"]) { name quantity } }"
    : "inventoryLevels(first: 20) { nodes { location { id name } quantities(names: [\"available\"]) { name quantity } } }";
  const query = `
    query inventory($first: Int!, $after: String, $query: String${locationId ? ", $locationId: ID!" : ""}) {
      ${locationsQuery}
      productVariants(first: $first, after: $after, query: $query, sortKey: TITLE) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id displayName title sku barcode price compareAtPrice inventoryQuantity inventoryPolicy updatedAt availableForSale
          selectedOptions { name value optionValue { id } }
          image { url altText }
          product { id title status descriptionHtml vendor productType tags seo { title description } featuredMedia { preview { image { url altText } } } }
          inventoryItem {
            id tracked
            ${inventoryLevelsQuery}
          }
        }
      }
    }
  `;
  try {
    const data = await shopifyAdminGraphql(query, { first: limit, after, query: search, ...(locationId ? { locationId } : {}) });
    const variants = (data?.productVariants?.nodes || []).map((variant: Record<string, unknown> & { selectedOptions?: { name?: string; value?: string; optionValue?: { id?: string } | null }[]; image?: { url?: string; altText?: string | null } | null; product?: { id?: string; title?: string; status?: string; descriptionHtml?: string; vendor?: string; productType?: string; tags?: string[]; seo?: { title?: string | null; description?: string | null } | null; featuredMedia?: { preview?: { image?: { url?: string; altText?: string | null } | null } | null } | null }; inventoryItem?: { id?: string; tracked?: boolean; inventoryLevel?: { location?: { id?: string; name?: string }; quantities?: { name?: string; quantity?: number }[] } | null; inventoryLevels?: { nodes?: { location?: { id?: string; name?: string }; quantities?: { name?: string; quantity?: number }[] }[] } } }) => {
      const inventoryLevels = variant.inventoryItem?.inventoryLevel
        ? [variant.inventoryItem.inventoryLevel]
        : variant.inventoryItem?.inventoryLevels?.nodes || [];
      return {
        id: variant.id,
        productId: variant.product?.id || "",
        name: variant.displayName || [variant.product?.title, variant.title].filter(Boolean).join(" — "),
        product: variant.product?.title || "Untitled product",
        descriptionHtml: variant.product?.descriptionHtml || "",
        vendor: variant.product?.vendor || "",
        productType: variant.product?.productType || "",
        tags: variant.product?.tags || [],
        seoTitle: variant.product?.seo?.title || "",
        seoDescription: variant.product?.seo?.description || "",
        variant: variant.title || "Default",
        selectedOptions: (variant.selectedOptions || []).map((option) => ({ name: option.name || "Option", value: option.value || "", optionValueId: option.optionValue?.id || "" })),
        sku: variant.sku || "",
        barcode: variant.barcode || "",
        price: variant.price || "0",
        compareAtPrice: variant.compareAtPrice || "",
        quantity: Number(variant.inventoryQuantity ?? 0),
        policy: variant.inventoryPolicy || "DENY",
        inventoryItemId: variant.inventoryItem?.id || "",
        tracked: Boolean(variant.inventoryItem?.tracked),
        levels: inventoryLevels.map((level) => ({ locationId: level.location?.id || "", locationName: level.location?.name || "Location", quantity: Number(level.quantities?.find((quantity) => quantity.name === "available")?.quantity || 0) })),
        availableForSale: Boolean(variant.availableForSale),
        productStatus: variant.product?.status || "UNKNOWN",
        image: variant.image?.url ? variant.image : variant.product?.featuredMedia?.preview?.image || null,
        updatedAt: variant.updatedAt,
      };
    });
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
    const productData = await shopifyAdminGraphql(productMutation, { product: {
      id: productId,
      title,
      status,
      descriptionHtml: typeof product.descriptionHtml === "string" ? product.descriptionHtml : "",
      vendor: typeof product.vendor === "string" ? product.vendor.trim() : "",
      productType: typeof product.productType === "string" ? product.productType.trim() : "",
      tags: Array.isArray(product.tags) ? product.tags.filter((tag: unknown): tag is string => typeof tag === "string" && Boolean(tag.trim())).map((tag: string) => tag.trim()) : [],
      seo: {
        title: typeof product.seoTitle === "string" ? product.seoTitle.trim() : "",
        description: typeof product.seoDescription === "string" ? product.seoDescription.trim() : "",
      },
    } });
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
      optionValues: Array.isArray(variant.optionValues)
        ? variant.optionValues
          .filter((option: unknown): option is { name: string; value: string } => Boolean(option && typeof option === "object" && "name" in option && "value" in option && typeof option.name === "string" && typeof option.value === "string" && option.name.trim() && option.value.trim()))
          .map((option: { name: string; value: string }) => ({ optionName: option.name.trim(), name: option.value.trim() }))
        : undefined,
    };
    const variantData = await shopifyAdminGraphql(variantMutation, { productId, variants: [variantInput] });
    const variantErrors = variantData?.productVariantsBulkUpdate?.userErrors || [];
    if (variantErrors.length) throw new Error(variantErrors.map((error: { message: string }) => error.message).join(" | "));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return shopifyError(error, {});
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const form = await request.formData().catch(() => null);
  const productId = typeof form?.get("productId") === "string" ? String(form.get("productId")) : "";
  const alt = typeof form?.get("alt") === "string" ? String(form.get("alt")).trim().slice(0, 512) : "";
  const file = form?.get("image");
  if (!productId.startsWith("gid://shopify/Product/")) return NextResponse.json({ error: "A valid Shopify product is required." }, { status: 400 });
  if (!(file instanceof File) || !file.type.startsWith("image/")) return NextResponse.json({ error: "Choose a valid image file." }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Product images must be 10 MB or smaller." }, { status: 400 });

  try {
    const stagedMutation = `mutation stagedProductImage($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets { url resourceUrl parameters { name value } }
        userErrors { field message }
      }
    }`;
    const stagedData = await shopifyAdminGraphql(stagedMutation, { input: [{ filename: file.name || "product-image", mimeType: file.type, resource: "PRODUCT_IMAGE", httpMethod: "POST" }] });
    const stagedErrors = stagedData?.stagedUploadsCreate?.userErrors || [];
    if (stagedErrors.length) throw new Error(stagedErrors.map((error: { message: string }) => error.message).join(" | "));
    const target = stagedData?.stagedUploadsCreate?.stagedTargets?.[0];
    if (!target?.url || !target?.resourceUrl) throw new Error("Shopify did not create an image upload target.");
    const upload = new FormData();
    for (const parameter of target.parameters || []) upload.append(parameter.name, parameter.value);
    upload.append("file", file, file.name);
    const uploadResponse = await fetch(target.url, { method: "POST", body: upload });
    if (!uploadResponse.ok) throw new Error("The image could not be uploaded to Shopify.");

    const mediaMutation = `mutation addProductImage($product: ProductUpdateInput!, $media: [CreateMediaInput!]) {
      productUpdate(product: $product, media: $media) {
        product { id }
        userErrors { field message }
      }
    }`;
    const mediaData = await shopifyAdminGraphql(mediaMutation, { product: { id: productId }, media: [{ originalSource: target.resourceUrl, mediaContentType: "IMAGE", alt }] });
    const mediaErrors = mediaData?.productUpdate?.userErrors || [];
    if (mediaErrors.length) throw new Error(mediaErrors.map((error: { message: string }) => error.message).join(" | "));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return shopifyError(error, {});
  }
}

export async function DELETE(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const productId = new URL(request.url).searchParams.get("productId")?.trim() || "";
  if (!productId.startsWith("gid://shopify/Product/")) {
    return NextResponse.json({ error: "A valid Shopify product is required." }, { status: 400 });
  }

  try {
    const mutation = `mutation deleteProduct($input: ProductDeleteInput!) {
      productDelete(input: $input) {
        deletedProductId
        userErrors { field message }
      }
    }`;
    const data = await shopifyAdminGraphql(mutation, { input: { id: productId } });
    const errors = data?.productDelete?.userErrors || [];
    if (errors.length) throw new Error(errors.map((error: { message: string }) => error.message).join(" | "));
    if (!data?.productDelete?.deletedProductId) throw new Error("Shopify did not delete this product.");
    return NextResponse.json({ ok: true, deletedProductId: data.productDelete.deletedProductId });
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
