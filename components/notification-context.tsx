import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import { adminApiUrls, fetchAdmin } from "@/services/admin-api";
import { trackEvent } from "@/services/analytics";

const INBOX_KEY = "notification_inbox";
const TEST_PUSH_CURSOR_KEY = "test_push_cursor";

export type InboxNotification = {
  id: string;
  title: string;
  body: string;
  url?: string;
  receivedAt: string;
  read: boolean;
  campaignId?: string;
};

type NotificationContextValue = {
  items: InboxNotification[];
  unread: number;
  enabled: boolean;
  registering: boolean;
  register: () => Promise<string | null>;
  markAllRead: () => Promise<void>;
  clear: () => Promise<void>;
  openItem: (id: string) => Promise<InboxNotification | undefined>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: true, shouldShowBanner: true, shouldShowList: true }),
});

export function NotificationProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [registering, setRegistering] = useState(false);

  const persist = useCallback(async (next: InboxNotification[]) => {
    setItems(next);
    await SecureStore.setItemAsync(INBOX_KEY, JSON.stringify(next.slice(0, 100)));
  }, []);

  useEffect(() => {
    SecureStore.getItemAsync(INBOX_KEY).then((value) => {
      if (value) try { setItems(JSON.parse(value)); } catch { /* ignore invalid local data */ }
    });
    Notifications.getPermissionsAsync().then(({ status }) => setEnabled(status === "granted"));
  }, []);

  useEffect(() => {
    const received = Notifications.addNotificationReceivedListener((notification) => {
      const content = notification.request.content;
      const next: InboxNotification = {
        id: notification.request.identifier,
        title: content.title ?? "Carter's",
        body: content.body ?? "",
        url: typeof content.data?.url === "string" ? content.data.url : undefined,
        receivedAt: new Date().toISOString(),
        read: false,
        campaignId: typeof content.data?.campaignId === "string" ? content.data.campaignId : typeof content.data?.testMessageId === "string" ? content.data.testMessageId : undefined,
      };
      setItems((current) => {
        const updated = [next, ...current.filter((item) => item.id !== next.id)].slice(0, 100);
        SecureStore.setItemAsync(INBOX_KEY, JSON.stringify(updated));
        return updated;
      });
    });
    const responded = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      const url = data?.url;
      const campaignId = data?.campaignId ?? data?.testMessageId;
      trackEvent("notification_open", { campaignId: typeof campaignId === "string" ? campaignId : undefined, title: response.notification.request.content.title ?? "" });
      if (typeof campaignId === "string") {
        setItems((current) => {
          const updated = current.map((item) => item.campaignId === campaignId ? { ...item, read: true } : item);
          SecureStore.setItemAsync(INBOX_KEY, JSON.stringify(updated));
          return updated;
        });
      }
      if (typeof url === "string" && url.startsWith("/")) router.push(url as never);
    });
    return () => { received.remove(); responded.remove(); };
  }, [router]);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const permission = await Notifications.getPermissionsAsync();
        if (permission.status !== "granted") return;
        const cursor = await SecureStore.getItemAsync(TEST_PUSH_CURSOR_KEY) ?? "";
        const response = await fetchAdmin(`/api/push/inbox?after=${encodeURIComponent(cursor)}`);
        if (!response.ok) return;
        const payload = await response.json();
        const messages = Array.isArray(payload?.messages) ? payload.messages : [];
        for (const message of messages) {
          if (!active) return;
          await Notifications.scheduleNotificationAsync({ content: { title: message.title, body: message.message, data: { url: message.url, campaignId: message.id } }, trigger: null });
        }
        const latest = messages.at(-1)?.createdAt;
        if (latest) await SecureStore.setItemAsync(TEST_PUSH_CURSOR_KEY, latest);
      } catch { /* The local admin may be offline. */ }
    };
    poll();
    const timer = setInterval(poll, 5000);
    return () => { active = false; clearInterval(timer); };
  }, []);

  const register = async () => {
    if (!Device.isDevice) throw new Error("Push notifications require a physical device or supported simulator.");
    setRegistering(true);
    try {
      if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("default", { name: "Store updates", importance: Notifications.AndroidImportance.HIGH });
      let permission = await Notifications.getPermissionsAsync();
      if (permission.status !== "granted") permission = await Notifications.requestPermissionsAsync();
      if (permission.status !== "granted") throw new Error("Notification permission was not granted.");
      setEnabled(true);
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      if (!projectId) throw new Error("EAS project ID is not configured yet.");
      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      if (adminApiUrls().length) {
        const response = await fetchAdmin("/api/push/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, platform: Platform.OS }) });
        if (!response.ok) throw new Error("The admin server could not save this device.");
      }
      return token;
    } finally { setRegistering(false); }
  };

  const markAllRead = async () => persist(items.map((item) => ({ ...item, read: true })));
  const clear = async () => persist([]);
  const openItem = async (id: string) => {
    const item = items.find((entry) => entry.id === id);
    if (!item) return undefined;
    await persist(items.map((entry) => entry.id === id ? { ...entry, read: true } : entry));
    await trackEvent("notification_open", { campaignId: item.campaignId, title: item.title });
    return item;
  };
  return <NotificationContext.Provider value={{ items, unread: items.filter((item) => !item.read).length, enabled, registering, register, markAllRead, clear, openItem }}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const value = useContext(NotificationContext);
  if (!value) throw new Error("useNotifications must be used inside NotificationProvider");
  return value;
}
