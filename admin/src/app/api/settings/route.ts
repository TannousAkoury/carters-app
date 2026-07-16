import { NextResponse } from "next/server";
import { readJson, writeJson } from "@/lib/json-store";
import { requirePermission } from "@/lib/shopify-admin";

export const dynamic = "force-dynamic";

const defaults = {
  workspace: {
    applicationName: "Carter's App Studio",
    storeName: "Carter's & OshKosh Lebanon",
    supportEmail: "",
    supportPhone: "",
    timezone: "Asia/Beirut",
    locale: "en-LB",
  },
  commerce: {
    currency: "USD",
    lowStockThreshold: 5,
    freeShippingThreshold: 50,
    orderPrefix: "CAR",
    defaultInventoryLocation: "",
  },
  app: {
    maintenanceMode: false,
    customerChat: true,
    wishlist: true,
    pushNotifications: true,
    guestCheckout: true,
    minimumVersion: "1.0.0",
    forceUpdate: false,
    updateMessage: "A newer version is available with important improvements.",
    updateUrl: "",
  },
  notifications: {
    newOrderAlerts: true,
    lowStockAlerts: true,
    newCustomerAlerts: false,
    failedPaymentAlerts: true,
    dailyDigest: true,
    digestEmail: "",
  },
  security: {
    sessionTimeoutMinutes: 480,
    auditRetentionDays: 90,
    requireTwoFactor: false,
    allowStaffInvites: true,
  },
};

type Settings = typeof defaults;

function text(value: unknown, fallback: string, max = 160) {
  return typeof value === "string" ? value.trim().slice(0, max) : fallback;
}

function flag(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function number(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function sanitize(value: unknown): Settings {
  const input = value && typeof value === "object" ? value as Partial<Settings> : {};
  const workspace = input.workspace ?? defaults.workspace;
  const commerce = input.commerce ?? defaults.commerce;
  const app = input.app ?? defaults.app;
  const notifications = input.notifications ?? defaults.notifications;
  const security = input.security ?? defaults.security;
  return {
    workspace: {
      applicationName: text(workspace.applicationName, defaults.workspace.applicationName, 80),
      storeName: text(workspace.storeName, defaults.workspace.storeName, 80),
      supportEmail: text(workspace.supportEmail, "", 160),
      supportPhone: text(workspace.supportPhone, "", 40),
      timezone: text(workspace.timezone, defaults.workspace.timezone, 80),
      locale: text(workspace.locale, defaults.workspace.locale, 20),
    },
    commerce: {
      currency: text(commerce.currency, defaults.commerce.currency, 3).toUpperCase(),
      lowStockThreshold: Math.floor(number(commerce.lowStockThreshold, defaults.commerce.lowStockThreshold, 0, 10000)),
      freeShippingThreshold: number(commerce.freeShippingThreshold, defaults.commerce.freeShippingThreshold, 0, 1000000),
      orderPrefix: text(commerce.orderPrefix, defaults.commerce.orderPrefix, 12).toUpperCase().replace(/[^A-Z0-9_-]/g, ""),
      defaultInventoryLocation: text(commerce.defaultInventoryLocation, "", 100),
    },
    app: {
      maintenanceMode: flag(app.maintenanceMode, defaults.app.maintenanceMode),
      customerChat: flag(app.customerChat, defaults.app.customerChat),
      wishlist: flag(app.wishlist, defaults.app.wishlist),
      pushNotifications: flag(app.pushNotifications, defaults.app.pushNotifications),
      guestCheckout: flag(app.guestCheckout, defaults.app.guestCheckout),
      minimumVersion: text(app.minimumVersion, defaults.app.minimumVersion, 20),
      forceUpdate: flag(app.forceUpdate, defaults.app.forceUpdate),
      updateMessage: text(app.updateMessage, defaults.app.updateMessage, 240),
      updateUrl: text(app.updateUrl, defaults.app.updateUrl, 500),
    },
    notifications: {
      newOrderAlerts: flag(notifications.newOrderAlerts, defaults.notifications.newOrderAlerts),
      lowStockAlerts: flag(notifications.lowStockAlerts, defaults.notifications.lowStockAlerts),
      newCustomerAlerts: flag(notifications.newCustomerAlerts, defaults.notifications.newCustomerAlerts),
      failedPaymentAlerts: flag(notifications.failedPaymentAlerts, defaults.notifications.failedPaymentAlerts),
      dailyDigest: flag(notifications.dailyDigest, defaults.notifications.dailyDigest),
      digestEmail: text(notifications.digestEmail, "", 160),
    },
    security: {
      sessionTimeoutMinutes: Math.floor(number(security.sessionTimeoutMinutes, defaults.security.sessionTimeoutMinutes, 15, 10080)),
      auditRetentionDays: Math.floor(number(security.auditRetentionDays, defaults.security.auditRetentionDays, 7, 2555)),
      requireTwoFactor: flag(security.requireTwoFactor, defaults.security.requireTwoFactor),
      allowStaffInvites: flag(security.allowStaffInvites, defaults.security.allowStaffInvites),
    },
  };
}

function integrationStatus() {
  const configured = (value?: string) => Boolean(value && !value.startsWith("replace_with_"));
  return {
    shopifyStorefront: configured(process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN || process.env.SHOPIFY_TOKEN) && configured(process.env.SHOPIFY_DOMAIN || process.env.NEXT_PUBLIC_SHOPIFY_DOMAIN),
    shopifyAdmin: configured(process.env.SHOPIFY_ADMIN_ACCESS_TOKEN) && configured(process.env.SHOPIFY_ADMIN_DOMAIN || process.env.SHOPIFY_DOMAIN || process.env.NEXT_PUBLIC_SHOPIFY_DOMAIN),
    push: configured(process.env.EXPO_ACCESS_TOKEN),
    email: configured(process.env.RESEND_API_KEY),
    realtime: configured(process.env.NEXT_PUBLIC_SUPABASE_URL) && configured(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  };
}

export async function GET() {
  const unauthorized = await requirePermission("Settings");
  if (unauthorized) return unauthorized;
  const stored = await readJson<Settings>("admin-settings.json", defaults);
  return NextResponse.json({ settings: sanitize(stored), integrations: integrationStatus() });
}

export async function PUT(request: Request) {
  const unauthorized = await requirePermission("Settings");
  if (unauthorized) return unauthorized;
  const body = await request.json().catch(() => null);
  if (!body?.settings || typeof body.settings !== "object") return NextResponse.json({ error: "settings must be an object" }, { status: 400 });
  const settings = sanitize(body.settings);
  await writeJson("admin-settings.json", settings);
  return NextResponse.json({ settings, integrations: integrationStatus(), savedAt: new Date().toISOString() });
}
