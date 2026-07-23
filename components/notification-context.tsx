import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import * as SecureStore from "@/services/storage";
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useState } from "react";
import { Linking, Platform } from "react-native";
import { adminApiUrls, fetchAdmin } from "@/services/admin-api";
import { trackEvent } from "@/services/analytics";

const INBOX_KEY = "notification_inbox";
const TEST_PUSH_CURSOR_KEY = "test_push_cursor";
const EXPO_PUSH_TOKEN_KEY = "expo_push_token";
const CUSTOMER_EMAIL_KEY = "shopify_customer_email";
const CUSTOMER_PHONE_KEY = "shopify_customer_phone";
const LAST_NOTIFICATION_RESPONSE_KEY = "last_notification_response";

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

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: true, shouldShowBanner: true, shouldShowList: true }),
  });
}

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
    if (Platform.OS === "web") return;
    Notifications.getPermissionsAsync().then(({ status }) => setEnabled(status === "granted"));
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") return;
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
        const updated = [next, ...current.filter((item) => item.id !== next.id && (!next.campaignId || item.campaignId !== next.campaignId))].slice(0, 100);
        SecureStore.setItemAsync(INBOX_KEY, JSON.stringify(updated));
        return updated;
      });
    });

    const handleResponse = async (response: Notifications.NotificationResponse) => {
      const responseId = response.notification.request.identifier;
      const lastResponseId = await SecureStore.getItemAsync(LAST_NOTIFICATION_RESPONSE_KEY);
      if (lastResponseId === responseId) return;
      await SecureStore.setItemAsync(LAST_NOTIFICATION_RESPONSE_KEY, responseId);
      const content = response.notification.request.content;
      const data = response.notification.request.content.data;
      const url = data?.url;
      const campaignId = data?.campaignId ?? data?.testMessageId;
      const opened: InboxNotification = { id: responseId, title: content.title ?? "Carter's", body: content.body ?? "", url: typeof url === "string" ? url : undefined, receivedAt: new Date().toISOString(), read: true, campaignId: typeof campaignId === "string" ? campaignId : undefined };
      setItems((current) => {
        const updated = [opened, ...current.filter((item) => item.id !== responseId && (!opened.campaignId || item.campaignId !== opened.campaignId))].slice(0, 100);
        void SecureStore.setItemAsync(INBOX_KEY, JSON.stringify(updated));
        return updated;
      });
      void trackEvent("notification_open", { campaignId: opened.campaignId, title: content.title ?? "" });
      if (typeof url === "string" && url.startsWith("/")) router.push(url as never);
      else if (typeof url === "string" && /^https:\/\//i.test(url)) void Linking.openURL(url).catch(() => undefined);
    };
    const responded = Notifications.addNotificationResponseReceivedListener((response) => { void handleResponse(response); });
    void Notifications.getLastNotificationResponseAsync().then((response) => { if (response) void handleResponse(response); });
    return () => { received.remove(); responded.remove(); };
  }, [router]);

  useEffect(() => {
    if (!__DEV__ || Platform.OS === "web") return;
    let active = true;
    const poll = async () => {
      try {
        const permission = await Notifications.getPermissionsAsync();
        if (permission.status !== "granted") return;
        const cursor = await SecureStore.getItemAsync(TEST_PUSH_CURSOR_KEY) ?? "";
        const token = await SecureStore.getItemAsync(EXPO_PUSH_TOKEN_KEY) ?? "";
        if (token) return;
        const response = await fetchAdmin(`/api/push/inbox?after=${encodeURIComponent(cursor)}&token=${encodeURIComponent(token)}`);
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
    if (Platform.OS === "web") throw new Error("Push notifications are available in the Android and iOS app.");
    if (!Device.isDevice) throw new Error("Push notifications require a physical device or supported simulator.");
    setRegistering(true);
    try {
      if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("default", { name: "Store updates", importance: Notifications.AndroidImportance.HIGH });
      let permission = await Notifications.getPermissionsAsync();
      if (permission.status !== "granted") permission = await Notifications.requestPermissionsAsync();
      if (permission.status !== "granted") throw new Error("Notification permission was not granted.");
      setEnabled(true);
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      // Expo Go cannot receive remote push notifications on current Android SDKs.
      // Permission is still useful: the development inbox poller turns admin
      // campaigns into local notifications while the app is running.
      if (!projectId) {
        if (__DEV__) return null;
        throw new Error("Push notifications are not configured for this production build.");
      }
      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      await SecureStore.setItemAsync(EXPO_PUSH_TOKEN_KEY, token);
      if (adminApiUrls().length) {
        const customerEmail = await SecureStore.getItemAsync(CUSTOMER_EMAIL_KEY);
        const customerPhone = await SecureStore.getItemAsync(CUSTOMER_PHONE_KEY);
        const response = await fetchAdmin("/api/push/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, platform: Platform.OS, customerEmail, customerPhone }) });
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
