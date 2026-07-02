import { createStorefrontApiClient } from "@shopify/storefront-api-client";
import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra;

const STORE_DOMAIN = extra?.SHOPIFY_DOMAIN;
const API_VERSION = extra?.SHOPIFY_API_VERSION ?? "2025-10";
const STOREFRONT_TOKEN = extra?.SHOPIFY_TOKEN;
const PUBLIC_SITE_URL =
  extra?.SHOPIFY_PUBLIC_SITE_URL ??
  extra?.SHOPIFY_SITE_URL ??
  "https://carters.com.lb";

export const shopifyClient = createStorefrontApiClient({
  storeDomain: STORE_DOMAIN,
  apiVersion: API_VERSION,
  publicAccessToken: STOREFRONT_TOKEN,
});

export type ShopifyMoney = {
  amount: string;
  currencyCode: string;
};

export type ShopifyCollectionSummary = {
  id: string;
  title: string;
  handle: string;
  description?: string | null;
  image?: {
    url?: string | null;
    altText?: string | null;
  } | null;
};

export type ShopifyCollectionDetails = ShopifyCollectionSummary & {
  bannerImage?: string;
  bannerVideo?: string;
  bannerVideoPoster?: string;
};

export type ShopifyProductSummary = {
  id: string;
  title: string;
  handle: string;
  availableForSale?: boolean;
  vendor?: string;
  variants?: { edges?: { node: { availableForSale?: boolean; selectedOptions?: { name: string; value: string }[] } }[] };
  featuredImage?: {
    url?: string | null;
    altText?: string | null;
  } | null;
  priceRange?: {
    minVariantPrice?: ShopifyMoney | null;
    maxVariantPrice?: ShopifyMoney | null;
  } | null;
  compareAtPriceRange?: {
    minVariantPrice?: ShopifyMoney | null;
  } | null;
};

export type HomepageHeroBanner = {
  id: string;
  title: string;
  subtitle: string;
  description?: string;
  categories?: string[];
  features?: string[];
  cta: string;
  bg: string;
  softColor: string;
  accentColor: string;
  image: string;
  fullWidth?: boolean;
  handle?: string;
  url?: string;
};

export type HomepageAgeCategory = {
  id: string;
  label: string;
  sub: string;
  bg: string;
  image: string;
  handle: string;
  url?: string;
};

export type HomepageShopCategory = {
  id: string;
  label: string;
  eyebrow?: string;
  subtitle?: string;
  cta?: string;
  image: string;
  bg: string;
  handle: string;
  url?: string;
};

export type HomepageExploreStyle = {
  id: string;
  label: string;
  image: string;
  handle: string;
  accentColor: string;
  url?: string;
};

export type HomepageTinyEssential = {
  id: string;
  title: string;
  image: string;
  handle: string;
  accentColor: string;
  url?: string;
};

export type HomepageBrand = {
  id: string;
  label: string;
  logoText: string;
  tagline: string;
  handle: string;
  image: string;
  bg: string;
  color: string;
  url?: string;
};

export type HomepageProduct = {
  id: string;
  title: string;
  price: string;
  oldPrice: string | null;
  image: string;
  wishlist: boolean;
  tag: "NEW" | "SALE" | null;
  handle?: string;
  availableForSale?: boolean;
  brand?: string;
  sizes?: string[];
  minPrice?: number;
  maxPrice?: number;
};

export type ProductVariant = {
  id: string;
  title: string;
  availableForSale: boolean;
  price: string;
  selectedOptions: { name: string; value: string }[];
};

export type ProductDetails = {
  id: string;
  title: string;
  description: string;
  handle: string;
  image: string;
  variants: ProductVariant[];
};

export type ShopifyCustomer = {
  id: string;
  displayName: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  numberOfOrders: string;
};

export async function createShopifyCustomer(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}) {
  const mutation = `
    mutation createCustomer($input: CustomerCreateInput!) {
      customerCreate(input: $input) {
        customer { id firstName lastName email }
        customerUserErrors { field message code }
      }
    }
  `;
  const data = await requestStorefront<any>(mutation, { input });
  const errors = data?.customerCreate?.customerUserErrors ?? [];
  if (errors.length) throw new Error(errors.map((error: any) => error.message).join("\n"));
  if (!data?.customerCreate?.customer) throw new Error("Shopify could not create the account.");
  return data.customerCreate.customer;
}

export async function signInShopifyCustomer(email: string, password: string) {
  const mutation = `
    mutation signInCustomer($input: CustomerAccessTokenCreateInput!) {
      customerAccessTokenCreate(input: $input) {
        customerAccessToken { accessToken expiresAt }
        customerUserErrors { field message code }
      }
    }
  `;
  const data = await requestStorefront<any>(mutation, { input: { email, password } });
  const errors = data?.customerAccessTokenCreate?.customerUserErrors ?? [];
  if (errors.length) throw new Error(errors.map((error: any) => error.message).join("\n"));
  const token = data?.customerAccessTokenCreate?.customerAccessToken;
  if (!token) throw new Error("Unable to sign in to Shopify.");
  return token as { accessToken: string; expiresAt: string };
}

export async function recoverShopifyCustomer(email: string) {
  const mutation = `
    mutation recoverCustomer($email: String!) {
      customerRecover(email: $email) {
        customerUserErrors { field message code }
      }
    }
  `;
  const data = await requestStorefront<any>(mutation, { email });
  const errors = data?.customerRecover?.customerUserErrors ?? [];
  if (errors.length) throw new Error(errors.map((error: any) => error.message).join("\n"));
}

export async function getShopifyCustomer(customerAccessToken: string): Promise<ShopifyCustomer | null> {
  const query = `
    query getCustomer($customerAccessToken: String!) {
      customer(customerAccessToken: $customerAccessToken) {
        id displayName firstName lastName email phone numberOfOrders
      }
    }
  `;
  const data = await requestStorefront<any>(query, { customerAccessToken });
  return data?.customer ?? null;
}

export type HomepagePromoItem = {
  id: string;
  title: string;
  text: string;
};

export type HomepageContent = {
  source: "shopify-admin" | "website-sync" | "storefront-api";
  heroBanners: HomepageHeroBanner[];
  promoItems: HomepagePromoItem[];
  ageGroups: HomepageAgeCategory[];
  shopCategories: HomepageShopCategory[];
  exploreStyles: HomepageExploreStyle[];
  tinyEssentials: HomepageTinyEssential[];
  ourBrands: HomepageBrand[];
  topPicksProducts: HomepageProduct[];
  latestCollectionProducts: HomepageProduct[];
};

export type StorefrontMenuItem = {
  id: string;
  title: string;
  url: string;
  handle?: string;
  image?: string;
  items: StorefrontMenuItem[];
};

