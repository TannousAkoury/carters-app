import { NextResponse } from "next/server";
import { readJson, writeBundledAppContent, writeJson } from "@/lib/json-store";

export const dynamic = "force-dynamic";
const fallback = { version: 1, publishedAt: null, sections: [], shopifyVisibility: {} as Record<string, boolean>, shopifyStyles: {} as Record<string,string> };
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" };

export async function GET() {
  return NextResponse.json(await readJson("app-content.json", fallback), { headers: cors });
}

export async function PUT(request: Request) {
  const body = await request.json();
  if (!Array.isArray(body?.sections)) return NextResponse.json({ error: "sections must be an array" }, { status: 400, headers: cors });
  const sections = body.sections.map((section: unknown) => {
    if (!section || typeof section !== "object") return section;
    const item = section as Record<string, unknown>;
    const customCss = typeof item.customCss === "string" ? item.customCss.slice(0, 4000).replace(/@import|expression\s*\(|url\s*\(/gi, "") : "";
    return { ...item, customCss };
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
