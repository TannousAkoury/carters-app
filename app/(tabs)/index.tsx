import { getHomepageContent, getStorefrontNavigation, parseMobileCustomCss, type HomepageThemeSection, type StorefrontMenuItem } from "@/services/shopify";
import { getAdminHomepageConfig, getBundledAdminHomepageConfig, type AdminSection } from "@/services/admin-content";
import { AdminSections } from "@/components/admin-sections";
import { useCart } from "@/components/cart-context";
import { useCurrency, type DisplayCurrency } from "@/components/currency-context";
import { salePercentage } from "@/utils/pricing";
import { useWishlist } from "@/components/wishlist-context";
import { useAppSettings } from "@/components/app-settings-context";
import { useNotifications } from "@/components/notification-context";
import type { AgeCategory, ExploreStyle, HeroBannerItem, HomeProduct as Product, OurBrand, PromoFeature, ShopCategory, TinyEssential } from "@/features/home/types";
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { useFocusEffect, useRouter } from "expo-router";
import { type ComponentProps, useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const DEVICE_WIDTH = Dimensions.get("window").width;
const SCREEN_W = Platform.OS === "web" ? Math.min(DEVICE_WIDTH, 480) : DEVICE_WIDTH;

const COLORS = {
  blue: "#4b7fb9",
  blueMid: "#6C98C8",
  blueLight: "#D9E7EA",
  softBlue: "#D9E7EA",
  pink: "#E0938E",
  pinkAccent: "#E0938E",
  orange: "#F6B99F",
  orangeSoft: "#FCE9DD",
  cream: "#FFF8F1",
  white: "#FFFFFF",
  offWhite: "#FFF8F1",
  card: "#FFFCF8",
  border: "#F1DED6",
  textDark: "#0B1E42",
  textMid: "#4D5668",
  textLight: "#9A8F8B",
  sale: "#D65A50",
};

const FONT = Platform.select({ ios: "System", android: "Roboto" });

function colorWithOpacity(color: string, opacity: number) {
  const match = color.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!match) return color;
  const [, r, g, b] = match;
  return `rgba(${parseInt(r, 16)},${parseInt(g, 16)},${parseInt(b, 16)},${opacity})`;
}

type IconName = ComponentProps<typeof Ionicons>["name"];
type TabId = "home" | "categories" | "shop" | "account";

type HeaderProps = {
  cartCount?: number;
  currency: DisplayCurrency;
  isScrolled: boolean;
  onCurrency?: () => void;
  onSearch?: () => void;
  onCart?: () => void;
  onWishlist?: () => void;
  onMenu?: () => void;
};

function Header({
  cartCount = 0,
  currency,
  isScrolled,
  onCurrency,
  onSearch,
  onCart,
  onWishlist,
  onMenu,
}: HeaderProps) {
  return (
    <View style={[styles.header, isScrolled && styles.headerScrolled]}>
      <View style={styles.headerMain}>
       <View style={styles.headerLeft}>
        <TouchableOpacity
          style={[
            styles.headerCircleBtn,
            !isScrolled && styles.headerCircleTransparent,
          ]}
          activeOpacity={0.75}
          onPress={onMenu}
          accessibilityRole="button"
          accessibilityLabel="Open shop menu"
        >
          <Ionicons name="menu-outline" size={24} color={COLORS.blue} />
        </TouchableOpacity>

        <Image
          source={{ uri: "https://carters.com.lb/cdn/shop/files/logo1.png?v=1707301645&width=330" }}
          style={styles.headerLogoImage}
          resizeMode="contain"
        />
       </View>

      <View style={styles.headerRight}>
        <TouchableOpacity
          style={styles.headerCurrencyBtn}
          onPress={onCurrency}
          accessibilityRole="button"
          accessibilityLabel={`Currency is ${currency}. Switch to ${currency === "USD" ? "LBP" : "USD"}`}
          activeOpacity={0.75}
        >
          <Text style={styles.headerCurrencyText}>{currency}</Text>
          <Ionicons name="swap-horizontal" size={12} color={COLORS.blue} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.headerCircleBtn,
            !isScrolled && styles.headerCircleTransparent,
          ]}
          onPress={onSearch}
          accessibilityRole="button"
          accessibilityLabel="Search products"
          activeOpacity={0.75}
        >
          <Ionicons name="search-outline" size={21} color={COLORS.blue} />
        </TouchableOpacity>

        {onWishlist ? <TouchableOpacity
          style={[
            styles.headerCircleBtn,
            !isScrolled && styles.headerCircleTransparent,
          ]}
          onPress={onWishlist}
          accessibilityRole="button"
          accessibilityLabel="Open wishlist"
          activeOpacity={0.75}
        >
          <Ionicons name="heart-outline" size={22} color={COLORS.blue} />
        </TouchableOpacity> : null}

        <TouchableOpacity
          style={[
            styles.headerCircleBtn,
            !isScrolled && styles.headerCircleTransparent,
          ]}
          onPress={onCart}
          accessibilityRole="button"
          accessibilityLabel={`Open shopping bag, ${cartCount} items`}
          activeOpacity={0.75}
        >
          <View>
            <Ionicons name="bag-outline" size={22} color={COLORS.blue} />

            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
       </View>
      </View>
    </View>
  );
}

function HeroBanner({
  items,
  onShopNow,
  customCss,
}: {
  items: HeroBannerItem[];
  onShopNow?: (banner: HeroBannerItem) => void;
  customCss?:string;
}) {
  const banner = items[0];

  if (!banner) {
    return (
      <View style={[styles.heroContainer, styles.heroLoadingContainer]}>
        <ActivityIndicator size="small" color={COLORS.blue} />
      </View>
    );
  }
  const automatic=banner.mobileStyle??{};const override=parseMobileCustomCss(customCss);const mobile={...automatic,...override};const margin=Math.max(0,mobile.marginHorizontal??0);const candidateRatio=mobile.aspectRatio??1920/863;const ratio=candidateRatio>=1&&candidateRatio<=4?candidateRatio:1920/863;const height=mobile.height??Math.min(SCREEN_W*.85,Math.max(80,(SCREEN_W-margin*2)/ratio));
  return (
    <TouchableOpacity style={[styles.shopifyHeroContainer,{width:SCREEN_W-margin*2,height,marginHorizontal:margin,paddingVertical:mobile.paddingVertical,backgroundColor:mobile.backgroundColor??COLORS.offWhite}]} activeOpacity={0.9} onPress={() => onShopNow?.(banner)}>
      <Image source={{ uri: banner.image }} style={[styles.shopifyHeroImage,{borderRadius:mobile.imageBorderRadius??0}]} resizeMode={mobile.imageFit??"contain"} />
    </TouchableOpacity>
  );
}

function SectionHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>

      {right}
    </View>
  );
}

function PromoStrip({
  items,
}: {
  items: PromoFeature[];
}) {
  const iconNames: IconName[] = [
    "rocket-outline",
    "storefront-outline",
    "card-outline",
  ];

  if (items.length === 0) return null;

  return (
    <View style={styles.promoStrip}>
      {items.map((item, index) => (
        <View key={item.id} style={styles.promoItem}>
          <View style={styles.promoIconCircle}>
            <Ionicons
              name={iconNames[index] ?? "sparkles-outline"}
              size={14}
              color={COLORS.blue}
            />
          </View>
          <Text style={styles.promoText} numberOfLines={2}>
            {item.title}
          </Text>
        </View>
      ))}
    </View>
  );
}

function HomepageStatus({
  loading,
  error,
}: {
  loading: boolean;
  error: string | null;
}) {
  if (!loading && !error) return null;

  return (
    <View style={styles.homepageStatus}>
      {loading ? (
        <ActivityIndicator size="small" color={COLORS.blue} />
      ) : (
        <Ionicons name="warning-outline" size={16} color={COLORS.sale} />
      )}

      <Text
        style={[
          styles.homepageStatusText,
          error ? styles.homepageStatusError : null,
        ]}
      >
        {loading ? "Updating storefront content..." : error}
      </Text>
    </View>
  );
}

