import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
};

const publicSiteUrl =
  process.env.SHOPIFY_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_SHOPIFY_SITE_URL ??
  "https://carters.com.lb";

export async function GET() {
  try {
    const response = await fetch(publicSiteUrl, {
      cache: "no-store",
      headers: { Accept: "text/html" },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Shopify homepage returned ${response.status}` },
        { status: 502, headers: cors },
      );
    }

    const html = await response.text();
    if (html.length > 5_000_000) {
      return NextResponse.json(
        { error: "Shopify homepage response is too large" },
        { status: 502, headers: cors },
      );
    }

    return new NextResponse(html, {
      headers: {
        ...cors,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load Shopify homepage" },
      { status: 502, headers: cors },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}
