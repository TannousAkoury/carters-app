import crypto from "node:crypto";
import { readJson, writeJson } from "@/lib/json-store";

export type AdminRole = {
  id: string;
  name: string;
  scope: string;
  description: string;
  permissions: string[];
  builtIn: boolean;
  createdAt: string;
};

const FILE = "admin-roles.json";
export const ADMIN_PERMISSIONS = ["Dashboard","App editor","Inventory","Promotions","Analytics","Marketing","Loyalty","Orders","Customers","Customer chat","Settings","Team & activity"] as const;
const defaults: AdminRole[] = [
  { id: "owner", name: "Owner", scope: "Full workspace access", description: "Manage every admin area, publishing, settings, and team access.", permissions: ["All permissions"], builtIn: true, createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "marketing", name: "Marketing", scope: "Campaigns and analytics", description: "Prepare campaigns and review customer engagement performance.", permissions: ["Dashboard", "App editor", "Marketing", "Analytics"], builtIn: true, createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "support", name: "Support", scope: "Customers and service", description: "Review customers, orders, and customer support conversations.", permissions: ["Dashboard", "Customers", "Orders", "Customer chat"], builtIn: true, createdAt: "2026-01-01T00:00:00.000Z" },
];

export async function listAdminRoles() {
  const roles = await readJson<AdminRole[]>(FILE, defaults);
  return roles.length ? roles : defaults;
}

export async function permissionsForRole(roleName: string) {
  if (roleName === "Owner") return [...ADMIN_PERMISSIONS];
  const role = (await listAdminRoles()).find((item) => item.name === roleName);
  return role?.permissions ?? [];
}

export async function createAdminRole(input: { name: string; scope: string; description: string; permissions: string[] }) {
  const roles = await listAdminRoles();
  const name = input.name.trim().slice(0, 60);
  if (!name) throw new Error("Role name is required.");
  if (roles.some((role) => role.name.toLowerCase() === name.toLowerCase())) throw new Error("A role with this name already exists.");
  const role: AdminRole = {
    id: crypto.randomUUID(), name,
    scope: input.scope.trim().slice(0, 100) || "Custom access",
    description: input.description.trim().slice(0, 240) || "Custom admin role.",
    permissions: [...new Set(input.permissions.filter((permission) => typeof permission === "string" && permission.trim()).map((permission) => permission.trim().slice(0, 50)))],
    builtIn: false, createdAt: new Date().toISOString(),
  };
  await writeJson(FILE, [role, ...roles]);
  return role;
}

export async function updateAdminRole(id: string, input: { scope: string; description: string; permissions: string[] }) {
  const roles = await listAdminRoles();
  const existing = roles.find((role) => role.id === id);
  if (!existing) throw new Error("Role was not found.");
  if (existing.name === "Owner") throw new Error("The Owner role cannot be modified.");
  const updated: AdminRole = {
    ...existing,
    scope: input.scope.trim().slice(0, 100) || existing.scope,
    description: input.description.trim().slice(0, 240) || existing.description,
    permissions: [...new Set(input.permissions.filter((permission) => ADMIN_PERMISSIONS.includes(permission as typeof ADMIN_PERMISSIONS[number])))],
  };
  await writeJson(FILE, roles.map((role) => role.id === id ? updated : role));
  return updated;
}

export async function deleteAdminRole(id: string) {
  const roles = await listAdminRoles();
  const role = roles.find((item) => item.id === id);
  if (!role) throw new Error("Role was not found.");
  if (role.builtIn) throw new Error("Built-in roles cannot be deleted.");
  await writeJson(FILE, roles.filter((item) => item.id !== id));
  return role;
}
