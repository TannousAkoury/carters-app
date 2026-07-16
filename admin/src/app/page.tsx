import { ADMIN_AUTH_COOKIE, getAdminSessionUser } from "@/lib/auth";
import { permissionsForRole } from "@/lib/admin-roles";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminHome from "./admin-client";

export default async function Page() {
  const session = (await cookies()).get(ADMIN_AUTH_COOKIE)?.value;
  const user = await getAdminSessionUser(session);
  if (!user) redirect("/login");
  return <AdminHome sessionUser={user} permissions={await permissionsForRole(user.role)} />;
}
