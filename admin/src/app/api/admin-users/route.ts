import { inviteAdminUser, listAdminUsers } from "@/lib/admin-users";
import { appBaseUrl, sendMemberSetupEmail } from "@/lib/email";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ users: await listAdminUsers() });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  try {
    const invite = await inviteAdminUser({
      email: typeof body?.email === "string" ? body.email : "",
      role: typeof body?.role === "string" ? body.role : "",
    });
    const setupUrl = `${appBaseUrl(request)}/set-password?token=${encodeURIComponent(invite.token)}`;
    const email = await sendMemberSetupEmail({ to: invite.user.email, setupUrl });
    return NextResponse.json({ user: invite.user, email });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to invite employee." }, { status: 400 });
  }
}
