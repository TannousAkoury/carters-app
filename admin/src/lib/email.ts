import crypto from "node:crypto";
import { readJson, writeJson } from "@/lib/json-store";

type EmailRecord = {
  id: string;
  to: string;
  subject: string;
  text: string;
  createdAt: string;
  mode: "resend" | "local-outbox";
};

export async function sendMemberSetupEmail(input: { to: string; setupUrl: string; reset?: boolean }) {
  const subject = input.reset ? "Reset your Carter's admin password" : "Set up your Carter's admin account";
  const text = [
    input.reset ? "An admin reset your Carter's admin password." : "You were invited to Carter's App Studio.",
    "",
    "Open this secure link to set your password:",
    input.setupUrl,
    "",
    "This link expires in 7 days.",
  ].join("\n");

  if (process.env.RESEND_API_KEY) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.ADMIN_EMAIL_FROM ?? "Carter's App Studio <onboarding@resend.dev>",
        to: input.to,
        subject,
        text,
      }),
    });
    if (!response.ok) throw new Error("Email provider could not send the invite.");
    return { mode: "resend" as const };
  }

  const outbox = await readJson<EmailRecord[]>("email-outbox.json", []);
  await writeJson("email-outbox.json", [...outbox.slice(-99), {
    id: crypto.randomUUID(),
    to: input.to,
    subject,
    text,
    createdAt: new Date().toISOString(),
    mode: "local-outbox",
  }]);
  return { mode: "local-outbox" as const, setupUrl: input.setupUrl };
}

export function appBaseUrl(request: Request) {
  return process.env.ADMIN_PUBLIC_URL ?? new URL(request.url).origin;
}
