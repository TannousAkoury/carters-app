import { deleteAdminRole, listAdminRoles, updateAdminRole } from "@/lib/admin-roles";
import { listAdminUsers } from "@/lib/admin-users";
import { currentAdminLabel, requirePermission } from "@/lib/shopify-admin";
import { recordTeamActivity } from "@/lib/team-activity";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const unauthorized = await requirePermission("Team & activity");
  if (unauthorized) return unauthorized;
  const body = await request.json().catch(() => null);
  try {
    const role = await updateAdminRole((await params).id, {
      scope: typeof body?.scope === "string" ? body.scope : "",
      description: typeof body?.description === "string" ? body.description : "",
      permissions: Array.isArray(body?.permissions) ? body.permissions : [],
    });
    await recordTeamActivity({ action: "Role permissions updated", category: "role", severity: "info", actor: await currentAdminLabel(), target: role.name, detail: `${role.permissions.length} permission groups enabled.` });
    return Response.json({ role });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to update role." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const unauthorized = await requirePermission("Team & activity");
  if (unauthorized) return unauthorized;
  try {
    const id = (await params).id;
    const users = await listAdminUsers();
    const name = (await listAdminRoles()).find((role) => role.id === id)?.name;
    if (name && users.some((user) => user.role === name)) throw new Error("Reassign members before deleting this role.");
    const role = await deleteAdminRole(id);
    await recordTeamActivity({ action: "Role deleted", category: "role", severity: "warning", actor: await currentAdminLabel(), target: role.name, detail: "Custom role removed from the workspace." });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to delete role." }, { status: 400 });
  }
}
