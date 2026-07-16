import { createAdminRole, listAdminRoles } from "@/lib/admin-roles";
import { currentAdminLabel, requirePermission } from "@/lib/shopify-admin";
import { recordTeamActivity } from "@/lib/team-activity";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorized = await requirePermission("Team & activity");
  if (unauthorized) return unauthorized;
  return Response.json({ roles: await listAdminRoles() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const unauthorized = await requirePermission("Team & activity");
  if (unauthorized) return unauthorized;
  const body = await request.json().catch(() => null);
  try {
    const role = await createAdminRole({
      name: typeof body?.name === "string" ? body.name : "",
      scope: typeof body?.scope === "string" ? body.scope : "",
      description: typeof body?.description === "string" ? body.description : "",
      permissions: Array.isArray(body?.permissions) ? body.permissions : [],
    });
    await recordTeamActivity({ action: "Role created", category: "role", severity: "success", actor: await currentAdminLabel(), target: role.name, detail: `${role.permissions.length} permission groups assigned.` });
    return Response.json({ role }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create role." }, { status: 400 });
  }
}
