import crypto from "node:crypto";
import { readJson, updateJson } from "@/lib/json-store";

export const CUSTOMER_BLOCK_REASONS = ["Spam", "Suspected fraud", "Abuse or harassment", "Policy violation", "Other"] as const;
export type CustomerBlockReason = (typeof CUSTOMER_BLOCK_REASONS)[number];

export type CustomerBlock = {
  id: string;
  customerId: string;
  customerName: string;
  email: string;
  phone: string;
  reason: CustomerBlockReason;
  note: string;
  blockedAt: string;
  blockedBy: string;
  active: boolean;
  unblockedAt?: string;
  unblockedBy?: string;
};

const FILE = "customer-blocks.json";
const normalizeEmail = (value?: string | null) => (value || "").trim().toLowerCase();
const normalizePhone = (value?: string | null) => (value || "").replace(/\D/g, "");
const normalizeId = (value?: string | null) => (value || "").trim().split("/").at(-1) || "";

export async function listCustomerBlocks() {
  return readJson<CustomerBlock[]>(FILE, []);
}

export function matchesCustomerBlock(block: CustomerBlock, customer: { customerId?: string | null; email?: string | null; phone?: string | null }) {
  if (!block.active) return false;
  const customerId = normalizeId(customer.customerId);
  const email = normalizeEmail(customer.email);
  const phone = normalizePhone(customer.phone);
  return Boolean(
    (customerId && normalizeId(block.customerId) === customerId) ||
    (email && normalizeEmail(block.email) === email) ||
    (phone && normalizePhone(block.phone) === phone),
  );
}

export async function findActiveCustomerBlock(customer: { customerId?: string | null; email?: string | null; phone?: string | null }) {
  return (await listCustomerBlocks()).find((block) => matchesCustomerBlock(block, customer)) || null;
}

export async function blockCustomer(input: Omit<CustomerBlock, "id" | "blockedAt" | "active" | "unblockedAt" | "unblockedBy">) {
  const now = new Date().toISOString();
  const updated = await updateJson<CustomerBlock[]>(FILE, [], (blocks) => {
    const existing = blocks.find((block) => normalizeId(block.customerId) === normalizeId(input.customerId));
    const saved: CustomerBlock = { id: existing?.id || crypto.randomUUID(), ...input, blockedAt: now, active: true };
    return [saved, ...blocks.filter((block) => block.id !== existing?.id)].slice(0, 10000);
  });
  return updated[0];
}

export async function unblockCustomer(customerId: string, unblockedBy: string): Promise<CustomerBlock | null> {
  const unblockedAt = new Date().toISOString();
  const updated = await updateJson<CustomerBlock[]>(FILE, [], (blocks) => blocks.map((block) => {
    if (normalizeId(block.customerId) !== normalizeId(customerId) || !block.active) return block;
    return { ...block, active: false, unblockedAt, unblockedBy };
  }));
  return updated.find((block) => normalizeId(block.customerId) === normalizeId(customerId) && block.unblockedAt === unblockedAt) || null;
}
