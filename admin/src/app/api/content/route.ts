import { NextResponse } from "next/server";
import { readJson, writeBundledAppContent, writeJson } from "@/lib/json-store";

export const dynamic = "force-dynamic";
const fallback = { version: 1, publishedAt: null, sections: [] };
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" };

export async function GET() {
  return NextResponse.json(await readJson("app-content.json", fallback), { headers: cors });
}

export async function PUT(request: Request) {
  const body = await request.json();
  if (!Array.isArray(body?.sections)) return NextResponse.json({ error: "sections must be an array" }, { status: 400, headers: cors });
  const content = { version: Date.now(), publishedAt: new Date().toISOString(), sections: body.sections };
  await writeJson("app-content.json", content);
  await writeBundledAppContent(content);
  return NextResponse.json(content, { headers: cors });
}

export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: cors }); }