function AgeRow({
  categories,
  onPress,
}: {
  categories: AgeCategory[];
  onPress?: (category: AgeCategory) => void;
}) {
  return (
    <View style={styles.sectionBlock}>
      <SectionHeader
        title="Shop by Age"
        subtitle="Choose the right age range"
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.ageRow}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={styles.ageItem}
            onPress={() => onPress?.(category)}
            activeOpacity={0.78}
          >
            <View style={styles.ageCircle}>
              <Image
                source={{ uri: category.image }}
                style={styles.ageImage}
                resizeMode="cover"
              />
            </View>

            <Text style={styles.ageLabel} numberOfLines={1}>
              {category.label}
            </Text>

            <Text style={styles.ageSub} numberOfLines={1}>
              {category.sub}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

function ShopifyThemeSections({sections,placement,visibility,customStyles,onOpen}:{sections:HomepageThemeSection[];placement:HomepageThemeSection["placement"];visibility:Record<string,boolean>;customStyles:Record<string,string>;onOpen:(url:string,context?:{title?:string;image?:string})=>void}){
  const visible=sections.filter(section=>section.placement===placement&&visibility[section.id]!==false);
  if(!visible.length)return null;
  return <>{visible.map(section=>{const automatic=section.mobileStyle??{};const override=parseMobileCustomCss(customStyles[section.id]);const mobile={...automatic,...override};const margin=Math.max(0,mobile.marginHorizontal??0);const candidateRatio=mobile.aspectRatio??1.55;const ratio=candidateRatio>=1&&candidateRatio<=4?candidateRatio:1.55;const imageSize={height:mobile.height??Math.min(SCREEN_W*.85,(SCREEN_W-margin*2)/ratio)};if(section.layout==="media-text"){return <View key={section.id} style={[styles.themeSection,styles.themeMediaTextSection,{marginHorizontal:margin,paddingVertical:mobile.paddingVertical??0,backgroundColor:mobile.backgroundColor}]}>
    {section.images[0]?<TouchableOpacity activeOpacity={.86} disabled={!section.url} onPress={()=>onOpen(section.url,{title:section.title,image:section.images[0].url})}><Image source={{uri:section.images[0].url}} style={[styles.themeBannerImage,imageSize,{borderRadius:mobile.imageBorderRadius??0}]} resizeMode={mobile.imageFit??"cover"}/></TouchableOpacity>:null}
    <View style={styles.themeMediaTextContent}>{section.title?<Text style={[styles.themeMediaTextTitle,{color:mobile.textColor,textAlign:mobile.textAlign??"center"}]}>{section.title}</Text>:null}{section.subtitle?<Text style={[styles.themeMediaTextSubtitle,{color:mobile.textColor,textAlign:mobile.textAlign??"center"}]}>{section.subtitle}</Text>:null}{section.buttonLabel&&section.url?<TouchableOpacity style={styles.themeMediaTextButton} onPress={()=>onOpen(section.url,{title:section.title,image:section.images[0]?.url})}><Text style={styles.themeMediaTextButtonText}>{section.buttonLabel}</Text></TouchableOpacity>:null}</View>
  </View>}const bannerPadding=mobile.paddingVertical??(section.layout==="banner"?0:22);return <View key={section.id} style={[styles.themeSection,{marginHorizontal:margin,paddingVertical:bannerPadding,backgroundColor:mobile.backgroundColor}]}>
    {section.title?<View style={styles.themeCustomHeader}><Text style={[styles.themeCustomTitle,{color:mobile.textColor,textAlign:mobile.textAlign}]}>{section.title}</Text>{section.subtitle?<Text style={[styles.themeSubtitle,{color:mobile.textColor,textAlign:mobile.textAlign}]}>{section.subtitle}</Text>:null}</View>:section.subtitle?<Text style={[styles.themeSubtitle,{color:mobile.textColor,textAlign:mobile.textAlign}]}>{section.subtitle}</Text>:null}
    {section.layout==="grid"?<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.themeGrid}>{section.images.map((image,index)=><TouchableOpacity key={`${image.url}-${index}`} style={styles.themeCard} activeOpacity={.82} onPress={()=>onOpen(image.link||section.url,{title:image.alt||section.title,image:image.url})}><Image source={{uri:image.url}} style={[styles.themeCardImage,{borderRadius:mobile.imageBorderRadius}]} resizeMode={mobile.imageFit??"cover"}/>{image.alt&&image.alt!==section.title?<Text style={[styles.themeCardLabel,{color:mobile.textColor,textAlign:mobile.textAlign}]} numberOfLines={2}>{image.alt}</Text>:null}</TouchableOpacity>)}</ScrollView>:section.images[0]?<TouchableOpacity activeOpacity={.86} disabled={!section.url} onPress={()=>onOpen(section.url,{title:section.title,image:section.images[0].url})}><Image source={{uri:section.images[0].url}} style={[styles.themeBannerImage,imageSize,{borderRadius:mobile.imageBorderRadius??0}]} resizeMode={mobile.imageFit??"cover"}/></TouchableOpacity>:null}
    {section.buttonLabel&&section.url?<TouchableOpacity style={styles.themeButton} onPress={()=>onOpen(section.url,{title:section.title,image:section.images[0]?.url})}><Text style={styles.themeButtonText}>{section.buttonLabel} →</Text></TouchableOpacity>:null}
  </View>})}</>;
}