export async function getStorefrontNavigation(): Promise<StorefrontMenuItem[]> {
  const query = `
    query getMainMenu {
      menu(handle: "main-menu") {
        items {
          id title url
          resource { ... on Collection { handle } }
          items {
            id title url
            resource { ... on Collection { handle } }
            items {
              id title url
              resource { ... on Collection { handle } }
            }
          }
        }
      }
    }
  `;
  try {
    const data = await requestStorefront<any>(query);
    const mapItem = (item: any): StorefrontMenuItem => ({
      id: item.id,
      title: item.title,
      url: item.url ?? "",
      handle: item.resource?.handle,
      items: (item.items ?? []).map(mapItem),
    });
    const rawItems: StorefrontMenuItem[] = (data?.menu?.items ?? []).map(mapItem);
    const take = (title: string, handle: string): StorefrontMenuItem => {
      const item = rawItems.find((entry) => entry.title.trim().toLowerCase() === title.toLowerCase());
      return item
        ? { ...item, handle, url: `${PUBLIC_SITE_URL}/collections/${handle}` }
        : {
            id: `fallback-${handle}`,
            title,
            handle,
            url: `${PUBLIC_SITE_URL}/collections/${handle}`,
            items: [],
          };
    };
    const groupedItems: StorefrontMenuItem[] = [
      {
        id: "theme-baby",
        title: "Baby",
        url: "",
        items: [take("Baby Girl", "bg"), take("Baby Boy", "baby-boy")],
      },
      {
        id: "theme-toddler",
        title: "Toddler",
        url: "",
        items: [take("Toddler Girl", "toddler-girl"), take("Toddler Boy", "toddler-boy")],
      },
      {
        id: "theme-kid",
        title: "Kid",
        url: "",
        items: [take("Girl", "kid-girl"), take("Boy", "kid-boy")],
      },
    ];
    const items = groupedItems;
    const themeItems: StorefrontMenuItem[] = [
      {
        id: "theme-little-planet",
        title: "Little Planet",
        url: `${PUBLIC_SITE_URL}/collections/little-planet`,
        handle: "little-planet",
        image: "https://cdn.shopify.com/s/files/1/0112/1327/5202/files/little_planet_by_carters.svg?v=1742205921",
        items: [],
      },
      {
        id: "theme-purelysoft",
        title: "PurelySoft",
        url: `${PUBLIC_SITE_URL}/collections/purelysoft-collection`,
        handle: "purelysoft-collection",
        image: "https://cdn.shopify.com/s/files/1/0112/1327/5202/files/PurelySoft_RGB_431C.png?v=1744274342",
        items: [],
      },
      {
        id: "theme-special-prices",
        title: "Special Prices",
        url: `${PUBLIC_SITE_URL}/collections/special-prices`,
        handle: "special-prices",
        items: [],
      },
    ];
    for (const themeItem of themeItems) {
      const existing = items.find((item) =>
        item.handle === themeItem.handle || item.url.includes(new URL(themeItem.url).pathname),
      );
      if (existing) Object.assign(existing, { image: themeItem.image, title: themeItem.title });
      else items.push(themeItem);
    }
    return items;
  } catch (error) {
    console.warn("Unable to load Shopify navigation:", error);
    return [];
  }
}

const COLORS = {
  blue: "#4b7fb9",
  blueMid: "#6C98C8",
  blueLight: "#D9E7EA",
  pinkAccent: "#E0938E",
  orange: "#F6B99F",
  offWhite: "#FFF8F1",
  textDark: "#0B1E42",
  sale: "#D65A50",
};

const PLACEHOLDER_IMAGE = "https://via.placeholder.com/400x400?text=Image";
const CATEGORY_BG_COLORS = [
  "#FBE4E1",
  "#EAF3F4",
  "#FFF3EF",
  "#E8F4F4",
  "#F0E9FF",
  "#FFF6E5",
];
const ACCENT_COLORS = [
  COLORS.blueMid,
  COLORS.pinkAccent,
  COLORS.orange,
  COLORS.blue,
  COLORS.pinkAccent,
  COLORS.orange,
  COLORS.sale,
];

const STOREFRONT_FALLBACK = {
  heroHandle: "new-collection-ss26",
  heroText: {
    title: "New Arrival",
    subtitle: "Spring summer season",
    description: "Adorable looks for every moment.",
    cta: "SHOP NEW ARRIVAL",
    categories: ["BABY", "TODDLER", "KIDS"],
    features: ["SOFT & COMFY", "SAFE & GENTLE", "MADE WITH LOVE"],
  },
  promoItems: [
    {
      id: "promo-delivery",
      title: "Fast delivery",
      text: "Quick delivery across Lebanon",
    },
    {
      id: "promo-pickup",
      title: "Pickup in Dora branch",
      text: "Visit our Dora branch for instant pickup",
    },
    {
      id: "promo-payment",
      title: "All Visa cards accepted",
      text: "Pay securely online with your Visa card",
    },
  ],
  ageGroups: [
    { handle: "bg", sub: "NB-24M" },
    { handle: "baby-boy", sub: "NB-24M" },
    { handle: "toddler-girl", sub: "2T-4T" },
    { handle: "toddler-boy", sub: "2T-4T" },
    { handle: "kid-girl", sub: "4-8" },
    { handle: "kid-boy", sub: "4-8" },
  ],
  shopCategories: [
    {
      handle: "sets",
      subtitle: "Easy matching looks made for everyday comfort.",
    },
    { handle: "pajamas", subtitle: "Soft sleepwear for cozy nights." },
    { handle: "bottoms", subtitle: "Comfy pants, shorts, and leggings." },
    { handle: "sleep-play", subtitle: "One-piece favorites for sleep and play." },
    { handle: "jackets", subtitle: "Layer-ready styles for every outing." },
    { handle: "tops", subtitle: "Everyday tees, shirts, and outfit starters." },
    {
      handle: "underwear-socks",
      subtitle: "Little essentials for every drawer.",
    },
    { handle: "bodysuits", subtitle: "Soft baby basics for every day." },
    { handle: "dresses", subtitle: "Sweet dresses and dressy favorites." },
    { handle: "swimwear", subtitle: "Sunny-day swim styles for kids." },
    { handle: "sunglasses", subtitle: "Playful finishing touches." },
  ],
  exploreStyles: [
    "sleep-play",
    "bodysuits",
    "dresses-rompers",
    "jeans-1",
    "shorts",
    "swim",
    "special-prices",
  ],
  tinyEssentials: [
    "newborn-essentials-baby-girl",
    "baby-neutrals",
    "newborn-essentials-baby-boy",
  ],
  brands: ["carters", "oshkosh-1", "little-planet", "purelysoft-collection"],
};

