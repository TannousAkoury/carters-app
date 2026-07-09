import { deleteAdminUser, resetAdminUserPassword } from "@/lib/admin-users";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  await deleteAdminUser((await params).id);
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request, { params }: Params) {
  const body = await request.json().catch(() => null);
  try {
    const user = await resetAdminUserPassword((await params).id, typeof body?.password === "string" ? body.password : "");
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to reset password." }, { status: 400 });
  }
}
