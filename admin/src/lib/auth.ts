import crypto from "node:crypto";
import { findAdminUserByEmail, findAdminUserById, verifyPassword } from "@/lib/admin-users";

export const ADMIN_AUTH_COOKIE = "carters_admin_session";

export class AdminAuthConfigurationError extends Error {}

export function getAdminCredentials() {
  const development = process.env.NODE_ENV !== "production";
  return {
    username: process.env.ADMIN_USERNAME ?? (development ? "admin" : ""),
    password: process.env.ADMIN_PASSWORD ?? (development ? "admin123" : ""),
    sessionToken: process.env.ADMIN_SESSION_TOKEN ?? (development ? "local-admin-session" : ""),
  };
}

export async function authenticateAdminUser(username: string, password: string) {
  const credentials = getAdminCredentials();
  if (credentials.username && credentials.password && credentials.sessionToken && username === credentials.username && password === credentials.password) {
    return { sessionToken: credentials.sessionToken, user: { id: "owner", email: credentials.username, role: "Owner" } };
  }

  const user = await findAdminUserByEmail(username);
  if (!user || !verifyPassword(password, user.passwordHash)) return null;
  return { sessionToken: createStaffSessionToken(user.id), user: { id: user.id, email: user.email, role: user.role } };
}

export async function validateAdminSession(session?: string) {
  return Boolean(await getAdminSessionUser(session));
}

export async function getAdminSessionUser(session?: string) {
  if (!session) return null;
  const credentials = getAdminCredentials();
  if (session === credentials.sessionToken) return { id: "owner", email: credentials.username, role: "Owner" };
  const userId = verifyStaffSessionToken(session);
  if (!userId) return null;
  const user = await findAdminUserById(userId);
  return user ? { id: user.id, email: user.email, role: user.role } : null;
}

function createStaffSessionToken(userId: string) {
  const secret = sessionSecret();
  if (!secret) throw new AdminAuthConfigurationError("ADMIN_SESSION_TOKEN must be configured in production.");
  const issuedAt = Math.floor(Date.now() / 1000).toString();
  const payload = `${userId}:${issuedAt}`;
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `staff:${payload}:${signature}`;
}

function verifyStaffSessionToken(token: string) {
  const [prefix, userId, issuedAt, signature] = token.split(":");
  const secret = sessionSecret();
  if (prefix !== "staff" || !userId || !issuedAt || !signature || !secret) return null;
  const issuedAtNumber = Number(issuedAt);
  if (!Number.isSafeInteger(issuedAtNumber) || issuedAtNumber > Date.now() / 1000 || Date.now() / 1000 - issuedAtNumber > 60 * 60 * 24 * 7) return null;
  const expected = crypto.createHmac("sha256", secret).update(`${userId}:${issuedAt}`).digest("hex");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer) ? userId : null;
}

function sessionSecret() {
  return process.env.ADMIN_SESSION_TOKEN ?? (process.env.NODE_ENV !== "production" ? "local-admin-session" : "");
}
