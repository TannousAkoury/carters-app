import { acceptAdminInvite } from "@/lib/admin-users";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  try {
    const user = await acceptAdminInvite(
      typeof body?.token === "string" ? body.token : "",
      typeof body?.password === "string" ? body.password : "",
    );
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to set password." }, { status: 400 });
  }
}
