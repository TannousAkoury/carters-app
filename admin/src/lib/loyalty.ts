import crypto from "node:crypto";
import { readJson, writeJson } from "@/lib/json-store";

export type LoyaltySettings = {
  enabled: boolean;
  programName: string;
  pointsPerItem: number;
  pointsPerCurrencyUnit: number;
  minimumRedemptionPoints: number;
  rewardExpiryDays: number;
};

export type LoyaltyAccount = {
  id: string;
  customerId: string;
  email: string;
  name: string;
  points: number;
  lifetimePoints: number;
  updatedAt: string;
};

export type LoyaltyTransaction = {
  id: string;
  accountId: string;
  customerId: string;
  email: string;
  type: "earn" | "reversal" | "adjustment" | "redemption";
  points: number;
  orderId?: string;
  orderName?: string;
  itemCount?: number;
  rewardCode?: string;
  rewardAmount?: number;
  currencyCode?: string;
  discountId?: string;
  expiresAt?: string;
  note: string;
  createdAt: string;
};

export type LoyaltyDiscountRequest = {
  account: LoyaltyAccount;
  code: string;
  points: number;
  amount: number;
  startsAt: string;
  endsAt: string;
};

export type LoyaltyDiscountResult = { discountId: string; currencyCode: string };

const defaultSettings: LoyaltySettings = {
  enabled: true,
  programName: "Carter's Rewards",
  pointsPerItem: 1,
  pointsPerCurrencyUnit: 10,
  minimumRedemptionPoints: 50,
  rewardExpiryDays: 30,
};

let queue = Promise.resolve();
const locked = async <T>(task: () => Promise<T>) => {
  const previous = queue;
  let release = () => {};
  queue = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  try { return await task(); } finally { release(); }
};
const normalizedEmail = (value: string) => value.trim().toLowerCase();
const accountKey = (customerId: string, email: string) => customerId || normalizedEmail(email);

