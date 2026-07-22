import Constants from "expo-constants";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { AppState, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { defaultMobileAppSettings, getMobileAppSettings, versionIsBelow, type MobileAppSettings } from "@/services/app-settings";
import { useLocalization } from "@/components/localization-context";

type AppSettingsContextValue = { settings: MobileAppSettings; refresh: () => Promise<void> };
const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(defaultMobileAppSettings);
  const refresh = useCallback(async () => {
    try { setSettings(await getMobileAppSettings()); }
    catch (error) { if (__DEV__) console.info("Using bundled app settings:", error); }
  }, []);

  useEffect(() => {
    refresh();
    const subscription = AppState.addEventListener("change", (state) => { if (state === "active") refresh(); });
    return () => subscription.remove();
  }, [refresh]);

  const value = useMemo(() => ({ settings, refresh }), [settings, refresh]);
  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings() {
  const value = useContext(AppSettingsContext);
  if (!value) throw new Error("useAppSettings must be used inside AppSettingsProvider");
  return value;
}

export function AppGate({ children }: { children: ReactNode }) {
  const { t, isArabic } = useLocalization();
  const { settings, refresh } = useAppSettings();
  const currentVersion = Constants.expoConfig?.version ?? "1.0.0";
  const updateRequired = settings.forceUpdate && versionIsBelow(currentVersion, settings.minimumVersion);
  if (!settings.maintenanceMode && !updateRequired) return children;
  const maintenance = settings.maintenanceMode;
  const openUpdate = () => { if (settings.updateUrl) Linking.openURL(settings.updateUrl); };
  return <View style={styles.gate}>
    <View style={styles.badge}><Text style={styles.badgeText}>{maintenance ? t("app.maintenance") : t("app.updateRequired")}</Text></View>
    <Text style={styles.logo}>Carter&apos;s</Text>
    <Text style={styles.title}>{maintenance ? t("app.backSoon") : t("app.updateApp")}</Text>
    <Text style={[styles.message, isArabic && styles.arabicParagraph]}>{maintenance ? t("app.maintenanceMessage") : settings.updateMessage}</Text>
    {!maintenance && settings.updateUrl ? <TouchableOpacity style={styles.primary} onPress={openUpdate}><Text style={styles.primaryText}>{t("app.updateNow")}</Text></TouchableOpacity> : null}
    <TouchableOpacity style={styles.secondary} onPress={refresh}><Text style={styles.secondaryText}>{t("app.checkAgain")}</Text></TouchableOpacity>
    {!maintenance ? <Text style={styles.version}>{t("app.version", { installed: currentVersion, required: settings.minimumVersion })}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  gate: { flex: 1, backgroundColor: "#fffaf6", alignItems: "center", justifyContent: "center", padding: 32 }, arabicParagraph: { writingDirection: "rtl" }, badge: { backgroundColor: "#eaf3f8", paddingHorizontal: 13, paddingVertical: 7, borderRadius: 18, marginBottom: 20 }, badgeText: { color: "#397ab5", fontSize: 11, fontWeight: "900", letterSpacing: 1 }, logo: { color: "#397ab5", fontSize: 30, fontWeight: "900", marginBottom: 28 }, title: { color: "#002041", fontSize: 25, fontWeight: "900", textAlign: "center" }, message: { color: "#657083", fontSize: 15, lineHeight: 23, textAlign: "center", maxWidth: 340, marginTop: 12, marginBottom: 26 }, primary: { width: "100%", maxWidth: 320, height: 52, borderRadius: 26, backgroundColor: "#002041", alignItems: "center", justifyContent: "center" }, primaryText: { color: "#fff", fontWeight: "900" }, secondary: { padding: 16, marginTop: 4 }, secondaryText: { color: "#397ab5", fontWeight: "900" }, version: { color: "#9a8f8b", fontSize: 11, marginTop: 8 },
});
