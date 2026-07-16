import { inviteAdminUser, listAdminUsers } from "@/lib/admin-users";
import { appBaseUrl, sendMemberSetupEmail } from "@/lib/email";
import { NextResponse } from "next/server";
import { currentAdminLabel, requirePermission } from "@/lib/shopify-admin";
import { recordTeamActivity } from "@/lib/team-activity";
import { readJson } from "@/lib/json-store";

export async function GET() {
  const unauthorized = await requirePermission("Team & activity");
  if (unauthorized) return unauthorized;
  return NextResponse.json({ users: await listAdminUsers() });
}

export async function POST(request: Request) {
  const unauthorized = await requirePermission("Team & activity");
  if (unauthorized) return unauthorized;
  const settings = await readJson<{ security?: { allowStaffInvites?: boolean } }>("admin-settings.json", {});
  if (settings.security?.allowStaffInvites === false) return NextResponse.json({ error: "Staff invitations are disabled in Security & governance settings." }, { status: 403 });
  const body = await request.json().catch(() => null);
  try {
    const invite = await inviteAdminUser({
      email: typeof body?.email === "string" ? body.email : "",
      role: typeof body?.role === "string" ? body.role : "",
    });
    const setupUrl = `${appBaseUrl(request)}/set-password?token=${encodeURIComponent(invite.token)}`;
    const email = await sendMemberSetupEmail({ to: invite.user.email, setupUrl });
    await recordTeamActivity({ action: "Member invited", category: "member", severity: "success", actor: await currentAdminLabel(), target: invite.user.email, detail: `${invite.user.role} access invitation sent.` });
    return NextResponse.json({ user: invite.user, email });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to invite employee." }, { status: 400 });
  }
}