export async function loyaltySnapshot() {
  const [settings, accounts, transactions] = await Promise.all([
    readJson<LoyaltySettings>("loyalty-settings.json", defaultSettings),
    readJson<LoyaltyAccount[]>("loyalty-accounts.json", []),
    readJson<LoyaltyTransaction[]>("loyalty-transactions.json", []),
  ]);
  return {
    settings: { ...defaultSettings, ...settings },
    accounts: accounts.sort((a, b) => b.points - a.points),
    transactions: transactions.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}

export async function saveLoyaltySettings(input: Partial<LoyaltySettings>) {
  const current = (await loyaltySnapshot()).settings;
  const pointsPerCurrencyUnit = Math.max(1, Math.floor(Number(input.pointsPerCurrencyUnit ?? current.pointsPerCurrencyUnit) || 1));
  const requestedMinimum = Math.max(pointsPerCurrencyUnit, Math.floor(Number(input.minimumRedemptionPoints ?? current.minimumRedemptionPoints) || pointsPerCurrencyUnit));
  const settings: LoyaltySettings = {
    enabled: typeof input.enabled === "boolean" ? input.enabled : current.enabled,
    programName: String(input.programName || current.programName).trim().slice(0, 80) || defaultSettings.programName,
    pointsPerItem: Math.max(0, Math.floor(Number(input.pointsPerItem ?? current.pointsPerItem) || 0)),
    pointsPerCurrencyUnit,
    minimumRedemptionPoints: Math.ceil(requestedMinimum / pointsPerCurrencyUnit) * pointsPerCurrencyUnit,
    rewardExpiryDays: Math.min(365, Math.max(1, Math.floor(Number(input.rewardExpiryDays ?? current.rewardExpiryDays) || 30))),
  };
  await writeJson("loyalty-settings.json", settings);
  return settings;
}

export async function awardPaidOrder(input: { orderId: string; orderName: string; customerId: string; email: string; name: string; itemCount: number }) {
  return locked(async () => {
    const snapshot = await loyaltySnapshot();
    const settings = snapshot.settings;
    if (!settings.enabled) return { status: "disabled" as const, points: 0 };
    if (!input.orderId || (!input.customerId && !input.email)) return { status: "missing-customer" as const, points: 0 };
    if (snapshot.transactions.some((transaction) => transaction.type === "earn" && transaction.orderId === input.orderId)) return { status: "duplicate" as const, points: 0 };
    const itemCount = Math.max(0, Math.floor(Number(input.itemCount) || 0));
    const points = itemCount * settings.pointsPerItem;
    if (points <= 0) return { status: "no-points" as const, points: 0 };
    const key = accountKey(input.customerId, input.email);
    const now = new Date().toISOString();
    let account = snapshot.accounts.find((item) => accountKey(item.customerId, item.email) === key);
    if (account) {
      account = { ...account, customerId: input.customerId || account.customerId, email: normalizedEmail(input.email) || account.email, name: input.name || account.name, points: account.points + points, lifetimePoints: account.lifetimePoints + points, updatedAt: now };
      snapshot.accounts = snapshot.accounts.map((item) => item.id === account!.id ? account! : item);
    } else {
      account = { id: crypto.randomUUID(), customerId: input.customerId, email: normalizedEmail(input.email), name: input.name || input.email || "Customer", points, lifetimePoints: points, updatedAt: now };
      snapshot.accounts.push(account);
    }
    snapshot.transactions.push({ id: crypto.randomUUID(), accountId: account.id, customerId: account.customerId, email: account.email, type: "earn", points, orderId: input.orderId, orderName: input.orderName, itemCount, note: `${points} points earned for ${itemCount} purchased item${itemCount === 1 ? "" : "s"} in ${input.orderName}`, createdAt: now });
    await Promise.all([writeJson("loyalty-accounts.json", snapshot.accounts), writeJson("loyalty-transactions.json", snapshot.transactions.slice(-10000))]);
    return { status: "awarded" as const, points, balance: account.points, account };
  });
}

export async function reverseOrderPoints(orderId: string, orderName: string) {
  return locked(async () => {
    const snapshot = await loyaltySnapshot();
    const earned = snapshot.transactions.find((transaction) => transaction.type === "earn" && transaction.orderId === orderId);
    if (!earned) return { status: "not-found" as const, points: 0 };
    if (snapshot.transactions.some((transaction) => transaction.type === "reversal" && transaction.orderId === orderId)) return { status: "duplicate" as const, points: 0 };
    const account = snapshot.accounts.find((item) => item.id === earned.accountId);
    if (!account) return { status: "not-found" as const, points: 0 };
    const now = new Date().toISOString();
    const points = Math.min(account.points, earned.points);
    const updated = { ...account, points: Math.max(0, account.points - earned.points), updatedAt: now };
    snapshot.accounts = snapshot.accounts.map((item) => item.id === account.id ? updated : item);
    snapshot.transactions.push({ id: crypto.randomUUID(), accountId: account.id, customerId: account.customerId, email: account.email, type: "reversal", points: -points, orderId, orderName, note: `Points reversed for ${orderName}`, createdAt: now });
    await Promise.all([writeJson("loyalty-accounts.json", snapshot.accounts), writeJson("loyalty-transactions.json", snapshot.transactions.slice(-10000))]);
    return { status: "reversed" as const, points, balance: updated.points };
  });
}

export async function adjustLoyaltyPoints(input: { accountId?: string; email?: string; points: number; note: string }) {
  return locked(async () => {
    const snapshot = await loyaltySnapshot();
    const email = normalizedEmail(input.email || "");
    let account = snapshot.accounts.find((item) => item.id === input.accountId) || (email ? snapshot.accounts.find((item) => item.email === email) : undefined);
    if (!account && email) {
      const now = new Date().toISOString();
      account = { id: crypto.randomUUID(), customerId: "", email, name: email, points: 0, lifetimePoints: 0, updatedAt: now };
      snapshot.accounts.push(account);
    }
    if (!account) throw new Error("Choose a loyalty customer.");
    const requested = Math.trunc(Number(input.points) || 0);
    if (!requested) throw new Error("Adjustment must be a positive or negative whole number.");
    const actual = requested < 0 ? -Math.min(account.points, Math.abs(requested)) : requested;
    const now = new Date().toISOString();
    const updated = { ...account, points: account.points + actual, lifetimePoints: account.lifetimePoints + Math.max(0, actual), updatedAt: now };
    snapshot.accounts = snapshot.accounts.map((item) => item.id === account!.id ? updated : item);
    snapshot.transactions.push({ id: crypto.randomUUID(), accountId: updated.id, customerId: updated.customerId, email: updated.email, type: "adjustment", points: actual, note: input.note.trim().slice(0, 180) || "Manual admin adjustment", createdAt: now });
    await Promise.all([writeJson("loyalty-accounts.json", snapshot.accounts), writeJson("loyalty-transactions.json", snapshot.transactions.slice(-10000))]);
    return updated;
  });
}

export async function redeemLoyaltyPoints(
  input: { accountId?: string; customerId?: string; email?: string; points: number },
  createDiscount: (request: LoyaltyDiscountRequest) => Promise<LoyaltyDiscountResult>,
) {
  return locked(async () => {
    const snapshot = await loyaltySnapshot();
    if (!snapshot.settings.enabled) throw new Error("The loyalty program is currently paused.");
    const email = normalizedEmail(input.email || "");
    const account = snapshot.accounts.find((item) => item.id === input.accountId)
      || snapshot.accounts.find((item) => (input.customerId && item.customerId === input.customerId) || (email && item.email === email));
    if (!account) throw new Error("This customer does not have a loyalty balance yet.");
    const points = Math.floor(Number(input.points) || 0);
    const { pointsPerCurrencyUnit, minimumRedemptionPoints, rewardExpiryDays } = snapshot.settings;
    if (points < minimumRedemptionPoints) throw new Error(`Redeem at least ${minimumRedemptionPoints} points.`);
    if (points % pointsPerCurrencyUnit !== 0) throw new Error(`Points must be redeemed in blocks of ${pointsPerCurrencyUnit}.`);
    if (account.points < points) throw new Error(`This customer has only ${account.points} available points.`);
    const amount = points / pointsPerCurrencyUnit;
    const startsAt = new Date().toISOString();
    const endsAt = new Date(Date.now() + rewardExpiryDays * 86400000).toISOString();
    const code = `CARTERS-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
    const discount = await createDiscount({ account, code, points, amount, startsAt, endsAt });
    const now = new Date().toISOString();
    const updated = { ...account, points: account.points - points, updatedAt: now };
    snapshot.accounts = snapshot.accounts.map((item) => item.id === account.id ? updated : item);
    const transaction: LoyaltyTransaction = {
      id: crypto.randomUUID(), accountId: account.id, customerId: account.customerId, email: account.email,
      type: "redemption", points: -points, rewardCode: code, rewardAmount: amount,
      currencyCode: discount.currencyCode, discountId: discount.discountId, expiresAt: endsAt,
      note: `${points} points redeemed for ${amount.toFixed(2)} ${discount.currencyCode} off`, createdAt: now,
    };
    snapshot.transactions.push(transaction);
    await Promise.all([writeJson("loyalty-accounts.json", snapshot.accounts), writeJson("loyalty-transactions.json", snapshot.transactions.slice(-10000))]);
    return { account: updated, transaction, reward: { code, amount, currencyCode: discount.currencyCode, expiresAt: endsAt } };
  });
}

export async function mergeActiveLoyaltyRewards(input:{customerId?:string;email?:string},mergeDiscounts:(input:{primaryDiscountId:string;secondaryDiscountIds:string[];amount:number})=>Promise<void>){
  return locked(async()=>{const snapshot=await loyaltySnapshot();const email=normalizedEmail(input.email||"");const account=snapshot.accounts.find(item=>(input.customerId&&item.customerId===input.customerId)||(email&&item.email===email));if(!account)throw new Error("This customer does not have a loyalty account.");const now=Date.now();const active=snapshot.transactions.filter(transaction=>transaction.accountId===account.id&&transaction.type==="redemption"&&transaction.rewardCode&&transaction.discountId&&Number(transaction.rewardAmount)>0&&(!transaction.expiresAt||new Date(transaction.expiresAt).getTime()>now));if(active.length<2)throw new Error("At least two active loyalty rewards are required.");const primary=active[0];const secondary=active.slice(1);const amount=active.reduce((sum,transaction)=>sum+Number(transaction.rewardAmount||0),0);await mergeDiscounts({primaryDiscountId:primary.discountId!,secondaryDiscountIds:secondary.map(transaction=>transaction.discountId!),amount});const changedAt=new Date().toISOString();snapshot.transactions=snapshot.transactions.map(transaction=>transaction.id===primary.id?{...transaction,rewardAmount:amount,note:`Combined loyalty reward worth ${amount.toFixed(2)} ${transaction.currencyCode||""}`.trim()}:secondary.some(item=>item.id===transaction.id)?{...transaction,expiresAt:changedAt,note:`Merged into reward ${primary.rewardCode}`}:transaction);await writeJson("loyalty-transactions.json",snapshot.transactions.slice(-10000));return {reward:{code:primary.rewardCode!,amount,currencyCode:primary.currencyCode||"USD",expiresAt:primary.expiresAt||changedAt},mergedCount:active.length}})
}

export async function findLoyaltyAccount(customerId: string, email: string) {
  const snapshot = await loyaltySnapshot();
  const normalized = normalizedEmail(email);
  return snapshot.accounts.find((account) => (customerId && account.customerId === customerId) || (normalized && account.email === normalized)) || null;
}
