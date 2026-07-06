import { trackEvent } from "@/services/analytics";
import { usePathname } from "expo-router";
import { useEffect } from "react";

export function AnalyticsTracker() {
  const pathname = usePathname();
  useEffect(() => { trackEvent("screen_view", { path: pathname }); }, [pathname]);
  return null;
}
