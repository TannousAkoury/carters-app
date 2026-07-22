import * as SecureStore from "@/services/storage";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useLocalization } from "@/components/localization-context";

export type DisplayCurrency = "USD" | "LBP";

// Keep this in one place so the store can update its commercial exchange rate.
export const LBP_PER_USD = 89500;

type Money = { amount: string; currencyCode: string };
type CurrencyContextValue = {
  currency: DisplayCurrency;
  setCurrency: (currency: DisplayCurrency) => void;
  toggleCurrency: () => void;
  formatMoney: (money?: Money | null) => string;
};

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: "USD",
  setCurrency: () => undefined,
  toggleCurrency: () => undefined,
  formatMoney: () => "",
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { numericLocaleTag } = useLocalization();
  const [currency, setCurrencyState] = useState<DisplayCurrency>("USD");

  useEffect(() => {
    SecureStore.getItemAsync("display_currency").then((saved) => {
      if (saved === "USD" || saved === "LBP") setCurrencyState(saved);
    }).catch(() => undefined);
  }, []);

  const setCurrency = (next: DisplayCurrency) => {
    setCurrencyState(next);
    SecureStore.setItemAsync("display_currency", next).catch(() => undefined);
  };

  const formatMoney = (money?: Money | null) => {
    if (!money) return "";
    const amount = Number(money.amount);
    const usdAmount = money.currencyCode === "LBP" ? amount / LBP_PER_USD : amount;
    if (currency === "LBP") return new Intl.NumberFormat(numericLocaleTag, { style: "currency", currency: "LBP", maximumFractionDigits: 0 }).format(Math.round(usdAmount * LBP_PER_USD));
    return new Intl.NumberFormat(numericLocaleTag, { style: "currency", currency: "USD" }).format(usdAmount);
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, toggleCurrency: () => setCurrency(currency === "USD" ? "LBP" : "USD"), formatMoney }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => useContext(CurrencyContext);