function ProductCard({
  item,
  onPress,
}: {
  item: Product;
  onPress?: (product: Product) => void;
}) {
  const { formatMoney } = useCurrency();
  const { settings: appSettings } = useAppSettings();
  const { has, toggle } = useWishlist();
  const wished = has(item.id);
  const fallbackAmount = Number(item.price.replace(/[^0-9.]/g, ""));
  const displayedPrice = formatMoney({ amount: String(item.minPrice ?? fallbackAmount), currencyCode: "USD" });
  const oldAmount = item.oldPrice ? Number(item.oldPrice.replace(/[^0-9.]/g, "")) : 0;
  const displayedOldPrice = item.oldPrice ? formatMoney({ amount: String(oldAmount), currencyCode: "USD" }) : null;
  const discount = salePercentage(item.minPrice ?? fallbackAmount, oldAmount);

  const toggleWishlist = () => {
    if (!item.handle) return;
    toggle({ id: item.id, title: item.title, price: item.price, oldPrice: item.oldPrice, image: item.image, handle: item.handle });
  };

  return (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => onPress?.(item)}
      activeOpacity={0.88}
    >
      <View style={styles.productImageWrap}>
        <Image
          source={{ uri: item.image }}
          style={styles.productImage}
          resizeMode="cover"
        />

        {(discount || item.tag === "NEW") && (
          <View
            style={[
              styles.productTag,
              discount ? styles.tagSale : styles.tagNew,
            ]}
          >
            <Text style={styles.productTagText}>{discount ? `-${discount}%` : "NEW"}</Text>
          </View>
        )}

        {appSettings.wishlist ? <TouchableOpacity
          style={styles.wishBtn}
          onPress={toggleWishlist}
          activeOpacity={0.75}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={wished ? "heart" : "heart-outline"}
            size={18}
            color={wished ? COLORS.pinkAccent : COLORS.textLight}
          />
        </TouchableOpacity> : null}
      </View>

      <View style={styles.productInfo}>
        <Text style={styles.productTitle} numberOfLines={2}>
          {item.title}
        </Text>

        <View style={styles.ratingRow}>
          <Ionicons name="star" size={11} color={COLORS.orange} />
          <Text style={styles.ratingText}>4.8</Text>
          <Text style={styles.ratingMuted}>Carter&apos;s pick</Text>
        </View>

        <View style={styles.priceRow}>
          <Text
            style={[
              styles.productPrice,
              item.oldPrice ? { color: COLORS.sale } : null,
            ]}
          >
            {displayedPrice}
          </Text>

          {item.oldPrice && (
            <Text style={styles.productOldPrice}>{displayedOldPrice}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function TopPicksSection({
  products,
  onSeeAll,
  onProductPress,
}: {
  products: Product[];
  onSeeAll?: () => void;
  onProductPress?: (product: Product) => void;
}) {
  return (
    <View style={styles.sectionBlock}>
      <SectionHeader
        title="Top Picks For You"
        subtitle="Fresh styles parents love"
        right={
          <TouchableOpacity style={styles.seeAllBtn} onPress={onSeeAll}>
            <Text style={styles.seeAll}>See All</Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.blue} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.topPicksRow}
      >
        {products.map((item) => (
          <ProductCard
            key={item.id}
            item={item}
            onPress={onProductPress}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function ShopCategorySection({
  categories,
  onPress,
}: {
  categories: ShopCategory[];
  onPress?: (category: ShopCategory) => void;
}) {
  return (
    <View style={styles.categorySectionBlock}>
      <SectionHeader
        title="Shop by Category"
        subtitle="Curated outfits, essentials & favorites"
      />

      {categories.map((category, index) => (
        <TouchableOpacity
          key={category.id}
          style={[
            styles.categoryFeatureCard,
            { borderColor: colorWithOpacity(category.bg, 0.45) },
          ]}
          onPress={() => onPress?.(category)}
          activeOpacity={0.88}
        >
          <View style={styles.categoryFeatureArt}>
            <Image
              source={{ uri: category.image }}
              style={styles.categoryFeatureImage}
              resizeMode="cover"
            />
          </View>

          <View style={styles.categoryFeatureContent}>
            <View style={styles.categoryFeatureTextWrap}>
              <Text style={styles.categoryEyebrow}>
                {category.eyebrow ?? (index === 0 ? "Featured category" : "Shop category")}
              </Text>
              <Text style={styles.categoryFeatureTitle} numberOfLines={1}>{category.label}</Text>
              <Text style={styles.categoryFeatureSub} numberOfLines={2}>
                {category.subtitle ?? "Easy matching looks made for everyday comfort."}
              </Text>
            </View>
            <View style={styles.categoryFeatureAction}>
              <Text style={styles.categoryFeatureActionText}>{category.cta ?? "Shop"}</Text>
              <Ionicons name="arrow-forward" size={13} color={COLORS.white} />
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ExploreStylesSection({
  items,
  onPress,
}: {
  items: ExploreStyle[];
  onPress?: (style: ExploreStyle) => void;
}) {
  return (
    <View style={styles.sectionBlock}>
      <SectionHeader
        title="Explore Styles"
        subtitle="Shop the looks kids love"
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.exploreRow}
      >
        {items.map((style) => (
          <TouchableOpacity
            key={style.id}
            style={styles.exploreCard}
            onPress={() => onPress?.(style)}
            activeOpacity={0.86}
          >
            <Image
              source={
                typeof style.image === "string"
                  ? { uri: style.image }
                  : style.image
              }
              style={styles.exploreImage}
              resizeMode="cover"
            />

            <View style={styles.exploreOverlay} />
            <View style={[styles.exploreAccent, { backgroundColor: style.accentColor }]} />

            <View style={styles.exploreTextWrap}>
              <Text style={styles.exploreLabel} numberOfLines={2}>
                {style.label}
              </Text>

              <View style={styles.exploreCta}>
                <Text style={styles.exploreCtaText}>Shop now</Text>
                <Ionicons name="arrow-forward" size={12} color={COLORS.white} />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

function TinyEssentialsSection({
  items,
  onPress,
}: {
  items: TinyEssential[];
  onPress?: (item: TinyEssential) => void;
}) {
  const badgeColor = items[0]?.accentColor ?? COLORS.blue;

  return (
    <View style={styles.sectionBlock}>
      <SectionHeader
        title="Tiny Essentials"
        subtitle="Soft newborn must-haves"
        right={
          <View style={[styles.tinyHeaderBadge, { backgroundColor: colorWithOpacity(badgeColor, 0.16) }]}>
            <Ionicons name="sparkles-outline" size={13} color={badgeColor} />
            <Text style={[styles.tinyHeaderBadgeText, { color: badgeColor }]}>Shopify picks</Text>
          </View>
        }
      />

      <View style={styles.tinyGrid}>
        {items.map((item, index) => {
          const isLarge = index === 0;

          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.tinyCard,
                { borderColor: colorWithOpacity(item.accentColor, 0.35) },
                isLarge && styles.tinyCardLarge,
              ]}
              onPress={() => onPress?.(item)}
              activeOpacity={0.86}
            >
              <Image
                source={{ uri: item.image }}
                style={styles.tinyImage}
                resizeMode="cover"
              />

              <View style={styles.tinyOverlay} />
              <View style={[styles.tinyAccentLine, { backgroundColor: item.accentColor }]} />

              <View style={styles.tinyContent}>
                <Text
                  style={[styles.tinyTitle, !isLarge && styles.tinyTitleSmall]}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>

              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function OurBrandsSection({
  brands,
  onPress,
}: {
  brands: OurBrand[];
  onPress?: (brand: OurBrand) => void;
}) {
  return (
    <View style={styles.sectionBlock}>
      <SectionHeader
        title="Our Brands"
        subtitle="Discover the Carter's family of brands"
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.brandsRow}
      >
        {brands.map((brand) => (
          <TouchableOpacity
            key={brand.id}
            style={styles.brandShowcaseCard}
            onPress={() => onPress?.(brand)}
            activeOpacity={0.88}
          >
            <View style={styles.brandImageWrap}>
              <Image
                source={{ uri: brand.image }}
                style={styles.brandImage}
                resizeMode="cover"
              />

            </View>

            <View style={styles.brandContentCard}>
              <Text style={styles.brandLabel} numberOfLines={1}>
                {brand.label}
              </Text>

              <Text style={styles.brandTagline} numberOfLines={2}>
                {brand.tagline}
              </Text>

              <View style={styles.brandFooterRow}>
                <View
                  style={[
                    styles.brandShopPill,
                    { borderColor: `${brand.color}33` },
                  ]}
                >
                  <Text
                    style={[styles.brandShopPillText, { color: brand.color }]}
                  >
                    Shop brand
                  </Text>
                </View>

                <Text style={styles.brandCollectionHint}>Baby & kids</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

function LatestCollectionSection({
  products,
  onSeeAll,
  onProductPress,
}: {
  products: Product[];
  onSeeAll?: () => void;
  onProductPress?: (product: Product) => void;
}) {
  return (
    <View style={styles.latestSection}>
      <SectionHeader
        title="Latest Collection"
        subtitle="New arrivals just landed"
        right={
          <TouchableOpacity style={styles.latestSeeAllBtn} onPress={onSeeAll}>
            <Text style={styles.latestSeeAllText}>View all</Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.white} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.latestRow}
      >
        {products.map((item) => (
          <ProductCard
            key={item.id}
            item={item}
            onPress={onProductPress}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function BottomNavigation({
  active,
  onHome,
  onShop,
  onNotifications,
  onAccount,
  onCart,
  cartCount,
  notificationCount,
}: {
  active: TabId;
  onHome: () => void;
  onShop: () => void;
  onNotifications: () => void;
  onAccount: () => void;
  onCart: () => void;
  cartCount: number;
  notificationCount: number;
}) {
  const items: { id: string; label: string; icon: IconName; activeIcon: IconName; onPress: () => void }[] = [
    { id: "home", label: "Home", icon: "home-outline", activeIcon: "home", onPress: onHome },
    { id: "shop", label: "Shop", icon: "bag-handle-outline", activeIcon: "bag-handle", onPress: onShop },
    { id: "cart", label: "Cart", icon: "cart-outline", activeIcon: "cart", onPress: onCart },
    { id: "notifications", label: "Notifications", icon: "notifications-outline", activeIcon: "notifications", onPress: onNotifications },
    { id: "account", label: "Account", icon: "person-outline", activeIcon: "person", onPress: onAccount },
  ];
  return (
    <View style={styles.bottomNavigation}>
      {items.map((item) => {
        const selected = active === item.id;
        return (
          <TouchableOpacity key={item.id} style={styles.bottomNavItem} onPress={item.onPress} accessibilityRole="button" accessibilityLabel={item.label}>
            <View><Ionicons name={selected ? item.activeIcon : item.icon} size={22} color={selected ? COLORS.blue : COLORS.textLight} />{item.id === "cart" && cartCount > 0 ? <View style={styles.bottomCartBadge}><Text style={styles.bottomCartBadgeText}>{cartCount > 99 ? "99+" : cartCount}</Text></View> : null}{item.id === "notifications" && notificationCount > 0 ? <View style={styles.bottomNotificationBadge}><Text style={styles.bottomCartBadgeText}>{notificationCount > 9 ? "9+" : notificationCount}</Text></View> : null}</View>
            <Text style={[styles.bottomNavLabel, selected && styles.bottomNavLabelActive]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function NavigationMenu({
  visible,
  onClose,
  active,
  onTab,
  shopifyMenu,
  onMenuItem,
}: {
  visible: boolean;
  onClose: () => void;
  active: TabId;
  onTab: (tabId: TabId) => void;
  shopifyMenu: StorefrontMenuItem[];
  onMenuItem: (item: StorefrontMenuItem) => void;
}) {
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const orderedMenu = [...shopifyMenu].sort((a, b) => {
    const aSpecial = a.title.toLowerCase().includes("special");
    const bSpecial = b.title.toLowerCase().includes("special");
    return Number(aSpecial) - Number(bSpecial);
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.menuBackdrop} activeOpacity={1} onPress={onClose}>
        <View style={styles.navigationMenu} onStartShouldSetResponder={() => true}>
          <View style={styles.menuHeader}>
            <Text style={styles.menuTitle}>Menu</Text>
            <TouchableOpacity onPress={onClose} style={styles.menuClose} accessibilityLabel="Close menu">
              <Ionicons name="close" size={25} color={COLORS.textDark} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.menuItem, active === "home" && styles.menuItemActive]} onPress={() => { onClose(); onTab("home"); }}>
            <Ionicons name={active === "home" ? "home" : "home-outline"} size={22} color={COLORS.blue} />
            <Text style={[styles.menuLabel, active === "home" && styles.menuLabelActive]}>Home</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.menuItem, active === "categories" && styles.menuItemActive]} onPress={() => setCategoriesOpen((open) => !open)}>
            <Ionicons name={categoriesOpen ? "grid" : "grid-outline"} size={22} color={COLORS.blue} />
            <Text style={[styles.menuLabel, active === "categories" && styles.menuLabelActive]}>Categories</Text>
            <Ionicons name={categoriesOpen ? "chevron-up" : "chevron-down"} size={18} color={COLORS.textLight} />
          </TouchableOpacity>
          {categoriesOpen ? (
          <ScrollView style={styles.categoryDropdown} showsVerticalScrollIndicator={false}>
          {orderedMenu.map((group) => {
            const isOpen = openGroup === group.id;
            const ageLabel: Record<string, string> = { baby: "NB-24M", toddler: "2T-5T", kid: "4-10" };
            const subtitle = ageLabel[group.title.trim().toLowerCase()];
            return (
              <View key={group.id}>
                        <TouchableOpacity style={styles.categoryGroup} onPress={() => group.items.length ? setOpenGroup(isOpen ? null : group.id) : onMenuItem(group)}>
                          <View style={styles.categoryGroupTitle}>
                            {group.image ? (
                              <ExpoImage source={{ uri: group.image }} style={styles.navigationBrandLogo} contentFit="contain" accessibilityLabel={group.title} />
                            ) : (
                              <Text style={[styles.categoryGroupText, group.title.toLowerCase().includes("special") && styles.specialMenuText]}>{group.title}</Text>
                            )}
                            {subtitle ? <Text style={styles.categoryAgeText}>{subtitle}</Text> : null}
                          </View>
                          {group.items.length ? <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={16} color={COLORS.blue} /> : <Ionicons name="chevron-forward" size={15} color={COLORS.textLight} />}
                        </TouchableOpacity>
                        {isOpen ? (
                          <View style={styles.categoryGroupLinks}>
                            {group.items.map((section) => (
                              <View key={section.id}>
                                <TouchableOpacity style={styles.categoryDropdownItem} onPress={() => onMenuItem(section)}>
                                  <Text style={styles.categorySectionText}>{section.title}</Text>
                                  <Ionicons name="chevron-forward" size={14} color={COLORS.textLight} />
                                </TouchableOpacity>
                                {section.items.map((item) => (
                                  <TouchableOpacity key={item.id} style={styles.categoryLeafItem} onPress={() => onMenuItem(item)}>
                                    <Text style={styles.categoryDropdownText}>{item.title}</Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            ))}
                          </View>
                        ) : null}
              </View>
            );
          })}
          </ScrollView>
          ) : null}
          <TouchableOpacity style={[styles.menuItem, active === "shop" && styles.menuItemActive]} onPress={() => { onClose(); onTab("shop"); }}>
            <Ionicons name={active === "shop" ? "bag" : "bag-outline"} size={22} color={COLORS.blue} />
            <Text style={[styles.menuLabel, active === "shop" && styles.menuLabelActive]}>Shop</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.menuItem, active === "account" && styles.menuItemActive]} onPress={() => { onClose(); onTab("account"); }}>
            <Ionicons name={active === "account" ? "person" : "person-outline"} size={22} color={COLORS.blue} />
            <Text style={[styles.menuLabel, active === "account" && styles.menuLabelActive]}>Account</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export default function HomeScreen() {
  const { count: cartCount } = useCart();
  const { currency, toggleCurrency } = useCurrency();
  const { settings: appSettings } = useAppSettings();
  const { unread: notificationCount } = useNotifications();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [menuVisible, setMenuVisible] = useState(false);
  const [shopifyMenu, setShopifyMenu] = useState<StorefrontMenuItem[]>([]);
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);
  const [homepageError, setHomepageError] = useState<string | null>(null);
  const [homepageLoading, setHomepageLoading] = useState(true);
  const [promoItems, setPromoItems] = useState<PromoFeature[]>([]);
  const [heroBanners, setHeroBanners] =
    useState<HeroBannerItem[]>([]);
  const [shopCategories, setShopCategories] =
    useState<ShopCategory[]>([]);
  const [topPicksProducts, setTopPicksProducts] =
    useState<Product[]>([]);
  const [latestCollectionProducts, setLatestCollectionProducts] =
    useState<Product[]>([]);
  const [ageGroups, setAgeGroups] = useState<AgeCategory[]>([]);
  const [exploreStylesState, setExploreStylesState] =
    useState<ExploreStyle[]>([]);
  const [tinyEssentialsState, setTinyEssentialsState] =
    useState<TinyEssential[]>([]);
  const [ourBrandsState, setOurBrandsState] = useState<OurBrand[]>([]);
  const bundledAdminConfig=getBundledAdminHomepageConfig();
  const [adminSections, setAdminSections] = useState<AdminSection[]>(bundledAdminConfig.sections);
  const [shopifyVisibility,setShopifyVisibility]=useState<Record<string,boolean>>(bundledAdminConfig.shopifyVisibility);
  const [shopifyStyles,setShopifyStyles]=useState<Record<string,string>>(bundledAdminConfig.shopifyStyles);
  const [themeSections,setThemeSections]=useState<HomepageThemeSection[]>([]);
  const [adminContentError, setAdminContentError] = useState("");

  useFocusEffect(
    useCallback(() => {
      setActiveTab("home");
    }, []),
  );

  useEffect(() => {
    let isMounted = true;

    const loadHomepage = async () => {
      try {
        setHomepageLoading(true);
        setHomepageError(null);

        const content = await getHomepageContent();

        if (!isMounted) return;

        setPromoItems(content.promoItems);
        setHeroBanners(content.heroBanners);
        setAgeGroups(content.ageGroups);
        setShopCategories(content.shopCategories);
        setTopPicksProducts(content.topPicksProducts);
        setExploreStylesState(content.exploreStyles);
        setTinyEssentialsState(content.tinyEssentials);
        setOurBrandsState(content.ourBrands);
        setLatestCollectionProducts(content.latestCollectionProducts);
        setThemeSections(content.themeSections);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to load homepage";

        console.error("Unable to load Shopify homepage:", error);
        if (isMounted) setHomepageError(message);
      } finally {
        if (isMounted) setHomepageLoading(false);
      }
    };

    loadHomepage();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    setShopifyMenu([]);
    getStorefrontNavigation().then((items) => {
      if (mounted) setShopifyMenu(items);
    });
    return () => { mounted = false; };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      setAdminContentError("");
      getAdminHomepageConfig()
        .then((config) => {
          console.info(`Loaded ${config.sections.length} admin section(s).`);
          if (mounted) {setAdminSections(config.sections);setShopifyVisibility(config.shopifyVisibility);setShopifyStyles(config.shopifyStyles)}
        })
        .catch((error) => {
          console.info("Admin sections unavailable:", error);
          if (mounted) setAdminContentError(error instanceof Error ? error.message : "Admin content unavailable");
        });
      return () => { mounted = false; };
    }, []),
  );

  const handleMainScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    setIsHeaderScrolled(offsetY > 55);
  };

  const showCollection = (handle?: string, title?: string, bannerImage?:string) => {
    if (!handle) return;
    router.push({
      pathname: "/collection/[handle]",
      params: { handle, title: title || "Collection", ...(bannerImage?{bannerImage}:{}) },
    });
  };

  const showProduct = (product: Product) => {
    if (product.handle) {
      router.push({ pathname: "/product/[handle]", params: { handle: product.handle } });
    }
  };

  const openShopifyMenuItem = (item: StorefrontMenuItem) => {
    setMenuVisible(false);
    if (item.title.trim().toLowerCase() === "special prices") {
      showCollection("special-prices", "Special Prices");
      return;
    }
    if (item.handle) {
      showCollection(item.handle, item.title);
      return;
    }
    if (item.url) {
      const url = item.url.startsWith("http") ? item.url : `https://carters.com.lb${item.url}`;
      WebBrowser.openBrowserAsync(url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
        controlsColor: "#002041",
        toolbarColor: "#ffffff",
      });
    }
  };
  const openThemeUrl=(url:string,context?:{title?:string;image?:string})=>{
    if(!url)return;
    const absolute=url.startsWith("http")?url:`https://carters.com.lb${url.startsWith("/")?url:`/${url}`}`;
    const sameStore=/^https?:\/\/(?:www\.)?carters\.com\.lb(?:\/|$)/i.test(absolute);
    let path=absolute.replace(/^https?:\/\/[^/]+/i,"").split("#")[0];
    path=path.replace(/^\/(?:[a-z]{2}(?:-[a-z]{2})?)(?=\/)/i,"");
    const collectionMatch=path.match(/^\/collections\/([^/?]+)/i);
    if(collectionMatch){showCollection(decodeURIComponent(collectionMatch[1]),context?.title||"Collection",context?.image);return}
    const productMatch=path.match(/^\/products\/([^/?]+)/i);
    if(productMatch){router.push({pathname:"/product/[handle]",params:{handle:decodeURIComponent(productMatch[1])}});return}
    const pageMatch=path.match(/^\/pages\/([^/?]+)/i);
    if(pageMatch&&/(sale|discount|special-price|clearance|offer|promotion)/i.test(pageMatch[1])){const handle=pageMatch[1]==="special-prices"?"special-prices":pageMatch[1];showCollection(handle,context?.title||pageMatch[1].replaceAll("-"," "),context?.image);return}
    if(/^\/search(?:\?|$)/i.test(path)){router.push("/search");return}
    if(sameStore&&(/^\/collections(?:\?|$)/i.test(path)||path==="/")){showCollection("all-products",context?.title||"Shop all",context?.image);return}
    void WebBrowser.openBrowserAsync(absolute,{presentationStyle:WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,controlsColor:"#002041",toolbarColor:"#ffffff"});
  };

  const handleTab = (tab: TabId) => {
    setActiveTab(tab);
    if (tab === "home") scrollRef.current?.scrollTo({ y: 0, animated: true });
    if (tab === "categories") setMenuVisible(true);
    if (tab === "shop") showCollection("all-products", "All Products");
    if (tab === "account") router.push("/account");
  };

  const openCart = () => {
    router.push("/cart");
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />

      <Header
        cartCount={cartCount}
        currency={currency}
        isScrolled={isHeaderScrolled}
        onCurrency={toggleCurrency}
        onSearch={() => router.push("/search")}
        onCart={openCart}
        onWishlist={appSettings.wishlist ? () => router.push("/wishlist") : undefined}
        onMenu={() => setMenuVisible(true)}
      />

      <ScrollView
        ref={scrollRef}
        style={styles.scrollBody}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleMainScroll}
        scrollEventThrottle={16}
      >
        {adminSections.length > 0 && (
          <AdminSections sections={adminSections} placement="before-hero" onOpen={() => showCollection("all-products", "Shop all")} />
        )}
        <ShopifyThemeSections sections={themeSections} placement="before-hero" visibility={shopifyVisibility} customStyles={shopifyStyles} onOpen={openThemeUrl}/>
        {__DEV__ && adminContentError ? (
          <View style={{ backgroundColor: "#fff0f0", padding: 10 }}>
            <Text style={{ color: "#a33", fontSize: 10, textAlign: "center" }}>Admin connection: {adminContentError}</Text>
          </View>
        ) : null}

        {shopifyVisibility.hero!==false&&<HeroBanner
          items={heroBanners}
          customCss={shopifyStyles.hero}
          onShopNow={(banner) =>
            showCollection(banner.handle, banner.title, banner.image)
          }
        />}

        <HomepageStatus loading={homepageLoading} error={homepageError} />

        <AdminSections sections={adminSections} placement="after-hero" onOpen={() => showCollection("all-products", "Shop all")} />
        <ShopifyThemeSections sections={themeSections} placement="after-hero" visibility={shopifyVisibility} customStyles={shopifyStyles} onOpen={openThemeUrl}/>

        {shopifyVisibility.promos!==false&&<PromoStrip items={promoItems} />}

        <AdminSections sections={adminSections} placement="after-promos" onOpen={() => showCollection("all-products", "Shop all")} />
        <ShopifyThemeSections sections={themeSections} placement="after-promos" visibility={shopifyVisibility} customStyles={shopifyStyles} onOpen={openThemeUrl}/>

        {shopifyVisibility["age-groups"]!==false&&ageGroups.length > 0 && (
          <AgeRow
            categories={ageGroups}
            onPress={(category) => showCollection(category.handle, category.label)}
          />
        )}

        <AdminSections sections={adminSections} placement="after-ages" onOpen={() => showCollection("all-products", "Shop all")} />
        <ShopifyThemeSections sections={themeSections} placement="after-ages" visibility={shopifyVisibility} customStyles={shopifyStyles} onOpen={openThemeUrl}/>

        {shopifyVisibility["top-picks"]!==false&&topPicksProducts.length > 0 && (
          <TopPicksSection
            products={topPicksProducts}
            onSeeAll={() => showCollection("new-collection-ss26", "Top picks")}
            onProductPress={showProduct}
          />
        )}

        <AdminSections sections={adminSections} placement="after-top-picks" onOpen={() => showCollection("all-products", "Shop all")} />
        <ShopifyThemeSections sections={themeSections} placement="after-top-picks" visibility={shopifyVisibility} customStyles={shopifyStyles} onOpen={openThemeUrl}/>

        {shopifyVisibility["shop-categories"]!==false&&shopCategories.length > 0 && (
          <ShopCategorySection
            categories={shopCategories}
            onPress={(category) => showCollection(category.handle, category.label)}
          />
        )}

        <AdminSections sections={adminSections} placement="after-categories" onOpen={() => showCollection("all-products", "Shop all")} />
        <ShopifyThemeSections sections={themeSections} placement="after-categories" visibility={shopifyVisibility} customStyles={shopifyStyles} onOpen={openThemeUrl}/>

        {shopifyVisibility["explore-styles"]!==false&&exploreStylesState.length > 0 && (
          <ExploreStylesSection
            items={exploreStylesState}
            onPress={(style) => showCollection(style.handle, style.label)}
          />
        )}

        <AdminSections sections={adminSections} placement="after-explore" onOpen={() => showCollection("all-products", "Shop all")} />
        <ShopifyThemeSections sections={themeSections} placement="after-explore" visibility={shopifyVisibility} customStyles={shopifyStyles} onOpen={openThemeUrl}/>

        {shopifyVisibility["tiny-essentials"]!==false&&tinyEssentialsState.length > 0 && (
          <TinyEssentialsSection
            items={tinyEssentialsState}
            onPress={(item) => showCollection(item.handle, item.title)}
          />
        )}

        <AdminSections sections={adminSections} placement="after-essentials" onOpen={() => showCollection("all-products", "Shop all")} />
        <ShopifyThemeSections sections={themeSections} placement="after-essentials" visibility={shopifyVisibility} customStyles={shopifyStyles} onOpen={openThemeUrl}/>

        {shopifyVisibility["our-brands"]!==false&&ourBrandsState.length > 0 && (
          <OurBrandsSection
            brands={ourBrandsState}
            onPress={(brand) => showCollection(brand.handle, brand.label)}
          />
        )}

        <AdminSections sections={adminSections} placement="after-brands" onOpen={() => showCollection("all-products", "Shop all")} />
        <ShopifyThemeSections sections={themeSections} placement="after-brands" visibility={shopifyVisibility} customStyles={shopifyStyles} onOpen={openThemeUrl}/>

        {shopifyVisibility["latest-collection"]!==false&&latestCollectionProducts.length > 0 && (
          <LatestCollectionSection
            products={latestCollectionProducts}
            onSeeAll={() => showCollection("new-collection-ss26", "Latest collection")}
            onProductPress={showProduct}
          />
        )}

        <AdminSections sections={adminSections} placement="after-latest" onOpen={() => showCollection("all-products", "Shop all")} />
        <ShopifyThemeSections sections={themeSections} placement="after-latest" visibility={shopifyVisibility} customStyles={shopifyStyles} onOpen={openThemeUrl}/>

      </ScrollView>

      <NavigationMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        active={activeTab}
        onTab={handleTab}
        shopifyMenu={shopifyMenu}
        onMenuItem={openShopifyMenuItem}
      />
      <BottomNavigation
        active={activeTab}
        onHome={() => handleTab("home")}
        onShop={() => handleTab("shop")}
        onNotifications={() => router.push("/notifications")}
        onAccount={() => handleTab("account")}
        onCart={openCart}
        cartCount={cartCount}
        notificationCount={notificationCount}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    width: "100%",
    maxWidth: Platform.OS === "web" ? 480 : undefined,
    alignSelf: "center",
    backgroundColor: COLORS.white,
    overflow: "hidden",
  },

  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: COLORS.white,
    paddingTop: Platform.OS === "ios" ? 44 : 28,
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  headerScrolled: {
    backgroundColor: COLORS.white,
    borderBottomColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  headerMain: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerRight: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 7,
  },
  headerCircleBtn: {
    width: 34,
    height: 38,
    borderRadius: 0,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCircleTransparent: {
    backgroundColor: "transparent",
  },
  headerCurrencyBtn: {
    height: 32,
    minWidth: 45,
    paddingHorizontal: 5,
    borderRadius: 16,
    backgroundColor: "#EEF5FA",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  headerCurrencyText: {
    color: COLORS.blue,
    fontSize: 10,
    fontWeight: "900",
  },
  logoWrap: {
    alignItems: "flex-start",
  },
  headerLogoImage: {
    width: 122,
    height: 31,
  },
  headerLogo: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.blue,
    letterSpacing: -0.7,
    fontFamily: FONT,
    lineHeight: 24,
  },
  headerSubLogo: {
    fontSize: 9,
    color: COLORS.textMid,
    fontWeight: "700",
    letterSpacing: 1.3,
    textTransform: "uppercase",
    marginTop: -1,
    fontFamily: FONT,
  },
  cartBadge: {
    position: "absolute",
    top: -7,
    right: -9,
    backgroundColor: COLORS.pinkAccent,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  cartBadgeText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: "800",
  },

  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Platform.OS === "ios" ? 131 : 115,
    paddingBottom: Platform.OS === "ios" ? 126 : 108,
  },

  heroContainer: {
    width: SCREEN_W,
    height: 458,
    overflow: "hidden",
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  shopifyHeroContainer: {
    width: SCREEN_W,
    height: (SCREEN_W * 863) / 1920,
    backgroundColor: COLORS.offWhite,
    overflow: "hidden",
  },
  shopifyHeroImage: {
    width: "100%",
    flex: 1,
    backgroundColor: COLORS.offWhite,
  },
  heroLoadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.offWhite,
  },
  heroSlide: {
    width: SCREEN_W,
    height: 458,
    position: "relative",
    overflow: "hidden",
    paddingTop: Platform.OS === "ios" ? 112 : 102,
  },
  heroBlobPrimary: {
    position: "absolute",
    width: 285,
    height: 285,
    borderRadius: 143,
    top: -94,
    right: -78,
  },
  heroPatternWrap: {
    position: "absolute",
    top: 112,
    left: 18,
    width: 92,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    opacity: 0.42,
  },
  heroDotBg: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(11,30,66,0.24)",
  },
  heroContent: {
    flex: 1,
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 46,
  },
  heroTextCol: {
    flex: 1,
    justifyContent: "center",
    zIndex: 2,
    paddingRight: 4,
  },
  heroPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.84)",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
  },
  heroPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  heroPillText: {
    fontSize: 10,
    color: COLORS.textMid,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "900",
    fontFamily: FONT,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 35,
    marginBottom: 10,
    letterSpacing: -1,
    fontFamily: FONT,
  },
  heroDescription: {
    maxWidth: 160,
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.textMid,
    fontWeight: "700",
    fontFamily: FONT,
    marginBottom: 10,
  },
  heroCategories: {
    maxWidth: 180,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 5,
    marginBottom: 14,
  },
  heroCategoryText: {
    fontSize: 11,
    color: COLORS.textDark,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontFamily: FONT,
  },
  heroCta: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 17,
    paddingVertical: 10,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 5,
  },
  heroCtaText: {
    fontSize: 12,
    fontWeight: "900",
    color: COLORS.white,
    fontFamily: FONT,
  },
  heroFeatures: {
    maxWidth: 190,
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 10,
  },
  heroFeatureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  heroFeatureText: {
    fontSize: 9,
    color: COLORS.textDark,
    fontWeight: "900",
    textTransform: "uppercase",
    fontFamily: FONT,
  },
  heroImageCol: {
    width: 210,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 3,
  },
  heroImageBackCard: {
    position: "absolute",
    bottom: 20,
    width: 176,
    height: 212,
    borderRadius: 30,
    transform: [{ rotate: "8deg" }],
  },
  heroImageFrame: {
    width: 196,
    height: 232,
    borderRadius: 30,
    overflow: "hidden",
    backgroundColor: COLORS.white,
    borderWidth: 5,
    borderColor: "rgba(255,255,255,0.86)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.13,
    shadowRadius: 22,
    elevation: 8,
  },
  heroImage: {
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.white,
  },
  heroImageBadge: {
    position: "absolute",
    left: 10,
    bottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  heroImageBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontFamily: FONT,
  },
  promoStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 0,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  promoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    justifyContent: "center",
  },
  promoIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.blueLight,
  },
  promoText: {
    fontSize: 10.5,
    color: COLORS.blue,
    fontWeight: "800",
    fontFamily: FONT,
    textAlign: "center",
    flexShrink: 1,
  },

  homepageStatus: {
    marginTop: 14,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  homepageStatusText: {
    flex: 1,
    fontSize: 11.5,
    color: COLORS.textMid,
    fontWeight: "700",
    fontFamily: FONT,
  },
  homepageStatusError: {
    color: COLORS.sale,
  },

  sectionBlock: {
    marginTop: 8,
    backgroundColor: COLORS.white,
    paddingVertical: 22,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.textDark,
    fontFamily: FONT,
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 3,
    fontWeight: "600",
    fontFamily: FONT,
  },

  ageRow: {
    paddingHorizontal: 12,
    gap: 12,
  },
  ageItem: {
    alignItems: "center",
    width: 86,
  },
  ageCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    borderWidth: 2,
    borderColor: COLORS.white,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  ageImage: {
    width: "100%",
    height: "100%",
  },
  ageLabel: {
    fontSize: 11.5,
    fontWeight: "900",
    color: COLORS.textDark,
    textAlign: "center",
    fontFamily: FONT,
  },
  ageSub: {
    fontSize: 10.5,
    color: COLORS.blue,
    textAlign: "center",
    marginTop: 2,
    fontWeight: "900",
    fontFamily: FONT,
  },

  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    borderRadius: 0,
    paddingHorizontal: 11,
    paddingVertical: 7,
    gap: 2,
  },
  seeAll: {
    fontSize: 12,
    color: COLORS.blue,
    fontWeight: "800",
    fontFamily: FONT,
  },

  topPicksRow: {
    paddingHorizontal: 12,
    gap: 13,
  },
  productCard: {
    width: 152,
    backgroundColor: COLORS.white,
    borderRadius: 0,
    overflow: "hidden",
    borderWidth: 0,
  },
  productImageWrap: {
    width: "100%",
    height: 166,
    position: "relative",
    backgroundColor: COLORS.blueLight,
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  productTag: {
    position: "absolute",
    top: 9,
    left: 9,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagNew: {
    backgroundColor: COLORS.blue,
  },
  tagSale: {
    backgroundColor: COLORS.sale,
  },
  productTagText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
    fontFamily: FONT,
  },
  wishBtn: {
    position: "absolute",
    top: 9,
    right: 9,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  productInfo: {
    padding: 11,
  },
  productTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: COLORS.textDark,
    marginBottom: 6,
    lineHeight: 16.5,
    fontFamily: FONT,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginBottom: 7,
  },
  ratingText: {
    fontSize: 10,
    color: COLORS.textMid,
    fontWeight: "800",
    fontFamily: FONT,
  },
  ratingMuted: {
    fontSize: 10,
    color: COLORS.textLight,
    fontWeight: "600",
    fontFamily: FONT,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: "900",
    color: COLORS.textDark,
    fontFamily: FONT,
  },
  productOldPrice: {
    fontSize: 11,
    color: COLORS.textLight,
    textDecorationLine: "line-through",
    fontFamily: FONT,
  },

  categorySectionBlock: {
    marginTop: 14,
    paddingVertical: 17,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  categoryHeaderBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.blueLight,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    gap: 5,
  },
  categoryHeaderBadgeText: {
    fontSize: 11.5,
    color: COLORS.blue,
    fontWeight: "900",
    fontFamily: FONT,
  },
  categoryFeatureCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    height: 330,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: "rgba(241, 222, 214, 0.95)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 5,
  },
  categoryFeatureArt: {
    height: 176,
    position: "relative",
    overflow: "hidden",
  },
  categoryFeatureImage: {
    width: "100%",
    height: "100%",
  },
  categoryFeatureContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 15,
    paddingVertical: 14,
    backgroundColor: COLORS.white,
  },
  categoryFeatureTextWrap: {
    flex: 1,
  },
  categoryEyebrow: {
    fontSize: 9.5,
    color: COLORS.blue,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.9,
    fontFamily: FONT,
    marginBottom: 4,
  },
  categoryFeatureTitle: {
    fontSize: 18,
    color: COLORS.textDark,
    fontWeight: "900",
    letterSpacing: -0.35,
    fontFamily: FONT,
    marginBottom: 4,
  },
  categoryFeatureSub: {
    fontSize: 11.5,
    color: COLORS.textMid,
    fontWeight: "600",
    lineHeight: 16,
    fontFamily: FONT,
  },
  categoryFeatureAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.blue,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 9,
    shadowColor: COLORS.blue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  categoryFeatureActionText: {
    color: COLORS.white,
    fontSize: 11.5,
    fontWeight: "900",
    fontFamily: FONT,
  },
  categoryGrid: {
    paddingHorizontal: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  categoryCard: {
    width: (SCREEN_W - 44) / 2,
    height: 210,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: "rgba(241, 222, 214, 0.95)",
    padding: 9,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.055,
    shadowRadius: 12,
    elevation: 3,
  },
  categoryMiniImageWrap: {
    height: 112,
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  categoryMiniImage: {
    width: "100%",
    height: "100%",
  },
  categoryMiniSoftOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  categoryNumberPill: {
    position: "absolute",
    top: 9,
    left: 9,
    minWidth: 29,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.96)",
  },
  categoryNumberText: {
    fontSize: 9.5,
    color: COLORS.blue,
    fontWeight: "900",
    fontFamily: FONT,
  },
  categoryCardFooter: {
    flex: 1,
    paddingTop: 10,
    paddingHorizontal: 2,
    justifyContent: "space-between",
  },
  categoryLabel: {
    fontSize: 12.8,
    fontWeight: "900",
    color: COLORS.textDark,
    fontFamily: FONT,
    lineHeight: 16.5,
    height: 34,
    marginBottom: 7,
  },
  categoryShopRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 2,
    backgroundColor: COLORS.blueLight,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    minHeight: 28,
  },
  categoryShopHint: {
    fontSize: 10.5,
    color: COLORS.blue,
    fontWeight: "900",
    fontFamily: FONT,
  },

  exploreRow: {
    paddingHorizontal: 16,
    gap: 13,
  },
  exploreCard: {
    width: 176,
    height: 220,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: COLORS.blueLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.08,
    shadowRadius: 13,
    elevation: 4,
  },
  exploreImage: {
    width: "100%",
    height: "100%",
  },
  exploreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(11,30,66,0.26)",
  },
  exploreAccent: {
    position: "absolute",
    top: 14,
    left: 14,
    width: 36,
    height: 5,
    borderRadius: 999,
  },
  exploreTextWrap: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
  },
  exploreLabel: {
    color: COLORS.white,
    fontSize: 19,
    fontWeight: "900",
    lineHeight: 23,
    letterSpacing: -0.4,
    fontFamily: FONT,
    marginBottom: 10,
  },
  exploreCta: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  exploreCtaText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "900",
    fontFamily: FONT,
  },

  tinyHeaderBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    gap: 5,
  },
  tinyHeaderBadgeText: {
    fontSize: 11.5,
    fontWeight: "900",
    fontFamily: FONT,
  },
  tinyGrid: {
    paddingHorizontal: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tinyCard: {
    width: "48%",
    height: 184,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: COLORS.blueLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.08,
    shadowRadius: 13,
    elevation: 4,
  },
  tinyCardLarge: {
    width: "100%",
    height: 224,
  },
  tinyImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  tinyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(11,30,66,0.28)",
  },
  tinyAccentLine: {
    position: "absolute",
    top: 14,
    left: 14,
    width: 38,
    height: 5,
    borderRadius: 999,
  },
  tinyContent: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
  },
  tinyTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 22,
    letterSpacing: -0.3,
    fontFamily: FONT,
    marginBottom: 10,
  },
  tinyTitleSmall: {
    fontSize: 14.5,
    lineHeight: 18,
  },
  tinyShopBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tinyShopBtnLarge: {
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  tinyShopText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "900",
    fontFamily: FONT,
  },

  brandsHeaderBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.blueLight,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    gap: 5,
  },
  brandsHeaderBadgeText: {
    fontSize: 11.5,
    color: COLORS.blue,
    fontWeight: "900",
    fontFamily: FONT,
  },
  brandsRow: {
    paddingHorizontal: 16,
    gap: 14,
  },
  brandShowcaseCard: {
    width: 226,
    borderRadius: 26,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  brandImageWrap: {
    height: 188,
    position: "relative",
    backgroundColor: COLORS.blueLight,
  },
  brandImage: {
    width: "100%",
    height: "100%",
  },
  brandImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(11,30,66,0.08)",
  },
  brandAccentBar: {
    position: "absolute",
    top: 14,
    left: 14,
    width: 40,
    height: 5,
    borderRadius: 999,
  },
  brandTopMeta: {
    position: "absolute",
    top: 26,
    left: 14,
    right: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brandWordmarkPill: {
    maxWidth: "78%",
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.95)",
  },
  brandWordmarkText: {
    fontSize: 11,
    color: COLORS.textDark,
    fontWeight: "900",
    fontFamily: FONT,
    textTransform: "lowercase",
  },
  brandArrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  brandContentCard: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 112,
  },
  brandLabel: {
    fontSize: 15,
    color: COLORS.textDark,
    fontWeight: "900",
    fontFamily: FONT,
    marginBottom: 5,
    letterSpacing: -0.2,
  },
  brandTagline: {
    fontSize: 11.5,
    color: COLORS.textMid,
    fontWeight: "600",
    fontFamily: FONT,
    lineHeight: 16,
  },
  brandFooterRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  brandShopPill: {
    backgroundColor: COLORS.offWhite,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  brandShopPillText: {
    fontSize: 11,
    fontWeight: "900",
    fontFamily: FONT,
  },
  brandCollectionHint: {
    fontSize: 10.5,
    color: COLORS.textLight,
    fontWeight: "800",
    fontFamily: FONT,
  },

  latestSection: {
    marginTop: 14,
    backgroundColor: COLORS.white,
    paddingVertical: 17,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  latestSeeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.blue,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 2,
  },
  latestSeeAllText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: "900",
    fontFamily: FONT,
  },
  latestHeroStrip: {
    marginHorizontal: 16,
    marginBottom: 15,
    borderRadius: 22,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 15,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  latestEyebrow: {
    fontSize: 10,
    color: COLORS.blue,
    textTransform: "uppercase",
    letterSpacing: 0.9,
    fontWeight: "900",
    fontFamily: FONT,
    marginBottom: 4,
  },
  latestHeroTitle: {
    fontSize: 15,
    color: COLORS.textDark,
    fontWeight: "900",
    fontFamily: FONT,
    letterSpacing: -0.2,
  },
  latestHeroIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.blueLight,
    alignItems: "center",
    justifyContent: "center",
  },
  latestRow: {
    paddingHorizontal: 12,
    gap: 13,
  },
  themeSection:{paddingVertical:22,backgroundColor:COLORS.white},
  themeCustomHeader:{paddingHorizontal:18,marginBottom:14},
  themeCustomTitle:{color:COLORS.textDark,fontSize:22,fontWeight:"900",fontFamily:FONT,textAlign:"center"},
  themeSubtitle:{paddingHorizontal:18,color:COLORS.textMid,fontSize:13,lineHeight:20,textAlign:"center",fontFamily:FONT},
  themeGrid:{paddingHorizontal:14,gap:12},
  themeCard:{width:SCREEN_W*.68,maxWidth:310,borderRadius:12,overflow:"hidden",backgroundColor:COLORS.offWhite},
  themeCardImage:{width:"100%",aspectRatio:1.25},
  themeCardLabel:{paddingHorizontal:12,paddingVertical:10,color:COLORS.textDark,fontSize:13,fontWeight:"800",fontFamily:FONT},
  themeBannerImage:{width:"100%",alignSelf:"center",backgroundColor:COLORS.offWhite},
  themeButton:{alignSelf:"center",marginTop:13,paddingHorizontal:17,paddingVertical:10,borderRadius:7,backgroundColor:COLORS.blueLight},
  themeButtonText:{color:COLORS.blue,fontSize:12,fontWeight:"900",fontFamily:FONT},
  themeMediaTextSection:{backgroundColor:COLORS.white},
  themeMediaTextContent:{alignItems:"center",paddingHorizontal:15,paddingTop:28,paddingBottom:15},
  themeMediaTextTitle:{color:COLORS.textDark,fontSize:30,lineHeight:37,fontWeight:"500",fontFamily:FONT,textAlign:"center",marginBottom:10},
  themeMediaTextSubtitle:{color:COLORS.textMid,fontSize:16,lineHeight:24,fontWeight:"400",fontFamily:FONT,textAlign:"center",marginBottom:25},
  themeMediaTextButton:{alignSelf:"center",minHeight:44,justifyContent:"center",paddingHorizontal:22,paddingVertical:11,borderRadius:5,backgroundColor:"#06a2e4"},
  themeMediaTextButtonText:{color:COLORS.white,fontSize:14,fontWeight:"800",fontFamily:FONT},

  menuBackdrop: { flex: 1, backgroundColor: "rgba(11, 30, 66, 0.38)" },
  bottomNavigation: { position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 90, flexDirection: "row", backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 8, paddingBottom: Platform.OS === "ios" ? 22 : 10, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 18 },
  bottomNavItem: { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", gap: 4 },
  bottomNavLabel: { color: COLORS.textLight, fontSize: 10, fontWeight: "700", fontFamily: FONT },
  bottomNavLabelActive: { color: COLORS.blue, fontWeight: "900" },
  bottomCartBadge: { position: "absolute", right: -10, top: -8, minWidth: 17, height: 17, paddingHorizontal: 3, borderRadius: 9, backgroundColor: COLORS.pinkAccent, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: COLORS.white },
  bottomNotificationBadge: { position: "absolute", right: -10, top: -8, minWidth: 17, height: 17, paddingHorizontal: 3, borderRadius: 9, backgroundColor: COLORS.pinkAccent, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: COLORS.white },
  bottomCartBadgeText: { color: COLORS.white, fontSize: 8, fontWeight: "900" },
  navigationMenu: { width: "86%", maxWidth: 360, height: "100%", backgroundColor: COLORS.white, paddingTop: Platform.OS === "ios" ? 54 : 34, paddingHorizontal: 18, shadowColor: "#000", shadowOffset: { width: 5, height: 0 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 20 },
  menuHeader: { height: 60, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: 12 },
  menuTitle: { color: COLORS.textDark, fontSize: 22, fontWeight: "900", fontFamily: FONT },
  menuClose: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  menuItem: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 14, borderRadius: 10, marginBottom: 5 },
  menuItemActive: { backgroundColor: COLORS.blueLight },
  menuLabel: { flex: 1, color: COLORS.textMid, fontSize: 16, fontWeight: "700", fontFamily: FONT },
  menuLabelActive: { color: COLORS.blue, fontWeight: "900" },
  categoryDropdown: { marginLeft: 18, marginRight: 6, marginBottom: 10, borderLeftWidth: 2, borderLeftColor: COLORS.blueLight, paddingLeft: 12, maxHeight: 430 },
  categoryGroup: { minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 10 },
  categoryGroupTitle: { flex: 1, paddingVertical: 7 },
  categoryGroupText: { color: COLORS.textDark, fontSize: 15, fontWeight: "900", fontFamily: FONT },
  categoryAgeText: { color: COLORS.textMid, fontSize: 11, fontWeight: "700", marginTop: 2, fontFamily: FONT },
  navigationBrandLogo: { width: 112, height: 34, alignSelf: "flex-start" },
  categoryGroupLinks: { paddingLeft: 10, paddingBottom: 6 },
  categoryDropdownItem: { minHeight: 45, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: "#f2e8e3" },
  categoryDropdownText: { flex: 1, color: COLORS.textMid, fontSize: 14, fontWeight: "700", fontFamily: FONT },
  categorySectionText: { flex: 1, color: COLORS.textDark, fontSize: 14, fontWeight: "900", fontFamily: FONT },
  categoryLeafItem: { minHeight: 38, justifyContent: "center", paddingLeft: 22, paddingRight: 8, borderBottomWidth: 1, borderBottomColor: "#f6efeb" },
  specialMenuText: { color: COLORS.sale },
  categoryDropdownEmpty: { color: COLORS.textLight, fontSize: 13, paddingVertical: 14 },
});
