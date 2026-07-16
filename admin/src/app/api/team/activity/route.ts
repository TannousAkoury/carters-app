import { requirePermission } from "@/lib/shopify-admin";
import { listTeamActivity } from "@/lib/team-activity";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorized = await requirePermission("Team & activity");
  if (unauthorized) return unauthorized;
  return Response.json({ events: await listTeamActivity() }, { headers: { "Cache-Control": "no-store" } });
}
