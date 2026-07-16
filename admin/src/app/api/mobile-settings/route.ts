import { readJson } from "@/lib/json-store";

export const dynamic = "force-dynamic";

type StoredSettings = {
  app?: {
    maintenanceMode?: boolean;
    customerChat?: boolean;
    wishlist?: boolean;
    pushNotifications?: boolean;
    guestCheckout?: boolean;
    minimumVersion?: string;
    forceUpdate?: boolean;
    updateMessage?: string;
    updateUrl?: string;
  };
};

const defaults = {
  maintenanceMode: false,
  customerChat: true,
  wishlist: true,
  pushNotifications: true,
  guestCheckout: true,
  minimumVersion: "1.0.0",
  forceUpdate: false,
  updateMessage: "A newer version is available with important improvements.",
  updateUrl: "",
};

export async function GET() {
  const stored = await readJson<StoredSettings>("admin-settings.json", {});
  const app = stored.app ?? {};
  const flag = (value: unknown, fallback: boolean) => typeof value === "boolean" ? value : fallback;
  const text = (value: unknown, fallback: string, max: number) => typeof value === "string" ? value.trim().slice(0, max) : fallback;
  return Response.json({
    app: {
      maintenanceMode: flag(app.maintenanceMode, defaults.maintenanceMode),
      customerChat: flag(app.customerChat, defaults.customerChat),
      wishlist: flag(app.wishlist, defaults.wishlist),
      pushNotifications: flag(app.pushNotifications, defaults.pushNotifications),
      guestCheckout: flag(app.guestCheckout, defaults.guestCheckout),
      minimumVersion: text(app.minimumVersion, defaults.minimumVersion, 20),
      forceUpdate: flag(app.forceUpdate, defaults.forceUpdate),
      updateMessage: text(app.updateMessage, defaults.updateMessage, 240),
      updateUrl: text(app.updateUrl, defaults.updateUrl, 500),
    },
  }, { headers: { "Cache-Control": "no-store" } });
}
