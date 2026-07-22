export type AppLocale = "en" | "ar" | "fr" | "ro";

export const SUPPORTED_LOCALES: readonly AppLocale[] = ["en", "ar", "fr", "ro"];
export const LOCALE_TAGS: Record<AppLocale, string> = {
  en: "en-US",
  ar: "ar-LB",
  fr: "fr-FR",
  ro: "ro-RO",
};
export const SHOPIFY_LANGUAGE_CODES: Record<AppLocale, "EN" | "AR" | "FR" | "RO"> = {
  en: "EN",
  ar: "AR",
  fr: "FR",
  ro: "RO",
};

let activeLocale: AppLocale = "en";

export function getActiveLocale() {
  return activeLocale;
}

export function setActiveLocale(locale: AppLocale) {
  activeLocale = locale;
}

export function isSupportedLocale(value: string | null | undefined): value is AppLocale {
  return SUPPORTED_LOCALES.includes(value as AppLocale);
}

export function hasArabicText(value: string | null | undefined) {
  return Boolean(value && /[\u0600-\u06ff]/.test(value));
}
