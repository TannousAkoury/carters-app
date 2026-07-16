import { acceptAdminInvite } from "@/lib/admin-users";
import { NextResponse } from "next/server";
import { recordTeamActivity } from "@/lib/team-activity";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  try {
    const user = await acceptAdminInvite(
      typeof body?.token === "string" ? body.token : "",
      typeof body?.password === "string" ? body.password : "",
    );
    await recordTeamActivity({ action: "Member activated", category: "access", severity: "success", actor: user.email, target: user.email, detail: `${user.role} account setup completed.` });
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to set password." }, { status: 400 });
  }
}