const WEBSITE_SECTION_IMAGES: Record<string, string> = {
  "new-collection-ss26":
    "https://carters.com.lb/cdn/shop/files/ConvertOut-Resized-carters_-_30_website_banner_1.jpg?v=1782805882",

  bg: "https://carters.com.lb/cdn/shop/files/baby_g_1.jpg?v=1775640362",
  "baby-boy":
    "https://carters.com.lb/cdn/shop/files/b_aby_b_1.jpg?v=1775640444",
  "toddler-girl":
    "https://carters.com.lb/cdn/shop/files/CAR_SPR26_RetroSport_Trend_04_03808_E_1.jpg?v=1775640699",
  "toddler-boy":
    "https://carters.com.lb/cdn/shop/files/CAR_SPR26_RetroSport_Trend_01_00027_E_1.jpg?v=1775640778",
  "kid-girl":
    "https://carters.com.lb/cdn/shop/files/CAR_SPR26_SuperSoft_Trend_02_02097_E_1.jpg?v=1775640980",
  "kid-boy":
    "https://carters.com.lb/cdn/shop/files/CAR_SPR26_Coastal_Trend_03_03601_E_1.jpg?v=1775641054",

  sets: "https://carters.com.lb/cdn/shop/files/26_SPR_CAR_Essentials_2_E_ALT1.jpg?v=1775744051",
  pajamas:
    "https://carters.com.lb/cdn/shop/files/26_SPR_CAR_DealPods4_5_E.jpg?v=1775744725",
  bottoms:
    "https://carters.com.lb/cdn/shop/files/26_SPR_CAR_50OffESS_1_1_E_1.jpg?v=1775824353",
  "sleep-play":
    "https://carters.com.lb/cdn/shop/files/sleep_play_1d7d8955-b9fd-46a0-89e2-6f49f3d48e4e.jpg?v=1775723006",
  jackets:
    "https://carters.com.lb/cdn/shop/files/26_SPR_OKB_ModernHeritage1_4_E.jpg?v=1775824476",
  tops: "https://carters.com.lb/cdn/shop/files/26_SPR_CAR_SpringStoriesP2_2_E.jpg?v=1775745399",
  "underwear-socks":
    "https://carters.com.lb/cdn/shop/files/3T729210_1.webp?v=1775745586",
  bodysuits:
    "https://carters.com.lb/cdn/shop/files/26_SPR_LP_SpringStoriesP3_3_E.jpg?v=1775824592",
  dresses:
    "https://carters.com.lb/cdn/shop/files/26_SPR_LP_SpringStoriesP1_18_E.jpg?v=1775745034",
  swimwear:
    "https://carters.com.lb/cdn/shop/files/26_SPR_LP_SpringStoriesP1_15_E.jpg?v=1775825891",
  sunglasses:
    "https://carters.com.lb/cdn/shop/files/26_SPR_CAR_SpringStyleStories_7_2_E.jpg?v=1775745365",

  "dresses-rompers":
    "https://carters.com.lb/cdn/shop/files/26_SPR_CAR_DealPods4_2_E.jpg?v=1775648189",
  "jeans-1": "https://carters.com.lb/cdn/shop/files/jeans_1.jpg?v=1775649977",
  shorts:
    "https://carters.com.lb/cdn/shop/files/26_SPR_CAR_DealsPod1_3_E.jpg?v=1775648981",
  swim: "https://carters.com.lb/cdn/shop/files/26_SPR_CAR_SpringStories_6_E.jpg?v=1775647279",
  "special-prices":
    "https://carters.com.lb/cdn/shop/files/ChatGPT_Image_Apr_9_2026_11_31_57_AM.png?v=1775723527",

  "newborn-essentials-baby-girl":
    "https://carters.com.lb/cdn/shop/files/25_SUM_CAR_CAN_MFL_2_E_1.jpg?v=1775741519",
  "baby-neutrals":
    "https://carters.com.lb/cdn/shop/files/25_SUM_CAR_CAN_MFL_3_E_1.jpg?v=1775650949",
  "newborn-essentials-baby-boy":
    "https://carters.com.lb/cdn/shop/files/25_SUM_CAR_CAN_MFL_1_E_1.jpg?v=1775651597",

  carters:
    "https://carters.com.lb/cdn/shop/files/carters_201a42bd-60e9-4cdf-83d1-b7a442d6371f.jpg?v=1775641446",
  "oshkosh-1":
    "https://carters.com.lb/cdn/shop/files/OK_SPR26_WBO_01_074_M_1.jpg?v=1775641314",
  "little-planet": "https://carters.com.lb/cdn/shop/files/lp.jpg?v=1775641127",
  "purelysoft-collection":
    "https://carters.com.lb/cdn/shop/files/ps.jpg?v=1775641210",
};

const MOBILE_HOMEPAGE_QUERY = `
  query getMobileHomepage {
    shop {
      metafield(namespace: "mobile", key: "homepage") {
        type
        value
        reference {
          __typename
          ... on Metaobject {
            id
            handle
            type
            fields {
              key
              type
              value
            }
          }
        }
      }
    }
    metaobjects(type: "mobile_homepage", first: 1) {
      edges {
        node {
          id
          handle
          type
          fields {
            key
            type
            value
          }
        }
      }
    }
  }
`;

const COLLECTION_PRODUCTS_QUERY = `
  query getCollectionProducts($handle: String!, $first: Int!, $after: String) {
    collection(handle: $handle) {
      id
      title
      handle
      products(first: $first, after: $after) {
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node {
            id
            title
            handle
            availableForSale
            vendor
            variants(first: 50) { edges { node { availableForSale selectedOptions { name value } } } }
            featuredImage {
              url
              altText
            }
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
              maxVariantPrice {
                amount
                currencyCode
              }
            }
            compareAtPriceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
  }
`;

const COLLECTION_BY_HANDLE_QUERY = `
  query getCollectionByHandle($handle: String!, $productsFirst: Int!) {
    collection(handle: $handle) {
      id
      title
      handle
      description
      image {
        url
        altText
      }
      heroTitle: metafield(namespace: "mobile", key: "hero_title") {
        value
      }
      heroSubtitle: metafield(namespace: "mobile", key: "hero_subtitle") {
        value
      }
      heroDescription: metafield(namespace: "mobile", key: "hero_description") {
        value
      }
      heroCta: metafield(namespace: "mobile", key: "hero_cta") {
        value
      }
      heroCategories: metafield(namespace: "mobile", key: "hero_categories") {
        value
      }
      heroFeatures: metafield(namespace: "mobile", key: "hero_features") {
        value
      }
      products(first: $productsFirst) {
        edges {
          node {
            id
            title
            handle
            availableForSale
            featuredImage {
              url
              altText
            }
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
              maxVariantPrice {
                amount
                currencyCode
              }
            }
            compareAtPriceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
  }
`;

const COLLECTIONS_QUERY = `
  query getCollections {
    collections(first: 100) {
      edges {
        node {
          id
          title
          handle
          description
          image {
            url
            altText
          }
        }
      }
    }
  }
`;

function decodeHtml(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value = "") {
  return decodeHtml(value.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " "));
}

function normalizeUrl(url?: string | null) {
  if (!url) return "";
  const decoded = decodeHtml(url);

  if (decoded.startsWith("//")) return `https:${decoded}`;
  if (decoded.startsWith("/")) return `${PUBLIC_SITE_URL.replace(/\/$/, "")}${decoded}`;

  return decoded;
}

function optimizeShopifyImage(url?: string | null, width = 900) {
  const normalized = normalizeUrl(url);

  if (!normalized) return PLACEHOLDER_IMAGE;
  if (!normalized.includes("cdn/shop") && !normalized.includes("cdn.shopify.com")) {
    return normalized;
  }

  const [base, query = ""] = normalized.split("?");
  const params = new URLSearchParams(query.replace(/&amp;/g, "&"));
  params.set("width", String(width));

  return `${base}?${params.toString()}`;
}

