import { ADMIN_AUTH_COOKIE } from "@/lib/auth";
import { NextResponse } from "next/server";
import { currentAdminLabel } from "@/lib/shopify-admin";
import { recordTeamActivity } from "@/lib/team-activity";

export async function POST() {
  const actor = await currentAdminLabel();
  await recordTeamActivity({ action: "Admin signed out", category: "access", severity: "info", actor, target: actor, detail: "Admin session ended." });
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_AUTH_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
