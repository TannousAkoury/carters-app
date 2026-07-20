import { ADMIN_AUTH_COOKIE, AdminAuthConfigurationError, authenticateAdminUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { recordTeamActivity } from "@/lib/team-activity";
import { readJson } from "@/lib/json-store";
import { requestClientKey, takeRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim().slice(0, 160) : "";
  const password = typeof body?.password === "string" ? body.password.slice(0, 512) : "";
  const rateLimit = takeRateLimit(`login:${requestClientKey(request)}:${username.toLowerCase()}`, 10, 15 * 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many sign-in attempts. Please try again later." }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } });
  }
  let authenticated;
  try {
    authenticated = await authenticateAdminUser(username, password);
  } catch (error) {
    if (error instanceof AdminAuthConfigurationError) return NextResponse.json({ error: "Admin authentication is not configured." }, { status: 503 });
    throw error;
  }

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
