import { NextResponse } from "next/server";
import { blockCustomer, CUSTOMER_BLOCK_REASONS, unblockCustomer } from "@/lib/customer-blocks";
import { readJson, updateJson } from "@/lib/json-store";
import type { PushDevice } from "@/lib/push";
import { currentAdminLabel, requirePermission } from "@/lib/shopify-admin";
import { recordTeamActivity } from "@/lib/team-activity";

const normalizeEmail = (value: string) => value.trim().toLowerCase();
const normalizePhone = (value: string) => value.replace(/\D/g, "");

export async function PATCH(request: Request) {
  const unauthorized = await requirePermission("Customers");
  if (unauthorized) return unauthorized;
  const body = await request.json().catch(() => null);
  const action = body?.action === "unblock" ? "unblock" : body?.action === "block" ? "block" : "";
  const customerId = typeof body?.customerId === "string" ? body.customerId.trim() : "";
  if (!action || !customerId) return NextResponse.json({ error: "A valid action and customer are required." }, { status: 400 });
  const actor = await currentAdminLabel();

  if (action === "unblock") {
    const block = await unblockCustomer(customerId, actor);
    if (!block) return NextResponse.json({ error: "This customer is not currently blocked." }, { status: 404 });
    await recordTeamActivity({ action: "Customer unblocked", category: "security", severity: "info", actor, target: block.customerName || block.email || customerId, detail: `Carter-managed access restored. Previous reason: ${block.reason}.` });
    return NextResponse.json({ block });
  }

  const reason = typeof body?.reason === "string" && CUSTOMER_BLOCK_REASONS.includes(body.reason) ? body.reason : "";
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 500) : "";
  if (!reason) return NextResponse.json({ error: "Choose a reason for blocking this customer." }, { status: 400 });
  if (reason === "Other" && !note) return NextResponse.json({ error: "Add a note when using the Other reason." }, { status: 400 });
  const customerName = typeof body?.customerName === "string" ? body.customerName.trim().slice(0, 160) : "";
  const email = typeof body?.email === "string" ? normalizeEmail(body.email).slice(0, 160) : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim().slice(0, 40) : "";
  const block = await blockCustomer({ customerId, customerName, email, phone, reason, note, blockedBy: actor });

  const normalizedPhone = normalizePhone(phone);
  const devices = await readJson<PushDevice[]>("push-devices.json", []);
  const matchingTokens = devices.filter((device) => {
    const emailMatches = Boolean(email && normalizeEmail(device.customerEmail || "") === email);
    const phoneMatches = Boolean(normalizedPhone && normalizePhone(device.customerPhone || "") === normalizedPhone);
    return emailMatches || phoneMatches;
  }).map((device) => device.token);
  await updateJson<string[]>("blocked-push-tokens.json", [], (tokens) => [...new Set([...matchingTokens, ...tokens])].slice(0, 10000));
  await updateJson<PushDevice[]>("push-devices.json", [], (devices) => devices.filter((device) => {
    const emailMatches = Boolean(email && normalizeEmail(device.customerEmail || "") === email);
    const phoneMatches = Boolean(normalizedPhone && normalizePhone(device.customerPhone || "") === normalizedPhone);
    return !emailMatches && !phoneMatches;
  }));
  await recordTeamActivity({ action: "Customer blocked", category: "security", severity: "warning", actor, target: customerName || email || customerId, detail: `${reason}${note ? ` — ${note}` : ""}. Carter-managed loyalty and push access restricted.` });
  return NextResponse.json({ block });
}
