import crypto from "node:crypto";
import { findAdminUserByEmail, findAdminUserById, verifyPassword } from "@/lib/admin-users";

export const ADMIN_AUTH_COOKIE = "carters_admin_session";

export function getAdminCredentials() {
  return {
    username: process.env.ADMIN_USERNAME ?? "admin",
    password: process.env.ADMIN_PASSWORD ?? "admin123",
    sessionToken: process.env.ADMIN_SESSION_TOKEN ?? "local-admin-session",
  };
}

export async function authenticateAdminUser(username: string, password: string) {
  const credentials = getAdminCredentials();
  if (username === credentials.username && password === credentials.password) {
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
  const signature = crypto.createHmac("sha256", sessionSecret()).update(userId).digest("hex");
  return `staff:${userId}:${signature}`;
}

function verifyStaffSessionToken(token: string) {
  const [prefix, userId, signature] = token.split(":");
  if (prefix !== "staff" || !userId || !signature) return null;
  const expected = crypto.createHmac("sha256", sessionSecret()).update(userId).digest("hex");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer) ? userId : null;
}

function sessionSecret() {
  return process.env.ADMIN_SESSION_TOKEN ?? "local-admin-session";
}
