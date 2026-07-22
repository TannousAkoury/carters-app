import { getCollectionDetails, getProducts, type ShopifyCollectionDetails } from "@/services/shopify";
import { useEvent } from "expo";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useState } from "react";
import { useProductFilters } from "@/features/collection/use-product-filters";
import { useCurrency } from "@/components/currency-context";
import { salePercentage } from "@/utils/pricing";
import { ActivityIndicator, FlatList, Image, ImageBackground, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

type Product = {
  id: string;
  title: string;
  price: string;
  oldPrice: string | null;
  image: string;
  tag: "NEW" | "SALE" | null;
  handle?: string;
  availableForSale?: boolean;
  brand?: string;
  sizes?: string[];
  minPrice?: number;
  maxPrice?: number;
};

function CollectionBannerCopy({title}:{title:string}){
  return <View style={styles.collectionBannerContent}><Text style={styles.collectionBannerTitle}>{title.toUpperCase()}</Text><View style={styles.collectionBreadcrumb}><Text style={styles.collectionBreadcrumbHome}>Home</Text><Text style={styles.collectionBreadcrumbSlash}>/</Text><Text style={styles.collectionBreadcrumbCurrent} numberOfLines={1}>{title.toUpperCase()}</Text></View></View>;
}

function CollectionVideoBanner({uri,poster}:{uri:string;poster?:string}){
  const player=useVideoPlayer(uri,current=>{current.loop=true;current.muted=true;current.audioMixingMode="mixWithOthers";current.play()});
  const {status}=useEvent(player,"statusChange",{status:player.status});
  return <View style={styles.collectionBanner}>{poster?<Image source={{uri:poster}} style={StyleSheet.absoluteFill} resizeMode="cover"/>:null}<VideoView player={player} style={[StyleSheet.absoluteFill,styles.collectionBannerVideo,status!=="readyToPlay"&&styles.collectionBannerVideoLoading]} contentFit="cover" nativeControls={false} allowsFullscreen={false} playsInline surfaceType="textureView"/></View>;
}

export default function CollectionScreen() {
  const { formatMoney } = useCurrency();
  const router = useRouter();
  const params = useLocalSearchParams<{ handle: string; title?: string }>();
  const handle = Array.isArray(params.handle) ? params.handle[0] : params.handle;
  const title = Array.isArray(params.title) ? params.title[0] : params.title;
  const [products, setProducts] = useState<Product[]>([]);
  const [collection, setCollection] = useState<ShopifyCollectionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterVisible, setFilterVisible] = useState(false);
  const { availability, setAvailability, sort, setSort, minimumPrice, setMinimumPrice, maximumPrice, setMaximumPrice, selectedBrands, selectedSizes, brands, sizes, visibleProducts, toggleBrand, toggleSize, clearFilters } = useProductFilters(products);
  const bannerImage=collection?.bannerImage;
  const collectionTitle=collection?.title||title||handle;

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");

    const isAllProducts = handle === "all-products";
    Promise.all([
      getProducts(isAllProducts ? undefined : handle),
      isAllProducts ? Promise.resolve(null) : getCollectionDetails(handle),
    ])
      .then(([items, details]) => {
        if (mounted) { setProducts(items); setCollection(details); }
      })
      .catch(() => mounted && setError("Unable to load this collection right now."))
      .finally(() => mounted && setLoading(false));

    return () => { mounted = false; };
  }, [handle]);

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={23} color="#002041" />
        </TouchableOpacity>
      </View>

      {collection?.bannerVideo?<CollectionVideoBanner key={collection.bannerVideo} uri={collection.bannerVideo} poster={collection.bannerVideoPoster||bannerImage}/>:bannerImage?<ImageBackground source={{uri:bannerImage}} style={styles.collectionBanner} imageStyle={styles.collectionBannerImage} resizeMode="cover"><View style={styles.collectionBannerOverlay}><CollectionBannerCopy title={collectionTitle}/></View></ImageBackground>:<LinearGradient colors={["#173b59","#0b2b48","#173a58"]} start={{x:0,y:.5}} end={{x:1,y:.5}} style={styles.collectionBanner}><View style={[styles.collectionBannerTexture,styles.collectionBannerTextureOne]}/><View style={[styles.collectionBannerTexture,styles.collectionBannerTextureTwo]}/><CollectionBannerCopy title={collectionTitle}/></LinearGradient>}

      {!loading && !error ? (
        <View style={styles.toolbar}>
          <Text style={styles.resultCount}>{visibleProducts.length} PRODUCTS</Text>
          <TouchableOpacity style={styles.filterLabel} onPress={() => setFilterVisible(true)}>
            <Ionicons name="options-outline" size={17} color="#002041" />
            <Text style={styles.filterText}>FILTER & SORT</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#06A2E4" />
          <Text style={styles.status}>Loading products…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}><Text style={styles.error}>{error}</Text></View>
      ) : (
        <FlatList
          data={visibleProducts}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          ListEmptyComponent={<Text style={styles.empty}>No products found in this collection.</Text>}
          renderItem={({ item }) => {
            const discount = salePercentage(item.minPrice ?? item.price, item.oldPrice);
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.86}
                onPress={() => item.handle && router.push({ pathname: "/product/[handle]", params: { handle: item.handle, size: selectedSizes.length === 1 ? selectedSizes[0] : undefined } })}
              >
                <View style={styles.imageWrap}>
                  <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
                  {discount ? <Text style={[styles.tag, styles.saleTag]}>-{discount}%</Text> : item.tag === "NEW" ? <Text style={styles.tag}>NEW</Text> : null}
                </View>
                <Text style={styles.productTitle} numberOfLines={2}>{item.title}</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.price}>{formatMoney({ amount: String(item.minPrice ?? Number(item.price.replace(/[^0-9.]/g, ""))), currencyCode: "USD" })}</Text>
                  {item.oldPrice ? <Text style={styles.oldPrice}>{formatMoney({ amount: String(Number(item.oldPrice.replace(/[^0-9.]/g, ""))), currencyCode: "USD" })}</Text> : null}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
      <Modal visible={filterVisible} transparent animationType="slide" onRequestClose={() => setFilterVisible(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setFilterVisible(false)}>
          <View style={styles.filterSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHeader}><Text style={styles.sheetTitle}>Filter & Sort</Text><TouchableOpacity onPress={() => setFilterVisible(false)}><Ionicons name="close" size={25} color="#26364d" /></TouchableOpacity></View>
            <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.optionHeading}>Availability</Text>
            <View style={styles.optionRow}>{([['all', 'All products'], ['in-stock', 'In stock']] as const).map(([value, label]) => <TouchableOpacity key={value} style={[styles.chip, availability === value && styles.chipActive]} onPress={() => setAvailability(value)}><Text style={[styles.chipText, availability === value && styles.chipTextActive]}>{label}</Text></TouchableOpacity>)}</View>
            <Text style={styles.optionHeading}>Price range</Text>
            <View style={styles.priceInputs}><View style={styles.priceInputWrap}><Text style={styles.currency}>$</Text><TextInput style={styles.priceInput} placeholder="Min" keyboardType="decimal-pad" value={minimumPrice} onChangeText={(value) => setMinimumPrice(value.replace(/[^0-9.]/g, ""))} /></View><Text style={styles.priceDash}>—</Text><View style={styles.priceInputWrap}><Text style={styles.currency}>$</Text><TextInput style={styles.priceInput} placeholder="Max" keyboardType="decimal-pad" value={maximumPrice} onChangeText={(value) => setMaximumPrice(value.replace(/[^0-9.]/g, ""))} /></View></View>
            {brands.length ? <><Text style={styles.optionHeading}>Brand</Text><View style={styles.wrapOptions}>{brands.map((brand) => <TouchableOpacity key={brand} style={[styles.chip, selectedBrands.includes(brand) && styles.chipActive]} onPress={() => toggleBrand(brand)}><Text style={[styles.chipText, selectedBrands.includes(brand) && styles.chipTextActive]}>{brand}</Text></TouchableOpacity>)}</View></> : null}
            {sizes.length ? <><Text style={styles.optionHeading}>Size</Text><View style={styles.wrapOptions}>{sizes.map((size) => <TouchableOpacity key={size} style={[styles.sizeChip, selectedSizes.includes(size) && styles.chipActive]} onPress={() => toggleSize(size)}><Text style={[styles.chipText, selectedSizes.includes(size) && styles.chipTextActive]}>{size}</Text></TouchableOpacity>)}</View></> : null}
            <Text style={styles.optionHeading}>Sort by</Text>
            {([['featured', 'Featured'], ['price-low', 'Price: low to high'], ['price-high', 'Price: high to low'], ['az', 'Name: A–Z']] as const).map(([value, label]) => <TouchableOpacity key={value} style={styles.sortOption} onPress={() => setSort(value)}><Text style={[styles.sortText, sort === value && styles.sortTextActive]}>{label}</Text>{sort === value ? <Ionicons name="checkmark-circle" size={21} color="#002041" /> : null}</TouchableOpacity>)}
            </ScrollView>
            <View style={styles.sheetActions}><TouchableOpacity style={styles.clearButton} onPress={clearFilters}><Text style={styles.clearText}>Clear</Text></TouchableOpacity><TouchableOpacity style={styles.applyButton} onPress={() => setFilterVisible(false)}><Text style={styles.applyText}>Show {visibleProducts.length}</Text></TouchableOpacity></View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 15, paddingBottom: 18, gap: 13, borderBottomWidth: 1, borderBottomColor: "#e8e8e8" },
  back: { width: 38, height: 38, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  toolbar: { height: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 17, borderBottomWidth: 1, borderBottomColor: "#e8e8e8" },
  collectionBanner:{height:190,overflow:"hidden",alignItems:"center",justifyContent:"center",backgroundColor:"#123551"},
  collectionBannerImage:{opacity:.96},
  collectionBannerVideo:{backgroundColor:"transparent"},
  collectionBannerVideoLoading:{opacity:0},
  collectionBannerOverlay:{width:"100%",height:"100%",alignItems:"center",justifyContent:"center",paddingHorizontal:22,backgroundColor:"rgba(4,31,54,.58)"},
  collectionBannerContent:{zIndex:2,alignItems:"center",paddingHorizontal:22},
  collectionBannerTexture:{position:"absolute",top:-45,bottom:-45,width:92,backgroundColor:"rgba(255,255,255,.018)",transform:[{rotate:"7deg"}]},
  collectionBannerTextureOne:{left:"18%"},
  collectionBannerTextureTwo:{right:"19%",width:130,backgroundColor:"rgba(0,18,34,.11)",transform:[{rotate:"-5deg"}]},
  collectionBannerTitle:{maxWidth:"100%",color:"#fff",fontSize:30,lineHeight:38,fontWeight:"700",letterSpacing:.6,textAlign:"center",textShadowColor:"rgba(0,0,0,.18)",textShadowOffset:{width:0,height:1},textShadowRadius:2},
  collectionBreadcrumb:{maxWidth:"100%",flexDirection:"row",alignItems:"center",justifyContent:"center",gap:9,marginTop:15},
  collectionBreadcrumbHome:{color:"#fff",fontSize:12,fontWeight:"600"},
  collectionBreadcrumbSlash:{color:"rgba(255,255,255,.7)",fontSize:14},
  collectionBreadcrumbCurrent:{maxWidth:"72%",color:"#fff",fontSize:12,fontWeight:"800"},
  resultCount: { color: "#667085", fontSize: 10, fontWeight: "700", letterSpacing: 0.6 },
  filterLabel: { flexDirection: "row", alignItems: "center", gap: 6 },
  filterText: { color: "#002041", fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30 },
  status: { color: "#647086", marginTop: 12 },
  error: { color: "#c5524a", textAlign: "center", fontSize: 15 },
  grid: { paddingHorizontal: 10, paddingTop: 14, paddingBottom: 30 },
  row: { gap: 10 },
  card: { flex: 1, marginBottom: 22, maxWidth: "48.7%" },
  imageWrap: { aspectRatio: 0.82, overflow: "hidden", backgroundColor: "#f5f5f5" },
  image: { width: "100%", height: "100%" },
  tag: { position: "absolute", left: 7, top: 7, color: "#fff", backgroundColor: "#002041", paddingHorizontal: 8, paddingVertical: 4, fontSize: 9, fontWeight: "900" },
  saleTag: { backgroundColor: "#d64545" },
  productTitle: { color: "#30343b", fontSize: 12, fontWeight: "600", lineHeight: 17, marginTop: 9 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 5 },
  price: { color: "#002041", fontSize: 13, fontWeight: "800" },
  oldPrice: { color: "#9a8f8b", fontSize: 11, textDecorationLine: "line-through" },
  empty: { color: "#647086", textAlign: "center", marginTop: 80, width: "100%" },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(11,30,66,0.4)" }, filterSheet: { maxHeight: "92%", backgroundColor: "#fff", borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 30 }, sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }, sheetTitle: { color: "#17243a", fontSize: 21, fontWeight: "900" }, optionHeading: { color: "#303b4d", fontSize: 13, fontWeight: "900", marginTop: 8, marginBottom: 8 }, optionRow: { flexDirection: "row", gap: 9, marginBottom: 8 }, wrapOptions: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 6 }, chip: { borderWidth: 1, borderColor: "#ccd5df", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 }, sizeChip: { minWidth: 48, borderWidth: 1, borderColor: "#ccd5df", borderRadius: 7, paddingHorizontal: 10, paddingVertical: 8, alignItems: "center" }, chipActive: { backgroundColor: "#002041", borderColor: "#002041" }, chipText: { color: "#526074", fontWeight: "700" }, chipTextActive: { color: "#fff" }, priceInputs: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 8 }, priceInputWrap: { flex: 1, height: 44, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#ccd5df", borderRadius: 7, paddingHorizontal: 11 }, currency: { color: "#526074", fontWeight: "800" }, priceInput: { flex: 1, height: "100%", paddingLeft: 6, color: "#26364d" }, priceDash: { color: "#8994a3" }, sortOption: { height: 42, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#eee" }, sortText: { color: "#657083" }, sortTextActive: { color: "#002041", fontWeight: "900" }, sheetActions: { flexDirection: "row", gap: 10, marginTop: 16 }, clearButton: { width: 95, height: 50, borderRadius: 7, borderWidth: 1, borderColor: "#002041", alignItems: "center", justifyContent: "center" }, clearText: { color: "#002041", fontWeight: "900" }, applyButton: { flex: 1, height: 50, borderRadius: 7, backgroundColor: "#002041", alignItems: "center", justifyContent: "center" }, applyText: { color: "#fff", fontWeight: "900", fontSize: 15 },
});
