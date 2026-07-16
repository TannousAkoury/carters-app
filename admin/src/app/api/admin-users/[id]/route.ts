import { createPasswordResetInvite, deleteAdminUser, findAdminUserById, updateAdminUserRole } from "@/lib/admin-users";
import { appBaseUrl, sendMemberSetupEmail } from "@/lib/email";
import { NextResponse } from "next/server";
import { currentAdminLabel, requirePermission } from "@/lib/shopify-admin";
import { recordTeamActivity } from "@/lib/team-activity";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const unauthorized = await requirePermission("Team & activity");
  if (unauthorized) return unauthorized;
  const id = (await params).id;
  const user = await findAdminUserById(id);
  await deleteAdminUser(id);
  if (user) await recordTeamActivity({ action: "Access revoked", category: "access", severity: "warning", actor: await currentAdminLabel(), target: user.email, detail: `${user.role} workspace access removed.` });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request, { params }: Params) {
  const unauthorized = await requirePermission("Team & activity");
  if (unauthorized) return unauthorized;
  try {
    const id = (await params).id;
    const body = await request.json().catch(() => null);
    if (body?.action === "role") {
      const user = await updateAdminUserRole(id, typeof body?.role === "string" ? body.role : "");
      await recordTeamActivity({ action: "Role changed", category: "role", severity: "info", actor: await currentAdminLabel(), target: user.email, detail: `Member assigned to ${user.role}.` });
      return NextResponse.json({ user });
    }
    const invite = await createPasswordResetInvite(id);
    const setupUrl = `${appBaseUrl(request)}/set-password?token=${encodeURIComponent(invite.token)}`;
    const email = await sendMemberSetupEmail({ to: invite.user.email, setupUrl, reset: true });
    await recordTeamActivity({ action: "Password setup sent", category: "security", severity: "info", actor: await currentAdminLabel(), target: invite.user.email, detail: "A new secure password setup link was issued." });
    return NextResponse.json({ user: invite.user, email });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to send reset email." }, { status: 400 });
  }
}
