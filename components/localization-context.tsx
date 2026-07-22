import { getLocales } from "expo-localization";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { AppState, Platform, View } from "react-native";
import * as Storage from "@/services/storage";
import { ar } from "@/localization/ar";
import { en, type TranslationKey } from "@/localization/en";
import { fr } from "@/localization/fr";
import { ro } from "@/localization/ro";
import { isSupportedLocale, LOCALE_TAGS, setActiveLocale, type AppLocale } from "@/services/locale";

const LANGUAGE_KEY = "app_language";
const translations = { en, ar, fr, ro } as const;
type TranslationParams = Record<string, string | number>;

type LocalizationContextValue = {
  locale: AppLocale;
  localeTag: string;
  numericLocaleTag: string;
  isArabic: boolean;
  setLocale: (locale: AppLocale) => void;
  t: (key: TranslationKey, params?: TranslationParams) => string;
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
};

function deviceLocale(): AppLocale {
  const languageCode = getLocales()[0]?.languageCode?.toLowerCase();
  return isSupportedLocale(languageCode) ? languageCode : "en";
}

const LocalizationContext = createContext<LocalizationContextValue | null>(null);

export function LocalizationProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(() => {
    // Keep the statically rendered web tree deterministic; the persisted or
    // browser locale is applied immediately after hydration. Native can use
    // the device locale on the first render.
    const initial = Platform.OS === "web" ? "en" : deviceLocale();
    setActiveLocale(initial);
    return initial;
  });

  const applyLocale = useCallback((next: AppLocale) => {
    setActiveLocale(next);
    setLocaleState(next);
    void Storage.setItemAsync(LANGUAGE_KEY, next);
  }, []);

  useEffect(() => {
    let mounted = true;
    Storage.getItemAsync(LANGUAGE_KEY).then((saved) => {
      if (!mounted) return;
      const next = isSupportedLocale(saved) ? saved : deviceLocale();
      setActiveLocale(next);
      setLocaleState(next);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    document.documentElement.lang = LOCALE_TAGS[locale];
    document.documentElement.dir = "ltr";
  }, [locale]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      void Storage.getItemAsync(LANGUAGE_KEY).then((saved) => {
        if (!saved) applyLocale(deviceLocale());
      });
    });
    return () => subscription.remove();
  }, [applyLocale]);

  const value = useMemo<LocalizationContextValue>(() => {
    const localeTag = LOCALE_TAGS[locale];
    const numericLocaleTag = locale === "ar" ? LOCALE_TAGS.en : localeTag;
    return {
      locale,
      localeTag,
      numericLocaleTag,
      isArabic: locale === "ar",
      setLocale: applyLocale,
      t: (key, params) => {
        const template = translations[locale][key] ?? en[key] ?? key;
        if (!params) return template;
        return Object.entries(params).reduce(
          (result, [name, replacement]) => result.replaceAll(`{${name}}`, String(replacement)),
          template,
        );
      },
      // Values that must keep their visual order (prices, counts and dates)
      // retain the app's LTR number system in Arabic mode.
      formatDate: (input, options) => new Intl.DateTimeFormat(numericLocaleTag, options).format(new Date(input)),
      formatNumber: (input, options) => new Intl.NumberFormat(numericLocaleTag, options).format(input),
    };
  }, [applyLocale, locale]);

  return (
    <LocalizationContext.Provider value={value}>
      <View style={{ flex: 1, direction: "ltr" }}>
        {children}
      </View>
    </LocalizationContext.Provider>
  );
}

export function useLocalization() {
  const value = useContext(LocalizationContext);
  if (!value) throw new Error("useLocalization must be used inside LocalizationProvider");
  return value;
}
