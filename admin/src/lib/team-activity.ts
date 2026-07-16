import crypto from "node:crypto";
import { readJson, writeJson } from "@/lib/json-store";

export type TeamActivity = {
  id: string;
  action: string;
  category: "access" | "member" | "role" | "security";
  severity: "info" | "success" | "warning";
  actor: string;
  target: string;
  detail: string;
  createdAt: string;
};

const FILE = "team-activity.json";

export async function listTeamActivity() {
  return readJson<TeamActivity[]>(FILE, []);
}

export async function recordTeamActivity(input: Omit<TeamActivity, "id" | "createdAt">) {
  const [events, settings] = await Promise.all([
    readJson<TeamActivity[]>(FILE, []),
    readJson<{ security?: { auditRetentionDays?: number } }>("admin-settings.json", {}),
  ]);
  const retentionDays = Math.min(2555, Math.max(7, Number(settings.security?.auditRetentionDays) || 90));
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const event: TeamActivity = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...input };
  await writeJson(FILE, [event, ...events.filter((item) => new Date(item.createdAt).getTime() >= cutoff)].slice(0, 1000));
  return event;
}
