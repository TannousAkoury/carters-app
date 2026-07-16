import * as SecureStore from "expo-secure-store";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const WISHLIST_KEY = "carters_wishlist_v1";

export type WishlistItem = {
  id: string;
  title: string;
  price: string;
  oldPrice?: string | null;
  image: string;
  handle: string;
};

type WishlistContextValue = {
  items: WishlistItem[];
  ready: boolean;
  has: (id: string) => boolean;
  toggle: (item: WishlistItem) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

function validItems(value: string | null): WishlistItem[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is WishlistItem =>
      Boolean(item && typeof item.id === "string" && typeof item.title === "string" && typeof item.image === "string" && typeof item.handle === "string"),
    );
  } catch {
    return [];
  }
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    SecureStore.getItemAsync(WISHLIST_KEY)
      .then((stored) => { if (mounted) setItems(validItems(stored)); })
      .finally(() => { if (mounted) setReady(true); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    SecureStore.setItemAsync(WISHLIST_KEY, JSON.stringify(items)).catch((error) => {
      console.warn("Unable to save wishlist", error);
    });
  }, [items, ready]);

  const has = useCallback((id: string) => items.some((item) => item.id === id), [items]);
  const toggle = useCallback((item: WishlistItem) => {
    setItems((current) => current.some((saved) => saved.id === item.id)
      ? current.filter((saved) => saved.id !== item.id)
      : [item, ...current].slice(0, 50));
  }, []);
  const remove = useCallback((id: string) => setItems((current) => current.filter((item) => item.id !== id)), []);
  const clear = useCallback(() => setItems([]), []);
  const value = useMemo(() => ({ items, ready, has, toggle, remove, clear }), [items, ready, has, toggle, remove, clear]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const value = useContext(WishlistContext);
  if (!value) throw new Error("useWishlist must be used inside WishlistProvider");
  return value;
}
