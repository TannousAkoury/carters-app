import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_AUTH_COOKIE, getAdminSessionUser, validateAdminSession } from "@/lib/auth";
import { permissionsForRole } from "@/lib/admin-roles";

export async function requireAdmin() {
  const session = (await cookies()).get(ADMIN_AUTH_COOKIE)?.value;
  return await validateAdminSession(session) ? null : NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
}

export async function currentAdminLabel() {
  const session = (await cookies()).get(ADMIN_AUTH_COOKIE)?.value;
  return (await getAdminSessionUser(session))?.email ?? "Administrator";
}

export async function requirePermission(permission: string) {
  return requireAnyPermission([permission]);
}

export async function requireAnyPermission(required: string[]) {
  const session = (await cookies()).get(ADMIN_AUTH_COOKIE)?.value;
  const user = await getAdminSessionUser(session);
  if (!user) return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  const permissions = await permissionsForRole(user.role);
  return permissions.includes("All permissions") || required.some((permission) => permissions.includes(permission))
    ? null
    : NextResponse.json({ error: `Access denied. Required permission: ${required.join(" or ")}.` }, { status: 403 });
}

function shopifyDomain() {
  const value = process.env.SHOPIFY_ADMIN_DOMAIN || process.env.SHOPIFY_DOMAIN || process.env.NEXT_PUBLIC_SHOPIFY_DOMAIN || "";
  return value.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export async function shopifyAdminGraphql(query: string, variables: Record<string, unknown>) {
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  const domain = shopifyDomain();
  const apiVersion = process.env.SHOPIFY_ADMIN_API_VERSION || process.env.SHOPIFY_API_VERSION || "2025-10";
  if (!token || token === "replace_with_your_shopify_admin_api_token" || !domain) throw new Error("Set a real Shopify Admin API token in SHOPIFY_ADMIN_ACCESS_TOKEN.");
  const response = await fetch(`https://${domain}/admin/api/${apiVersion}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.errors?.length) {
    const message = payload?.errors?.map((error: { message?: string }) => error.message).filter(Boolean).join(" | ") || `Shopify returned HTTP ${response.status}`;
    throw new Error(message);
  }
  return payload?.data;
}

export function shopifyError(error: unknown, empty: Record<string, unknown>) {
  const message = error instanceof Error ? error.message : "Shopify request failed.";
  const missingConfig = message.startsWith("Set a real");
  return NextResponse.json({ configured: !missingConfig, error: message, ...empty }, { status: missingConfig ? 503 : 502 });
}
