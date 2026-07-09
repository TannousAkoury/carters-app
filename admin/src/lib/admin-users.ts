import crypto from "node:crypto";
import { readJson, writeJson } from "@/lib/json-store";

export type AdminUser = {
  id: string;
  email: string;
  role: string;
  passwordHash?: string;
  inviteTokenHash?: string;
  inviteExpiresAt?: string;
  status: "invited" | "active";
  createdAt: string;
  updatedAt: string;
};

export type PublicAdminUser = Omit<AdminUser, "passwordHash" | "inviteTokenHash">;

const USERS_FILE = "admin-users.json";
const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7;

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

export async function inviteAdminUser(input: { email: string; role: string }) {
  const email = normalizeEmail(input.email);
  if (!email || !email.includes("@")) throw new Error("A valid employee email is required.");
  const users = await readJson<AdminUser[]>(USERS_FILE, []);
  if (users.some((user) => user.email === email)) throw new Error("This employee already exists.");
  const now = new Date().toISOString();
  const invite = createInviteToken();
  const user: AdminUser = {
    id: crypto.randomUUID(),
    email,
    role: input.role.trim() || "Staff",
    inviteTokenHash: hashToken(invite.token),
    inviteExpiresAt: invite.expiresAt,
    status: "invited",
    createdAt: now,
    updatedAt: now,
  };
  await writeJson(USERS_FILE, [user, ...users]);
  return { user: publicUser(user), token: invite.token };
}

export async function deleteAdminUser(id: string) {
  const users = await readJson<AdminUser[]>(USERS_FILE, []);
  await writeJson(USERS_FILE, users.filter((user) => user.id !== id));
}

export async function createPasswordResetInvite(id: string) {
  const users = await readJson<AdminUser[]>(USERS_FILE, []);
  const invite = createInviteToken();
  const now = new Date().toISOString();
  const next = users.map((user) => user.id === id ? { ...user, inviteTokenHash: hashToken(invite.token), inviteExpiresAt: invite.expiresAt, status: "invited" as const, updatedAt: now } : user);
  const updated = next.find((user) => user.id === id);
  if (!updated) throw new Error("Employee was not found.");
  await writeJson(USERS_FILE, next);
  return { user: publicUser(updated), token: invite.token };
}

export async function acceptAdminInvite(token: string, password: string) {
  if (password.length < 8) throw new Error("Password must contain at least 8 characters.");
  const users = await readJson<AdminUser[]>(USERS_FILE, []);
  const tokenHash = hashToken(token);
  const now = new Date();
  const user = users.find((item) => item.inviteTokenHash === tokenHash);
  if (!user || !user.inviteExpiresAt || new Date(user.inviteExpiresAt) < now) {
    throw new Error("This invite link is invalid or expired.");
  }
  const updatedAt = now.toISOString();
  const next = users.map((item) => item.id === user.id ? {
    ...item,
    passwordHash: hashPassword(password),
    inviteTokenHash: undefined,
    inviteExpiresAt: undefined,
    status: "active" as const,
    updatedAt,
  } : item);
  const updated = next.find((item) => item.id === user.id);
  await writeJson(USERS_FILE, next);
  return publicUser(updated ?? user);
}

export function verifyPassword(password: string, passwordHash?: string) {
  if (!passwordHash) return false;
  const [algorithm, iterations, salt, stored] = passwordHash.split(":");
  if (algorithm !== "pbkdf2" || !iterations || !salt || !stored) return false;
  const actual = crypto.pbkdf2Sync(password, salt, Number(iterations), 32, "sha256").toString("hex");
  const storedBuffer = Buffer.from(stored);
  const actualBuffer = Buffer.from(actual);
  return storedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(storedBuffer, actualBuffer);
}

function createInviteToken() {
  return { token: crypto.randomBytes(32).toString("hex"), expiresAt: new Date(Date.now() + INVITE_TTL_MS).toISOString() };
}

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const iterations = 120000;
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("hex");
  return `pbkdf2:${iterations}:${salt}:${hash}`;
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function publicUser(user: AdminUser): PublicAdminUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    inviteExpiresAt: user.inviteExpiresAt,
    status: user.status ?? (user.passwordHash ? "active" : "invited"),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
