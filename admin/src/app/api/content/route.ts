import { NextResponse } from "next/server";
import { readJson, writeBundledAppContent, writeJson } from "@/lib/json-store";
import { requirePermission } from "@/lib/shopify-admin";

export const dynamic = "force-dynamic";
const fallback = { version: 1, publishedAt: null, sections: [], shopifyVisibility: {} as Record<string, boolean>, shopifyStyles: {} as Record<string,string> };
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" };

export async function GET() {
  return NextResponse.json(await readJson("app-content.json", fallback), { headers: cors });
}

export async function PUT(request: Request) {
  const unauthorized = await requirePermission("App editor");
  if (unauthorized) return unauthorized;
  const raw = await request.text();
  if (raw.length > 2_000_000) return NextResponse.json({ error: "Published content is too large" }, { status: 413, headers: cors });
  let body: Record<string, unknown> | null = null;
  try { body = JSON.parse(raw) as Record<string, unknown>; } catch { /* handled below */ }
  if (!Array.isArray(body?.sections)) return NextResponse.json({ error: "sections must be an array" }, { status: 400, headers: cors });
  if (body.sections.length > 100 || body.sections.some((section) => !section || typeof section !== "object" || Array.isArray(section))) return NextResponse.json({ error: "sections contains invalid content" }, { status: 400, headers: cors });
  const sections = body.sections.map((section: unknown) => {
    if (!section || typeof section !== "object") return section;
    const item = section as Record<string, unknown>;
    const customCss = typeof item.customCss === "string" ? item.customCss.slice(0, 4000).replace(/@import|expression\s*\(|url\s*\(/gi, "") : "";
    const items = Array.isArray(item.items) ? item.items.filter(value => typeof value === "string").slice(0, 8).map(value => (value as string).trim().slice(0, 160)).filter(Boolean) : [];
    return { ...item, customCss, items };
  });
  const rawVisibility = body?.shopifyVisibility && typeof body.shopifyVisibility === "object" ? body.shopifyVisibility as Record<string, unknown> : {};
  const shopifyVisibility = Object.fromEntries(Object.entries(rawVisibility).filter(([key, value]) => key.length <= 180 && typeof value === "boolean").slice(0, 100));
  const rawStyles=body?.shopifyStyles&&typeof body.shopifyStyles==="object"?body.shopifyStyles as Record<string,unknown>:{};
  const shopifyStyles=Object.fromEntries(Object.entries(rawStyles).filter(([key,value])=>key.length<=180&&typeof value==="string").slice(0,100).map(([key,value])=>[key,(value as string).slice(0,4000).replace(/@import|expression\s*\(|url\s*\(/gi,"")]));
  const content = { version: Date.now(), publishedAt: new Date().toISOString(), sections, shopifyVisibility,shopifyStyles };
  await writeJson("app-content.json", content);
  await writeBundledAppContent(content);
  return NextResponse.json(content, { headers: cors });
}

export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: cors }); }
