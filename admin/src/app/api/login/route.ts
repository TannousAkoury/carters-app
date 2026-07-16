import { ADMIN_AUTH_COOKIE, authenticateAdminUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { recordTeamActivity } from "@/lib/team-activity";
import { readJson } from "@/lib/json-store";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const authenticated = await authenticateAdminUser(username, password);

  if (!authenticated) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }
  await recordTeamActivity({ action: "Admin signed in", category: "access", severity: "success", actor: authenticated.user.email, target: authenticated.user.email, detail: `${authenticated.user.role} session started.` });
  const settings = await readJson<{ security?: { sessionTimeoutMinutes?: number } }>("admin-settings.json", {});
  const timeoutMinutes = Math.min(10080, Math.max(15, Number(settings.security?.sessionTimeoutMinutes) || 480));

  const response = NextResponse.json({ ok: true, user: authenticated.user });
  response.cookies.set({
    name: ADMIN_AUTH_COOKIE,
    value: authenticated.sessionToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * timeoutMinutes,
  });
  return response;
}
