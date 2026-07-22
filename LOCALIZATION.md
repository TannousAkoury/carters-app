# Mobile app localization

## Current architecture

- Framework: Expo SDK 54, React Native 0.81, Expo Router 6, TypeScript.
- State: React Context. Localization follows that convention with `LocalizationProvider`.
- Static copy: typed, flat keys in `localization/en.ts`, `ar.ts`, `fr.ts`, and `ro.ts`.
- First launch: `expo-localization` selects a supported device language; unsupported languages use English.
- Persistence: the chosen language is stored as `app_language` through the existing cross-platform storage adapter. It does not touch cart, account, wishlist, or navigation state.
- Formatting: text uses the selected locale. French and Romanian values use their locale format; Arabic mode deliberately keeps prices, counts, and dates in the existing `en-US` LTR presentation. Shopify remains the price source.
- Arabic layout: the root, web document, navigation, rows, cards, grids, drawers, modals, gestures, and arrows stay LTR and retain the English layout. Arabic direction is applied only to Arabic text content. Longer Arabic paragraphs may align right inside their unchanged text box.
- Mixed content: direction is selected from the actual string, so an English Shopify fallback stays LTR in Arabic mode. Prices, currency values, dates, phone numbers, emails, URLs, codes, SKUs, sizes, and measurements remain LTR.

## Shopify behavior

Every named Storefront API query and mutation receives Shopify's `@inContext(language: ...)` directive using the selected app language. Country/market, currency, inventory, variants, tax, and shipping logic are not coupled to the language.

The live store localization audit on 2026-07-22 returned only English (`EN`) as an available language and Lebanon (`LB`) as an available country. Arabic, French, and Romanian requests currently fall back to the store's default English content. The app's own interface still translates normally.

Before translated Shopify content can appear, publish Arabic, French, and Romanian in Shopify Markets and translate these resources in Shopify Admin/Translate & Adapt:

- product titles and HTML descriptions;
- collection titles and descriptions;
- menus and navigation labels managed by Shopify;
- pages, policies, blogs, and articles displayed by the app;
- translatable metafields used by banners or mobile homepage content;
- checkout/system wording supported by the published Shopify market languages.

Do not put those values in the app translation files and do not duplicate products. Brand names, SKUs, option values that are technical references, discount codes, URLs, email addresses, and phone numbers remain unchanged.

## Files

Foundation:

- `components/localization-context.tsx`
- `components/language-selector.tsx`
- `services/locale.ts`
- `localization/en.ts`, `ar.ts`, `fr.ts`, `ro.ts`
- `app/_layout.tsx`, `app.json`, `package.json`

Localized UI and Shopify integration:

- `services/shopify.ts`
- `app/(tabs)/index.tsx`
- `app/collection/[handle].tsx`
- `app/product/[handle].tsx`
- `app/search.tsx`
- `app/cart.tsx`
- `app/wishlist.tsx`
- `app/notifications.tsx`
- `app/account.tsx`
- navigation, notification, currency, app-gate, and WhatsApp components under `components/`

## Adding another language

1. Add its code to `AppLocale`, `SUPPORTED_LOCALES`, `LOCALE_TAGS`, and `SHOPIFY_LANGUAGE_CODES` in `services/locale.ts`.
2. Copy `localization/en.ts` into a new locale file and translate the values, preserving placeholders such as `{count}`.
3. Add the resource to `translations` in `components/localization-context.tsx`.
4. Add its native language label to `components/language-selector.tsx` and to every translation resource.
5. Publish and translate the same language in Shopify Markets.
6. Run `npx tsc --noEmit` and `npm run lint`. The `Record<TranslationKey, string>` type makes missing keys a compile error.

## Test checklist

- [ ] Fresh install follows supported device language and otherwise uses English.
- [ ] EN → AR → FR → RO → EN changes visible app copy without a restart.
- [ ] Relaunch restores the last selected language.
- [ ] Language button and sheet are usable with screen readers and small screens.
- [ ] Header, drawer, bottom navigation, home sections, long French/Romanian labels, and Arabic wrapping do not clip.
- [ ] Arabic uses the exact English component order: header buttons, back arrows, menus, filters, tabs, forms, cards, grids, drawers, modals, and transitions are not mirrored.
- [ ] Long Arabic descriptions wrap and align naturally inside the original text bounds.
- [ ] English Shopify fallbacks, prices, dates, phone numbers, emails, URLs, codes, SKUs, sizes, and measurements remain LTR.
- [ ] Home, search, collections, filters, products, options, size chart, wishlist, and empty/error states work in every language.
- [ ] Adding/removing cart lines and checkout work; currency values still come from Shopify.
- [ ] Login, registration, password reset, profile, addresses, rewards, orders, and localized dates work.
- [ ] Notifications, app maintenance/update gates, accessibility labels, and WhatsApp remain functional.
- [ ] Switching language preserves cart ID, customer token, wishlist, current route, and selected currency.
- [ ] Missing Shopify translations fall back to English without showing raw translation keys.
- [ ] Offline/API failures show a usable localized fallback and do not loop requests.
- [ ] Development logs show no localization, rendering, or duplicate-request warnings.
- [ ] Checkout language is verified again after all four languages are published in Shopify.

## Risks and human review

- Shopify dynamic content cannot become translated until the languages and translations are published in Shopify. Checkout locale behavior is also controlled by Shopify support and market configuration.
- Promotional artwork can contain baked-in English text; replace it with localized artwork or text-layer content in Shopify/Admin when required.
- Shopify/admin-generated reward transaction notes and push campaign bodies are dynamic content. Their authors or source systems must provide localized variants.
- Arabic, French, and Romanian marketing language should receive native-speaker review before production publishing.
- Arabic business wording that still requires merchant review: promotional campaign copy, pickup/delivery promises, payment-provider terminology, loyalty program terms, and any text baked into banner artwork.
- Check the fixed-LTR Arabic layout in a development build and Expo Go on both an Arabic-device locale and an English-device locale.

## Rollback

For a complete localization rollback, revert the files listed above and remove `expo-localization` from `package.json`, the lockfile, and the app plugin list. For only the fixed-layout Arabic adjustment, revert the most recent Arabic-direction edits in the localization context and affected screens. Shopify data, translations, credentials, carts, customers, orders, and products are never written or migrated by this implementation, so no Shopify rollback is required.
