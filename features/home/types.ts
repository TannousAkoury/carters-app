import type { ImageSourcePropType } from 'react-native';

export type HeroBannerItem = { id: string; title: string; subtitle: string; description?: string; categories?: string[]; features?: string[]; cta: string; bg: string; softColor: string; accentColor: string; image: string; fullWidth?: boolean; handle?: string; url?: string };
export type AgeCategory = { id: string; label: string; sub: string; bg: string; image: string; handle: string };
export type ShopCategory = { id: string; label: string; eyebrow?: string; subtitle?: string; cta?: string; image: string; bg: string; handle: string };
export type ExploreStyle = { id: string; label: string; image: string | ImageSourcePropType; handle: string; accentColor: string };
export type TinyEssential = { id: string; title: string; image: string; handle: string; accentColor: string };
export type OurBrand = { id: string; label: string; logoText: string; tagline: string; handle: string; image: string; bg: string; color: string };
export type HomeProduct = { id: string; title: string; price: string; oldPrice: string | null; image: string; wishlist: boolean; tag: 'NEW' | 'SALE' | null; handle?: string };
export type PromoFeature = { id: string; title: string; text?: string };
