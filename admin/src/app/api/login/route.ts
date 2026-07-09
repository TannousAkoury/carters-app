import { ADMIN_AUTH_COOKIE, authenticateAdminUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const authenticated = await authenticateAdminUser(username, password);

  if (!authenticated) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, user: authenticated.user });
  response.cookies.set({
    name: ADMIN_AUTH_COOKIE,
    value: authenticated.sessionToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return response;
}
