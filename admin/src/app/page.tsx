import { ADMIN_AUTH_COOKIE, validateAdminSession } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminHome from "./admin-client";

export default async function Page() {
  const session = (await cookies()).get(ADMIN_AUTH_COOKIE)?.value;
  if (!await validateAdminSession(session)) redirect("/login");
  return <AdminHome />;
}