function handleFromUrl(url?: string) {
  if (!url) return "";
  const match = normalizeUrl(url).match(/\/(?:collections|products)\/([^/?#]+)/);
  return match?.[1] ?? "";
}

function sectionByMarker(html: string, marker: string) {
  const start = html.indexOf(marker);
  if (start < 0) return "";

  const next = html.indexOf('id="shopify-section-', start + marker.length);
  return html.slice(start, next > start ? next : undefined);
}

function matchFirst(source: string, pattern: RegExp) {
  return source.match(pattern)?.[1] ?? "";
}

function extractImage(source: string) {
  return matchFirst(source, /<img[^>]+src=["']([^"']+)["'][^>]*>/i);
}

function splitList(value?: string) {
  if (!value) return [];

  return value
    .split(/[\n,|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseAnchorBlocks(section: string, className: string) {
  const blocks: { href: string; html: string }[] = [];
  const re = new RegExp(
    `<a\\b(?=[^>]*class=["'][^"']*${className}[^"']*["'])[^>]*href=["']([^"']+)["'][^>]*>([\\s\\S]*?)<\\/a>`,
    "gi",
  );

  let match: RegExpExecArray | null;
  while ((match = re.exec(section))) {
    blocks.push({ href: normalizeUrl(match[1]), html: match[2] });
  }

  return blocks;
}

function parseHero(html: string): HomepageHeroBanner[] {
  const section = sectionByMarker(html, "carters-hero-split");
  if (!section) {
    const bannerSection = sectionByMarker(html, "__banner_image_");
    const image = extractImage(bannerSection);

    if (!image) return [];

    const url = normalizeUrl(matchFirst(bannerSection, /<a[^>]+href=["']([^"']+)["']/i));

    return [
      {
        id: "shopify-banner-1",
        title: "",
        subtitle: "",
        cta: "",
        bg: COLORS.offWhite,
        softColor: COLORS.offWhite,
        accentColor: COLORS.blue,
        image: optimizeShopifyImage(image, 1920),
        fullWidth: true,
        handle: handleFromUrl(url),
        url,
      },
    ];
  }

  const url = normalizeUrl(
    matchFirst(section, /carters-hero-split__btn["'][^>]*href=["']([^"']+)["']/i),
  );
  const title = stripTags(
    matchFirst(section, /class=["']title-bottom["'][^>]*>([\s\S]*?)<\/span>/i),
  );
  const categoriesHtml = matchFirst(
    section,
    /carters-hero-split__cats["'][^>]*>([\s\S]*?)<\/div>/i,
  );
  const featuresHtml = matchFirst(
    section,
    /carters-hero-split__features["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>/i,
  );

  if (!title) return [];

  return [
    {
      id: "hero-1",
      title,
      subtitle: stripTags(
        matchFirst(section, /carters-hero-split__tag["'][^>]*>([\s\S]*?)<\/div>/i),
      ),
      description: stripTags(
        matchFirst(section, /carters-hero-split__desc["'][^>]*>([\s\S]*?)<\/div>/i),
      ),
      categories: [...categoriesHtml.matchAll(/<span[^>]*>([\s\S]*?)<\/span>/gi)].map(
        (match) => stripTags(match[1]),
      ),
      features: [...featuresHtml.matchAll(/<span>([^<]+)<\/span>\s*<\/div>/gi)].map(
        (match) => stripTags(match[1]),
      ),
      cta:
        stripTags(matchFirst(section, /class=["']btn-text["'][^>]*>([\s\S]*?)<\/span>/i)) ||
        "Shop Now",
      bg: COLORS.offWhite,
      softColor: "rgba(217, 231, 234, 0.78)",
      accentColor: COLORS.blue,
      image: optimizeShopifyImage(extractImage(section), 900),
      handle: handleFromUrl(url),
      url,
    },
  ];
}

function parsePromoItems(html: string): HomepagePromoItem[] {
  const section = sectionByMarker(html, "mc-feature-row");
  const items: HomepagePromoItem[] = [];
  const re =
    /<div\b(?=[^>]*class=["'][^"']*mc-feature-card[^"']*["'])[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/gi;

  let match: RegExpExecArray | null;
  while ((match = re.exec(section))) {
    items.push({
      id: `promo-${items.length + 1}`,
      title: stripTags(match[1]),
      text: stripTags(match[2]),
    });
  }

  return items.filter((item) => item.title);
}

function parseAgeGroups(html: string): HomepageAgeCategory[] {
  const section = sectionByMarker(html, "category-circle-grid");

  return parseAnchorBlocks(section, "category-circle-grid__item")
    .map((block, index) => {
      const titleHtml = matchFirst(
        block.html,
        /category-circle-grid__title["'][^>]*>([\s\S]*?)<\/div>/i,
      );
      const [label, sub = ""] = titleHtml
        .replace(/<br\s*\/?>/gi, "|")
        .split("|")
        .map(stripTags);

      return {
        id: handleFromUrl(block.href) || `age-${index + 1}`,
        label,
        sub,
        bg: CATEGORY_BG_COLORS[index % CATEGORY_BG_COLORS.length],
        image: optimizeShopifyImage(extractImage(block.html), 500),
        handle: handleFromUrl(block.href),
        url: block.href,
      };
    })
    .filter((item) => item.label && item.handle);
}

function parseShopCategories(html: string): HomepageShopCategory[] {
  const section = sectionByMarker(html, "shop-by-category-cards");

  return parseAnchorBlocks(section, "shop-by-category-cards__card")
    .map((block, index) => ({
      id: handleFromUrl(block.href) || `category-${index + 1}`,
      label:
        stripTags(
          matchFirst(block.html, /shop-by-category-cards__name["'][^>]*>([\s\S]*?)<\/span>/i),
        ) || stripTags(matchFirst(block.html, /alt=["']([^"']*)["']/i)),
      eyebrow: index === 0 ? "Featured category" : "Shop category",
      subtitle: "Easy matching looks made for everyday comfort.",
      cta: "Shop",
      image: optimizeShopifyImage(extractImage(block.html), 700),
      bg: CATEGORY_BG_COLORS[index % CATEGORY_BG_COLORS.length],
      handle: handleFromUrl(block.href),
      url: block.href,
    }))
    .filter((item) => item.label && item.handle);
}

function parseExploreStyles(html: string): HomepageExploreStyle[] {
  const section = sectionByMarker(html, "deals-for-you-section");
  const items: HomepageExploreStyle[] = [];
  const re =
    /<div\b(?=[^>]*class=["'][^"']*deals-for-you-card[^"']*["'])[^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*>[\s\S]*?<a\b(?=[^>]*class=["'][^"']*deals-for-you-button[^"']*["'])[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let match: RegExpExecArray | null;
  while ((match = re.exec(section))) {
    const href = normalizeUrl(match[3]);
    const index = items.length;

    items.push({
      id: handleFromUrl(href) || `style-${index + 1}`,
      label: stripTags(match[4]) || stripTags(match[2]),
      image: optimizeShopifyImage(match[1], 700),
      handle: handleFromUrl(href),
      accentColor: ACCENT_COLORS[index % ACCENT_COLORS.length],
      url: href,
    });
  }

  return items.filter((item) => item.label && item.handle);
}

function parseTinyEssentials(html: string): HomepageTinyEssential[] {
  const section = sectionByMarker(html, "new-trending-three-images");
  const items: HomepageTinyEssential[] = [];
  const re =
    /<div\b(?=[^>]*class=["'][^"']*new-trending-three-images__card[^"']*["'])[^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*>[\s\S]*?<h3[^>]*class=["'][^"']*new-trending-three-images__title[^"']*["'][^>]*>([\s\S]*?)<\/h3>[\s\S]*?<a[^>]+href=["']([^"']+)["'][^>]*>/gi;

  let match: RegExpExecArray | null;
  while ((match = re.exec(section))) {
    const href = normalizeUrl(match[4]);
    const index = items.length;

    items.push({
      id: handleFromUrl(href) || `tiny-${index + 1}`,
      title: stripTags(match[3]) || stripTags(match[2]),
      image: optimizeShopifyImage(match[1], 900),
      handle: handleFromUrl(href),
      accentColor: ACCENT_COLORS[index % ACCENT_COLORS.length],
      url: href,
    });
  }

  return items.filter((item) => item.title && item.handle);
}

function parseBrands(html: string): HomepageBrand[] {
  const section = sectionByMarker(html, "brands-showcase-section");

  return parseAnchorBlocks(section, "brand-card")
    .map((block, index) => {
      const label =
        stripTags(matchFirst(block.html, /brand-card-vertical-text[^>]*>([\s\S]*?)<\/div>/i)) ||
        stripTags(matchFirst(block.html, /alt=["']([^"']*)["']/i));

      return {
        id: handleFromUrl(block.href) || `brand-${index + 1}`,
        label,
        logoText: label,
        tagline: "",
        handle: handleFromUrl(block.href),
        image: optimizeShopifyImage(extractImage(block.html), 900),
        bg: CATEGORY_BG_COLORS[index % CATEGORY_BG_COLORS.length],
        color: [COLORS.blue, COLORS.orange, COLORS.textDark, COLORS.pinkAccent][index % 4],
        url: block.href,
      };
    })
    .filter((item) => item.label && item.handle);
}

function parseLatestProductsFromHtml(html: string): HomepageProduct[] {
  const section = sectionByMarker(html, "carters-products-carousel");
  const products: HomepageProduct[] = [];
  const re =
    /<div\b(?=[^>]*class=["'][^"']*cpc-card[^"']*["'])[^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*>[\s\S]*?<a\b(?=[^>]*class=["'][^"']*cpc-title[^"']*["'])[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?<div[^>]+class=["'][^"']*cpc-price[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;

  let match: RegExpExecArray | null;
  while ((match = re.exec(section))) {
    const href = normalizeUrl(match[3]);
    const index = products.length;

    products.push({
      id: handleFromUrl(href) || `product-${index + 1}`,
      title: stripTags(match[4]) || stripTags(match[2]),
      price: stripTags(match[5]),
      oldPrice: null,
      image: optimizeShopifyImage(match[1], 700),
      wishlist: false,
      tag: index < 6 ? "NEW" : null,
      handle: handleFromUrl(href),
    });
  }

  return products.filter((product) => product.title && product.price);
}

function formatMoney(money?: ShopifyMoney | null) {
  if (!money?.amount || !money.currencyCode) return "";
  const amount = Number(money.amount);

  if (!Number.isFinite(amount)) return `${money.amount} ${money.currencyCode}`;

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: money.currencyCode,
    }).format(amount);
  } catch {
    return `${money.currencyCode} ${amount.toFixed(2)}`;
  }
}

function mapProduct(product: ShopifyProductSummary, index = 0): HomepageProduct {
  const price = product.priceRange?.minVariantPrice;
  const compareAt = product.compareAtPriceRange?.minVariantPrice;
  const compareAtAmount = Number(compareAt?.amount ?? 0);
  const priceAmount = Number(price?.amount ?? 0);
  const hasCompareAt = compareAtAmount > 0 && compareAtAmount > priceAmount;

  return {
    id: product.id,
    title: product.title,
    price: formatMoney(price),
    oldPrice: hasCompareAt ? formatMoney(compareAt) : null,
    image: optimizeShopifyImage(product.featuredImage?.url, 700),
    wishlist: false,
    tag: hasCompareAt ? "SALE" : index < 8 ? "NEW" : null,
    handle: product.handle,
    availableForSale: product.availableForSale,
    brand: product.vendor,
    sizes: [...new Set((product.variants?.edges ?? []).flatMap(({ node }) =>
      node.availableForSale ? (node.selectedOptions ?? []).filter((option) => option.name.toLowerCase() === "size").map((option) => option.value) : [],
    ))],
    minPrice: Number(product.priceRange?.minVariantPrice?.amount ?? 0),
    maxPrice: Number(product.priceRange?.maxVariantPrice?.amount ?? 0),
  };
}

function collectionUrl(handle: string) {
  return `${PUBLIC_SITE_URL.replace(/\/$/, "")}/collections/${handle}`;
}

function collectionProducts(collection: any) {
  return ((collection?.products?.edges ?? []) as any[]).map((edge) => edge.node);
}

function collectionMetafieldValue(collection: any, key: string) {
  return collection?.[key]?.value ? String(collection[key].value).trim() : "";
}

function collectionImage(collection: any, width = 700) {
  const firstProduct = collectionProducts(collection)[0] as ShopifyProductSummary | undefined;
  const websiteImage = WEBSITE_SECTION_IMAGES[collection?.handle];

  return optimizeShopifyImage(
    websiteImage ?? collection?.image?.url ?? firstProduct?.featuredImage?.url,
    width,
  );
}

async function getCollectionByHandle(handle: string, productsFirst = 1) {
  try {
    const data = await requestStorefront<any>(COLLECTION_BY_HANDLE_QUERY, {
      handle,
      productsFirst,
    });

    return data?.collection ?? null;
  } catch (error) {
    console.warn(`Unable to load collection ${handle}:`, error);
    return null;
  }
}

async function getCollectionsByHandles(handles: string[], productsFirst = 1) {
  const uniqueHandles = [...new Set(handles.filter(Boolean))];
  const collections = await Promise.all(
    uniqueHandles.map((handle) => getCollectionByHandle(handle, productsFirst)),
  );

  return collections.filter(Boolean);
}

async function requestStorefront<T>(query: string, variables?: Record<string, unknown>) {
  const response = await shopifyClient.request(
    query,
    variables ? { variables } : undefined,
  );

  if (response.errors) {
    throw new Error(JSON.stringify(response.errors));
  }

  return response.data as T;
}

export async function getProduct(handle: string): Promise<ProductDetails | null> {
  const query = `
    query getProduct($handle: String!) {
      product(handle: $handle) {
        id title description handle
        featuredImage { url }
        variants(first: 100) {
          edges {
            node {
              id title availableForSale
              selectedOptions { name value }
              price { amount currencyCode }
            }
          }
        }
      }
    }
  `;
  const data = await requestStorefront<any>(query, { handle });
  if (!data?.product) return null;
  return {
    id: data.product.id,
    title: data.product.title,
    description: data.product.description,
    handle: data.product.handle,
    image: optimizeShopifyImage(data.product.featuredImage?.url, 1000),
    variants: (data.product.variants?.edges ?? []).map(({ node }: any) => ({
      id: node.id,
      title: node.title,
      availableForSale: node.availableForSale,
      price: formatMoney(node.price),
      selectedOptions: node.selectedOptions ?? [],
    })),
  };
}

export async function createCheckout(variantId: string): Promise<string> {
  const mutation = `
    mutation createCart($input: CartInput!) {
      cartCreate(input: $input) {
        cart { checkoutUrl }
        userErrors { message }
      }
    }
  `;
  const data = await requestStorefront<any>(mutation, {
    input: {
      lines: [{ merchandiseId: variantId, quantity: 1 }],
      attributes: [{ key: "Order source", value: "Carter Mobile App" }],
      note: "Order placed from Carter mobile app",
    },
  });
  const error = data?.cartCreate?.userErrors?.[0]?.message;
  if (error) throw new Error(error);
  const url = data?.cartCreate?.cart?.checkoutUrl;
  if (!url) throw new Error("Checkout could not be created.");
  return url;
}

export type ShopifyCart = {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: { subtotalAmount: ShopifyMoney; totalAmount: ShopifyMoney };
  lines: { edges: { node: { id: string; quantity: number; merchandise: { id: string; title: string; product: { title: string; handle: string; featuredImage?: { url: string } | null }; price: ShopifyMoney } } }[] };
};

const CART_FIELDS = `
  id checkoutUrl totalQuantity
  cost { subtotalAmount { amount currencyCode } totalAmount { amount currencyCode } }
  lines(first: 100) { edges { node { id quantity merchandise { ... on ProductVariant { id title price { amount currencyCode } product { title handle featuredImage { url } } } } } } }
`;

export async function addToShopifyCart(cartId: string | null, variantId: string) {
  const mutation = cartId ? `mutation add($cartId: ID!, $lines: [CartLineInput!]!) { cartLinesAdd(cartId: $cartId, lines: $lines) { cart { ${CART_FIELDS} } userErrors { message } } }` : `mutation create($input: CartInput!) { cartCreate(input: $input) { cart { ${CART_FIELDS} } userErrors { message } } }`;
  const variables = cartId
    ? { cartId, lines: [{ merchandiseId: variantId, quantity: 1 }] }
    : {
        input: {
          lines: [{ merchandiseId: variantId, quantity: 1 }],
          attributes: [{ key: "Order source", value: "Carter Mobile App" }],
          note: "Order placed from Carter mobile app",
        },
      };
  const data = await requestStorefront<any>(mutation, variables);
  const payload = cartId ? data?.cartLinesAdd : data?.cartCreate;
  if (payload?.userErrors?.length) throw new Error(payload.userErrors[0].message);
  return payload?.cart as ShopifyCart;
}

export async function getShopifyCart(cartId: string) {
  const data = await requestStorefront<any>(`query cart($id: ID!) { cart(id: $id) { ${CART_FIELDS} } }`, { id: cartId });
  return (data?.cart ?? null) as ShopifyCart | null;
}

export async function updateShopifyCartLine(cartId: string, lineId: string, quantity: number) {
  const mutation = quantity > 0 ? `mutation update($cartId: ID!, $lines: [CartLineUpdateInput!]!) { cartLinesUpdate(cartId: $cartId, lines: $lines) { cart { ${CART_FIELDS} } userErrors { message } } }` : `mutation remove($cartId: ID!, $lineIds: [ID!]!) { cartLinesRemove(cartId: $cartId, lineIds: $lineIds) { cart { ${CART_FIELDS} } userErrors { message } } }`;
  const data = await requestStorefront<any>(mutation, quantity > 0 ? { cartId, lines: [{ id: lineId, quantity }] } : { cartId, lineIds: [lineId] });
  const payload = quantity > 0 ? data?.cartLinesUpdate : data?.cartLinesRemove;
  if (payload?.userErrors?.length) throw new Error(payload.userErrors[0].message);
  return payload?.cart as ShopifyCart;
}

export async function markShopifyCartAsAppOrder(cartId: string) {
  const mutation = `
    mutation markAppCart($cartId: ID!, $attributes: [AttributeInput!]!, $note: String!) {
      cartAttributesUpdate(cartId: $cartId, attributes: $attributes) { userErrors { message } }
      cartNoteUpdate(cartId: $cartId, note: $note) { userErrors { message } }
    }
  `;
  const data = await requestStorefront<any>(mutation, {
    cartId,
    attributes: [{ key: "Order source", value: "Carter Mobile App" }],
    note: "Order placed from Carter mobile app",
  });
  const errors = [
    ...(data?.cartAttributesUpdate?.userErrors ?? []),
    ...(data?.cartNoteUpdate?.userErrors ?? []),
  ];
  if (errors.length) throw new Error(errors[0].message);
}

function parseAdminPayload(data: any): HomepageContent | null {
  const metafield = data?.shop?.metafield;
  const metaobject = metafield?.reference ?? data?.metaobjects?.edges?.[0]?.node;

  const rawPayload =
    metafield?.type === "json" || metafield?.type === "json_string"
      ? metafield.value
      : metaobject?.fields?.find((field: any) =>
          ["payload", "homepage_json", "sections"].includes(field.key),
        )?.value;

  if (!rawPayload) return null;

  try {
    const payload = JSON.parse(rawPayload);

    return {
      source: "shopify-admin",
      heroBanners: payload.heroBanners ?? payload.hero ?? [],
      promoItems: payload.promoItems ?? payload.promos ?? [],
      ageGroups: payload.ageGroups ?? [],
      shopCategories: payload.shopCategories ?? payload.categories ?? [],
      exploreStyles: payload.exploreStyles ?? [],
      tinyEssentials: payload.tinyEssentials ?? [],
      ourBrands: payload.ourBrands ?? payload.brands ?? [],
      topPicksProducts: payload.topPicksProducts ?? [],
      latestCollectionProducts: payload.latestCollectionProducts ?? [],
    };
  } catch (error) {
    console.warn("Invalid mobile homepage JSON in Shopify admin:", error);
    return null;
  }
}

async function getMobileHomepageFromAdmin() {
  try {
    const data = await requestStorefront<any>(MOBILE_HOMEPAGE_QUERY);
    return parseAdminPayload(data);
  } catch (error) {
    console.info("Mobile homepage metafield unavailable; trying storefront sync.");
    return null;
  }
}

async function fetchWebsiteHomepageHtml() {
  const response = await fetch(PUBLIC_SITE_URL);

  if (!response.ok) {
    throw new Error(`Website homepage returned ${response.status}`);
  }

  return response.text();
}

async function getCollectionProducts(handle: string, first = 12) {
  if (!handle) return [];

  try {
    const data = await requestStorefront<any>(COLLECTION_PRODUCTS_QUERY, {
      handle,
      first,
      after: null,
    });

    return (data?.collection?.products?.edges ?? []).map((edge: any, index: number) =>
      mapProduct(edge.node, index),
    );
  } catch (error) {
    console.warn(`Unable to load collection products for ${handle}:`, error);
    return [];
  }
}

async function getAllCollectionProducts(handle: string) {
  if (!handle) return [];

  const products: HomepageProduct[] = [];
  let after: string | null = null;
  let hasNextPage = true;

  try {
    while (hasNextPage) {
      const data: any = await requestStorefront<any>(COLLECTION_PRODUCTS_QUERY, {
        handle,
        first: 100,
        after,
      });
      const connection: any = data?.collection?.products;
      const edges: any[] = connection?.edges ?? [];

      products.push(
        ...edges.map((edge: any, index: number) =>
          mapProduct(edge.node, products.length + index),
        ),
      );

      hasNextPage = Boolean(connection?.pageInfo?.hasNextPage);
      after = connection?.pageInfo?.endCursor ?? null;

      if (hasNextPage && !after) break;
    }

    return products;
  } catch (error) {
    console.warn(`Unable to load every product for ${handle}:`, error);
    return products;
  }
}

async function getHomepageContentFromStorefront(): Promise<HomepageContent> {
  const allHandles = [
    STOREFRONT_FALLBACK.heroHandle,
    ...STOREFRONT_FALLBACK.ageGroups.map((item) => item.handle),
    ...STOREFRONT_FALLBACK.shopCategories.map((item) => item.handle),
    ...STOREFRONT_FALLBACK.exploreStyles,
    ...STOREFRONT_FALLBACK.tinyEssentials,
    ...STOREFRONT_FALLBACK.brands,
  ];
  const collections = await getCollectionsByHandles(allHandles, 2);
  const byHandle = new Map(collections.map((collection: any) => [collection.handle, collection]));
  const heroCollection = byHandle.get(STOREFRONT_FALLBACK.heroHandle);
  const latestCollectionProducts = await getCollectionProducts(
    STOREFRONT_FALLBACK.heroHandle,
    12,
  );

  const heroBanners: HomepageHeroBanner[] = [
        {
          id: heroCollection?.id ?? "shopify-banner-fallback",
          title:
            collectionMetafieldValue(heroCollection, "heroTitle") ||
            STOREFRONT_FALLBACK.heroText.title,
          subtitle:
            collectionMetafieldValue(heroCollection, "heroSubtitle") ||
            STOREFRONT_FALLBACK.heroText.subtitle,
          description:
            collectionMetafieldValue(heroCollection, "heroDescription") ||
            STOREFRONT_FALLBACK.heroText.description,
          categories:
            splitList(collectionMetafieldValue(heroCollection, "heroCategories")).length > 0
              ? splitList(collectionMetafieldValue(heroCollection, "heroCategories"))
              : STOREFRONT_FALLBACK.heroText.categories,
          features:
            splitList(collectionMetafieldValue(heroCollection, "heroFeatures")).length > 0
              ? splitList(collectionMetafieldValue(heroCollection, "heroFeatures"))
              : STOREFRONT_FALLBACK.heroText.features,
          cta:
            collectionMetafieldValue(heroCollection, "heroCta") ||
            STOREFRONT_FALLBACK.heroText.cta,
          bg: COLORS.offWhite,
          softColor: "rgba(217, 231, 234, 0.78)",
          accentColor: COLORS.blue,
          image: heroCollection
            ? collectionImage(heroCollection, 1920)
            : optimizeShopifyImage(
                WEBSITE_SECTION_IMAGES[STOREFRONT_FALLBACK.heroHandle],
                1920,
              ),
          fullWidth: !heroCollection,
          handle: heroCollection?.handle ?? STOREFRONT_FALLBACK.heroHandle,
          url: collectionUrl(
            heroCollection?.handle ?? STOREFRONT_FALLBACK.heroHandle,
          ),
        },
      ];

  const ageGroups = STOREFRONT_FALLBACK.ageGroups
    .map((item, index) => {
      const collection = byHandle.get(item.handle);
      if (!collection) return null;

      return {
        id: collection.id,
        label: collection.title,
        sub: item.sub,
        bg: CATEGORY_BG_COLORS[index % CATEGORY_BG_COLORS.length],
        image: collectionImage(collection, 500),
        handle: collection.handle,
        url: collectionUrl(collection.handle),
      } as HomepageAgeCategory;
    })
    .filter(Boolean) as HomepageAgeCategory[];

  const shopCategories = STOREFRONT_FALLBACK.shopCategories
    .map((item, index) => {
      const collection = byHandle.get(item.handle);
      if (!collection) return null;

      return {
        id: collection.id,
        label: collection.title,
        eyebrow: index === 0 ? "Featured category" : "Shop category",
        subtitle: collection.description || item.subtitle,
        cta: "Shop",
        image: collectionImage(collection, 700),
        bg: CATEGORY_BG_COLORS[index % CATEGORY_BG_COLORS.length],
        handle: collection.handle,
        url: collectionUrl(collection.handle),
      } as HomepageShopCategory;
    })
    .filter(Boolean) as HomepageShopCategory[];

  const exploreStyles = STOREFRONT_FALLBACK.exploreStyles
    .map((handle, index) => {
      const collection = byHandle.get(handle);
      if (!collection) return null;

      return {
        id: collection.id,
        label: collection.title,
        image: collectionImage(collection, 700),
        handle: collection.handle,
        accentColor: ACCENT_COLORS[index % ACCENT_COLORS.length],
        url: collectionUrl(collection.handle),
      } as HomepageExploreStyle;
    })
    .filter(Boolean) as HomepageExploreStyle[];

  const tinyEssentials = STOREFRONT_FALLBACK.tinyEssentials
    .map((handle, index) => {
      const collection = byHandle.get(handle);
      if (!collection) return null;

      return {
        id: collection.id,
        title: collection.title,
        image: collectionImage(collection, 900),
        handle: collection.handle,
        accentColor: ACCENT_COLORS[index % ACCENT_COLORS.length],
        url: collectionUrl(collection.handle),
      } as HomepageTinyEssential;
    })
    .filter(Boolean) as HomepageTinyEssential[];

  const ourBrands = STOREFRONT_FALLBACK.brands
    .map((handle, index) => {
      const collection = byHandle.get(handle);
      if (!collection) return null;

      return {
        id: collection.id,
        label: collection.title,
        logoText: collection.title,
        tagline: collection.description || "",
        handle: collection.handle,
        image: collectionImage(collection, 900),
        bg: CATEGORY_BG_COLORS[index % CATEGORY_BG_COLORS.length],
        color: [COLORS.blue, COLORS.orange, COLORS.textDark, COLORS.pinkAccent][index % 4],
        url: collectionUrl(collection.handle),
      } as HomepageBrand;
    })
    .filter(Boolean) as HomepageBrand[];

  return {
    source: "storefront-api",
    heroBanners,
    promoItems: STOREFRONT_FALLBACK.promoItems,
    ageGroups,
    shopCategories,
    exploreStyles,
    tinyEssentials,
    ourBrands,
    topPicksProducts: latestCollectionProducts.slice(0, 6),
    latestCollectionProducts,
  };
}

export async function getHomepageContent(): Promise<HomepageContent> {
  const adminContent = await getMobileHomepageFromAdmin();

  try {
    const html = await fetchWebsiteHomepageHtml();
    const heroBanners = parseHero(html);

    // The storefront theme is the source of truth for the visual hero. The
    // mobile.homepage metafield can still manage the remaining app sections,
    // but a stale copy of its hero must not hide a newly published Shopify
    // banner.
    if (adminContent) {
      return {
        ...adminContent,
        heroBanners: heroBanners.length > 0 ? heroBanners : adminContent.heroBanners,
      };
    }

    const latestHandle = heroBanners[0]?.handle || STOREFRONT_FALLBACK.heroHandle;
    const latestCollectionProducts = await getCollectionProducts(latestHandle, 12);
    const parsedProducts = latestCollectionProducts.length
      ? latestCollectionProducts
      : parseLatestProductsFromHtml(html);

    return {
      source: "website-sync",
      heroBanners,
      promoItems: parsePromoItems(html),
      ageGroups: parseAgeGroups(html),
      shopCategories: parseShopCategories(html),
      exploreStyles: parseExploreStyles(html),
      tinyEssentials: parseTinyEssentials(html),
      ourBrands: parseBrands(html),
      topPicksProducts: parsedProducts.slice(0, 6),
      latestCollectionProducts: parsedProducts,
    };
  } catch (error) {
    if (adminContent) return adminContent;

    console.info("Website theme sync unavailable; using Storefront API fallback.");
    return getHomepageContentFromStorefront();
  }
}

export async function getCollections() {
  try {
    const data = await requestStorefront<any>(COLLECTIONS_QUERY);
    return (data?.collections?.edges ?? []).map(
      (edge: any) => edge.node as ShopifyCollectionSummary,
    );
  } catch (error) {
    console.error("Error fetching collections:", error);
    return [];
  }
}

export async function getCollectionDetails(handle: string): Promise<ShopifyCollectionDetails | null> {
  const query = `
    query getCollectionBanner($handle: String!) {
      collection(handle: $handle) {
        id title handle description
        image { url altText }
        mobileBanner: metafield(namespace: "custom", key: "mobile_banner") { ...BannerFields }
        appBanner: metafield(namespace: "custom", key: "app_banner") { ...BannerFields }
        banner: metafield(namespace: "custom", key: "banner") { ...BannerFields }
        bannerVideo: metafield(namespace: "custom", key: "banner_video") { ...BannerFields }
      }
    }
    fragment BannerFields on Metafield {
      reference {
        ... on MediaImage { image { url altText } }
        ... on Video {
          previewImage { url }
          sources { url mimeType width height }
        }
        ... on GenericFile { url mimeType }
      }
    }
  `;
  try {
    const [data, themeBanner] = await Promise.all([
      requestStorefront<any>(query, { handle }),
      getPublishedCollectionBanner(handle),
    ]);
    const collection = data?.collection;
    if (!collection) return null;
    const fields = [collection.mobileBanner, collection.appBanner, collection.bannerVideo, collection.banner];
    const videoReference = fields.map((field) => field?.reference).find((reference) =>
      reference?.sources?.some((source: any) => source.mimeType === "video/mp4"),
    );
    const imageReference = fields.map((field) => field?.reference).find((reference) => reference?.image?.url);
    const genericVideo = fields.map((field) => field?.reference).find((reference) => reference?.mimeType?.startsWith("video/"));
    return {
      id: collection.id,
      title: collection.title,
      handle: collection.handle,
      description: collection.description,
      image: collection.image,
      bannerImage: themeBanner.image ?? imageReference?.image?.url,
      bannerVideo: themeBanner.video ?? videoReference?.sources?.find((source: any) => source.mimeType === "video/mp4")?.url ?? genericVideo?.url,
      bannerVideoPoster: themeBanner.poster ?? videoReference?.previewImage?.url,
    };
  } catch (error) {
    console.warn(`Unable to load collection banner for ${handle}:`, error);
    return null;
  }
}

function absoluteStorefrontUrl(url?: string) {
  if (!url) return undefined;
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `${PUBLIC_SITE_URL.replace(/\/$/, "")}${url}`;
  return url;
}

async function getPublishedCollectionBanner(handle: string) {
  try {
    const response = await fetch(
      `${PUBLIC_SITE_URL.replace(/\/$/, "")}/collections/${encodeURIComponent(handle)}`,
    );
    if (!response.ok) return {} as { image?: string; video?: string; poster?: string };
    const html = await response.text();
    const mainStart = html.search(/<main\b[^>]*id=["']MainContent["']/i);
    if (mainStart < 0) return {};
    const afterMain = html.slice(mainStart);
    const gridStart = afterMain.search(/id=["']shopify-section-[^"']*product-grid[^"']*["']/i);
    const bannerHtml = gridStart >= 0 ? afterMain.slice(0, gridStart) : afterMain.slice(0, 30000);
    const video = bannerHtml.match(/<source\b[^>]*src=["']([^"']+)["'][^>]*type=["']video\/mp4["']/i)?.[1];
    const poster = bannerHtml.match(/<video\b[^>]*poster=["']([^"']+)["']/i)?.[1];
    if (video) {
      return { video: absoluteStorefrontUrl(video), poster: absoluteStorefrontUrl(poster) };
    }
    const images = [...bannerHtml.matchAll(/<img\b[^>]*(?:src|data-src)=["']([^"']+)["'][^>]*>/gi)];
    const image = images
      .map((match) => match[1])
      .find((url) => /\/cdn\/shop\/files\//i.test(url) && !/logo|icon|badge/i.test(url));
    return { image: absoluteStorefrontUrl(image) };
  } catch (error) {
    console.warn(`Unable to sync published banner for ${handle}:`, error);
    return {} as { image?: string; video?: string; poster?: string };
  }
}

export async function getProducts(collectionHandle?: string) {
  if (collectionHandle) return getAllCollectionProducts(collectionHandle);

  const query = `
    query getProducts {
      products(first: 20) {
        edges {
          node {
            id
            title
            handle
            availableForSale
            vendor
            variants(first: 50) { edges { node { availableForSale selectedOptions { name value } } } }
            featuredImage {
              url
              altText
            }
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
              maxVariantPrice {
                amount
                currencyCode
              }
            }
            compareAtPriceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
  `;

  try {
    const data = await requestStorefront<any>(query);
    return (data?.products?.edges ?? []).map((edge: any, index: number) =>
      mapProduct(edge.node, index),
    );
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}

export async function searchProducts(search: string) {
  const term = search.trim();
  if (!term) return [];
  const query = `
    query searchProducts($query: String!) {
      products(first: 50, query: $query, sortKey: RELEVANCE) {
        edges { node {
          id title handle availableForSale vendor
          variants(first: 50) { edges { node { availableForSale selectedOptions { name value } } } }
          featuredImage { url altText }
          priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
          compareAtPriceRange { minVariantPrice { amount currencyCode } }
        } }
      }
    }
  `;
  try {
    const data = await requestStorefront<any>(query, { query: term });
    return (data?.products?.edges ?? []).map((edge: any, index: number) => mapProduct(edge.node, index));
  } catch (error) {
    console.error("Unable to search products:", error);
    return [];
  }
}
