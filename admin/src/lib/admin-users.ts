import crypto from "node:crypto";
import { readJson, writeJson } from "@/lib/json-store";

export type AdminUser = {
  id: string;
  email: string;
  role: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
};

export type PublicAdminUser = Omit<AdminUser, "passwordHash">;

const USERS_FILE = "admin-users.json";

export async function listAdminUsers() {
  const users = await readJson<AdminUser[]>(USERS_FILE, []);
  return users.map(publicUser);
}

export async function findAdminUserByEmail(email: string) {
  const normalized = normalizeEmail(email);
  const users = await readJson<AdminUser[]>(USERS_FILE, []);
  return users.find((user) => user.email === normalized) ?? null;
}

export async function findAdminUserById(id: string) {
  const users = await readJson<AdminUser[]>(USERS_FILE, []);
  return users.find((user) => user.id === id) ?? null;
}

export async function createAdminUser(input: { email: string; role: string; password: string }) {
  const email = normalizeEmail(input.email);
  if (!email || !email.includes("@")) throw new Error("A valid employee email is required.");
  if (input.password.length < 8) throw new Error("Password must contain at least 8 characters.");
  const users = await readJson<AdminUser[]>(USERS_FILE, []);
  if (users.some((user) => user.email === email)) throw new Error("This employee already exists.");
  const now = new Date().toISOString();
  const user: AdminUser = {
    id: crypto.randomUUID(),
    email,
    role: input.role.trim() || "Staff",
    passwordHash: hashPassword(input.password),
    createdAt: now,
    updatedAt: now,
  };
  await writeJson(USERS_FILE, [user, ...users]);
  return publicUser(user);
}

export async function deleteAdminUser(id: string) {
  const users = await readJson<AdminUser[]>(USERS_FILE, []);
  await writeJson(USERS_FILE, users.filter((user) => user.id !== id));
}

export async function resetAdminUserPassword(id: string, password: string) {
  if (password.length < 8) throw new Error("Password must contain at least 8 characters.");
  const users = await readJson<AdminUser[]>(USERS_FILE, []);
  const now = new Date().toISOString();
  const next = users.map((user) => user.id === id ? { ...user, passwordHash: hashPassword(password), updatedAt: now } : user);
  const updated = next.find((user) => user.id === id);
  if (!updated) throw new Error("Employee was not found.");
  await writeJson(USERS_FILE, next);
  return publicUser(updated);
}

export function verifyPassword(password: string, passwordHash: string) {
  const [algorithm, iterations, salt, stored] = passwordHash.split(":");
  if (algorithm !== "pbkdf2" || !iterations || !salt || !stored) return false;
  const actual = crypto.pbkdf2Sync(password, salt, Number(iterations), 32, "sha256").toString("hex");
  const storedBuffer = Buffer.from(stored);
  const actualBuffer = Buffer.from(actual);
  return storedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(storedBuffer, actualBuffer);
}

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const iterations = 120000;
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("hex");
  return `pbkdf2:${iterations}:${salt}:${hash}`;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function publicUser(user: AdminUser): PublicAdminUser {
  return { id: user.id, email: user.email, role: user.role, createdAt: user.createdAt, updatedAt: user.updatedAt };
}
