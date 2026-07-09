import { readJson, writeJson } from "@/lib/json-store";

export type PushDevice = {
  token: string;
  platform?: string;
  customerEmail?: string;
  customerPhone?: string;
  updatedAt: string;
};

export type PushMessage = {
  id: string;
  title: string;
  message: string;
  url: string;
  createdAt: string;
  recipientCount: number;
  status: "test-queued" | "submitted" | "failed";
  targetTokens?: string[];
  kind?: "campaign" | "order";
};

type SendPushInput = {
  title: string;
  message: string;
  url?: string;
  devices?: PushDevice[];
  targetTokens?: string[];
  kind?: PushMessage["kind"];
  storeInInbox?: boolean;
};

export async function sendClientPush(input: SendPushInput) {
  const devices = input.devices ?? await readJson<PushDevice[]>("push-devices.json", []);
  const targetTokens = input.targetTokens?.length ? new Set(input.targetTokens) : null;
  const recipients = targetTokens ? devices.filter((device) => targetTokens.has(device.token)) : devices;
  const messages = await readJson<PushMessage[]>("push-messages.json", []);
  const notification: PushMessage = {
    id: crypto.randomUUID(),
    title: input.title,
    message: input.message,
    url: input.url || "/notifications",
    createdAt: new Date().toISOString(),
    recipientCount: recipients.length,
    status: recipients.length ? "submitted" : "test-queued",
    ...(targetTokens ? { targetTokens: [...targetTokens] } : {}),
    kind: input.kind ?? "campaign",
  };

  if (!recipients.length) {
    if (input.storeInInbox !== false) await writeJson("push-messages.json", [...messages.slice(-99), notification]);
    return { sent: 0, queued: true, campaignId: notification.id, mode: "local-test" };
  }

  const expoMessages = recipients.map(({ token }) => ({
    to: token,
    sound: "default",
    title: notification.title,
    body: notification.message,
    data: { url: notification.url, campaignId: notification.id, kind: notification.kind },
  }));
  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "Accept-Encoding": "gzip, deflate" },
    body: JSON.stringify(expoMessages),
  });
  const result = await response.json();
  notification.status = response.ok ? "submitted" : "failed";
  if (input.storeInInbox !== false) await writeJson("push-messages.json", [...messages.slice(-99), notification]);
  if (!response.ok) return { error: result, status: response.status };
  return { sent: recipients.length, campaignId: notification.id, tickets: result.data };
}
