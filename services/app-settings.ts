import { fetchAdmin } from "@/services/admin-api";

export type MobileAppSettings = {
  maintenanceMode: boolean;
  customerChat: boolean;
  wishlist: boolean;
  pushNotifications: boolean;
  guestCheckout: boolean;
  minimumVersion: string;
  forceUpdate: boolean;
  updateMessage: string;
  updateUrl: string;
};

export const defaultMobileAppSettings: MobileAppSettings = {
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

export async function getMobileAppSettings(): Promise<MobileAppSettings> {
  const response = await fetchAdmin("/api/mobile-settings");
  if (!response.ok) throw new Error(`App settings returned ${response.status}`);
  const data = await response.json();
  return { ...defaultMobileAppSettings, ...(data?.app ?? {}) };
}

export function versionIsBelow(current: string, minimum: string) {
  const parts = (value: string) => value.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const left = parts(current);
  const right = parts(minimum);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    if ((left[index] ?? 0) < (right[index] ?? 0)) return true;
    if ((left[index] ?? 0) > (right[index] ?? 0)) return false;
  }
  return false;
}
