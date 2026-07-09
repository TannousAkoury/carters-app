import { createPasswordResetInvite, deleteAdminUser } from "@/lib/admin-users";
import { appBaseUrl, sendMemberSetupEmail } from "@/lib/email";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  await deleteAdminUser((await params).id);
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const invite = await createPasswordResetInvite((await params).id);
    const setupUrl = `${appBaseUrl(request)}/set-password?token=${encodeURIComponent(invite.token)}`;
    const email = await sendMemberSetupEmail({ to: invite.user.email, setupUrl, reset: true });
    return NextResponse.json({ user: invite.user, email });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to send reset email." }, { status: 400 });
  }
}
