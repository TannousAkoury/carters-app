import { createAdminUser, listAdminUsers } from "@/lib/admin-users";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ users: await listAdminUsers() });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  try {
    const user = await createAdminUser({
      email: typeof body?.email === "string" ? body.email : "",
      role: typeof body?.role === "string" ? body.role : "",
      password: typeof body?.password === "string" ? body.password : "",
    });
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create employee." }, { status: 400 });
  }
}
