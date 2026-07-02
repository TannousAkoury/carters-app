import { getShopifyCart } from '@/services/shopify';
import * as SecureStore from 'expo-secure-store';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

type CartContextValue = { count: number; setCount: (count: number) => void; refresh: () => Promise<void> };
const CartContext = createContext<CartContextValue>({ count: 0, setCount: () => undefined, refresh: async () => undefined });

export function CartProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);
  const refresh = useCallback(async () => {
    try {
      const id = await SecureStore.getItemAsync('shopify_cart_id');
      const cart = id ? await getShopifyCart(id) : null;
      setCount(cart?.totalQuantity ?? 0);
    } catch { setCount(0); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return <CartContext.Provider value={{ count, setCount, refresh }}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
