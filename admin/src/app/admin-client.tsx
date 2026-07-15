"use client";
/* eslint-disable @next/next/no-img-element */

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import baseStyles from "./page.module.css";
import extraStyles from "./admin-extra.module.css";
import AnalyticsDateRangePicker, { type AnalyticsDateRange } from "./analytics-date-range-picker";

const styles = Object.fromEntries(
  [...new Set([...Object.keys(baseStyles), ...Object.keys(extraStyles)])].map((className) => [
    className,
    [baseStyles[className], extraStyles[className]].filter(Boolean).join(" "),
  ]),
) as typeof baseStyles & typeof extraStyles;

type SectionType = "hero" | "text" | "products" | "announcement";
type Section = {
  id: string;
  type: SectionType;
  title: string;
  subtitle: string;
  image: string;
  buttonLabel: string;
  background: string;
  enabled: boolean;
  placement?: Placement;
  customCss?: string;
};
type View = "dashboard" | "editor" | "inventory" | "promotions" | "analytics" | "marketing" | "orders" | "customers" | "chat" | "team" | "settings";
type OrderFilter = "all" | "pending" | "unfulfilled" | "unpaid" | "paid" | "cancelled";
type Placement = "before-hero" | "after-hero" | "after-promos" | "after-ages" | "after-top-picks" | "after-categories" | "after-explore" | "after-essentials" | "after-brands" | "after-latest";
type AdminRole = { id: string; name: string; scope: string; description: string; members: number };
type StaffUser = { id: string; email: string; role: string; status: "invited" | "active"; inviteExpiresAt?: string; createdAt: string; updatedAt: string };
type AdminCustomer = { id:string; name:string; firstName:string; lastName:string; email:string; phone:string; location:string; orders:number; totalSpent?:{amount:string;currencyCode:string}|null; status:string; lastOrderAt?:string|null; createdAt?:string|null; updatedAt?:string|null };
type OrderAddress = { firstName:string; lastName:string; address1:string; address2:string; city:string; province:string; zip:string; country:string; phone:string };
type OrderLineItem = { name:string; quantity:number; sku?:string|null; variantTitle?:string|null; image?:{url?:string|null;altText?:string|null}|null };
type AdminOrder = { id:string; name:string; createdAt:string; financialStatus:string; fulfillmentStatus:string; canMarkAsPaid:boolean; cancelledAt?:string|null; note:string; tags:string[]; total?:{amount:string;currencyCode:string}|null; customer:string; email:string; destination:string; shippingAddress:OrderAddress; items:OrderLineItem[] };
type OrderDraft = { email:string; note:string; tags:string; shippingAddress:OrderAddress };
type InventoryLevel = { locationId:string; locationName:string; quantity:number };
type VariantOption = { name:string; value:string; optionValueId?:string };
type InventoryItem = { id:string; productId:string; inventoryItemId:string; name:string; product:string; descriptionHtml:string; vendor:string; productType:string; tags:string[]; seoTitle:string; seoDescription:string; variant:string; selectedOptions:VariantOption[]; sku:string; barcode:string; price:string; compareAtPrice:string; quantity:number; policy:string; tracked:boolean; levels:InventoryLevel[]; availableForSale:boolean; productStatus:string; image?:{url?:string|null;altText?:string|null}|null; updatedAt?:string };
type InventoryLocation = { id:string; name:string; isActive:boolean };
type ProductDraft = { title:string; descriptionHtml:string; vendor:string; productType:string; tags:string; seoTitle:string; seoDescription:string; status:string; options:VariantOption[]; sku:string; barcode:string; price:string; compareAtPrice:string; inventoryPolicy:string; tracked:boolean };
type Promotion = { id:string; title:string; type:string; code:string; status:string; startsAt?:string|null; endsAt?:string|null; usageCount:number; valueType?:"percentage"|"fixed"; value?:number; minimumSubtotal?:string; usageLimit?:number|null; appliesOncePerCustomer?:boolean; editable?:boolean; valueEditable?:boolean };
type PromotionDraft = { method:"code"|"automatic"; title:string; code:string; valueType:"percentage"|"fixed"; value:string; minimumSubtotal:string; usageLimit:string; startsAt:string; endsAt:string; appliesOncePerCustomer:boolean };
type AppAnalytics = {
  range:{days:number;start:string;end:string};
  metrics:{uniqueDevices:number;sessions:number;screenViews:number;productViews:number;cartViews:number;viewsPerSession:number;bounceRate:number;activeDevices24h:number;notificationOpens:number;pushDevices:number};
  changes:{uniqueDevices:number;sessions:number;screenViews:number;productViews:number;cartViews:number};
  daily:{date:string;label:string;devices:number;sessions:number;views:number;productViews:number;cartViews:number}[];
  screens:{path:string;label:string;views:number;devices:number;share:number}[];
  topProducts:{path:string;handle:string;label:string;views:number;devices:number;image?:{url:string;altText:string}|null}[];
  platforms:{label:string;value:number}[];
  audience:{label:string;value:number}[];
  funnel:{label:string;value:number;rate:number}[];
  hours:{hour:number;value:number}[];
  generatedAt:string;
  recordingSince:string|null;
};
type CommerceAnalytics = {
  range:{days:number;start:string;end:string};
  currencyCode:string;
  totals:{sales:number;revenue:number;customers:number;orders:number;refunds:number;discounts:number;itemsSold:number;averageOrderValue:number};
  daily:{date:string;label:string;sales:number;revenue:number;customers:number;orders:number;refunds:number;discounts:number;itemsSold:number;averageOrderValue:number}[];
  topProducts:{title:string;quantity:number;sales:number}[];
  fulfillment:{label:string;value:number}[];
  financial:{label:string;value:number}[];
  sources:{label:string;value:number}[];
  customerTypes:{label:string;value:number}[];
  topCustomers:{id:string;name:string;email:string;orders:number;totalSpent:number;averageOrderValue:number;lastOrderAt:string;accountState:string;accountType:string;orderSource:string}[];
  truncated:boolean;
  generatedAt:string;
};
type CustomerDraft = { firstName:string; lastName:string; email:string; phone:string };
const placements: { value: Placement; label: string }[] = [
  { value:"before-hero",label:"Before Shopify hero" },{ value:"after-hero",label:"After Shopify hero" },{ value:"after-promos",label:"After promo strip" },{ value:"after-ages",label:"After age groups" },{ value:"after-top-picks",label:"After top picks" },{ value:"after-categories",label:"After shop categories" },{ value:"after-explore",label:"After explore styles" },{ value:"after-essentials",label:"After tiny essentials" },{ value:"after-brands",label:"After brands" },{ value:"after-latest",label:"After latest collection" },
];
const shopifySections: { name:string; after:Placement }[] = [{name:"Hero banners",after:"after-hero"},{name:"Promo strip",after:"after-promos"},{name:"Age groups",after:"after-ages"},{name:"Top picks",after:"after-top-picks"},{name:"Shop categories",after:"after-categories"},{name:"Explore styles",after:"after-explore"},{name:"Tiny essentials",after:"after-essentials"},{name:"Our brands",after:"after-brands"},{name:"Latest collection",after:"after-latest"}];

const defaults: Section[] = [
  { id: "hero-1", type: "hero", title: "Made for little adventures", subtitle: "Discover soft, playful styles for every day.", image: "https://images.unsplash.com/photo-1522771930-78848d9293e8?auto=format&fit=crop&w=900&q=80", buttonLabel: "Shop new arrivals", background: "#f9e7df", enabled: true },
  { id: "notice-1", type: "announcement", title: "Free delivery on orders over $50", subtitle: "", image: "", buttonLabel: "", background: "#0d416c", enabled: true },
  { id: "products-1", type: "products", title: "Top picks this week", subtitle: "Popular with Carter's families", image: "", buttonLabel: "View all", background: "#ffffff", enabled: true },
];

const sectionNames: Record<SectionType, string> = { hero: "Hero banner", text: "Text block", products: "Product carousel", announcement: "Announcement" };
const customCssExample=`.section {
  padding: 24px;
  border-radius: 12px;
}
.title {
  color: #0b2944;
  font-size: 28px;
}
.description {
  color: #61707d;
}
.button {
  background-color: #397ab5;
  color: #ffffff;
  border-radius: 8px;
}`;
type PreviewCustomStyles={section:CSSProperties;title:CSSProperties;description:CSSProperties;button:CSSProperties};
function parsePreviewCustomCss(source=""):PreviewCustomStyles{
  const result:PreviewCustomStyles={section:{},title:{},description:{},button:{}};
  const allowed:Record<keyof PreviewCustomStyles,Record<string,keyof CSSProperties>>={
    section:{"background-color":"backgroundColor",padding:"padding","padding-top":"paddingTop","padding-right":"paddingRight","padding-bottom":"paddingBottom","padding-left":"paddingLeft",margin:"margin","margin-top":"marginTop","margin-bottom":"marginBottom","border-radius":"borderRadius","border-width":"borderWidth","border-color":"borderColor","min-height":"minHeight"},
    title:{color:"color","font-size":"fontSize","font-weight":"fontWeight","text-align":"textAlign","line-height":"lineHeight","margin-bottom":"marginBottom"},
    description:{color:"color","font-size":"fontSize","font-weight":"fontWeight","text-align":"textAlign","line-height":"lineHeight","margin-top":"marginTop"},
    button:{"background-color":"backgroundColor",color:"color","font-size":"fontSize","font-weight":"fontWeight","border-radius":"borderRadius",padding:"padding","padding-left":"paddingLeft","padding-right":"paddingRight","padding-top":"paddingTop","padding-bottom":"paddingBottom","margin-top":"marginTop"},
  };
  for(const block of source.matchAll(/\.(section|title|description|button)\s*\{([^}]*)\}/gi)){
    const group=block[1].toLowerCase() as keyof PreviewCustomStyles;
    for(const declaration of block[2].split(";")){const separator=declaration.indexOf(":");if(separator<0)continue;const property=declaration.slice(0,separator).trim().toLowerCase();const value=declaration.slice(separator+1).trim();const key=allowed[group][property];if(key&&value&&!/url\s*\(|@import|expression\s*\(/i.test(value))(result[group] as Record<string,string>)[key]=value}
  }
  return result;
}
function newSection(type: SectionType): Section {
  return { id: `${type}-${Date.now()}`, type, title: sectionNames[type], subtitle: type === "text" ? "Write your message here." : "", image: "", buttonLabel: type === "announcement" ? "" : "Learn more", background: type === "announcement" ? "#0d416c" : "#ffffff", enabled: true, placement: "before-hero" };
}

export default function Home() {
  const [view, setView] = useState<View>("dashboard");
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("all");
  const [sections, setSections] = useState<Section[]>(defaults);
  const [selectedId, setSelectedId] = useState(defaults[0].id);
  const [saved, setSaved] = useState(true);
  const [publishedAt, setPublishedAt] = useState("Not published yet");
  const [publishMessage, setPublishMessage] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const draft = localStorage.getItem("carters-admin-draft");
    const published = localStorage.getItem("carters-admin-published-at");
    // Hydrate the browser-only draft after the initial server render.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (draft) { try { setSections(JSON.parse(draft)); } catch { /* keep defaults */ } }
    if (published) setPublishedAt(published);
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const selected = useMemo(() => sections.find((item) => item.id === selectedId), [sections, selectedId]);
  const pageTitles: Record<View, { title: string; copy: string }> = {
    dashboard: { title: "Command center", copy: "Monitor app health, traffic, and publishing status." },
    editor: { title: "App editor", copy: "Arrange custom content around live Shopify sections." },
    inventory: { title: "Inventory", copy: "Monitor Shopify product variants and stock levels." },
    promotions: { title: "Promotions", copy: "Review Shopify discount codes and automatic offers." },
    analytics: { title: "Analytics", copy: "Understand app traffic and customer engagement." },
    marketing: { title: "Marketing", copy: "Create push campaigns and review notification performance." },
    orders: { title: "Orders", copy: "Review live orders from Shopify." },
    customers: { title: "Customers", copy: "Prepare Shopify-backed customer operations." },
    chat: { title: "Customer chat", copy: "Review support readiness and realtime connection state." },
    team: { title: "Team & activity", copy: "Manage admin roles and audit readiness." },
    settings: { title: "Settings", copy: "Configure production connections and app controls." },
  };
  const update = (patch: Partial<Section>) => {
    setSections((items) => items.map((item) => item.id === selectedId ? { ...item, ...patch } : item));
    setSaved(false);
  };
  const saveDraft = () => { localStorage.setItem("carters-admin-draft", JSON.stringify(sections)); setSaved(true); };
  const logout = async () => { await fetch("/api/logout", { method: "POST" }); window.location.href = "/login"; };
  const publish = async () => {
    setPublishMessage("Publishing…");
    try {
      const response = await fetch("/api/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sections }) });
      if (!response.ok) throw new Error("Publish failed");
      const result = await response.json();
      const stamp = new Date(result.publishedAt).toLocaleString();
      localStorage.setItem("carters-admin-published", JSON.stringify(sections));
      localStorage.setItem("carters-admin-published-at", stamp);
      setPublishedAt(stamp); setSaved(true); setPublishMessage("Published to app ✓");
    } catch { setPublishMessage("Unable to publish"); }
  };
  const move = (index: number, direction: -1 | 1) => {
    const next = index + direction; if (next < 0 || next >= sections.length) return;
    setSections((items) => { const copy = [...items]; [copy[index], copy[next]] = [copy[next], copy[index]]; return copy; });
    setSaved(false);
  };
  const remove = (id: string) => {
    setSections((items) => items.filter((item) => item.id !== id));
    if (selectedId === id) setSelectedId(sections.find((item) => item.id !== id)?.id ?? "");
    setSaved(false);
  };
  const duplicate = (id: string) => {
    const source=sections.find(item=>item.id===id);if(!source)return;const copy={...source,id:`${source.type}-${Date.now()}`,title:`${source.title} copy`};
    setSections((items) => { const index=items.findIndex(item=>item.id===id);const next=[...items];next.splice(index+1,0,copy);return next; });
    setSelectedId(copy.id);
    setSaved(false);
  };
  const setSectionVisibility = (id:string,enabled:boolean) => { setSections(items=>items.map(item=>item.id===id?{...item,enabled}:item));setSaved(false); };
  const add = (type: SectionType, placement: Placement = "before-hero") => { const item = { ...newSection(type), placement }; setSections((items) => [...items, item]); setSelectedId(item.id); setSaved(false); };
  const openOrders = (filter: OrderFilter = "all") => { setOrderFilter(filter); setView("orders"); };

  if (!ready) return null;
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <Image className={styles.brandLogo} src="/carters-logo.png" alt="Carter's and OshKosh B'gosh" width={306} height={91} priority />
        </div>
        <nav className={styles.nav}>
          <Nav active={view === "dashboard"} onClick={() => setView("dashboard")} icon="⌂" label="Dashboard" />
          <Nav active={view === "editor"} onClick={() => setView("editor")} icon="✦" label="App editor" />
          <Nav active={view === "inventory"} onClick={() => setView("inventory")} icon="▦" label="Inventory" />
          <Nav active={view === "promotions"} onClick={() => setView("promotions")} icon="%" label="Promotions" />
          <Nav active={view === "analytics"} onClick={() => setView("analytics")} icon="↗" label="Analytics" />
          <Nav active={view === "marketing"} onClick={() => setView("marketing")} icon="◈" label="Marketing" />
          <Nav active={view === "orders"} onClick={() => openOrders("all")} icon="▤" label="Orders" />
          <Nav active={view === "customers"} onClick={() => setView("customers")} icon="♙" label="Customers" />
          <Nav active={view === "chat"} onClick={() => setView("chat")} icon="◌" label="Customer chat" badge="3" />
          <Nav active={view === "team"} onClick={() => setView("team")} icon="☷" label="Team & activity" />
          <Nav active={view === "settings"} onClick={() => setView("settings")} icon="⚙" label="Settings" />
        </nav>
        <div className={styles.sidebarFoot}><span className={styles.avatar}>CA</span><div><strong>Store admin</strong><small>Administrator</small></div></div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}><div className={styles.topbarTitle}><p className={styles.eyebrow}>CARTER&apos;S MOBILE APP</p><h1>{pageTitles[view].title}</h1><small>{pageTitles[view].copy}</small></div><div className={styles.topActions}><span className={styles.statusDot}>{publishMessage || "● App live"}</span>{view === "editor" && <><button className={styles.secondary} onClick={saveDraft}>{saved ? "Draft saved" : "Save draft"}</button><button className={styles.primary} onClick={publish}>Publish changes</button></>}<button className={styles.secondary} onClick={logout}>Log out</button></div></header>
        {view === "dashboard" && <Dashboard setView={setView} openOrders={openOrders} publishedAt={publishedAt} />}
        {view === "editor" && <Editor sections={sections} selected={selected} selectedId={selectedId} setSelectedId={setSelectedId} update={update} move={move} remove={remove} duplicate={duplicate} setSectionVisibility={setSectionVisibility} add={add} />}
        {view === "inventory" && <Inventory />}
        {view === "promotions" && <Promotions />}
        {view === "analytics" && <Analytics />}
        {view === "marketing" && <Marketing />}
        {view === "orders" && <Orders initialFilter={orderFilter} />}
        {view === "customers" && <Customers />}
        {view === "chat" && <Chat />}
        {view === "team" && <Team />}
        {view === "settings" && <Settings />}
      </main>
    </div>
  );
}

function Nav({ active, onClick, icon, label, badge }: { active: boolean; onClick: () => void; icon: string; label: string; badge?: string }) {
  return <button className={`${styles.navItem} ${active ? styles.navActive : ""}`} onClick={onClick}><span>{icon}</span>{label}{badge && <b>{badge}</b>}</button>;
}

function DashboardCommerceChart({title,copy,value,data,color,formatPoint}:{title:string;copy:string;value:string;data:{date:string;label:string;value:number}[];color:string;formatPoint:(value:number)=>string}){
  const width=560;const height=170;const inset=12;const max=Math.max(1,...data.map(point=>point.value));const step=data.length>1?(width-inset*2)/(data.length-1):0;
  const points=data.map((point,index)=>({...point,x:inset+index*step,y:height-inset-(point.value/max)*(height-inset*2)}));
  const line=points.map(point=>`${point.x},${point.y}`).join(" ");const area=points.length?`M ${points[0].x} ${height-inset} L ${points.map(point=>`${point.x} ${point.y}`).join(" L ")} L ${points.at(-1)?.x} ${height-inset} Z`:"";const labelEvery=Math.max(1,Math.ceil(data.length/5));const gradientId=`dashboard-${title.toLowerCase().replaceAll(" ","-")}`;
  return <article className={styles.dashboardCommerceCard}><header><div><p>{title}</p><strong>{value}</strong><small>{copy}</small></div><span style={{background:`${color}18`,color}}>↗</span></header><div className={styles.dashboardCommerceChart}>{data.length?<><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title} over the last 30 days`}><defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".28"/><stop offset="100%" stopColor={color} stopOpacity=".02"/></linearGradient></defs>{[.25,.5,.75,1].map(level=><line key={level} x1={inset} x2={width-inset} y1={height-inset-level*(height-inset*2)} y2={height-inset-level*(height-inset*2)} stroke="#e9eef2"/>)}{area&&<path d={area} fill={`url(#${gradientId})`}/>}<polyline points={line} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>{points.map(point=><circle key={point.date} cx={point.x} cy={point.y} r="3" fill="#fff" stroke={color} strokeWidth="2"><title>{point.label}: {formatPoint(point.value)}</title></circle>)}</svg><div className={styles.dashboardCommerceAxis}>{data.map((point,index)=>index%labelEvery===0||index===data.length-1?<span key={point.date}>{point.label}</span>:null)}</div></>:<div className={styles.dashboardEmpty}>No commerce activity in this period</div>}</div></article>;
}

function Dashboard({ setView, openOrders, publishedAt }: { setView: (v: View) => void; openOrders: (filter: OrderFilter) => void; publishedAt: string }) {
  type Summary = { sessions:number; screenViews:number; productViews:number; cartViews:number; notificationDevices:number; purchases:number|null; days:{label:string;value:number}[] };
  type Operations = { orders:AdminOrder[]; inventory:InventoryItem[]; promotions:Promotion[]; pendingOrders:number };
  const [summary,setSummary]=useState<Summary|null>(null);
  const [operations,setOperations]=useState<Operations>({orders:[],inventory:[],promotions:[],pendingOrders:0});
  const [commerce,setCommerce]=useState<CommerceAnalytics|null>(null);
  const [loading,setLoading]=useState(true);
  const [analyticsError,setAnalyticsError]=useState("");
  const [commerceError,setCommerceError]=useState("");
  const refresh=useCallback(async()=>{
    setLoading(true);setAnalyticsError("");setCommerceError("");
    const requests=await Promise.allSettled([
      fetch("/api/analytics/summary",{cache:"no-store"}),fetch("/api/shopify/orders",{cache:"no-store"}),fetch("/api/shopify/inventory?limit=50",{cache:"no-store"}),fetch("/api/shopify/promotions",{cache:"no-store"}),fetch("/api/analytics/commerce?days=30",{cache:"no-store"}),
    ]);
    const read=async(result:PromiseSettledResult<Response>)=>{if(result.status!=="fulfilled"||!result.value.ok)return null;return result.value.json()};
    const [analytics,orders,inventory,promotions,commerceData]=await Promise.all(requests.map(read));
    if(analytics)setSummary(analytics);else setAnalyticsError("Some live dashboard data is temporarily unavailable.");
    if(commerceData)setCommerce(commerceData);else setCommerceError("Shopify commerce charts are temporarily unavailable.");
    setOperations({orders:Array.isArray(orders?.orders)?orders.orders:[],inventory:Array.isArray(inventory?.inventory)?inventory.inventory:[],promotions:Array.isArray(promotions?.promotions)?promotions.promotions:[],pendingOrders:Number(orders?.counts?.pending||0)});
    setLoading(false);
  },[]);
  useEffect(()=>{/* eslint-disable react-hooks/set-state-in-effect */void refresh();/* eslint-enable react-hooks/set-state-in-effect */},[refresh]);
  const unfulfilled=operations.orders.filter(order=>!order.cancelledAt&&order.fulfillmentStatus.toUpperCase()!=="FULFILLED").length;
  const outOfStock=operations.inventory.filter(item=>item.tracked&&item.quantity<=0).length;
  const lowStock=operations.inventory.filter(item=>item.tracked&&item.quantity>0&&item.quantity<=5).length;
  const activePromotions=operations.promotions.filter(item=>item.status==="ACTIVE").length;
  const revenue=operations.orders.reduce((sum,order)=>sum+Number(order.total?.amount||0),0);
  const currency=operations.orders.find(order=>order.total?.currencyCode)?.total?.currencyCode||"USD";
  const commerceCurrency=commerce?.currencyCode||currency;
  const formatCommerceMoney=(amount:number)=>{try{return new Intl.NumberFormat(undefined,{style:"currency",currency:commerceCurrency,maximumFractionDigits:2}).format(amount)}catch{return `${amount.toFixed(2)} ${commerceCurrency}`}};
  const metrics = [
    {value:summary?.sessions ?? "—",label:"App sessions",note:"Last 30 days",icon:"↗",tone:styles.dashboardIconBlue},
    {value:operations.orders.length||"—",label:"Recent orders",note:revenue?`${new Intl.NumberFormat(undefined,{style:"currency",currency}).format(revenue)} loaded value`:"Latest Shopify activity",icon:"▤",tone:styles.dashboardIconGreen},
    {value:operations.pendingOrders,label:"Pending orders",note:"All open Shopify orders",icon:"◷",tone:operations.pendingOrders?styles.dashboardIconAmber:styles.dashboardIconGreen,view:"pending" as OrderFilter},
    {value:summary?.notificationDevices ?? "—",label:"Push audience",note:"Registered devices",icon:"◇",tone:styles.dashboardIconPurple},
    {value:outOfStock,label:"Out of stock",note:`${lowStock} additional low-stock variants`,icon:"!",tone:outOfStock?styles.dashboardIconRed:styles.dashboardIconAmber},
  ];
  const maxDay=Math.max(1,...(summary?.days.map(day=>day.value)??[1]));
  const actionItems=[
    {count:unfulfilled,title:"Orders need fulfillment",copy:"Review the latest unfulfilled Shopify orders.",view:"orders" as View,tone:unfulfilled?styles.dashboardActionWarn:""},
    {count:outOfStock,title:"Variants are out of stock",copy:`${lowStock} more loaded variants are running low.`,view:"inventory" as View,tone:outOfStock?styles.dashboardActionDanger:""},
    {count:activePromotions,title:"Active promotions",copy:"Review offers currently available to customers.",view:"promotions" as View,tone:styles.dashboardActionBlue},
  ];
  return <div className={`${styles.content} ${styles.dashboardPage}`}>
    <section className={styles.dashboardWelcome}><div className={styles.dashboardWelcomeCopy}><div className={styles.dashboardDate}>{new Intl.DateTimeFormat(undefined,{weekday:"long",month:"long",day:"numeric"}).format(new Date())}</div><h2>Good to see you, Store admin.</h2><p>Here is what is happening across the Carter&apos;s mobile storefront.</p></div><div className={styles.dashboardHeroActions}><button className={styles.secondary} disabled={loading} onClick={()=>void refresh()}>{loading?"Refreshing…":"↻ Refresh data"}</button><button className={styles.primary} onClick={()=>setView("editor")}>Open app editor</button></div></section>
    {analyticsError&&<div className={styles.dashboardNotice}><span>!</span>{analyticsError}</div>}
    <section className={styles.dashboardMetricGrid}>{metrics.map(metric=>metric.view?<button type="button" className={`${styles.dashboardMetric} ${styles.dashboardMetricButton}`} key={metric.label} onClick={()=>openOrders(metric.view)}><div className={styles.dashboardMetricTop}><span className={`${styles.dashboardMetricIcon} ${metric.tone}`}>{metric.icon}</span><i>{loading?"Updating":"Open queue"}</i></div><p>{metric.label}</p><strong>{metric.value}</strong><small>{metric.note}</small></button>:<article className={styles.dashboardMetric} key={metric.label}><div className={styles.dashboardMetricTop}><span className={`${styles.dashboardMetricIcon} ${metric.tone}`}>{metric.icon}</span><i>{loading?"Updating":"Live"}</i></div><p>{metric.label}</p><strong>{metric.value}</strong><small>{metric.note}</small></article>)}</section>
    <section className={styles.dashboardMainGrid}>
      <article className={`${styles.dashboardCard} ${styles.dashboardChartCard}`}><header className={styles.dashboardCardHeader}><div><h3>App engagement</h3><p>Recorded sessions over the last 7 days</p></div><button onClick={()=>setView("analytics")}>View analytics →</button></header><div className={styles.dashboardChartSummary}><div><strong>{summary?.sessions??"—"}</strong><span>Total sessions · 30 days</span></div><div><strong>{summary?.screenViews??"—"}</strong><span>Screen views</span></div><div><strong>{summary?.productViews??"—"}</strong><span>Product views</span></div></div><div className={styles.dashboardChart}>{(summary?.days??[]).length?(summary?.days??[]).map(day=><div key={day.label} className={styles.dashboardBarColumn}><div><span style={{height:`${Math.max(5,(day.value/maxDay)*100)}%`}}/></div><small>{day.label}</small></div>):<div className={styles.dashboardEmpty}>{loading?"Loading engagement…":"No recorded sessions yet"}</div>}</div></article>
      <article className={`${styles.dashboardCard} ${styles.dashboardActions}`}><header className={styles.dashboardCardHeader}><div><h3>Action center</h3><p>Items that may need your attention</p></div><span className={styles.dashboardBadge}>{actionItems.reduce((sum,item)=>sum+item.count,0)} items</span></header><div>{actionItems.map(item=><button key={item.title} className={`${styles.dashboardActionItem} ${item.tone}`} onClick={()=>setView(item.view)}><span>{item.count}</span><div><strong>{item.title}</strong><small>{item.copy}</small></div><b>›</b></button>)}</div></article>
    </section>
    <section className={styles.dashboardCommerceSection}><header className={styles.dashboardSectionHeader}><div><p>SHOPIFY COMMERCE</p><h2>Store performance</h2><span>Sales activity from non-cancelled orders over the last 30 days.</span></div><i className={`${styles.tag} ${commerceError?styles.tagGray:styles.tagGreen}`}>{loading?"Loading":commerceError?"Unavailable":"Live Shopify data"}</i></header>{commerceError&&<div className={styles.dashboardNotice}><span>!</span>{commerceError}</div>}<div className={styles.dashboardCommerceGrid}>{commerce? <><DashboardCommerceChart title="Sales" copy={`Gross order value · ${commerceCurrency}`} value={formatCommerceMoney(commerce.totals.sales)} color="#397ab5" formatPoint={formatCommerceMoney} data={commerce.daily.map(day=>({date:day.date,label:day.label,value:day.sales}))}/><DashboardCommerceChart title="Revenue" copy={`Payments received minus refunds · ${commerceCurrency}`} value={formatCommerceMoney(commerce.totals.revenue)} color="#19805c" formatPoint={formatCommerceMoney} data={commerce.daily.map(day=>({date:day.date,label:day.label,value:day.revenue}))}/><DashboardCommerceChart title="Customers" copy="Unique purchasing customers" value={commerce.totals.customers.toLocaleString()} color="#7254a5" formatPoint={value=>`${value.toLocaleString()} customer${value===1?"":"s"}`} data={commerce.daily.map(day=>({date:day.date,label:day.label,value:day.customers}))}/><DashboardCommerceChart title="Orders" copy="Non-cancelled orders" value={commerce.totals.orders.toLocaleString()} color="#a86b13" formatPoint={value=>`${value.toLocaleString()} order${value===1?"":"s"}`} data={commerce.daily.map(day=>({date:day.date,label:day.label,value:day.orders}))}/></>:Array.from({length:4},(_,index)=><article className={`${styles.dashboardCommerceCard} ${styles.dashboardCommerceSkeleton}`} key={index}/>)}</div>{commerce?.truncated&&<small className={styles.dashboardCommerceWarning}>The chart reached the safe Shopify pagination limit; totals may be incomplete for this period.</small>}</section>
    <section className={styles.dashboardQuickGrid}>{[
      ["✦","Customize app","Edit homepage sections and content","editor"],["◈","Create campaign","Send a push notification","marketing"],["▦","Update inventory","Manage stock and variants","inventory"],["%","Manage offers","Review active promotions","promotions"],
    ].map(([icon,title,copy,target])=><button className={styles.dashboardQuickAction} key={title} onClick={()=>setView(target as View)}><span>{icon}</span><div><strong>{title}</strong><small>{copy}</small></div><b>→</b></button>)}</section>
    <section className={styles.dashboardLowerGrid}>
      <article className={styles.dashboardCard}><header className={styles.dashboardCardHeader}><div><h3>Recent orders</h3><p>Latest activity from Shopify</p></div><button onClick={()=>setView("orders")}>View all orders →</button></header><div className={styles.dashboardOrderList}>{operations.orders.length?operations.orders.slice(0,5).map(order=><button key={order.id} className={styles.dashboardOrderRow} onClick={()=>setView("orders")}><span className={styles.dashboardOrderIcon}>▤</span><div><strong>{order.name}</strong><small>{order.customer} · {new Date(order.createdAt).toLocaleDateString()}</small></div><div className={styles.dashboardOrderMeta}><strong>{order.total?new Intl.NumberFormat(undefined,{style:"currency",currency:order.total.currencyCode}).format(Number(order.total.amount)):"—"}</strong><small>{order.fulfillmentStatus.toLowerCase().replaceAll("_"," ")}</small></div></button>):<div className={styles.dashboardEmpty}>{loading?"Loading Shopify orders…":"No orders were returned"}</div>}</div></article>
      <article className={`${styles.dashboardCard} ${styles.dashboardHealth}`}><header className={styles.dashboardCardHeader}><div><h3>Store health</h3><p>Live service and publishing status</p></div></header><div className={styles.dashboardHealthList}><div><span className={styles.dashboardHealthOk}/><div><strong>Shopify connection</strong><small>{operations.orders.length||operations.inventory.length?"Live commerce data connected":"Waiting for commerce data"}</small></div><b>{operations.orders.length||operations.inventory.length?"Connected":"Check"}</b></div><div><span className={styles.dashboardHealthOk}/><div><strong>Mobile content</strong><small>Latest app homepage publication</small></div><b>{publishedAt}</b></div><div><span className={summary?.notificationDevices?styles.dashboardHealthOk:styles.dashboardHealthWarn}/><div><strong>Push delivery</strong><small>{summary?.notificationDevices?`${summary.notificationDevices} registered devices`:"Expo Go local delivery mode"}</small></div><b>{summary?.notificationDevices?"Ready":"Development"}</b></div><div><span className={styles.dashboardHealthOk}/><div><strong>Analytics recording</strong><small>Mobile engagement events</small></div><b>{summary?"Active":"Loading"}</b></div></div></article>
    </section>
    <section className={`${styles.dashboardCard} ${styles.dashboardJourney}`}><header className={styles.dashboardCardHeader}><div><h3>Customer journey</h3><p>Measured mobile events from discovery through checkout</p></div></header><div className={styles.funnel}>{[[summary?.sessions??0,"Sessions"],[summary?.productViews??0,"Product views"],[summary?.cartViews??0,"Cart views"],[summary?.purchases??"—","Purchases"]].map(([value,label],index)=><div key={String(label)}><strong>{value}</strong><span>{label}</span>{index<3&&<b>→</b>}</div>)}</div></section>
  </div>;
}

function Editor({ sections, selected, selectedId, setSelectedId, update, move, remove, duplicate, setSectionVisibility, add }: { sections: Section[]; selected?: Section; selectedId: string; setSelectedId: (id:string)=>void; update:(p:Partial<Section>)=>void; move:(i:number,d:-1|1)=>void; remove:(id:string)=>void; duplicate:(id:string)=>void; setSectionVisibility:(id:string,enabled:boolean)=>void; add:(t:SectionType,p?:Placement)=>void }) {
  const [showAdd,setShowAdd]=useState(false);
  const [search,setSearch]=useState("");
  const [device,setDevice]=useState<"mobile"|"tablet">("mobile");
  const [inspectorTab,setInspectorTab]=useState<"content"|"design">("content");
  const sectionDescriptions:Record<SectionType,string>={hero:"Large campaign image and call to action",text:"Flexible editorial copy and button",products:"Curated product collection",announcement:"Compact store-wide message"};
  const sectionIcons:Record<SectionType,string>={hero:"▣",text:"¶",products:"▦",announcement:"◇"};
  const visibleSections=sections.filter(section=>`${section.title} ${sectionNames[section.type]}`.toLowerCase().includes(search.trim().toLowerCase()));
  const selectedIndex=selected?sections.findIndex(section=>section.id===selected.id):-1;
  const deleteSelected=()=>{if(selected&&window.confirm(`Delete “${selected.title||sectionNames[selected.type]}”?`))remove(selected.id)};
  return <div className={styles.editor}>
    <section className={styles.sectionPanel}>
      <div className={`${styles.panelTitle} ${styles.panelTitlePro}`}><div><h2>Homepage</h2><p>{sections.length} custom sections · {sections.filter(item=>item.enabled).length} visible</p></div><button className={styles.addButton} type="button" aria-label="Add section" onClick={()=>setShowAdd(value=>!value)}>{showAdd?"×":"＋"}</button></div>
      {showAdd&&<div className={styles.editorAddMenu}><div><strong>Add section</strong><small>Choose a block for your homepage</small></div>{(Object.keys(sectionNames) as SectionType[]).map(type=><button key={type} type="button" onClick={()=>{add(type);setShowAdd(false)}}><span>{sectionIcons[type]}</span><div><strong>{sectionNames[type]}</strong><small>{sectionDescriptions[type]}</small></div><b>＋</b></button>)}</div>}
      <div className={styles.editorSearch}><span>⌕</span><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search sections"/>{search&&<button type="button" onClick={()=>setSearch("")}>×</button>}</div>
      <div className={styles.sectionList}>{visibleSections.length?visibleSections.map(section=><div key={section.id} className={`${styles.sectionRow} ${selectedId===section.id?styles.sectionSelected:""} ${!section.enabled?styles.sectionHidden:""}`} onClick={()=>{setSelectedId(section.id);setInspectorTab("content")}}><span className={styles.sectionTypeIcon}>{sectionIcons[section.type]}</span><div><strong>{section.title||sectionNames[section.type]}</strong><small>{sectionNames[section.type]} · {section.enabled?"Visible":"Hidden"}</small></div><span className={styles.sectionChevron}>›</span></div>):<div className={styles.editorEmptyState}><span>⌕</span><strong>No sections found</strong><small>Try a different search.</small></div>}</div>
      <details className={styles.shopifyMap}><summary>Shopify sections <span>{shopifySections.length} locked</span></summary><button className={styles.insertSlot} onClick={()=>add("text","before-hero")}>＋ Insert before Shopify hero</button>{shopifySections.map((item,index)=><section key={item.name}><div className={styles.shopifyRow}><span>{index+1}</span><div><strong>{item.name}</strong><small>Managed by Shopify</small></div><b>Locked</b></div><button className={styles.insertSlot} onClick={()=>add("text",item.after)}>＋ Insert after {item.name}</button></section>)}</details>
    </section>
    <section className={`${styles.previewPanel} ${styles.previewWorkspace}`}>
      <div className={`${styles.previewToolbar} ${styles.previewToolbarPro}`}><div className={styles.previewTitle}><span>Preview</span><small>Homepage · live draft</small></div><div className={styles.deviceSwitcher}><button type="button" className={device==="mobile"?styles.deviceActive:""} onClick={()=>setDevice("mobile")}>▯ <span>Mobile</span></button><button type="button" className={device==="tablet"?styles.deviceActive:""} onClick={()=>setDevice("tablet")}>▭ <span>Tablet</span></button></div><div className={styles.previewCount}><b>{sections.filter(item=>item.enabled).length}</b> active</div></div>
      <div className={`${styles.deviceStage} ${device==="tablet"?styles.deviceStageTablet:""}`}><div className={styles.phone}><div className={styles.phoneTop}><b>9:41</b><span>● ◒ ▰</span></div><div className={styles.appHeader}><span>☰</span><strong>Carter&apos;s</strong><span>⌕　♧</span></div><div className={styles.phoneBody}>{sections.some(item=>item.enabled)?sections.filter(item=>item.enabled).map(section=><PreviewSection key={section.id} section={section} selected={section.id===selectedId} onClick={()=>setSelectedId(section.id)}/>):<div className={styles.previewEmpty}><span>＋</span><strong>Your homepage is empty</strong><small>Enable or add a section to preview it.</small></div>}</div><div className={styles.appTabs}><span>⌂<small>Home</small></span><span>⌕<small>Search</small></span><span>♡<small>Wishlist</small></span><span>♙<small>Account</small></span></div></div></div>
    </section>
    <section className={styles.settingsPanel}>{selected?<><div className={`${styles.panelTitle} ${styles.panelTitlePro}`}><div><h2>{selected.title||sectionNames[selected.type]}</h2><p>{sectionNames[selected.type]}</p></div><label className={styles.switch} title={selected.enabled?"Visible":"Hidden"}><input type="checkbox" checked={selected.enabled} onChange={event=>update({enabled:event.target.checked})}/><span/></label></div><div className={styles.inspectorSectionActions}><button type="button" onClick={()=>setSectionVisibility(selected.id,!selected.enabled)}>{selected.enabled?"○ Hide":"◉ Show"}</button><button type="button" onClick={()=>duplicate(selected.id)}>⧉ Duplicate</button><button type="button" disabled={selectedIndex<=0} onClick={()=>move(selectedIndex,-1)}>↑ Up</button><button type="button" disabled={selectedIndex<0||selectedIndex>=sections.length-1} onClick={()=>move(selectedIndex,1)}>↓ Down</button></div><div className={styles.inspectorTabs}><button type="button" className={inspectorTab==="content"?styles.inspectorTabActive:""} onClick={()=>setInspectorTab("content")}>Content</button><button type="button" className={inspectorTab==="design"?styles.inspectorTabActive:""} onClick={()=>setInspectorTab("design")}>Design</button></div><div className={styles.editorForm}>{inspectorTab==="content"?<><label>Title<input maxLength={80} value={selected.title} onChange={event=>update({title:event.target.value})}/><small>{selected.title.length}/80</small></label><label>Description<textarea rows={5} maxLength={220} value={selected.subtitle} onChange={event=>update({subtitle:event.target.value})}/><small>{selected.subtitle.length}/220</small></label>{selected.type!=="announcement"&&<label>Button label<input maxLength={32} value={selected.buttonLabel} onChange={event=>update({buttonLabel:event.target.value})}/><small>{selected.buttonLabel.length}/32</small></label>}</>:<><label>Position<select className={styles.selectField} value={selected.placement??"before-hero"} onChange={event=>update({placement:event.target.value as Placement})}>{placements.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label>{selected.type==="hero"&&<label>Background image URL<input value={selected.image} placeholder="https://..." onChange={event=>update({image:event.target.value})}/>{selected.image&&<span className={styles.imagePreview} style={{backgroundImage:`url(${selected.image})`}}/>}</label>}<label>Background color<div className={styles.colorField}><input type="color" value={selected.background} onChange={event=>update({background:event.target.value})}/><input value={selected.background} onChange={event=>update({background:event.target.value})}/></div></label><label className={styles.customCssField}>Custom CSS<textarea rows={14} maxLength={4000} spellCheck={false} value={selected.customCss??""} onChange={event=>update({customCss:event.target.value})} placeholder={customCssExample}/><small>{(selected.customCss??"").length}/4000</small></label><div className={styles.customCssHelp}><strong>Supported selectors</strong><code>.section</code><code>.title</code><code>.description</code><code>.button</code><p>Use standard declarations such as color, font-size, padding, border-radius, text-align, and background-color. Styles are scoped to this section and translated for the mobile app.</p><button type="button" onClick={()=>update({customCss:customCssExample})}>Insert example</button></div></>}<div className={styles.inspectorDelete}><button className={styles.delete} type="button" onClick={deleteSelected}>Delete section</button></div></div></>:<div className={styles.editorEmptyState}><span>✦</span><strong>Select a section</strong><small>Choose a block from the list or preview to edit it.</small></div>}</section>
  </div>;
}

function PreviewSection({section,selected,onClick}:{section:Section;selected:boolean;onClick:()=>void}) {
  const custom=parsePreviewCustomCss(section.customCss);
  if(section.type==="hero") return <section onClick={onClick} className={`${styles.previewHero} ${selected?styles.previewSelected:""}`} style={{backgroundColor:section.background,backgroundImage:section.image?`linear-gradient(90deg,rgba(0,0,0,.36),rgba(0,0,0,.02)),url(${section.image})`:undefined,...custom.section}}><h3 style={custom.title}>{section.title}</h3><p style={custom.description}>{section.subtitle}</p><button style={custom.button}>{section.buttonLabel}</button></section>;
  if(section.type==="announcement") return <section onClick={onClick} className={`${styles.previewNotice} ${selected?styles.previewSelected:""}`} style={{background:section.background,...custom.section}}><span style={custom.title}>{section.title}</span></section>;
  if(section.type==="products") return <section onClick={onClick} className={`${styles.previewProducts} ${selected?styles.previewSelected:""}`} style={custom.section}><h3 style={custom.title}>{section.title}</h3><p style={custom.description}>{section.subtitle}</p><div>{["#f5ddd2","#dce8ef","#efe4d4"].map((c,i)=><span key={c} style={{background:c}}><i>Product {i+1}</i><b>${18+i*7}.00</b></span>)}</div></section>;
  return <section onClick={onClick} className={`${styles.previewText} ${selected?styles.previewSelected:""}`} style={{background:section.background,...custom.section}}><h3 style={custom.title}>{section.title}</h3><p style={custom.description}>{section.subtitle}</p><button style={custom.button}>{section.buttonLabel}</button></section>;
}

export function InventoryReadOnly(){
  const [items,setItems]=useState<InventoryItem[]>([]);const [search,setSearch]=useState("");const [loading,setLoading]=useState(true);const [message,setMessage]=useState("");const [pageInfo,setPageInfo]=useState<{hasNextPage:boolean;endCursor:string|null}>({hasNextPage:false,endCursor:null});
  const load=async(term:string,after:string|null)=>{setLoading(true);setMessage("");try{const params=new URLSearchParams();if(term.trim())params.set("search",term.trim());if(after)params.set("after",after);const response=await fetch(`/api/shopify/inventory?${params}`,{cache:"no-store"});const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to load inventory.");const next=Array.isArray(data.inventory)?data.inventory:[];setItems(current=>after?[...current,...next]:next);setPageInfo(data.pageInfo||{hasNextPage:false,endCursor:null});if(!next.length)setMessage(term?"No inventory matches this search.":"No Shopify inventory was returned.")}catch(error){setMessage(error instanceof Error?error.message:"Unable to load inventory.");if(!after)setItems([])}finally{setLoading(false)}};
  useEffect(()=>{/* eslint-disable react-hooks/set-state-in-effect */void load("",null);/* eslint-enable react-hooks/set-state-in-effect */},[]);
  const lowStock=items.filter(item=>item.tracked&&item.quantity>0&&item.quantity<=5).length;const outOfStock=items.filter(item=>item.tracked&&item.quantity<=0).length;const totalUnits=items.reduce((sum,item)=>sum+Math.max(0,item.quantity),0);
  return <div className={styles.content}><div className={styles.actionHeader}><div><h2>Inventory</h2><p>Live aggregate stock from Shopify product variants.</p></div><form className={styles.customerSearch} onSubmit={event=>{event.preventDefault();void load(search,null)}}><input className={styles.smallSearch} placeholder="Search product, variant, or SKU" value={search} onChange={event=>setSearch(event.target.value)}/><button className={styles.primary} disabled={loading}>Search</button>{search&&<button className={styles.secondary} type="button" onClick={()=>{setSearch("");void load("",null)}}>Clear</button>}</form></div><div className={styles.segmentGrid}>{[["Variants","Loaded from Shopify",items.length],["Available units","Across loaded variants",totalUnits],["Low stock","Five units or fewer",lowStock],["Out of stock","Tracked with no stock",outOfStock]].map(([title,copy,value])=><article className={styles.segment} key={title}><span>▦</span><div><strong>{title}</strong><small>{copy}</small></div><b>{value}</b></article>)}</div><section className={`${styles.card} ${styles.inventoryTable}`}><div className={styles.cardHead}><div><h2>Stock directory</h2><p>{message||"Quantities are aggregated across Shopify locations."}</p></div><i className={`${styles.tag} ${message?styles.tagGray:styles.tagGreen}`}>{loading?"Loading":message?"Notice":"Connected"}</i></div><div className={styles.dataTable}><div className={styles.tableHead}><span>Product</span><span>SKU</span><span>Price</span><span>Quantity</span><span>Availability</span><span>Updated</span></div>{items.length?items.map(item=><div className={styles.tableRow} key={item.id}><div className={styles.customerCell}><strong>{item.product}</strong><small>{item.variant} · {item.productStatus.toLowerCase()}</small></div><span>{item.sku||"—"}</span><span>{item.price}</span><strong className={item.quantity<=0?styles.stockEmpty:item.quantity<=5?styles.stockLow:styles.stockOk}>{item.tracked?item.quantity:"Not tracked"}</strong><span><i className={`${styles.tag} ${item.quantity<=0?styles.tagGray:item.availableForSale?styles.tagGreen:styles.tagBlue}`}>{item.availableForSale?"Available":"Unavailable"}</i></span><span>{item.updatedAt?new Date(item.updatedAt).toLocaleDateString():"—"}</span></div>):<div className={styles.empty}>{loading?"Loading Shopify inventory...":message||"No inventory found."}</div>}</div>{pageInfo.hasNextPage&&<div className={styles.inlineActions}><button className={styles.secondary} disabled={loading} onClick={()=>void load(search,pageInfo.endCursor)}>Load more</button></div>}</section></div>
}

export function PromotionsReadOnly(){
  const [items,setItems]=useState<Promotion[]>([]);const [search,setSearch]=useState("");const [loading,setLoading]=useState(true);const [message,setMessage]=useState("");const [pageInfo,setPageInfo]=useState<{hasNextPage:boolean;endCursor:string|null}>({hasNextPage:false,endCursor:null});
  const load=async(term:string,after:string|null)=>{setLoading(true);setMessage("");try{const params=new URLSearchParams();if(term.trim())params.set("search",term.trim());if(after)params.set("after",after);const response=await fetch(`/api/shopify/promotions?${params}`,{cache:"no-store"});const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to load promotions.");const next=Array.isArray(data.promotions)?data.promotions:[];setItems(current=>after?[...current,...next]:next);setPageInfo(data.pageInfo||{hasNextPage:false,endCursor:null});if(!next.length)setMessage(term?"No promotions match this search.":"No Shopify promotions were returned.")}catch(error){setMessage(error instanceof Error?error.message:"Unable to load promotions.");if(!after)setItems([])}finally{setLoading(false)}};
  useEffect(()=>{/* eslint-disable react-hooks/set-state-in-effect */void load("",null);/* eslint-enable react-hooks/set-state-in-effect */},[]);
  const active=items.filter(item=>item.status==="ACTIVE").length;const scheduled=items.filter(item=>item.status==="SCHEDULED").length;const uses=items.reduce((sum,item)=>sum+item.usageCount,0);
  return <div className={styles.content}><div className={styles.actionHeader}><div><h2>Promotions</h2><p>Shopify discount codes and automatic offers.</p></div><form className={styles.customerSearch} onSubmit={event=>{event.preventDefault();void load(search,null)}}><input className={styles.smallSearch} placeholder="Search promotion title" value={search} onChange={event=>setSearch(event.target.value)}/><button className={styles.primary} disabled={loading}>Search</button>{search&&<button className={styles.secondary} type="button" onClick={()=>{setSearch("");void load("",null)}}>Clear</button>}</form></div><div className={styles.segmentGrid}>{[["Promotions","Loaded from Shopify",items.length],["Active","Currently available",active],["Scheduled","Starting later",scheduled],["Uses","Reported by Shopify",uses]].map(([title,copy,value])=><article className={styles.segment} key={title}><span>%</span><div><strong>{title}</strong><small>{copy}</small></div><b>{value}</b></article>)}</div><section className={`${styles.card} ${styles.promotionTable}`}><div className={styles.cardHead}><div><h2>Promotion directory</h2><p>{message||"Codes and automatic discounts are managed in Shopify."}</p></div><i className={`${styles.tag} ${message?styles.tagGray:styles.tagGreen}`}>{loading?"Loading":message?"Notice":"Connected"}</i></div><div className={styles.dataTable}><div className={styles.tableHead}><span>Promotion</span><span>Method</span><span>Status</span><span>Starts</span><span>Ends</span><span>Uses</span></div>{items.length?items.map(item=><div className={styles.tableRow} key={item.id}><div className={styles.customerCell}><strong>{item.title}</strong><small>{item.type.replace(/([a-z])([A-Z])/g,"$1 $2")}</small></div><strong>{item.code}</strong><span><i className={`${styles.tag} ${item.status==="ACTIVE"?styles.tagGreen:item.status==="SCHEDULED"?styles.tagBlue:styles.tagGray}`}>{item.status.toLowerCase()}</i></span><span>{item.startsAt?new Date(item.startsAt).toLocaleDateString():"Immediately"}</span><span>{item.endsAt?new Date(item.endsAt).toLocaleDateString():"No end date"}</span><strong>{item.usageCount}</strong></div>):<div className={styles.empty}>{loading?"Loading Shopify promotions...":message||"No promotions found."}</div>}</div>{pageInfo.hasNextPage&&<div className={styles.inlineActions}><button className={styles.secondary} disabled={loading} onClick={()=>void load(search,pageInfo.endCursor)}>Load more</button></div>}</section></div>
}

function Inventory(){
  const [items,setItems]=useState<InventoryItem[]>([]);
  const [locations,setLocations]=useState<InventoryLocation[]>([]);
  const [locationId,setLocationId]=useState("");
  const [search,setSearch]=useState("");
  const [stockFilter,setStockFilter]=useState("all");
  const [statusFilter,setStatusFilter]=useState("all");
  const [selected,setSelected]=useState<string[]>([]);
  const [bulkMode,setBulkMode]=useState<"set"|"add"|"subtract"|"zero">("set");
  const [bulkValue,setBulkValue]=useState("0");
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");
  const [editing,setEditing]=useState<InventoryItem|null>(null);
  const [productDraft,setProductDraft]=useState<ProductDraft|null>(null);
  const [productSaving,setProductSaving]=useState(false);
  const [productDeleting,setProductDeleting]=useState(false);
  const [productImage,setProductImage]=useState<File|null>(null);
  const [productImageAlt,setProductImageAlt]=useState("");
  const [bulkEditor,setBulkEditor]=useState(false);
  const [pageInfo,setPageInfo]=useState<{hasNextPage:boolean;endCursor:string|null}>({hasNextPage:false,endCursor:null});
  const load=async(term:string,after:string|null,limit=50)=>{setLoading(true);setMessage("");try{const params=new URLSearchParams();params.set("limit",String(limit));if(term.trim())params.set("search",term.trim());if(after)params.set("after",after);const response=await fetch(`/api/shopify/inventory?${params}`,{cache:"no-store"});const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to load inventory.");const next=Array.isArray(data.inventory)?data.inventory:[];setItems(current=>after?[...current,...next]:next);const nextLocations=Array.isArray(data.locations)?data.locations:[];setLocations(nextLocations);setLocationId(current=>current||nextLocations[0]?.id||"");setPageInfo(data.pageInfo||{hasNextPage:false,endCursor:null});if(!next.length)setMessage(term?"No inventory matches this search.":"No Shopify inventory was returned.")}catch(error){setMessage(error instanceof Error?error.message:"Unable to load inventory.");if(!after)setItems([])}finally{setLoading(false)}};
  useEffect(()=>{/* eslint-disable react-hooks/set-state-in-effect */void load("",null);/* eslint-enable react-hooks/set-state-in-effect */},[]);
  const quantityAt=(item:InventoryItem)=>locationId?(item.levels.find(level=>level.locationId===locationId)?.quantity??0):item.quantity;
  const filtered=items.filter(item=>{
    const quantity=quantityAt(item);
    const stockMatches=stockFilter==="all"||(stockFilter==="in"&&quantity>0)||(stockFilter==="low"&&quantity>0&&quantity<=5)||(stockFilter==="out"&&quantity<=0)||(stockFilter==="untracked"&&!item.tracked);
    return stockMatches&&(statusFilter==="all"||item.productStatus===statusFilter);
  });
  const toggle=(id:string)=>setSelected(current=>current.includes(id)?current.filter(item=>item!==id):[...current,id]);
  const selectVisible=()=>setSelected(current=>filtered.every(item=>current.includes(item.id))?current.filter(id=>!filtered.some(item=>item.id===id)):[...new Set([...current,...filtered.map(item=>item.id)])]);
  const selectAllProducts=async()=>{
    setLoading(true);setMessage("Loading all Shopify inventory...");
    try{
      const allItems:InventoryItem[]=[];let after:string|null=null;let hasNextPage=true;let loadedLocations:InventoryLocation[]=locations;let page=0;
      while(hasNextPage){
        const params=new URLSearchParams({limit:"250"});if(locationId)params.set("locationId",locationId);if(after)params.set("after",after);
        const response=await fetch(`/api/shopify/inventory?${params}`,{cache:"no-store"});const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to load all inventory.");
        allItems.push(...(Array.isArray(data.inventory)?data.inventory:[]));if(Array.isArray(data.locations)&&data.locations.length)loadedLocations=data.locations;
        page+=1;hasNextPage=Boolean(data.pageInfo?.hasNextPage&&data.pageInfo?.endCursor);after=hasNextPage?data.pageInfo.endCursor:null;if(hasNextPage)setMessage(`Loading all Shopify inventory... ${allItems.length} variants loaded (${page} page${page===1?"":"s"}).`);
      }
      const uniqueItems=[...new Map(allItems.map(item=>[item.id,item])).values()];setItems(uniqueItems);setLocations(loadedLocations);setLocationId(current=>current||loadedLocations[0]?.id||"");setPageInfo({hasNextPage:false,endCursor:null});setSelected(uniqueItems.map(item=>item.id));setMessage(`Selected all ${uniqueItems.length} product variants.`);
    }catch(error){setMessage(error instanceof Error?error.message:"Unable to select all products.")}finally{setLoading(false)}
  };
  const applyBulk=async()=>{
    if(!locationId||!selected.length){setMessage("Choose a location and select at least one variant.");return}
    const amount=Math.max(0,Math.floor(Number(bulkValue)||0));
    const selectedItems=items.filter(item=>selected.includes(item.id)&&item.tracked&&item.inventoryItemId);
    const changes:{inventoryItemId:string;locationId:string;delta?:number;activateQuantity?:number}[]=[];
    selectedItems.forEach(item=>{
      const level=item.levels.find(entry=>entry.locationId===locationId);const current=level?.quantity??0;
      const target=bulkMode==="set"?amount:bulkMode==="add"?current+amount:bulkMode==="subtract"?Math.max(0,current-amount):0;
      if(!level){if(target>0)changes.push({inventoryItemId:item.inventoryItemId,locationId,activateQuantity:target});return}
      const delta=target-current;if(delta)changes.push({inventoryItemId:item.inventoryItemId,locationId,delta});
    });
    if(!changes.length){setMessage("The selected inventory already has that quantity, or inventory tracking is disabled.");return}
    if(bulkMode==="zero"&&!window.confirm(`Set ${changes.length} selected inventor${changes.length===1?"y":"ies"} to zero at this location?`))return;
    setSaving(true);setMessage("Updating Shopify inventory...");
    try{let changed=0;for(let index=0;index<changes.length;index+=250){const batch=changes.slice(index,index+250);const response=await fetch("/api/shopify/inventory",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({changes:batch})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to update inventory.");changed+=Number(data.changed||batch.length)}setMessage(`Updated ${changed} inventory item${changed===1?"":"s"}.`);setSelected([]);await load(search,null)}catch(error){setMessage(error instanceof Error?error.message:"Unable to update inventory.")}finally{setSaving(false)}
  };
  const openProduct=(item:InventoryItem)=>{setEditing(item);setProductDraft({title:item.product,descriptionHtml:item.descriptionHtml||"",vendor:item.vendor||"",productType:item.productType||"",tags:(item.tags||[]).join(", "),seoTitle:item.seoTitle||"",seoDescription:item.seoDescription||"",status:item.productStatus,options:item.selectedOptions||[],sku:item.sku,barcode:item.barcode,price:item.price,compareAtPrice:item.compareAtPrice||"",inventoryPolicy:item.policy,tracked:item.tracked});setProductImage(null);setProductImageAlt(item.image?.altText||item.product);setMessage("");window.scrollTo({top:0,behavior:"smooth"})};
  const closeProduct=()=>{setEditing(null);setProductDraft(null);setProductImage(null)};
  const saveProduct=async()=>{
    if(!editing||!productDraft)return;
    if(!productDraft.title.trim()){setMessage("Product title is required.");return}
    setProductSaving(true);setMessage("Updating product in Shopify...");
    try{
      const response=await fetch("/api/shopify/inventory",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({productId:editing.productId,variantId:editing.id,product:{title:productDraft.title,descriptionHtml:productDraft.descriptionHtml,vendor:productDraft.vendor,productType:productDraft.productType,tags:productDraft.tags.split(",").map(tag=>tag.trim()).filter(Boolean),seoTitle:productDraft.seoTitle,seoDescription:productDraft.seoDescription,status:productDraft.status},variant:{optionValues:productDraft.options,sku:productDraft.sku,barcode:productDraft.barcode,price:productDraft.price,compareAtPrice:productDraft.compareAtPrice,inventoryPolicy:productDraft.inventoryPolicy,tracked:productDraft.tracked}})});
      const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to update product.");
      if(productImage){setMessage("Uploading the product image to Shopify...");const imageForm=new FormData();imageForm.append("productId",editing.productId);imageForm.append("alt",productImageAlt);imageForm.append("image",productImage);const imageResponse=await fetch("/api/shopify/inventory",{method:"POST",body:imageForm});const imageData=await imageResponse.json();if(!imageResponse.ok)throw new Error(imageData.error||"Product details saved, but the image could not be uploaded.")}
      closeProduct();await load(search,null);setMessage(`${productDraft.title} was updated in Shopify.`)
    }catch(error){setMessage(error instanceof Error?error.message:"Unable to update product.")}finally{setProductSaving(false)}
  };
  const deleteProduct=async()=>{
    if(!editing)return;
    const productName=editing.product;
    if(!window.confirm(`Permanently delete ${productName}? This deletes the product, every variant, its images, and inventory from Shopify. This cannot be undone.`))return;
    setProductDeleting(true);setMessage(`Deleting ${productName} from Shopify...`);
    try{const response=await fetch(`/api/shopify/inventory?productId=${encodeURIComponent(editing.productId)}`,{method:"DELETE"});const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to delete product.");const deletedIds=items.filter(item=>item.productId===editing.productId).map(item=>item.id);setItems(current=>current.filter(item=>item.productId!==editing.productId));setSelected(current=>current.filter(id=>!deletedIds.includes(id)));closeProduct();setMessage(`${productName} was permanently deleted from Shopify.`)}catch(error){setMessage(error instanceof Error?error.message:"Unable to delete product.")}finally{setProductDeleting(false)}
  };
  const openBulkEditor=async()=>{await load("",null,250);setBulkEditor(true)};
  if(bulkEditor)return <InventoryBulkEditor items={items} locations={locations} initialLocationId={locationId} onClose={()=>setBulkEditor(false)} onSaved={async changed=>{setBulkEditor(false);await load(search,null);setMessage(`Updated ${changed} inventory item${changed===1?"":"s"} from the bulk editor.`)}}/>;
  if(editing&&productDraft)return <div className={styles.productWorkspace}>
    <header className={styles.productWorkspaceHeader}>
      <div className={styles.productWorkspaceTitle}>
        <button className={styles.productBack} type="button" onClick={closeProduct}>←</button>
        <div><button type="button" onClick={closeProduct}>Products</button><h2>{productDraft.title}</h2><span>{editing.variant}</span></div>
        <i className={`${styles.tag} ${productDraft.status==="ACTIVE"?styles.tagGreen:styles.tagGray}`}>{productDraft.status.toLowerCase()}</i>
      </div>
      <div className={styles.productWorkspaceActions}>
        <button className={styles.secondary} type="button" disabled={productSaving||productDeleting} onClick={closeProduct}>Discard</button>
        <button className={styles.primary} type="button" disabled={productSaving||productDeleting} onClick={()=>void saveProduct()}>{productSaving?"Saving...":"Save"}</button>
      </div>
    </header>
    {message&&<div className={styles.productWorkspaceMessage}>{message}</div>}
    <div className={styles.productWorkspaceBody}>
      <main className={styles.productWorkspaceMain}>
        <section className={styles.productWorkspaceCard}>
          <div className={styles.productCardHeading}><div><h3>Product details</h3><p>The title and publishing status customers see in Shopify.</p></div></div>
          <div className={styles.productDetailsLead}>
            <InventoryProductImage item={editing} large/>
            <label>Title<input value={productDraft.title} onChange={event=>setProductDraft(current=>current&&({...current,title:event.target.value}))}/></label>
          </div>
          <label>Description<textarea rows={7} value={productDraft.descriptionHtml} onChange={event=>setProductDraft(current=>current&&({...current,descriptionHtml:event.target.value}))} placeholder="Describe the product. Basic HTML is supported."/></label>
          <label>Status<select value={productDraft.status} onChange={event=>setProductDraft(current=>current&&({...current,status:event.target.value}))}><option value="ACTIVE">Active</option><option value="DRAFT">Draft</option><option value="ARCHIVED">Archived</option></select></label>
        </section>
        <section className={styles.productWorkspaceCard}>
          <div className={styles.productCardHeading}><div><h3>Product organization</h3><p>Information used to organize and search your Shopify catalog.</p></div></div>
          <div className={styles.productWorkspaceGrid}>
            <label>Vendor<input value={productDraft.vendor} onChange={event=>setProductDraft(current=>current&&({...current,vendor:event.target.value}))} placeholder="Carter's"/></label>
            <label>Product type<input value={productDraft.productType} onChange={event=>setProductDraft(current=>current&&({...current,productType:event.target.value}))} placeholder="Clothing"/></label>
          </div>
          <label>Tags<input value={productDraft.tags} onChange={event=>setProductDraft(current=>current&&({...current,tags:event.target.value}))} placeholder="baby, clothing, summer"/><small>Separate tags with commas.</small></label>
        </section>
        <section className={styles.productWorkspaceCard}>
          <div className={styles.productCardHeading}><div><h3>Pricing</h3><p>Set the selling and comparison prices for this variant.</p></div></div>
          <div className={styles.productWorkspaceGrid}>
            <label>Price<input type="number" min="0" step="0.01" value={productDraft.price} onChange={event=>setProductDraft(current=>current&&({...current,price:event.target.value}))}/></label>
            <label>Compare-at price<input type="number" min="0" step="0.01" value={productDraft.compareAtPrice} onChange={event=>setProductDraft(current=>current&&({...current,compareAtPrice:event.target.value}))} placeholder="No compare-at price"/></label>
          </div>
        </section>
        <section className={styles.productWorkspaceCard}>
          <div className={styles.productCardHeading}><div><h3>Inventory</h3><p>Manage identifiers and stock behavior for {editing.variant}.</p></div></div>
          {productDraft.options.filter(option=>!(option.name==="Title"&&option.value==="Default Title")).length>0&&<div className={styles.productOptionGrid}>{productDraft.options.map((option,index)=>option.name==="Title"&&option.value==="Default Title"?null:<label key={`${option.name}-${index}`}>{option.name}<input value={option.value} onChange={event=>setProductDraft(current=>current&&({...current,options:current.options.map((entry,entryIndex)=>entryIndex===index?{...entry,value:event.target.value}:entry)}))}/></label>)}</div>}
          <div className={styles.productWorkspaceGrid}>
            <label>SKU<input value={productDraft.sku} onChange={event=>setProductDraft(current=>current&&({...current,sku:event.target.value}))}/></label>
            <label>Barcode<input value={productDraft.barcode} onChange={event=>setProductDraft(current=>current&&({...current,barcode:event.target.value}))}/></label>
          </div>
          <label className={styles.productWorkspaceCheck}><input type="checkbox" checked={productDraft.tracked} onChange={event=>setProductDraft(current=>current&&({...current,tracked:event.target.checked}))}/><span><strong>Track quantity</strong><small>Shopify will maintain available inventory for this variant.</small></span></label>
          <div className={styles.productWorkspaceLocations}><div><strong>Location</strong><strong>Available</strong></div>{editing.levels.length?editing.levels.map(level=><div key={level.locationId}><span>{level.locationName}</span><b>{level.quantity}</b></div>):<small>No active inventory levels.</small>}</div>
        </section>
        <section className={styles.productWorkspaceCard}>
          <div className={styles.productCardHeading}><div><h3>Search engine listing</h3><p>Control how this product can appear in search results.</p></div></div>
          <label>Page title<input maxLength={70} value={productDraft.seoTitle} onChange={event=>setProductDraft(current=>current&&({...current,seoTitle:event.target.value}))} placeholder={productDraft.title}/><small>{productDraft.seoTitle.length}/70 characters</small></label>
          <label>Meta description<textarea rows={4} maxLength={320} value={productDraft.seoDescription} onChange={event=>setProductDraft(current=>current&&({...current,seoDescription:event.target.value}))}/><small>{productDraft.seoDescription.length}/320 characters</small></label>
        </section>
      </main>
      <aside className={styles.productWorkspaceAside}>
        <section className={styles.productWorkspaceCard}>
          <div className={styles.productCardHeading}><div><h3>Media</h3><p>Add a new product image to Shopify.</p></div></div>
          <div className={styles.productMediaPreview}><InventoryProductImage item={editing} large/></div>
          <label className={styles.productImageUpload}>Image<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={event=>setProductImage(event.target.files?.[0]||null)}/><span>{productImage?productImage.name:"Choose image"}</span></label>
          <label>Alternative text<input value={productImageAlt} onChange={event=>setProductImageAlt(event.target.value)} placeholder="Describe the image"/></label>
          <small className={styles.productMediaNote}>JPG, PNG, WebP, or GIF up to 10 MB. Saving adds the image to the product gallery.</small>
        </section>
        <section className={styles.productWorkspaceCard}>
          <div className={styles.productCardHeading}><div><h3>Variant</h3><p>{editing.variant}</p></div></div>
          <dl className={styles.productSummaryList}><div><dt>SKU</dt><dd>{productDraft.sku||"Not set"}</dd></div><div><dt>Available</dt><dd>{editing.tracked?editing.quantity:"Not tracked"}</dd></div><div><dt>Last updated</dt><dd>{editing.updatedAt?new Date(editing.updatedAt).toLocaleDateString():"—"}</dd></div></dl>
        </section>
        <section className={styles.productWorkspaceCard}>
          <div className={styles.productCardHeading}><div><h3>Selling when out of stock</h3><p>Choose how Shopify handles orders after inventory reaches zero.</p></div></div>
          <label>Inventory policy<select value={productDraft.inventoryPolicy} onChange={event=>setProductDraft(current=>current&&({...current,inventoryPolicy:event.target.value}))}><option value="DENY">Stop selling</option><option value="CONTINUE">Continue selling</option></select></label>
        </section>
        <section className={`${styles.productWorkspaceCard} ${styles.productDangerZone}`}>
          <div><h3>Delete product</h3><p>Permanently removes this product, all variants, images, and inventory from Shopify.</p></div>
          <button className={styles.delete} type="button" disabled={productSaving||productDeleting} onClick={()=>void deleteProduct()}>{productDeleting?"Deleting...":"Delete product"}</button>
        </section>
      </aside>
    </div>
  </div>;
  const lowStock=filtered.filter(item=>item.tracked&&quantityAt(item)>0&&quantityAt(item)<=5).length;const outOfStock=filtered.filter(item=>item.tracked&&quantityAt(item)<=0).length;const totalUnits=filtered.reduce((sum,item)=>sum+Math.max(0,quantityAt(item)),0);
  return <div className={styles.content}>
    <div className={styles.actionHeader}>
      <div><h2>Inventory</h2><p>Manage available Shopify stock by location.</p></div>
      <form className={styles.customerSearch} onSubmit={event=>{event.preventDefault();void load(search,null)}}>
        <input className={styles.smallSearch} placeholder="Search product, variant, or SKU" value={search} onChange={event=>setSearch(event.target.value)}/>
        <button className={styles.primary} disabled={loading}>Search</button>
        <button className={styles.secondary} type="button" disabled={loading||!items.length} onClick={()=>void openBulkEditor()}>{loading?"Loading...":"Open bulk editor"}</button>
        {search&&<button className={styles.secondary} type="button" onClick={()=>{setSearch("");void load("",null)}}>Clear</button>}
      </form>
    </div>
    <div className={styles.inventoryFilters}>
      <label>Location<select value={locationId} onChange={event=>{setLocationId(event.target.value);setSelected([])}}>{locations.map(location=><option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
      <label>Stock<select value={stockFilter} onChange={event=>setStockFilter(event.target.value)}><option value="all">All inventory</option><option value="in">In stock</option><option value="low">Low stock</option><option value="out">Out of stock</option><option value="untracked">Not tracked</option></select></label>
      <label>Product status<select value={statusFilter} onChange={event=>setStatusFilter(event.target.value)}><option value="all">All statuses</option><option value="ACTIVE">Active</option><option value="DRAFT">Draft</option><option value="ARCHIVED">Archived</option></select></label>
    </div>
    <div className={styles.segmentGrid}>{[["Variants","Matching filters",filtered.length],["Available units","At selected location",totalUnits],["Low stock","Five units or fewer",lowStock],["Out of stock","Tracked with no stock",outOfStock]].map(([title,copy,value])=><article className={styles.segment} key={title}><span>▦</span><div><strong>{title}</strong><small>{copy}</small></div><b>{value}</b></article>)}</div>
    {selected.length>0&&<div className={styles.bulkBar}>
      <strong>{selected.length} selected</strong>
      <button className={styles.secondary} type="button" disabled={loading} onClick={()=>void selectAllProducts()}>{loading?"Loading all...":"Select all products"}</button>
      <select value={bulkMode} onChange={event=>setBulkMode(event.target.value as typeof bulkMode)}><option value="set">Set quantity to</option><option value="add">Add quantity</option><option value="subtract">Subtract quantity</option><option value="zero">Set to zero</option></select>
      {bulkMode!=="zero"&&<input type="number" min="0" value={bulkValue} onChange={event=>setBulkValue(event.target.value)}/>}
      <button className={styles.primary} disabled={saving||loading} onClick={()=>void applyBulk()}>{saving?"Updating...":"Apply bulk edit"}</button>
      <button className={styles.secondary} disabled={saving||loading} onClick={()=>setSelected([])}>Clear selection</button>
    </div>}
    <section className={`${styles.card} ${styles.inventoryManageTable}`}>
      <div className={styles.cardHead}><div><h2>Stock directory</h2><p>{message||"Select variants to change quantities in bulk. Setting zero removes available stock, not the product."}</p></div><i className={`${styles.tag} ${message?styles.tagGray:styles.tagGreen}`}>{loading?"Loading":message?"Notice":"Connected"}</i></div>
      <div className={styles.dataTable}>
        <div className={styles.tableHead}><input type="checkbox" aria-label="Select visible inventory" checked={Boolean(filtered.length)&&filtered.every(item=>selected.includes(item.id))} onChange={selectVisible}/><span>Product</span><span>SKU</span><span>Price</span><span>Available</span><span>Status</span><span>Image</span><span>Updated</span><span>Action</span></div>
        {filtered.length?filtered.map(item=><div className={styles.tableRow} key={item.id}><input type="checkbox" aria-label={`Select ${item.name}`} checked={selected.includes(item.id)} onChange={()=>toggle(item.id)}/><div className={styles.customerCell}><strong>{item.product}</strong><small>{item.variant} · {item.productStatus.toLowerCase()}</small></div><span>{item.sku||"—"}</span><span>{item.price}</span><strong className={quantityAt(item)<=0?styles.stockEmpty:quantityAt(item)<=5?styles.stockLow:styles.stockOk}>{item.tracked?quantityAt(item):"Not tracked"}</strong><span><i className={`${styles.tag} ${quantityAt(item)<=0?styles.tagGray:styles.tagGreen}`}>{quantityAt(item)>0?"In stock":"Out of stock"}</i></span><InventoryProductImage item={item}/><span>{item.updatedAt?new Date(item.updatedAt).toLocaleDateString():"—"}</span><button className={styles.secondary} type="button" onClick={()=>openProduct(item)}>View / edit</button></div>):<div className={styles.empty}>{loading?"Loading Shopify inventory...":message||"No inventory matches these filters."}</div>}
      </div>
      {pageInfo.hasNextPage&&<div className={styles.inlineActions}><button className={styles.secondary} disabled={loading} onClick={()=>void load(search,pageInfo.endCursor)}>Load more</button></div>}
    </section>
  </div>
}

function InventoryBulkEditor({items,locations,initialLocationId,onClose,onSaved}:{items:InventoryItem[];locations:InventoryLocation[];initialLocationId:string;onClose:()=>void;onSaved:(changed:number)=>Promise<void>}){
  const quantityAtLocation=(item:InventoryItem,targetLocationId:string)=>item.levels.find(level=>level.locationId===targetLocationId)?.quantity??0;
  const makeDraft=(targetLocationId:string)=>Object.fromEntries(items.map(item=>[item.id,String(quantityAtLocation(item,targetLocationId))]));
  const [locationId,setLocationId]=useState(initialLocationId||locations[0]?.id||"");
  const [draft,setDraft]=useState<Record<string,string>>(()=>makeDraft(initialLocationId||locations[0]?.id||""));
  const [query,setQuery]=useState("");
  const [stockFilter,setStockFilter]=useState("all");
  const [statusFilter,setStatusFilter]=useState("all");
  const [changedOnly,setChangedOnly]=useState(false);
  const [fillValue,setFillValue]=useState("");
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");
  const normalizedQuery=query.trim().toLowerCase();
  const changedIds=items.filter(item=>item.tracked&&Math.max(0,Math.floor(Number(draft[item.id])||0))!==quantityAtLocation(item,locationId)).map(item=>item.id);
  const visible=items.filter(item=>{
    const quantity=Math.max(0,Math.floor(Number(draft[item.id])||0));
    const matchesQuery=!normalizedQuery||[item.product,item.variant,item.sku,item.barcode].some(value=>value.toLowerCase().includes(normalizedQuery));
    const matchesStatus=statusFilter==="all"||item.productStatus===statusFilter;
    const matchesStock=stockFilter==="all"||(stockFilter==="in"&&item.tracked&&quantity>0)||(stockFilter==="low"&&item.tracked&&quantity>0&&quantity<=5)||(stockFilter==="out"&&item.tracked&&quantity<=0)||(stockFilter==="untracked"&&!item.tracked);
    return matchesQuery&&matchesStatus&&matchesStock&&(!changedOnly||changedIds.includes(item.id));
  });
  const changeLocation=(nextLocationId:string)=>{setLocationId(nextLocationId);setDraft(makeDraft(nextLocationId));setMessage("")};
  const resetChanges=()=>{setDraft(makeDraft(locationId));setMessage("")};
  const fillVisible=()=>{if(fillValue.trim()==="")return;const quantity=String(Math.max(0,Math.floor(Number(fillValue)||0)));setDraft(current=>({...current,...Object.fromEntries(visible.filter(item=>item.tracked).map(item=>[item.id,quantity]))}))};
  const save=async()=>{
    const changedItems=items.filter(item=>changedIds.includes(item.id)&&item.inventoryItemId);
    const changes:{inventoryItemId:string;locationId:string;delta?:number;activateQuantity?:number}[]=[];
    changedItems.forEach(item=>{const level=item.levels.find(entry=>entry.locationId===locationId);const current=level?.quantity??0;const target=Math.max(0,Math.floor(Number(draft[item.id])||0));if(!level){if(target>0)changes.push({inventoryItemId:item.inventoryItemId,locationId,activateQuantity:target});return}const delta=target-current;if(delta)changes.push({inventoryItemId:item.inventoryItemId,locationId,delta})});
    if(!changes.length){setMessage("No inventory quantities have changed.");return}
    setSaving(true);setMessage(`Saving ${changes.length} changed row${changes.length===1?"":"s"} to Shopify...`);
    try{const response=await fetch("/api/shopify/inventory",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({changes})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to save bulk inventory.");await onSaved(data.changed||changes.length)}catch(error){setMessage(error instanceof Error?error.message:"Unable to save bulk inventory.");setSaving(false)}
  };
  return <div className={styles.bulkEditorPage}>
    <header className={styles.bulkEditorHeader}>
      <div><small>INVENTORY / BULK EDITOR</small><h2>Spreadsheet inventory editor</h2><p>Edit quantities directly in the Available column, then save all changed rows together.</p></div>
      <div><button className={styles.secondary} disabled={saving||!changedIds.length} onClick={resetChanges}>Reset changes</button><button className={styles.secondary} disabled={saving} onClick={onClose}>Close</button><button className={styles.primary} disabled={saving||!changedIds.length} onClick={()=>void save()}>{saving?"Saving...":`Save ${changedIds.length} change${changedIds.length===1?"":"s"}`}</button></div>
    </header>
    <section className={styles.bulkEditorFilters}>
      <label className={styles.bulkSearch}>Search products<input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Product, variant, SKU, or barcode"/></label>
      <label>Location<select value={locationId} onChange={event=>changeLocation(event.target.value)}>{locations.map(location=><option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
      <label>Stock<select value={stockFilter} onChange={event=>setStockFilter(event.target.value)}><option value="all">All inventory</option><option value="in">In stock</option><option value="low">Low stock</option><option value="out">Out of stock</option><option value="untracked">Not tracked</option></select></label>
      <label>Status<select value={statusFilter} onChange={event=>setStatusFilter(event.target.value)}><option value="all">All statuses</option><option value="ACTIVE">Active</option><option value="DRAFT">Draft</option><option value="ARCHIVED">Archived</option></select></label>
      <label className={styles.bulkChangedCheck}><input type="checkbox" checked={changedOnly} onChange={event=>setChangedOnly(event.target.checked)}/>Changed rows only</label>
      <div className={styles.bulkFill}><label>Set visible quantities<input type="number" min="0" value={fillValue} onChange={event=>setFillValue(event.target.value)} placeholder="0"/></label><button className={styles.secondary} disabled={!visible.some(item=>item.tracked)||fillValue.trim()===""} onClick={fillVisible}>Apply</button></div>
    </section>
    {message&&<div className={styles.bulkEditorMessage}>{message}</div>}
    <div className={styles.bulkSheetWrap}>
      <table className={styles.bulkSheet}>
        <thead><tr><th>#</th><th>Product</th><th>Variant</th><th>SKU</th><th>Price</th><th>Status</th><th>Tracking</th><th>Available</th></tr></thead>
        <tbody>{visible.length?visible.map((item,index)=>{const changed=changedIds.includes(item.id);return <tr key={item.id} className={changed?styles.bulkRowChanged:""}><td>{index+1}</td><td><strong>{item.product}</strong></td><td>{item.variant}</td><td>{item.sku||"—"}</td><td>{item.price}</td><td><i className={[styles.tag,item.productStatus==="ACTIVE"?styles.tagGreen:styles.tagGray].join(" ")}>{item.productStatus.toLowerCase()}</i></td><td>{item.tracked?"Tracked":"Not tracked"}</td><td><input type="number" min="0" disabled={!item.tracked} aria-label={`Available quantity for ${item.name}`} value={draft[item.id]??"0"} onChange={event=>setDraft(current=>({...current,[item.id]:event.target.value}))}/>{changed&&<span>Edited</span>}</td></tr>}):<tr><td colSpan={8} className={styles.bulkSheetEmpty}>No inventory matches these filters.</td></tr>}</tbody>
      </table>
    </div>
    <footer className={styles.bulkEditorFooter}><span>{visible.length} visible of {items.length} loaded variants</span><strong>{changedIds.length} unsaved change{changedIds.length===1?"":"s"}</strong></footer>
  </div>;
}

const emptyPromotionDraft=():PromotionDraft=>({method:"code",title:"",code:"",valueType:"percentage",value:"10",minimumSubtotal:"",usageLimit:"",startsAt:"",endsAt:"",appliesOncePerCustomer:false});
const toDateTimeLocal=(value?:string|null)=>{if(!value)return "";const date=new Date(value);if(Number.isNaN(date.getTime()))return "";return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16)};

function Promotions(){
  const [items,setItems]=useState<Promotion[]>([]);const [search,setSearch]=useState("");const [statusFilter,setStatusFilter]=useState("all");const [methodFilter,setMethodFilter]=useState("all");const [loading,setLoading]=useState(true);const [message,setMessage]=useState("");const [showCreate,setShowCreate]=useState(false);const [editing,setEditing]=useState<Promotion|null>(null);const [pageInfo,setPageInfo]=useState<{hasNextPage:boolean;endCursor:string|null}>({hasNextPage:false,endCursor:null});
  const [draft,setDraft]=useState<PromotionDraft>(emptyPromotionDraft);
  const load=async(term:string,after:string|null)=>{setLoading(true);setMessage("");try{const params=new URLSearchParams();if(term.trim())params.set("search",term.trim());if(after)params.set("after",after);const response=await fetch(`/api/shopify/promotions?${params}`,{cache:"no-store"});const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to load promotions.");const next=Array.isArray(data.promotions)?data.promotions:[];setItems(current=>after?[...current,...next]:next);setPageInfo(data.pageInfo||{hasNextPage:false,endCursor:null});if(!next.length)setMessage(term?"No promotions match this search.":"No Shopify promotions were returned.")}catch(error){setMessage(error instanceof Error?error.message:"Unable to load promotions.");if(!after)setItems([])}finally{setLoading(false)}};
  useEffect(()=>{/* eslint-disable react-hooks/set-state-in-effect */void load("",null);/* eslint-enable react-hooks/set-state-in-effect */},[]);
  const methodOf=(item:Promotion):PromotionDraft["method"]=>item.type.startsWith("Automatic")?"automatic":"code";const filtered=items.filter(item=>(statusFilter==="all"||item.status===statusFilter)&&(methodFilter==="all"||methodOf(item)===methodFilter));
  const closePromotionForm=()=>{setShowCreate(false);setEditing(null);setDraft(emptyPromotionDraft())};
  const openCreatePromotion=()=>{if(showCreate&&!editing){closePromotionForm();return}setEditing(null);setDraft(emptyPromotionDraft());setShowCreate(true)};
  const openEditPromotion=(item:Promotion)=>{if(!item.editable){setMessage("This promotion is controlled by a Shopify app and must be edited in Shopify.");return}setEditing(item);setDraft({method:methodOf(item),title:item.title,code:methodOf(item)==="code"?item.code:"",valueType:item.valueType||"percentage",value:String(item.value||10),minimumSubtotal:item.minimumSubtotal||"",usageLimit:item.usageLimit?String(item.usageLimit):"",startsAt:toDateTimeLocal(item.startsAt),endsAt:toDateTimeLocal(item.endsAt),appliesOncePerCustomer:Boolean(item.appliesOncePerCustomer)});setShowCreate(true);window.scrollTo({top:0,behavior:"smooth"})};
  const savePromotion=async()=>{const updating=Boolean(editing);setLoading(true);setMessage(updating?"Updating promotion in Shopify...":"Creating promotion in Shopify...");try{const payload={...draft,id:editing?.id,type:editing?.type,startsAt:draft.startsAt?new Date(draft.startsAt).toISOString():undefined,endsAt:draft.endsAt?new Date(draft.endsAt).toISOString():undefined};const response=await fetch("/api/shopify/promotions",{method:updating?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});const data=await response.json();if(!response.ok)throw new Error(data.error||(updating?"Unable to update promotion.":"Unable to create promotion."));setMessage(updating?"Promotion updated in Shopify.":"Promotion created in Shopify.");closePromotionForm();await load("",null)}catch(error){setMessage(error instanceof Error?error.message:updating?"Unable to update promotion.":"Unable to create promotion.")}finally{setLoading(false)}};
  const deletePromotion=async(item:Promotion)=>{if(!window.confirm(`Delete ${item.title}? This permanently removes the promotion from Shopify.`))return;setLoading(true);setMessage("Deleting promotion...");try{const response=await fetch(`/api/shopify/promotions?id=${encodeURIComponent(item.id)}&method=${methodOf(item)}`,{method:"DELETE"});const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to delete promotion.");setItems(current=>current.filter(entry=>entry.id!==item.id));setMessage(`${item.title} was deleted.`)}catch(error){setMessage(error instanceof Error?error.message:"Unable to delete promotion.")}finally{setLoading(false)}};
  const active=filtered.filter(item=>item.status==="ACTIVE").length;const scheduled=filtered.filter(item=>item.status==="SCHEDULED").length;const uses=filtered.reduce((sum,item)=>sum+item.usageCount,0);
  return <div className={styles.content}>
    <div className={styles.actionHeader}>
      <div><h2>Promotions</h2><p>Create and manage Shopify discounts.</p></div>
      <div className={styles.inlineActions}><button className={styles.primary} onClick={openCreatePromotion}>{showCreate&&!editing?"Close creator":"Create promotion"}</button></div>
    </div>
    {showCreate&&<section className={[styles.card,styles.promotionCreator].join(" ")}>
      <div className={styles.cardHead}><div><h2>{editing?"Edit promotion":"New promotion"}</h2><p>{editing?(editing.valueEditable?"Update the discount details directly in Shopify.":"Update the title, code, usage limits, and schedule. Product rules stay unchanged."):"Basic percentage or fixed-amount discount for all products."}</p></div></div>
      <div className={styles.promotionForm}>
        <label>Method<select value={draft.method} disabled={Boolean(editing)} onChange={event=>setDraft(current=>({...current,method:event.target.value as PromotionDraft["method"]}))}><option value="code">Discount code</option><option value="automatic">Automatic discount</option></select></label>
        <label>Title<input value={draft.title} onChange={event=>setDraft(current=>({...current,title:event.target.value}))} placeholder="Summer sale"/></label>
        {draft.method==="code"&&<label>Code<input value={draft.code} onChange={event=>setDraft(current=>({...current,code:event.target.value.toUpperCase()}))} placeholder="SUMMER20"/></label>}
        {(!editing||editing.valueEditable)&&<><label>Value type<select value={draft.valueType} onChange={event=>setDraft(current=>({...current,valueType:event.target.value as PromotionDraft["valueType"]}))}><option value="percentage">Percentage</option><option value="fixed">Fixed amount</option></select></label>
        <label>Discount value<input type="number" min="0.01" step="0.01" value={draft.value} onChange={event=>setDraft(current=>({...current,value:event.target.value}))}/></label>
        <label>Minimum subtotal<input type="number" min="0" step="0.01" value={draft.minimumSubtotal} onChange={event=>setDraft(current=>({...current,minimumSubtotal:event.target.value}))} placeholder="No minimum"/></label></>}
        {draft.method==="code"&&<label>Usage limit<input type="number" min="1" value={draft.usageLimit} onChange={event=>setDraft(current=>({...current,usageLimit:event.target.value}))} placeholder="Unlimited"/></label>}
        <label>Starts<input type="datetime-local" value={draft.startsAt} onChange={event=>setDraft(current=>({...current,startsAt:event.target.value}))}/></label>
        <label>Ends<input type="datetime-local" value={draft.endsAt} onChange={event=>setDraft(current=>({...current,endsAt:event.target.value}))}/></label>
        {draft.method==="code"&&<label className={styles.promotionCheck}><input type="checkbox" checked={draft.appliesOncePerCustomer} onChange={event=>setDraft(current=>({...current,appliesOncePerCustomer:event.target.checked}))}/>Limit to one use per customer</label>}
      </div>
      <div className={styles.inlineActions}><button className={styles.secondary} onClick={closePromotionForm}>Cancel</button><button className={styles.primary} disabled={loading} onClick={()=>void savePromotion()}>{loading?(editing?"Saving...":"Creating..."):(editing?"Save changes":"Create in Shopify")}</button></div>
    </section>}
    <div className={styles.promotionFilters}>
      <form className={styles.customerSearch} onSubmit={event=>{event.preventDefault();void load(search,null)}}><input className={styles.smallSearch} placeholder="Search promotion title" value={search} onChange={event=>setSearch(event.target.value)}/><button className={styles.primary} disabled={loading}>Search</button></form>
      <select value={statusFilter} onChange={event=>setStatusFilter(event.target.value)}><option value="all">All statuses</option><option value="ACTIVE">Active</option><option value="SCHEDULED">Scheduled</option><option value="EXPIRED">Expired</option></select>
      <select value={methodFilter} onChange={event=>setMethodFilter(event.target.value)}><option value="all">All methods</option><option value="code">Discount code</option><option value="automatic">Automatic</option></select>
    </div>
    <div className={styles.segmentGrid}>{[["Promotions","Matching filters",filtered.length],["Active","Currently available",active],["Scheduled","Starting later",scheduled],["Uses","Reported by Shopify",uses]].map(([title,copy,value])=><article className={styles.segment} key={title}><span>%</span><div><strong>{title}</strong><small>{copy}</small></div><b>{value}</b></article>)}</div>
    <section className={[styles.card,styles.promotionManageTable].join(" ")}>
      <div className={styles.cardHead}><div><h2>Promotion directory</h2><p>{message||"Shopify code and automatic discounts."}</p></div><i className={[styles.tag,message?styles.tagGray:styles.tagGreen].join(" ")}>{loading?"Loading":message?"Notice":"Connected"}</i></div>
      <div className={styles.dataTable}>
        <div className={styles.tableHead}><span>Promotion</span><span>Method</span><span>Status</span><span>Starts</span><span>Ends</span><span>Uses</span><span>Action</span></div>
        {filtered.length?filtered.map(item=><div className={styles.tableRow} key={item.id}>
          <div className={styles.customerCell}><strong>{item.title}</strong><small>{item.type.replace(/([a-z])([A-Z])/g,"$1 $2")}</small></div>
          <strong>{item.code}</strong>
          <span><i className={[styles.tag,item.status==="ACTIVE"?styles.tagGreen:item.status==="SCHEDULED"?styles.tagBlue:styles.tagGray].join(" ")}>{item.status.toLowerCase()}</i></span>
          <span>{item.startsAt?new Date(item.startsAt).toLocaleDateString():"Immediately"}</span>
          <span>{item.endsAt?new Date(item.endsAt).toLocaleDateString():"No end date"}</span>
          <strong>{item.usageCount}</strong>
          <div className={styles.promotionActions}><button className={styles.secondary} disabled={loading||!item.editable} title={item.editable?"Edit promotion":"App-controlled promotions must be edited in Shopify"} onClick={()=>openEditPromotion(item)}>Edit</button><button className={styles.delete} disabled={loading} onClick={()=>void deletePromotion(item)}>Delete</button></div>
        </div>):<div className={styles.empty}>{loading?"Loading Shopify promotions...":message||"No promotions match these filters."}</div>}
      </div>
      {pageInfo.hasNextPage&&<div className={styles.inlineActions}><button className={styles.secondary} disabled={loading} onClick={()=>void load(search,pageInfo.endCursor)}>Load more</button></div>}
    </section>
  </div>;
}

function AppActivityChart({data}:{data:AppAnalytics["daily"]}){
  const width=720;const height=230;const inset=14;const max=Math.max(1,...data.map(day=>day.views));const step=data.length>1?(width-inset*2)/(data.length-1):0;
  const points=data.map((day,index)=>({x:inset+index*step,y:height-inset-(day.views/max)*(height-inset*2),...day}));
  const line=points.map(point=>`${point.x},${point.y}`).join(" ");const area=points.length?`M ${points[0].x} ${height-inset} L ${points.map(point=>`${point.x} ${point.y}`).join(" L ")} L ${points.at(-1)?.x} ${height-inset} Z`:"";const labelEvery=Math.max(1,Math.ceil(data.length/7));
  return <div className={styles.salesChart}><div className={styles.salesChartValue}><strong>{data.reduce((sum,day)=>sum+day.views,0).toLocaleString()}</strong><span>Screen views in selected period</span></div><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Daily app screen views"><defs><linearGradient id="app-activity-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4d92c8" stopOpacity=".32"/><stop offset="100%" stopColor="#4d92c8" stopOpacity=".02"/></linearGradient></defs>{[.25,.5,.75,1].map(value=><line key={value} x1={inset} x2={width-inset} y1={height-inset-value*(height-inset*2)} y2={height-inset-value*(height-inset*2)} stroke="#e7edf1" strokeWidth="1"/>)}{area&&<path d={area} fill="url(#app-activity-fill)"/>}<polyline points={line} fill="none" stroke="#397ab5" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>{data.length<=30&&points.map(point=><circle key={point.date} cx={point.x} cy={point.y} r="3" fill="#fff" stroke="#397ab5" strokeWidth="2"/>)}</svg><div className={styles.analyticsAxis}>{data.map((day,index)=>index%labelEvery===0||index===data.length-1?<span key={day.date}>{day.label}</span>:null)}</div></div>
}

function DeviceActivityChart({data}:{data:AppAnalytics["daily"]}){
  const max=Math.max(1,...data.map(day=>day.devices));const display=data.length>30?data.filter((_,index)=>index%Math.ceil(data.length/30)===0):data;
  return <div className={styles.orderVolumeChart}>{display.map(day=><div key={day.date} title={`${day.label}: ${day.devices} active devices`}><span style={{height:`${Math.max(3,(day.devices/max)*100)}%`}}/><small>{display.length<=10?day.label:""}</small></div>)}</div>
}

function AnalyticsBreakdown({title,items,unit="devices"}:{title:string;items:{label:string;value:number}[];unit?:string}){
  const colors=["#397ab5","#70a8cf","#96c6b0","#e3b86b","#d98787","#9a86c8"];const total=items.reduce((sum,item)=>sum+item.value,0);let cursor=0;const stops=items.map((item,index)=>{const start=cursor;cursor+=total?(item.value/total)*100:0;return `${colors[index%colors.length]} ${start}% ${cursor}%`});
  return <section className={styles.analyticsBreakdown}><div className={styles.analyticsDonut} style={{background:total?`conic-gradient(${stops.join(",")})`:"#edf1f4"}}><div><strong>{total}</strong><small>{unit}</small></div></div><div className={styles.analyticsLegend}><h3>{title}</h3>{items.length?items.map((item,index)=><div key={item.label}><i style={{background:colors[index%colors.length]}}/><span>{item.label.toLowerCase().replaceAll("_"," ")}</span><strong>{item.value}</strong></div>):<small>No app activity in this period.</small>}</div></section>
}

function recentAnalyticsRange(days:number):AnalyticsDateRange{
  const end=new Date();const start=new Date(end);start.setUTCDate(start.getUTCDate()-(days-1));
  return {start:start.toISOString().slice(0,10),end:end.toISOString().slice(0,10)};
}
function analyticsPeriodLabel(range:AppAnalytics["range"]){
  const format=new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"});
  return `${format.format(new Date(range.start))} – ${format.format(new Date(range.end))}`;
}

type CommerceReportView="sales"|"products"|"orders"|"customers";
function commerceMoney(value:number,currencyCode:string){try{return new Intl.NumberFormat(undefined,{style:"currency",currency:currencyCode,maximumFractionDigits:2}).format(value)}catch{return `${value.toFixed(2)} ${currencyCode}`}}
function exportCommerceReport(data:CommerceAnalytics,report:CommerceReportView){
  const quote=(value:string|number)=>`"${String(value).replaceAll('"','""')}"`;
  let headers:string[]=[];let rows:(string|number)[][]=[];
  if(report==="sales"){headers=["Date","Gross sales","Net payments","Refunds","Discounts","Orders","Items sold","Average order value"];rows=data.daily.map(day=>[day.date,day.sales,day.revenue,day.refunds,day.discounts,day.orders,day.itemsSold,day.averageOrderValue])}
  if(report==="products"){headers=["Product","Net product sales","Items sold"];rows=data.topProducts.map(item=>[item.title,item.sales,item.quantity])}
  if(report==="orders"){headers=["Report","Status or source","Orders"];rows=[[...data.fulfillment.map(item=>["Fulfillment",item.label,item.value]),...data.financial.map(item=>["Payment",item.label,item.value]),...data.sources.map(item=>["Sales channel",item.label,item.value])]].flat() as (string|number)[][]}
  if(report==="customers"){headers=["Customer","Email","Account type","Order source","Orders","Total spent","Average order value","Latest order"];rows=data.topCustomers.map(customer=>[customer.name,customer.email,customer.accountType,customer.orderSource,customer.orders,customer.totalSpent,customer.averageOrderValue,customer.lastOrderAt])}
  const csv=[headers,...rows].map(row=>row.map(quote).join(",")).join("\n");const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});const link=document.createElement("a");link.href=URL.createObjectURL(blob);link.download=`carters-${report}-report-${data.range.start.slice(0,10)}-${data.range.end.slice(0,10)}.csv`;link.click();URL.revokeObjectURL(link.href);
}
function CommerceReport({data,view}:{data:CommerceAnalytics;view:CommerceReportView}){
  const money=(value:number)=>commerceMoney(value,data.currencyCode);
  const [customerSort,setCustomerSort]=useState<"spend"|"orders">("spend");
  const [customerType,setCustomerType]=useState<"all"|"registered"|"guest">("all");
  const rankedCustomers=data.topCustomers.filter(customer=>customerType==="all"||(customerType==="registered"?customer.accountState==="ENABLED":customer.accountState!=="ENABLED")).sort((a,b)=>customerSort==="orders"?b.orders-a.orders||b.totalSpent-a.totalSpent:b.totalSpent-a.totalSpent||b.orders-a.orders);
  if(view==="products")return <div className={styles.analyticsReportTable}><div className={styles.analyticsReportHead}><span>#</span><span>Product</span><span>Items sold</span><span>Net product sales</span></div>{data.topProducts.length?data.topProducts.map((product,index)=><div className={styles.analyticsReportRow} key={product.title}><b>{index+1}</b><strong>{product.title}</strong><span>{product.quantity.toLocaleString()}</span><strong>{money(product.sales)}</strong></div>):<div className={styles.analyticsReportEmpty}>No product sales were returned for this period.</div>}</div>;
  if(view==="orders")return <div className={styles.analyticsBreakdownReports}><AnalyticsBreakdown title="Fulfillment status" items={data.fulfillment} unit="orders"/><AnalyticsBreakdown title="Payment status" items={data.financial} unit="orders"/><AnalyticsBreakdown title="Sales channel" items={data.sources} unit="orders"/></div>;
  if(view==="customers")return <div className={styles.analyticsCustomerReport}><div className={styles.analyticsCustomerSummary}><AnalyticsBreakdown title="Purchase frequency in period" items={data.customerTypes} unit="customers"/><div><strong>{data.totals.customers.toLocaleString()}</strong><span>Purchasing customers</span><small>Unique customers with a non-cancelled order.</small></div><div><strong>{data.totals.orders&&data.totals.customers?(data.totals.orders/data.totals.customers).toFixed(2):"0"}</strong><span>Orders per customer</span><small>Average within the selected period.</small></div></div><div className={styles.analyticsCustomerRankHeader}><div><h3>Top customers</h3><p>See account registration status and the customer&apos;s primary order channel.</p></div><div className={styles.analyticsCustomerControls}><select value={customerType} onChange={event=>setCustomerType(event.target.value as typeof customerType)} aria-label="Customer account type"><option value="all">All customer types</option><option value="registered">Registered accounts</option><option value="guest">Guest / checkout</option></select><div className={styles.analyticsCustomerSort}><button type="button" className={customerSort==="spend"?styles.analyticsCustomerSortActive:""} onClick={()=>setCustomerSort("spend")}>Highest spend</button><button type="button" className={customerSort==="orders"?styles.analyticsCustomerSortActive:""} onClick={()=>setCustomerSort("orders")}>Most orders</button></div></div></div><div className={`${styles.analyticsReportTable} ${styles.analyticsTopCustomerTable}`}><div className={styles.analyticsReportHead}><span>#</span><span>Customer</span><span>Account type</span><span>Order source</span><span>Orders</span><span>Total spent</span><span>Average order</span><span>Latest order</span></div>{rankedCustomers.length?rankedCustomers.map((customer,index)=><div className={styles.analyticsReportRow} key={customer.id}><b>{index+1}</b><div className={styles.analyticsTopCustomerIdentity}><strong>{customer.name}</strong><small>{customer.email||"No email"}</small></div><span><i className={`${styles.tag} ${customer.accountState==="ENABLED"?styles.tagGreen:styles.tagGray}`}>{customer.accountType}</i></span><span>{customer.orderSource}</span><strong>{customer.orders}</strong><strong>{money(customer.totalSpent)}</strong><span>{money(customer.averageOrderValue)}</span><span>{new Date(customer.lastOrderAt).toLocaleDateString()}</span></div>):<div className={styles.analyticsReportEmpty}>No customers match this account type in the selected period.</div>}</div><div className={styles.analyticsReportTable}><div className={styles.analyticsReportHead}><span>Date</span><span>Customers</span><span>Orders</span><span>Orders / customer</span></div>{data.daily.map(day=><div className={styles.analyticsReportRow} key={day.date}><strong>{day.label}</strong><span>{day.customers}</span><span>{day.orders}</span><strong>{day.customers?(day.orders/day.customers).toFixed(2):"0"}</strong></div>)}</div></div>;
  return <div className={styles.analyticsSalesReport}><div className={styles.analyticsSalesCharts}><DashboardCommerceChart title="Gross sales" copy={`Order value · ${data.currencyCode}`} value={money(data.totals.sales)} color="#397ab5" formatPoint={money} data={data.daily.map(day=>({date:day.date,label:day.label,value:day.sales}))}/><DashboardCommerceChart title="Net payments" copy="Payments received after refunds" value={money(data.totals.revenue)} color="#19805c" formatPoint={money} data={data.daily.map(day=>({date:day.date,label:day.label,value:day.revenue}))}/></div><div className={styles.analyticsReportTable}><div className={styles.analyticsReportHead}><span>Date</span><span>Gross sales</span><span>Net payments</span><span>Orders</span></div>{data.daily.map(day=><div className={styles.analyticsReportRow} key={day.date}><strong>{day.label}</strong><span>{money(day.sales)}</span><span>{money(day.revenue)}</span><strong>{day.orders}</strong></div>)}</div></div>;
}

function Analytics(){
  const initialRange=useMemo(()=>recentAnalyticsRange(30),[]);
  const [analytics,setAnalytics]=useState<AppAnalytics|null>(null);const [commerce,setCommerce]=useState<CommerceAnalytics|null>(null);const [reportView,setReportView]=useState<CommerceReportView>("sales");const [range,setRange]=useState<AnalyticsDateRange>(initialRange);const [loading,setLoading]=useState(true);const [message,setMessage]=useState("");const [commerceMessage,setCommerceMessage]=useState("");
  useEffect(()=>{let active=true;const load=async()=>{const params=new URLSearchParams(range);const [appResult,commerceResult]=await Promise.allSettled([fetch(`/api/analytics/summary?${params}`,{cache:"no-store"}),fetch(`/api/analytics/commerce?${params}`,{cache:"no-store"})]);const read=async(result:PromiseSettledResult<Response>)=>{if(result.status!=="fulfilled")throw result.reason;const data=await result.value.json();if(!result.value.ok)throw new Error(data.error||"Report unavailable.");return data};try{const data=await read(appResult);if(active)setAnalytics(data)}catch(error){if(active)setMessage(error instanceof Error?error.message:"App analytics unavailable.")}try{const data=await read(commerceResult);if(active)setCommerce(data)}catch(error){if(active)setCommerceMessage(error instanceof Error?error.message:"Shopify reports unavailable.")}if(active)setLoading(false)};void load();return()=>{active=false}},[range]);
  const applyRange=(next:AnalyticsDateRange)=>{setLoading(true);setMessage("");setCommerceMessage("");setRange(next)};
  const maxProduct=Math.max(1,...(analytics?.topProducts.map(product=>product.views)||[1]));const maxScreen=Math.max(1,...(analytics?.screens.map(screen=>screen.views)||[1]));const maxHour=Math.max(1,...(analytics?.hours.map(hour=>hour.value)||[1]));
  const metrics=analytics?[{label:"Unique devices",value:analytics.metrics.uniqueDevices,change:analytics.changes.uniqueDevices},{label:"Sessions",value:analytics.metrics.sessions,change:analytics.changes.sessions},{label:"Screen views",value:analytics.metrics.screenViews,change:analytics.changes.screenViews},{label:"Product views",value:analytics.metrics.productViews,change:analytics.changes.productViews},{label:"Cart views",value:analytics.metrics.cartViews,change:analytics.changes.cartViews}]:[];
  return <div className={`${styles.content} ${styles.analyticsPage}`}>
    <section className={styles.analyticsHero}><div><p>ANALYTICS &amp; REPORTS</p><h2>Store performance</h2><span>Shopify commerce reports and mobile app behavior in one workspace.</span></div><div className={styles.analyticsHeroActions}><AnalyticsDateRangePicker value={range} loading={loading} onApply={applyRange}/><i className={`${styles.tag} ${message&&commerceMessage?styles.tagGray:styles.tagGreen}`}>{loading?"Loading":message&&commerceMessage?"Unavailable":"Live data"}</i></div></section>
    {message&&<section className={`${styles.card} ${styles.analyticsNotice}`}>{message}</section>}
    <section className={styles.analyticsReportsSection}><div className={styles.analyticsReportsHeader}><div><p>SHOPIFY REPORTS</p><h2>Commerce reports</h2><span>{commerce?analyticsPeriodLabel(commerce.range):"Sales, orders, products, and customer performance."}</span></div>{commerce&&<button className={styles.secondary} type="button" onClick={()=>exportCommerceReport(commerce,reportView)}>↓ Export CSV</button>}</div>{commerceMessage&&<div className={styles.analyticsReportWarning}>{commerceMessage}</div>}<div className={styles.analyticsCommerceMetrics}>{[
      [commerce?commerceMoney(commerce.totals.sales,commerce.currencyCode):"—","Gross sales","Total non-cancelled order value"],[commerce?commerceMoney(commerce.totals.averageOrderValue,commerce.currencyCode):"—","Average order value","Gross sales divided by orders"],[commerce?.totals.orders??"—","Orders","Non-cancelled Shopify orders"],[commerce?.totals.itemsSold??"—","Items sold","Units across loaded line items"],[commerce?commerceMoney(commerce.totals.refunds,commerce.currencyCode):"—","Refunds","Reported by Shopify orders"],[commerce?commerceMoney(commerce.totals.discounts,commerce.currencyCode):"—","Discounts","Discount value applied"],
    ].map(([value,label,copy])=><article key={label}><span>{label}</span><strong>{typeof value==="number"?value.toLocaleString():value}</strong><small>{copy}</small></article>)}</div><nav className={styles.analyticsReportTabs} aria-label="Commerce reports">{([['sales','Sales over time','↗'],['products','Sales by product','▦'],['orders','Order analysis','▤'],['customers','Customer analysis','♙']] as [CommerceReportView,string,string][]).map(([value,label,icon])=><button type="button" key={value} className={reportView===value?styles.analyticsReportTabActive:""} onClick={()=>setReportView(value)}><span>{icon}</span>{label}</button>)}</nav><div className={styles.analyticsReportBody}>{commerce?<CommerceReport data={commerce} view={reportView}/>:<div className={styles.analyticsReportLoading}>{loading?"Loading Shopify report…":"No Shopify report data available."}</div>}</div>{commerce?.truncated&&<small className={styles.analyticsReportWarning}>The safe Shopify pagination limit was reached, so large-period totals may be incomplete.</small>}</section>
    <div className={styles.analyticsSectionTitle}><div><p>MOBILE APP REPORTS</p><h2>Customer behavior</h2></div><span>Events recorded inside the Carter&apos;s app</span></div>
    <div className={styles.commerceMetricGrid}>{loading&&!analytics?Array.from({length:5},(_,index)=><article className={`${styles.metric} ${styles.analyticsSkeleton}`} key={index}/>):metrics.map(metric=><article className={styles.metric} key={metric.label}><div className={styles.metricIcon}>{metric.change>=0?"↗":"↘"}</div><p>{metric.label}</p><strong>{metric.value.toLocaleString()}</strong><span className={metric.change>=0?styles.analyticsPositive:styles.analyticsNegative}>{metric.change>=0?"+":""}{metric.change}% <i>vs previous period</i></span></article>)}</div>
    <div className={styles.analyticsPrimaryGrid}><section className={styles.card}><div className={styles.cardHead}><div><h2>App activity over time</h2><p>Daily screen views · {analytics?analyticsPeriodLabel(analytics.range):"selected period"}</p></div><span className={styles.analyticsRefunds}>{analytics?.metrics.viewsPerSession??"—"} views / session</span></div>{analytics?<AppActivityChart data={analytics.daily}/>:<div className={styles.analyticsChartEmpty}>Loading app activity...</div>}</section><section className={styles.card}><div className={styles.cardHead}><div><h2>Active devices</h2><p>Unique devices active each day</p></div></div>{analytics?<DeviceActivityChart data={analytics.daily}/>:<div className={styles.analyticsChartEmpty}>Loading devices...</div>}</section></div>
    <div className={styles.analyticsPrimaryGrid}><section className={styles.card}><div className={styles.cardHead}><div><h2>Engagement funnel</h2><p>How active devices move from browsing to cart</p></div></div><div className={styles.analyticsFunnel}>{analytics?.funnel.map((step,index)=><div key={step.label}><span>{index+1}</span><div><strong>{step.label}</strong><small>{step.rate}% of active devices</small><i><b style={{width:`${step.rate}%`}}/></i></div><em>{step.value}</em></div>)}</div></section><section className={`${styles.card} ${styles.analyticsBreakdowns}`}><AnalyticsBreakdown title="Device platform" items={analytics?.platforms||[]}/><AnalyticsBreakdown title="New vs returning" items={analytics?.audience||[]}/></section></div>
    <div className={styles.analyticsPrimaryGrid}><section className={styles.card}><div className={styles.cardHead}><div><h2>Popular screens</h2><p>Most-viewed destinations in the app</p></div></div><div className={styles.analyticsScreenList}>{analytics?.screens.length?analytics.screens.map((screen,index)=><div key={screen.path}><b>{index+1}</b><div><strong>{screen.label}</strong><small>{screen.path} · {screen.devices} device{screen.devices===1?"":"s"}</small><span><i style={{width:`${Math.max(3,(screen.views/maxScreen)*100)}%`}}/></span></div><em>{screen.views} views</em></div>):<div className={styles.empty}>No screen views in this period.</div>}</div></section><section className={styles.card}><div className={styles.cardHead}><div><h2>Activity by hour</h2><p>Screen views by local hour</p></div></div><div className={styles.analyticsHourly}>{analytics?.hours.map(hour=><div key={hour.hour} title={`${hour.hour}:00 · ${hour.value} views`}><span style={{height:`${Math.max(3,(hour.value/maxHour)*100)}%`}}/><small>{hour.hour%6===0?`${hour.hour}:00`:""}</small></div>)}</div></section></div>
    <div className={styles.analyticsPrimaryGrid}><section className={styles.card}><div className={styles.cardHead}><div><h2>Top viewed products</h2><p>Product pages receiving the most app attention</p></div></div><div className={styles.analyticsProducts}>{analytics?.topProducts.length?analytics.topProducts.map((product,index)=><div key={product.path}><b>{index+1}</b>{product.image?.url?<img className={styles.analyticsProductImage} src={product.image.url} alt={product.image.altText||product.label}/>:<span className={styles.analyticsProductFallback}>▦</span>}<div><strong>{product.label}</strong><small>{product.devices} device{product.devices===1?"":"s"}</small><span><i style={{width:`${Math.max(3,(product.views/maxProduct)*100)}%`}}/></span></div><em>{product.views} views</em></div>):<div className={styles.empty}>No product views in this period.</div>}</div></section><section className={styles.card}><div className={styles.cardHead}><div><h2>Engagement quality</h2><p>Supporting app health indicators</p></div></div><div className={styles.appAnalyticsStrip}>{[[analytics?.metrics.viewsPerSession??"—","Views / session"],[analytics?`${analytics.metrics.bounceRate}%`:"—","Single-view sessions"],[analytics?.metrics.activeDevices24h??"—","Active devices · 24h"],[analytics?.metrics.notificationOpens??"—","Notification opens"],[analytics?.metrics.pushDevices??"—","Push-enabled devices"],[analytics?.recordingSince?new Date(analytics.recordingSince).toLocaleDateString():"—","Recording since"]].map(([value,label])=><div key={label}><strong>{value}</strong><small>{label}</small></div>)}</div></section></div>
  </div>
}

function Chat(){return <div className={styles.content}><div className={styles.actionHeader}><div><h2>Customer chat</h2><p>Realtime support inbox readiness.</p></div><button className={styles.secondary}>Configure inbox</button></div><div className={styles.supportGrid}><section className={styles.card}><div className={styles.cardHead}><div><h2>Inbox status</h2><p>Supabase Realtime is required before live chat can be enabled.</p></div></div><div className={styles.empty}>No recorded conversations yet.</div></section><section className={styles.card}><div className={styles.cardHead}><div><h2>Setup checklist</h2><p>Required production pieces.</p></div></div><div className={styles.checkList}>{["Create conversations table","Enable realtime channel","Add staff assignment rules","Connect notification alerts"].map((item)=><div key={item}><span>○</span><strong>{item}</strong></div>)}</div></section></div></div>}

function Marketing(){
  type Campaign={id:string;title:string;message:string;url:string;createdAt:string;recipientCount:number;status:string;opens:number;openRate:number|null};
  const templates=[{name:"New arrivals",icon:"✦",title:"New arrivals are here",message:"Discover fresh styles made for every little adventure.",url:"/collection/new-collection-ss26"},{name:"Limited offer",icon:"%",title:"A special offer just for you",message:"Open the Carter's app and shop the latest limited-time offer.",url:"/promotions"},{name:"Back in stock",icon:"↻",title:"Your favorite is back",message:"The item you were waiting for is available again. Shop before it sells out.",url:"/notifications"}];
  const [composer,setComposer]=useState(false);const [step,setStep]=useState<"compose"|"review">("compose");const [sending,setSending]=useState(false);
  const [pushTitle,setPushTitle]=useState("New arrivals are here");const [pushMessage,setPushMessage]=useState("Discover fresh styles made for every little adventure.");const [pushUrl,setPushUrl]=useState("/collection/new-collection-ss26");
  const [sendStatus,setSendStatus]=useState("");const [campaigns,setCampaigns]=useState<Campaign[]>([]);const [deviceCount,setDeviceCount]=useState<number|null>(null);const [refreshMessage,setRefreshMessage]=useState("");
  const validUrl=pushUrl.startsWith("/")||/^https:\/\//i.test(pushUrl);const canReview=Boolean(pushTitle.trim()&&pushMessage.trim()&&pushTitle.length<=65&&pushMessage.length<=180&&validUrl);
  const measuredRates=campaigns.flatMap(campaign=>campaign.openRate===null?[]:[campaign.openRate]);const averageOpenRate=measuredRates.length?Math.round(measuredRates.reduce((sum,value)=>sum+value,0)/measuredRates.length*10)/10:null;const totalRecipients=campaigns.reduce((sum,campaign)=>sum+campaign.recipientCount,0);
  const refreshCampaigns=async()=>{setRefreshMessage("Refreshing…");try{const response=await fetch(`/api/push/campaigns?t=${Date.now()}`,{cache:"no-store"});if(!response.ok)throw new Error("Refresh failed");const data=await response.json();setCampaigns(Array.isArray(data.campaigns)?data.campaigns:[]);setRefreshMessage(`Updated ${new Date().toLocaleTimeString()}`)}catch{setRefreshMessage("Unable to refresh")}};
  useEffect(()=>{fetch("/api/analytics/summary").then(response=>response.json()).then(data=>setDeviceCount(Number(data.notificationDevices)||0)).catch(()=>setDeviceCount(null));fetch("/api/push/campaigns").then(response=>response.json()).then(data=>setCampaigns(Array.isArray(data.campaigns)?data.campaigns:[])).catch(()=>setCampaigns([]))},[]);
  const openComposer=(campaign?:Campaign)=>{if(campaign){setPushTitle(campaign.title);setPushMessage(campaign.message);setPushUrl(campaign.url)}setStep("compose");setSendStatus("");setComposer(true);window.scrollTo({top:0,behavior:"smooth"})};
  const applyTemplate=(template:(typeof templates)[number])=>{setPushTitle(template.title);setPushMessage(template.message);setPushUrl(template.url);setSendStatus("")};
  const sendPush=async()=>{if(!canReview||sending)return;setSending(true);setSendStatus("Sending campaign…");try{const response=await fetch("/api/push/send",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:pushTitle,message:pushMessage,url:pushUrl})});const result=await response.json();if(!response.ok)throw new Error(result.error||"Unable to send campaign.");setSendStatus(result.queued&&result.sent===0?"Campaign added to the local test inbox.":`Campaign sent to ${result.sent} device${result.sent===1?"":"s"}.`);setComposer(false);setStep("compose");await refreshCampaigns()}catch(error){setSendStatus(error instanceof Error?error.message:"Unable to send campaign.")}finally{setSending(false)}};
  return <div className={`${styles.content} ${styles.notificationPage}`}>
    <section className={styles.notificationHero}><div><p>CUSTOMER ENGAGEMENT</p><h2>Push notifications</h2><span>Create concise campaigns, review them before delivery, and measure customer opens.</span></div><button className={styles.primary} onClick={()=>openComposer()}>＋ Create campaign</button></section>
    {sendStatus&&!composer&&<div className={styles.notificationNotice}>{sendStatus}</div>}
    <div className={styles.metricGrid}><MiniMetric value={deviceCount===null?"—":deviceCount.toLocaleString()} label="Reachable devices" note="Registered push tokens"/><MiniMetric value={averageOpenRate===null?"—":`${averageOpenRate}%`} label="Average open rate" note="Unique campaign opens"/><MiniMetric value={totalRecipients.toLocaleString()} label="Notifications delivered" note="Recorded campaign recipients"/><MiniMetric value={campaigns.length.toLocaleString()} label="Campaign history" note="Latest 100 retained"/></div>
    {composer&&<section className={styles.notificationComposer}>
      <header><div><small>NEW CAMPAIGN</small><h2>{step==="compose"?"Create notification":"Review and send"}</h2><p>{step==="compose"?"Write a focused message and choose where customers land.":"Confirm the audience and message before notifying customers."}</p></div><button className={styles.iconButton} type="button" aria-label="Close composer" onClick={()=>setComposer(false)}>×</button></header>
      <div className={styles.notificationSteps}><span className={step==="compose"?styles.notificationStepActive:styles.notificationStepDone}><b>{step==="review"?"✓":"1"}</b>Compose</span><i/><span className={step==="review"?styles.notificationStepActive:""}><b>2</b>Review</span></div>
      {step==="compose"?<div className={styles.notificationComposerBody}>
        <main>
          <section className={styles.notificationCard}><div className={styles.notificationCardHead}><div><h3>Message</h3><p>Keep the most important words visible on the lock screen.</p></div></div><label>Title <span>{pushTitle.length}/65</span><input maxLength={65} value={pushTitle} onChange={event=>setPushTitle(event.target.value)} placeholder="Notification title"/></label><label>Message <span>{pushMessage.length}/180</span><textarea rows={5} maxLength={180} value={pushMessage} onChange={event=>setPushMessage(event.target.value)} placeholder="Tell customers what is new"/></label></section>
          <section className={styles.notificationCard}><div className={styles.notificationCardHead}><div><h3>Destination</h3><p>Open a relevant app screen after the customer taps.</p></div></div><label>Deep link<input value={pushUrl} onChange={event=>setPushUrl(event.target.value)} placeholder="/notifications"/>{!validUrl&&<small className={styles.notificationError}>Use an app path beginning with / or a secure HTTPS link.</small>}</label><div className={styles.deepLinkPresets}>{[["Notifications","/notifications"],["Promotions","/promotions"],["New collection","/collection/new-collection-ss26"]].map(([label,url])=><button type="button" key={url} onClick={()=>setPushUrl(url)}>{label}</button>)}</div></section>
        </main>
        <aside><section className={styles.notificationPreviewCard}><div><span>9:41</span><b>•••</b></div><article><span className={styles.notificationAppIcon}>C</span><div><small>CARTER&apos;S · NOW</small><strong>{pushTitle||"Notification title"}</strong><p>{pushMessage||"Your notification message will appear here."}</p></div></article><small>Preview appearance varies by device.</small></section><section className={styles.notificationTemplateCard}><h3>Quick templates</h3><p>Start with a proven campaign structure.</p>{templates.map(template=><button type="button" key={template.name} onClick={()=>applyTemplate(template)}><span>{template.icon}</span><div><strong>{template.name}</strong><small>{template.title}</small></div><b>→</b></button>)}</section></aside>
      </div>:<div className={styles.notificationReview}>
        <section className={styles.notificationReviewSummary}><div><span>Audience</span><strong>All registered app users</strong><small>{deviceCount===null?"Recipient count unavailable":`${deviceCount.toLocaleString()} reachable device${deviceCount===1?"":"s"}`}</small></div><div><span>Delivery</span><strong>Send immediately</strong><small>Scheduling is not enabled.</small></div><div><span>Destination</span><strong>{pushUrl}</strong><small>Opened when the notification is tapped.</small></div></section>
        <section className={styles.notificationReviewMessage}><span className={styles.notificationAppIcon}>C</span><div><small>CARTER&apos;S</small><strong>{pushTitle}</strong><p>{pushMessage}</p></div></section>
        <div className={styles.notificationWarning}><span>!</span><p><strong>This action notifies customers immediately.</strong> Confirm the message, destination, and reachable audience before sending.</p></div>
      </div>}
      {sendStatus&&<div className={styles.notificationComposerStatus}>{sendStatus}</div>}
      <footer><button className={styles.secondary} type="button" disabled={sending} onClick={()=>step==="review"?setStep("compose"):setComposer(false)}>{step==="review"?"Back to edit":"Cancel"}</button><button className={styles.primary} type="button" disabled={!canReview||sending} onClick={()=>step==="compose"?setStep("review"):void sendPush()}>{step==="compose"?"Review campaign":sending?"Sending…":"Send notification"}</button></footer>
    </section>}
    <section className={`${styles.card} ${styles.notificationHistory}`}><div className={styles.cardHead}><div><h2>Campaign history</h2><p>Unique opens are recorded when a customer taps a notification. {refreshMessage}</p></div><button className={styles.secondary} onClick={refreshCampaigns}>↻ Refresh</button></div>{campaigns.length?<div className={styles.dataTable}><div className={styles.tableHead}><span>Campaign</span><span>Sent</span><span>Status</span><span>Recipients</span><span>Performance</span><span>Action</span></div>{campaigns.map(c=><div className={styles.tableRow} key={c.id}><div className={styles.notificationCampaignCell}><strong>{c.title}</strong><small>{c.message}</small></div><span>{new Date(c.createdAt).toLocaleString()}</span><span><i className={`${styles.tag} ${c.status==="submitted"?styles.tagGreen:c.status==="failed"?styles.tagGray:styles.tagBlue}`}>{c.status==="test-queued"?"Local test":c.status}</i></span><strong>{c.recipientCount||"Test"}</strong><span>{c.openRate===null?`${c.opens} opens`:`${c.opens} opens · ${c.openRate}%`}</span><button className={styles.secondary} type="button" onClick={()=>openComposer(c)}>Use again</button></div>)}</div>:<div className={styles.notificationEmpty}><span>◇</span><strong>No campaigns yet</strong><p>Create your first notification to start measuring customer engagement.</p><button className={styles.primary} onClick={()=>openComposer()}>Create campaign</button></div>}</section>
    <section className={styles.notificationAutomationNotice}><span>⚙</span><div><strong>Automations are not enabled yet</strong><p>Cart reminders, back-in-stock alerts, and birthday messages require a persistent scheduler and customer targeting rules.</p></div><i className={`${styles.tag} ${styles.tagGray}`}>Setup required</i></section>
  </div>
}

function MiniMetric({value,label,note}:{value:string;label:string;note:string}){return <article className={styles.metric}><p>{label}</p><strong>{value}</strong><span>{note}</span></article>}

function OrderProductImage({item}:{item:OrderLineItem}){
  if(!item.image?.url)return <span className={styles.orderImageFallback}>▦</span>;
  // Shopify serves order product images from its CDN; preserve the exact historic line-item image URL.
  return <img className={styles.orderProductImage} src={item.image.url} alt={item.image.altText||item.name}/>;
}

function InventoryProductImage({item,large=false}:{item:InventoryItem;large?:boolean}){
  if(!item.image?.url)return <span className={`${styles.inventoryImageFallback} ${large?styles.productWorkspaceImage:""}`} aria-label="No product image">▦</span>;
  // Shopify serves product images from its CDN.
  return <img className={`${styles.inventoryProductImage} ${large?styles.productWorkspaceImage:""}`} src={item.image.url} alt={item.image.altText||item.name}/>;
}

function Orders({initialFilter}:{initialFilter:OrderFilter}){
  const [orders,setOrders]=useState<AdminOrder[]>([]);
  const [pendingCount,setPendingCount]=useState(0);
  const [search,setSearch]=useState("");
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState("");
  const [statusFilter,setStatusFilter]=useState<OrderFilter>(initialFilter);
  const [selectedOrderIds,setSelectedOrderIds]=useState<string[]>([]);
  const [bulkNotifyCustomer,setBulkNotifyCustomer]=useState(false);
  const [selectedId,setSelectedId]=useState("");
  const [saving,setSaving]=useState(false);
  const [notifyCustomer,setNotifyCustomer]=useState(false);
  const [draft,setDraft]=useState<OrderDraft|null>(null);
  const [pageInfo,setPageInfo]=useState<{hasNextPage:boolean;endCursor:string|null}>({hasNextPage:false,endCursor:null});
  const loadOrders=useCallback(async(term:string,after:string|null,filter:OrderFilter)=>{
    setLoading(true);setMessage("");
    try{
      const params=new URLSearchParams();
      if(term.trim())params.set("search",term.trim());
      if(filter==="pending")params.set("status","pending");
      if(after)params.set("after",after);
      const response=await fetch(`/api/shopify/orders?${params.toString()}`,{cache:"no-store"});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Unable to load Shopify orders.");
      const next=Array.isArray(data.orders)?data.orders:[];
      setOrders(items=>after?[...items,...next]:next);
      setPendingCount(Number(data.counts?.pending||0));
      setPageInfo(data.pageInfo||{hasNextPage:false,endCursor:null});
      if(!next.length)setMessage(term?"No Shopify orders match this search.":filter==="pending"?"There are no open Shopify orders.":"No Shopify orders were returned.");
    }catch(error){setMessage(error instanceof Error?error.message:"Unable to load Shopify orders.");if(!after)setOrders([])}
    finally{setLoading(false)}
  },[]);
  useEffect(()=>{
    /* eslint-disable react-hooks/set-state-in-effect */
    void loadOrders("",null,initialFilter);
    /* eslint-enable react-hooks/set-state-in-effect */
    // Initial Shopify load only; search and pagination are explicit actions.
  },[initialFilter,loadOrders]);
  const money=(value:AdminOrder["total"])=>{if(!value)return "—";try{return new Intl.NumberFormat(undefined,{style:"currency",currency:value.currencyCode}).format(Number(value.amount))}catch{return `${value.amount} ${value.currencyCode}`}};
  const paidCount=orders.filter(order=>order.financialStatus==="PAID").length;
  const openFulfillmentCount=orders.filter(order=>!(["FULFILLED","RESTOCKED"] as string[]).includes(order.fulfillmentStatus)).length;
  const sales=orders.reduce((sum,order)=>sum+(Number(order.total?.amount)||0),0);
  const currency=orders.find(order=>order.total?.currencyCode)?.total?.currencyCode;
  const salesLabel=currency?money({amount:String(sales),currencyCode:currency}):"—";
  const filteredOrders=orders.filter(order=>statusFilter==="all"||statusFilter==="pending"||(statusFilter==="unfulfilled"&&!order.cancelledAt&&order.fulfillmentStatus!=="FULFILLED")||(statusFilter==="unpaid"&&!order.cancelledAt&&order.financialStatus!=="PAID")||(statusFilter==="paid"&&!order.cancelledAt&&order.financialStatus==="PAID")||(statusFilter==="cancelled"&&Boolean(order.cancelledAt)));
  const selectedOrders=orders.filter(order=>selectedOrderIds.includes(order.id));
  const fulfillableSelected=selectedOrders.filter(order=>!order.cancelledAt&&order.fulfillmentStatus!=="FULFILLED");
  const selectedOrder=orders.find(order=>order.id===selectedId);
  const toggleOrder=(id:string)=>setSelectedOrderIds(current=>current.includes(id)?current.filter(value=>value!==id):[...current,id]);
  const selectVisibleOrders=()=>setSelectedOrderIds(current=>filteredOrders.every(order=>current.includes(order.id))?current.filter(id=>!filteredOrders.some(order=>order.id===id)):[...new Set([...current,...filteredOrders.map(order=>order.id)])]);
  const changeOrderFilter=(filter:OrderFilter)=>{setStatusFilter(filter);setSelectedOrderIds([]);void loadOrders(search,null,filter)};
  const openOrder=(order:AdminOrder)=>{setSelectedId(order.id);setDraft({email:order.email,note:order.note,tags:order.tags.join(", "),shippingAddress:{...order.shippingAddress}});setNotifyCustomer(false);setMessage("")};
  const closeOrder=()=>{setSelectedId("");setDraft(null)};
  const updateAddress=(key:keyof OrderAddress,value:string)=>setDraft(current=>current?{...current,shippingAddress:{...current.shippingAddress,[key]:value}}:current);
  const saveOrder=async()=>{
    if(!selectedOrder||!draft)return;
    setSaving(true);setMessage("Updating order in Shopify...");
    try{
      const response=await fetch("/api/shopify/orders",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:selectedOrder.id,...draft})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Unable to update order.");
      setOrders(items=>items.map(item=>item.id===data.order.id?data.order:item));
      setDraft({email:data.order.email,note:data.order.note,tags:data.order.tags.join(", "),shippingAddress:{...data.order.shippingAddress}});
      setMessage(`${data.order.name} was updated in Shopify.`);
    }catch(error){setMessage(error instanceof Error?error.message:"Unable to update order.")}
    finally{setSaving(false)}
  };
  const updateOrderStatus=async(action:"mark_paid"|"fulfill")=>{
    if(!selectedOrder)return;
    const label=action==="mark_paid"?"mark this order as paid":"mark all prepared items as fulfilled";
    if(!window.confirm(`Are you sure you want to ${label} in Shopify?`))return;
    setSaving(true);setMessage(action==="mark_paid"?"Recording payment in Shopify...":"Creating Shopify fulfillment...");
    try{
      const response=await fetch("/api/shopify/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:selectedOrder.id,action,notifyCustomer})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Unable to update order status.");
      await loadOrders(search,null,statusFilter);
      setMessage(action==="mark_paid"?`${selectedOrder.name} is now marked paid.`:`${selectedOrder.name} is now marked fulfilled${notifyCustomer?" and the customer was notified":""}.`);
    }catch(error){setMessage(error instanceof Error?error.message:"Unable to update order status.")}
    finally{setSaving(false)}
  };
  const bulkFulfillOrders=async()=>{
    if(!fulfillableSelected.length){setMessage("Select at least one unfulfilled order.");return}
    if(!window.confirm(`Mark ${fulfillableSelected.length} selected order${fulfillableSelected.length===1?"":"s"} as fulfilled in Shopify?`))return;
    setSaving(true);setMessage(`Fulfilling ${fulfillableSelected.length} selected orders...`);
    try{
      const ids=fulfillableSelected.map(order=>order.id);const failedIds:string[]=[];let fulfilledCount=0;
      for(let index=0;index<ids.length;index+=50){const batch=ids.slice(index,index+50);const response=await fetch("/api/shopify/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ids:batch,action:"bulk_fulfill",notifyCustomer:bulkNotifyCustomer})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to fulfill selected orders.");fulfilledCount+=Number(data.fulfilledOrders)||0;if(Array.isArray(data.failed))failedIds.push(...data.failed.map((item:{id:string})=>item.id))}
      await loadOrders(search,null,statusFilter);
      setSelectedOrderIds(failedIds);
      setMessage(failedIds.length?`${fulfilledCount} orders fulfilled; ${failedIds.length} could not be fulfilled and remain selected.`:`${fulfilledCount} selected order${fulfilledCount===1?"":"s"} marked fulfilled.`);
    }catch(error){setMessage(error instanceof Error?error.message:"Unable to fulfill selected orders.")}
    finally{setSaving(false)}
  };
  const printSelectedOrders=()=>{if(!selectedOrders.length){setMessage("Select at least one order to print.");return}window.print()};
  const cancelOrder=async()=>{
    if(!selectedOrder||selectedOrder.cancelledAt)return;
    if(!window.confirm(`Cancel ${selectedOrder.name}? This is irreversible. Inventory will be restocked, but no automatic refund will be issued.`))return;
    setSaving(true);setMessage("Cancelling order in Shopify...");
    try{
      const response=await fetch(`/api/shopify/orders?id=${encodeURIComponent(selectedOrder.id)}`,{method:"DELETE"});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Unable to cancel order.");
      setMessage(`${selectedOrder.name} cancellation was submitted to Shopify.`);
      setSelectedId("");setDraft(null);
      await loadOrders(search,null,statusFilter);
    }catch(error){setMessage(error instanceof Error?error.message:"Unable to cancel order.")}
    finally{setSaving(false)}
  };
  return <div className={styles.content}>
    <div className={styles.actionHeader}><div><h2>Orders</h2><p>Live Shopify orders, newest first.</p></div><form className={styles.customerSearch} onSubmit={event=>{event.preventDefault();void loadOrders(search,null,statusFilter)}}><input className={styles.smallSearch} placeholder="Search order, customer, or email" value={search} onChange={event=>setSearch(event.target.value)}/><button className={styles.primary} disabled={loading} type="submit">Search</button>{search&&<button className={styles.secondary} disabled={loading} type="button" onClick={()=>{setSearch("");void loadOrders("",null,statusFilter)}}>Clear</button>}</form></div>
    <div className={styles.orderFilters} role="tablist" aria-label="Filter orders">{([["all","All"],["pending",`Pending (${pendingCount})`],["unfulfilled","Unfulfilled"],["unpaid","Unpaid"],["paid","Paid"],["cancelled","Cancelled"]] as [OrderFilter,string][]).map(([value,label])=><button key={value} role="tab" aria-selected={statusFilter===value} className={statusFilter===value?styles.orderFilterActive:""} onClick={()=>changeOrderFilter(value)}>{label}</button>)}</div>
    {selectedOrders.length>0&&<div className={styles.orderBulkBar}><strong>{selectedOrders.length} selected</strong><label><input type="checkbox" checked={bulkNotifyCustomer} onChange={event=>setBulkNotifyCustomer(event.target.checked)}/>Notify customers</label><button className={styles.secondary} type="button" onClick={printSelectedOrders}>Print orders</button><button className={styles.primary} type="button" disabled={saving||!fulfillableSelected.length} onClick={()=>void bulkFulfillOrders()}>{saving?"Fulfilling...":`Mark fulfilled (${fulfillableSelected.length})`}</button><button className={styles.secondary} type="button" onClick={()=>setSelectedOrderIds([])}>Clear</button></div>}
    <div className={styles.segmentGrid}>{[["Loaded orders","Current Shopify results",String(orders.length)],["Paid","Loaded paid orders",String(paidCount)],["Needs fulfillment","Loaded open fulfillments",String(openFulfillmentCount)],["Order value","Loaded page total",salesLabel]].map(([title,copy,value])=><article className={styles.segment} key={title}><span>▤</span><div><strong>{title}</strong><small>{copy}</small></div><b>{value}</b></article>)}</div>
    <section className={`${styles.card} ${styles.orderTable}`}>
      <div className={styles.cardHead}><div><h2>Orders</h2><p>{message||`${filteredOrders.length} order${filteredOrders.length===1?"":"s"} in this view.`}</p></div><i className={`${styles.tag} ${message?styles.tagGray:styles.tagGreen}`}>{loading?"Loading":message?"Notice":"Connected"}</i></div>
      <div className={styles.dataTable}>
        <div className={styles.tableHead}><input type="checkbox" aria-label="Select all visible orders" checked={Boolean(filteredOrders.length)&&filteredOrders.every(order=>selectedOrderIds.includes(order.id))} onChange={selectVisibleOrders}/><span>Order</span><span>Date</span><span>Customer</span><span>Total</span><span>Payment</span><span>Fulfillment</span><span>Items</span><span>Action</span></div>
        {filteredOrders.length?filteredOrders.map(order=><div className={`${styles.tableRow} ${styles.orderRow}`} key={order.id}>
          <input type="checkbox" aria-label={`Select ${order.name}`} checked={selectedOrderIds.includes(order.id)} onChange={()=>toggleOrder(order.id)}/>
          <button className={styles.orderLink} type="button" onClick={()=>openOrder(order)}>{order.name}</button>
          <span>{new Date(order.createdAt).toLocaleDateString()}<small>{new Date(order.createdAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</small></span>
          <div className={styles.customerCell}><strong>{order.customer}</strong><small>{order.destination}</small></div>
          <strong>{money(order.total)}</strong>
          <span><i className={`${styles.tag} ${order.financialStatus==="PAID"?styles.tagGreen:styles.tagGray}`}>{order.financialStatus.toLowerCase().replaceAll("_"," ")}</i></span>
          <span><i className={`${styles.tag} ${order.cancelledAt?styles.tagGray:order.fulfillmentStatus==="FULFILLED"?styles.tagGreen:styles.tagBlue}`}>{order.cancelledAt?"cancelled":order.fulfillmentStatus.toLowerCase().replaceAll("_"," ")}</i></span>
          <div className={styles.orderItemCell}><div className={styles.orderImageStack}>{order.items.slice(0,3).map((item,index)=><OrderProductImage key={`${item.name}-${index}`} item={item}/>)}</div><span>{order.items.reduce((sum,item)=>sum+item.quantity,0)} item{order.items.reduce((sum,item)=>sum+item.quantity,0)===1?"":"s"}</span></div>
          <button className={styles.secondary} type="button" onClick={()=>openOrder(order)}>View / edit</button>
        </div>):<div className={styles.empty}>{loading?"Loading Shopify orders...":message||"No orders match this view."}</div>}
      </div>
      {pageInfo.hasNextPage&&<div className={styles.inlineActions}><button className={styles.secondary} disabled={loading} onClick={()=>void loadOrders(search,pageInfo.endCursor,statusFilter)}>Load more</button></div>}
    </section>
    {selectedOrder&&draft&&<div className={styles.orderOverlay} role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)closeOrder()}}>
      <section className={styles.orderDrawer} role="dialog" aria-modal="true" aria-labelledby="order-drawer-title">
        <div className={styles.orderDrawerHeader}><div><button className={styles.orderClose} type="button" aria-label="Close order" onClick={closeOrder}>←</button><div><h2 id="order-drawer-title">{selectedOrder.name}</h2><p>{new Date(selectedOrder.createdAt).toLocaleString()} · {money(selectedOrder.total)}</p></div></div><button className={styles.secondary} type="button" onClick={closeOrder}>Close</button></div>
        <div className={styles.orderDrawerBody}>
          <div className={styles.orderStatusRow}><i className={`${styles.tag} ${selectedOrder.financialStatus==="PAID"?styles.tagGreen:styles.tagGray}`}>{selectedOrder.financialStatus.toLowerCase().replaceAll("_"," ")}</i><i className={`${styles.tag} ${selectedOrder.cancelledAt?styles.tagGray:selectedOrder.fulfillmentStatus==="FULFILLED"?styles.tagGreen:styles.tagBlue}`}>{selectedOrder.cancelledAt?"cancelled":selectedOrder.fulfillmentStatus.toLowerCase().replaceAll("_"," ")}</i></div>
          <div className={styles.orderSummaryGrid}><article><small>Customer</small><strong>{selectedOrder.customer}</strong><span>{selectedOrder.email||"No email"}</span></article><article><small>Ship to</small><strong>{selectedOrder.destination}</strong><span>{selectedOrder.shippingAddress.phone||"No phone"}</span></article><article><small>Order total</small><strong>{money(selectedOrder.total)}</strong><span>{selectedOrder.items.reduce((sum,item)=>sum+item.quantity,0)} items</span></article></div>
          <section className={styles.orderDrawerCard}>
            <div className={styles.cardHead}><div><h2>Products</h2><p>Items currently on this Shopify order.</p></div></div>
            <div className={styles.orderLines}>{selectedOrder.items.length?selectedOrder.items.map((item,index)=><div key={`${item.name}-${index}`}><OrderProductImage item={item}/><div><strong>{item.name}</strong><small>{[item.variantTitle,item.sku].filter(Boolean).join(" · ")||"Product item"}</small></div><span>Quantity {item.quantity}</span></div>):<div className={styles.empty}>No line items returned.</div>}</div>
          </section>
          <section className={styles.orderDrawerCard}>
            <div className={styles.cardHead}><div><h2>Preparation status</h2><p>Record payment and fulfillment in Shopify when the order is ready.</p></div></div>
            <div className={styles.orderPrepareActions}>
              <label><input type="checkbox" checked={notifyCustomer} onChange={event=>setNotifyCustomer(event.target.checked)}/>Notify the customer when fulfilling</label>
              <div><button className={styles.secondary} type="button" disabled={saving||!selectedOrder.canMarkAsPaid||Boolean(selectedOrder.cancelledAt)} onClick={()=>void updateOrderStatus("mark_paid")}>{selectedOrder.financialStatus==="PAID"?"Already paid":"Mark as paid"}</button><button className={styles.primary} type="button" disabled={saving||selectedOrder.fulfillmentStatus==="FULFILLED"||Boolean(selectedOrder.cancelledAt)} onClick={()=>void updateOrderStatus("fulfill")}>{selectedOrder.fulfillmentStatus==="FULFILLED"?"Already fulfilled":"Mark as fulfilled"}</button></div>
            </div>
          </section>
          <section className={styles.orderDrawerCard}><div className={styles.cardHead}><div><h2>Customer and shipping</h2><p>Edit supported Shopify order fields.</p></div></div><div className={styles.orderDetailGrid}><label>Customer email<input type="email" value={draft.email} onChange={event=>setDraft(current=>current?{...current,email:event.target.value}:current)}/></label><label>Tags<input value={draft.tags} onChange={event=>setDraft(current=>current?{...current,tags:event.target.value}:current)} placeholder="priority, gift"/></label><label className={styles.orderWideField}>Internal note<textarea rows={3} value={draft.note} onChange={event=>setDraft(current=>current?{...current,note:event.target.value}:current)}/></label><label>First name<input value={draft.shippingAddress.firstName} onChange={event=>updateAddress("firstName",event.target.value)}/></label><label>Last name<input value={draft.shippingAddress.lastName} onChange={event=>updateAddress("lastName",event.target.value)}/></label><label className={styles.orderWideField}>Address<input value={draft.shippingAddress.address1} onChange={event=>updateAddress("address1",event.target.value)}/></label><label>Apartment / suite<input value={draft.shippingAddress.address2} onChange={event=>updateAddress("address2",event.target.value)}/></label><label>Phone<input value={draft.shippingAddress.phone} onChange={event=>updateAddress("phone",event.target.value)}/></label><label>City<input value={draft.shippingAddress.city} onChange={event=>updateAddress("city",event.target.value)}/></label><label>Province / state<input value={draft.shippingAddress.province} onChange={event=>updateAddress("province",event.target.value)}/></label><label>Postal code<input value={draft.shippingAddress.zip} onChange={event=>updateAddress("zip",event.target.value)}/></label><label>Country<input value={draft.shippingAddress.country} onChange={event=>updateAddress("country",event.target.value)}/></label></div></section>
        </div>
        <div className={styles.orderDrawerFooter}><small>{message||"Product and quantity changes require Shopify's separate order-edit workflow."}</small><div><button className={styles.delete} type="button" disabled={saving||Boolean(selectedOrder.cancelledAt)} onClick={()=>void cancelOrder()}>{selectedOrder.cancelledAt?"Order cancelled":"Cancel order"}</button><button className={styles.primary} type="button" disabled={saving||Boolean(selectedOrder.cancelledAt)} onClick={()=>void saveOrder()}>{saving?"Saving...":"Save changes"}</button></div></div>
      </section>
    </div>}
    <div className={styles.orderPrintArea} aria-hidden="true">
      {selectedOrders.map(order=><article className={styles.printOrder} key={`print-${order.id}`}>
        <header><div><p>CARTER&apos;S ORDER</p><h1>{order.name}</h1><span>{new Date(order.createdAt).toLocaleString()}</span></div><div><strong>{money(order.total)}</strong><span>{order.financialStatus.toLowerCase().replaceAll("_"," ")} · {order.fulfillmentStatus.toLowerCase().replaceAll("_"," ")}</span></div></header>
        <section className={styles.printAddresses}><div><small>Customer</small><strong>{order.customer}</strong><span>{order.email||"No email"}</span><span>{order.shippingAddress.phone||"No phone"}</span></div><div><small>Ship to</small><strong>{[order.shippingAddress.firstName,order.shippingAddress.lastName].filter(Boolean).join(" ")||order.customer}</strong><span>{[order.shippingAddress.address1,order.shippingAddress.address2].filter(Boolean).join(", ")}</span><span>{[order.shippingAddress.city,order.shippingAddress.province,order.shippingAddress.zip].filter(Boolean).join(", ")}</span><span>{order.shippingAddress.country}</span></div></section>
        <section className={styles.printProducts}><div className={styles.printProductHead}><span>Product</span><span>SKU</span><span>Quantity</span></div>{order.items.map((item,index)=><div className={styles.printProductRow} key={`${order.id}-${item.name}-${index}`}><OrderProductImage item={item}/><div><strong>{item.name}</strong><span>{item.variantTitle||""}</span></div><span>{item.sku||"—"}</span><b>{item.quantity}</b></div>)}</section>
        {order.note&&<section className={styles.printNote}><small>Order note</small><p>{order.note}</p></section>}
        <footer><span>{order.items.reduce((sum,item)=>sum+item.quantity,0)} total items</span><strong>Total: {money(order.total)}</strong></footer>
      </article>)}
    </div>
  </div>
}

function Customers(){
  const [customers,setCustomers]=useState<AdminCustomer[]>([]);
  const [search,setSearch]=useState("");
  const [statusFilter,setStatusFilter]=useState("all");
  const [minOrders,setMinOrders]=useState("");
  const [maxOrders,setMaxOrders]=useState("");
  const [minSpent,setMinSpent]=useState("");
  const [maxSpent,setMaxSpent]=useState("");
  const [createdFrom,setCreatedFrom]=useState("");
  const [createdTo,setCreatedTo]=useState("");
  const [inactiveOnly,setInactiveOnly]=useState(false);
  const [inactiveMonths,setInactiveMonths]=useState("5");
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState("");
  const [editingId,setEditingId]=useState("");
  const [savingId,setSavingId]=useState("");
  const [draft,setDraft]=useState<CustomerDraft>({firstName:"",lastName:"",email:"",phone:""});
  const [pageInfo,setPageInfo]=useState<{hasNextPage:boolean;endCursor:string|null}>({hasNextPage:false,endCursor:null});
  const loadCustomers=async(nextSearch=search,after?:string|null,nextCreatedFrom=createdFrom,nextCreatedTo=createdTo)=>{
    setLoading(true); setMessage("");
    try{
      const params=new URLSearchParams();
      if(nextSearch.trim())params.set("search",nextSearch.trim());
      if(nextCreatedFrom)params.set("createdFrom",nextCreatedFrom);
      if(nextCreatedTo)params.set("createdTo",nextCreatedTo);
      if(after)params.set("after",after);
      const response=await fetch(`/api/shopify/customers?${params.toString()}`,{cache:"no-store"});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Unable to load customers.");
      setCustomers(current=>after?[...current,...(data.customers??[])]:data.customers??[]);
      setPageInfo(data.pageInfo??{hasNextPage:false,endCursor:null});
    }catch(error){setMessage(error instanceof Error?error.message:"Unable to load customers."); if(!after)setCustomers([])}
    finally{setLoading(false)}
  };
  const startEdit=(customer:AdminCustomer)=>{setEditingId(customer.id);setDraft({firstName:customer.firstName,lastName:customer.lastName,email:customer.email,phone:customer.phone});setMessage("")};
  const saveCustomer=async()=>{
    if(!editingId)return;
    setSavingId(editingId);setMessage("Saving customer...");
    try{
      const response=await fetch("/api/shopify/customers",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:editingId,...draft})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Unable to update customer.");
      setCustomers(items=>items.map(item=>item.id===editingId?data.customer:item));
      setEditingId("");setMessage("Customer updated.");
    }catch(error){setMessage(error instanceof Error?error.message:"Unable to update customer.")}
    finally{setSavingId("")}
  };
  const deleteCustomer=async(customer:AdminCustomer)=>{
    if(customer.orders>0){setMessage("Shopify only allows deleting customers with no orders.");return}
    if(!window.confirm(`Delete ${customer.name}?`))return;
    setSavingId(customer.id);setMessage("Deleting customer...");
    try{
      const response=await fetch(`/api/shopify/customers?id=${encodeURIComponent(customer.id)}`,{method:"DELETE"});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Unable to delete customer.");
      setCustomers(items=>items.filter(item=>item.id!==customer.id));
      if(editingId===customer.id)setEditingId("");
      setMessage("Customer deleted.");
    }catch(error){setMessage(error instanceof Error?error.message:"Unable to delete customer.")}
    finally{setSavingId("")}
  };
  useEffect(()=>{
    /* eslint-disable react-hooks/set-state-in-effect */
    void loadCustomers("",null);
    /* eslint-enable react-hooks/set-state-in-effect */
    // The initial load should run once; subsequent loads are driven by search and pagination actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  const statusOptions=Array.from(new Set(customers.map(customer=>customer.status).filter(Boolean)));
  const amountValue=(customer:AdminCustomer)=>Number(customer.totalSpent?.amount??0)||0;
  const minOrderValue=minOrders===""?null:Number(minOrders);
  const maxOrderValue=maxOrders===""?null:Number(maxOrders);
  const minSpentValue=minSpent===""?null:Number(minSpent);
  const maxSpentValue=maxSpent===""?null:Number(maxSpent);
  const inactiveMonthValue=Math.max(1,Number(inactiveMonths)||5);
  const inactiveSince=new Date();
  inactiveSince.setMonth(inactiveSince.getMonth()-inactiveMonthValue);
  const matchesCustomer=(customer:AdminCustomer)=>{
    const spent=amountValue(customer);
    const lastOrderDate=customer.lastOrderAt?new Date(customer.lastOrderAt):null;
    return (statusFilter==="all"||customer.status===statusFilter)
      && (minOrderValue===null||customer.orders>=minOrderValue)
      && (maxOrderValue===null||customer.orders<=maxOrderValue)
      && (minSpentValue===null||spent>=minSpentValue)
      && (maxSpentValue===null||spent<=maxSpentValue)
      && (!createdFrom||Boolean(customer.createdAt&&customer.createdAt.slice(0,10)>=createdFrom))
      && (!createdTo||Boolean(customer.createdAt&&customer.createdAt.slice(0,10)<=createdTo))
      && (!inactiveOnly||!lastOrderDate||lastOrderDate<inactiveSince);
  };
  const filteredCustomers=customers.filter(matchesCustomer);
  const totalOrders=filteredCustomers.reduce((sum,customer)=>sum+customer.orders,0);
  const activeCount=filteredCustomers.filter(customer=>customer.status==="ENABLED").length;
  const formatSpent=(value:AdminCustomer["totalSpent"])=>{if(!value)return "—";try{return new Intl.NumberFormat(undefined,{style:"currency",currency:value.currencyCode}).format(Number(value.amount))}catch{return `${value.amount} ${value.currencyCode}`}};
  const formatDate=(value?:string|null)=>value?new Date(value).toLocaleDateString():"—";
  const hasCustomerFilters=Boolean(search||statusFilter!=="all"||minOrders||maxOrders||minSpent||maxSpent||createdFrom||createdTo||inactiveOnly);
  const resetFilters=()=>{setSearch("");setStatusFilter("all");setMinOrders("");setMaxOrders("");setMinSpent("");setMaxSpent("");setCreatedFrom("");setCreatedTo("");setInactiveOnly(false);setInactiveMonths("5");void loadCustomers("",null,"","")};
  const exportCustomers=()=>{
    if(!filteredCustomers.length){setMessage("No customers match this export filter.");return}
    const columns=["Name","First name","Last name","Email","Phone","Location","Orders","Total spent","Status","Last order","Created at","Updated at"];
    const escapeCsv=(value:string|number|null|undefined)=>`"${String(value??"").replace(/"/g,'""')}"`;
    const rows=filteredCustomers.map(customer=>[
      customer.name,
      customer.firstName,
      customer.lastName,
      customer.email,
      customer.phone,
      customer.location,
      customer.orders,
      customer.totalSpent?`${customer.totalSpent.amount} ${customer.totalSpent.currencyCode}`:"",
      customer.status,
      customer.lastOrderAt||"",
      customer.createdAt||"",
      customer.updatedAt||"",
    ]);
    const csv=[columns,...rows].map(row=>row.map(escapeCsv).join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const link=document.createElement("a");
    const filterName=statusFilter==="all"?"all":statusFilter.toLowerCase();
    link.href=url;
    const creationRange=createdFrom||createdTo?`-${createdFrom||"beginning"}-to-${createdTo||"today"}`:"";
    link.download=`shopify-customers-${filterName}${creationRange}-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setMessage(`Exported ${filteredCustomers.length} customer${filteredCustomers.length===1?"":"s"}.`);
  };
  const exportCustomersForDatabase=async()=>{
    setLoading(true);setMessage("Loading every customer in the selected creation range...");
    try{
      const all:AdminCustomer[]=[];let after:string|null=null;let hasNext=true;let pages=0;
      while(hasNext&&pages<100){const params=new URLSearchParams();if(search.trim())params.set("search",search.trim());if(createdFrom)params.set("createdFrom",createdFrom);if(createdTo)params.set("createdTo",createdTo);if(after)params.set("after",after);const response=await fetch(`/api/shopify/customers?${params}`,{cache:"no-store"});const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to prepare the customer database export.");all.push(...(Array.isArray(data.customers)?data.customers:[]));hasNext=Boolean(data.pageInfo?.hasNextPage&&data.pageInfo?.endCursor);after=hasNext?data.pageInfo.endCursor:null;pages+=1;if(hasNext)setMessage(`Loading customers for database export... ${all.length} loaded.`)}
      if(hasNext)throw new Error("The export reached its 5,000-customer safety limit. Choose a smaller creation date range.");
      const selected=all.filter(matchesCustomer);if(!selected.length)throw new Error("No customers match this database export filter.");
      const payload={schemaVersion:1,exportedAt:new Date().toISOString(),source:"Shopify Admin",upsertKey:"shopifyId",creationRange:{from:createdFrom||null,to:createdTo||null},customers:selected.map(customer=>({shopifyId:customer.id,name:customer.name,firstName:customer.firstName,lastName:customer.lastName,email:customer.email||null,phone:customer.phone||null,location:customer.location,orders:customer.orders,totalSpent:customer.totalSpent?Number(customer.totalSpent.amount):0,currencyCode:customer.totalSpent?.currencyCode||null,status:customer.status,lastOrderAt:customer.lastOrderAt||null,createdAt:customer.createdAt||null,updatedAt:customer.updatedAt||null}))};
      const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=`shopify-customers-database-${createdFrom||"beginning"}-to-${createdTo||"today"}.json`;document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);setMessage(`Prepared all ${selected.length} matching customers for database upsert.`)
    }catch(error){setMessage(error instanceof Error?error.message:"Unable to prepare the customer database export.")}finally{setLoading(false)}
  };
  return <div className={styles.content}><div className={styles.actionHeader}><div><h2>Customers</h2><p>Live Shopify customer directory.</p></div><form className={styles.customerSearch} onSubmit={event=>{event.preventDefault();void loadCustomers(search,null)}}><input className={styles.smallSearch} placeholder="Search customers" value={search} onChange={event=>setSearch(event.target.value)} /><button className={styles.primary} disabled={loading} type="submit">Search</button><button className={styles.secondary} disabled={loading||!filteredCustomers.length} type="button" onClick={exportCustomers}>Export CSV</button><button className={styles.secondary} disabled={loading} type="button" onClick={()=>void exportCustomersForDatabase()}>Database JSON</button>{hasCustomerFilters&&<button className={styles.secondary} disabled={loading} type="button" onClick={resetFilters}>Clear</button>}</form></div><div className={styles.customerFilterBar}><select className={styles.customerFilter} value={statusFilter} onChange={event=>setStatusFilter(event.target.value)}><option value="all">All statuses</option>{statusOptions.map(status=><option key={status} value={status}>{status.toLowerCase()}</option>)}</select><label>Orders from<input type="number" min="0" value={minOrders} onChange={event=>setMinOrders(event.target.value)} /></label><label>Orders to<input type="number" min="0" value={maxOrders} onChange={event=>setMaxOrders(event.target.value)} /></label><label>Spent from<input type="number" min="0" step="0.01" value={minSpent} onChange={event=>setMinSpent(event.target.value)} /></label><label>Spent to<input type="number" min="0" step="0.01" value={maxSpent} onChange={event=>setMaxSpent(event.target.value)} /></label><label>Created from<input type="date" value={createdFrom} max={createdTo||undefined} onChange={event=>setCreatedFrom(event.target.value)} /></label><label>Created to<input type="date" value={createdTo} min={createdFrom||undefined} onChange={event=>setCreatedTo(event.target.value)} /></label><label className={styles.customerCheck}><input type="checkbox" checked={inactiveOnly} onChange={event=>setInactiveOnly(event.target.checked)} />No purchase in</label><label>Months<input type="number" min="1" value={inactiveMonths} onChange={event=>setInactiveMonths(event.target.value)} /></label></div><div className={styles.segmentGrid}>{[["Profiles","Loaded from Shopify Admin",String(customers.length)],["Filtered","Matching current filter",String(filteredCustomers.length)],["Active accounts","Enabled filtered records",String(activeCount)],["Orders","From filtered customers",String(totalOrders)]].map(([title,copy,value])=><article className={styles.segment} key={title}><span>♙</span><div><strong>{title}</strong><small>{copy}</small></div><b>{value}</b></article>)}</div><section className={`${styles.card} ${styles.customerTable}`}><div className={styles.cardHead}><div><h2>Customer directory</h2><p>{message||`Showing customers after search, creation date, order, spend, and inactivity filters. Inactive means no order since ${formatDate(inactiveSince.toISOString())}.`}</p></div><i className={`${styles.tag} ${message?styles.tagGray:styles.tagGreen}`}>{loading?"Loading":message?"Notice":"Connected"}</i></div><div className={styles.dataTable}><div className={styles.tableHead}><span>Customer</span><span>Location</span><span>Orders</span><span>Status</span><span>Created</span><span>Last order</span></div>{filteredCustomers.length?filteredCustomers.map(customer=><div className={styles.customerRecord} key={customer.id}><div className={styles.tableRow}><div className={styles.customerCell}><strong>{customer.name}</strong><small>{customer.email||"No email"} · {customer.phone||"No phone"}</small><div className={styles.customerActions}><button className={styles.secondary} disabled={savingId===customer.id} onClick={()=>startEdit(customer)}>Edit</button><button className={styles.secondary} disabled={savingId===customer.id||customer.orders>0} title={customer.orders>0?"Shopify only allows deleting customers with no orders.":undefined} onClick={()=>void deleteCustomer(customer)}>Delete</button></div></div><span>{customer.location}</span><span>{customer.orders} · {formatSpent(customer.totalSpent)}</span><span><i className={`${styles.tag} ${customer.status==="ENABLED"?styles.tagGreen:styles.tagGray}`}>{customer.status.toLowerCase()}</i></span><span>{formatDate(customer.createdAt)}</span><span>{formatDate(customer.lastOrderAt)}</span></div>{editingId===customer.id&&<div className={styles.customerEditPanel}><label>First name<input value={draft.firstName} onChange={event=>setDraft(value=>({...value,firstName:event.target.value}))}/></label><label>Last name<input value={draft.lastName} onChange={event=>setDraft(value=>({...value,lastName:event.target.value}))}/></label><label>Email<input value={draft.email} onChange={event=>setDraft(value=>({...value,email:event.target.value}))}/></label><label>Phone<input value={draft.phone} onChange={event=>setDraft(value=>({...value,phone:event.target.value}))}/></label><div><button className={styles.secondary} disabled={savingId===customer.id} onClick={()=>setEditingId("")}>Cancel</button><button className={styles.primary} disabled={savingId===customer.id} onClick={saveCustomer}>{savingId===customer.id?"Saving":"Save"}</button></div></div>}</div>):<div className={styles.empty}>{loading?"Loading customers...":message||"No customers found for this filter."}</div>}</div>{pageInfo.hasNextPage&&<div className={styles.inlineActions}><button className={styles.secondary} disabled={loading} onClick={()=>loadCustomers(search,pageInfo.endCursor)}>Load more</button></div>}</section></div>
}

function Team(){
  const [tab,setTab]=useState<"staff"|"activity">("staff");
  const [showRoleForm,setShowRoleForm]=useState(false);
  const [showEmployeeForm,setShowEmployeeForm]=useState(false);
  const [roleName,setRoleName]=useState("Content manager");
  const [roleScope,setRoleScope]=useState("Content and campaigns");
  const [roleDescription,setRoleDescription]=useState("Can edit app sections and prepare push campaigns.");
  const [employeeEmail,setEmployeeEmail]=useState("");
  const [employeeRole,setEmployeeRole]=useState("Marketing");
  const [staffUsers,setStaffUsers]=useState<StaffUser[]>([]);
  const [staffMessage,setStaffMessage]=useState("");
  const [roles,setRoles]=useState<AdminRole[]>([
    { id:"owner", name:"Owner", scope:"Full workspace access", description:"Can manage every admin area, publishing, settings, and roles.", members:1 },
    { id:"marketing", name:"Marketing", scope:"Campaigns and analytics", description:"Can prepare notifications and review campaign performance.", members:0 },
    { id:"support", name:"Support", scope:"Customers and chat", description:"Can view customer support tools after realtime services are connected.", members:0 },
  ]);
  const loadStaff=async()=>{try{const response=await fetch("/api/admin-users",{cache:"no-store"});const data=await response.json();setStaffUsers(Array.isArray(data.users)?data.users:[])}catch{setStaffMessage("Unable to load employees.")}};
  useEffect(()=>{
    /* eslint-disable react-hooks/set-state-in-effect */
    void loadStaff();
    /* eslint-enable react-hooks/set-state-in-effect */
  },[]);
  const addRole=()=>{const cleanName=roleName.trim();if(!cleanName)return;setRoles(items=>[{ id:`role-${Date.now()}`, name:cleanName, scope:roleScope.trim()||"Custom access", description:roleDescription.trim()||"Custom admin role.", members:0 },...items]);setRoleName("");setRoleScope("");setRoleDescription("");setShowRoleForm(false)};
  const addEmployee=async()=>{setStaffMessage("Sending invite email...");try{const response=await fetch("/api/admin-users",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:employeeEmail,role:employeeRole})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to invite employee.");setEmployeeEmail("");setShowEmployeeForm(false);setStaffMessage(data.email?.mode==="local-outbox"?`Invite saved to local email outbox. Setup link: ${data.email.setupUrl}`:"Invite email sent. The member can set their own password.");await loadStaff()}catch(error){setStaffMessage(error instanceof Error?error.message:"Unable to invite employee.")}};
  const deleteEmployee=async(user:StaffUser)=>{if(!window.confirm(`Delete access for ${user.email}?`))return;setStaffMessage("Deleting employee...");try{await fetch(`/api/admin-users/${user.id}`,{method:"DELETE"});setStaffMessage("Employee access deleted.");await loadStaff()}catch{setStaffMessage("Unable to delete employee.")}};
  const resetEmployee=async(user:StaffUser)=>{if(!window.confirm(`Send a new password setup email to ${user.email}?`))return;setStaffMessage("Sending reset email...");try{const response=await fetch(`/api/admin-users/${user.id}`,{method:"PATCH"});const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to send reset email.");setStaffMessage(data.email?.mode==="local-outbox"?`Reset saved to local email outbox. Setup link: ${data.email.setupUrl}`:"Password reset email sent.");await loadStaff()}catch(error){setStaffMessage(error instanceof Error?error.message:"Unable to send reset email.")}};
  const rolesWithMembers=roles.map(role=>({...role,members:role.name==="Owner"?1:staffUsers.filter(user=>user.role===role.name).length}));
  return <div className={styles.content}><div className={styles.tabBar}><button className={tab==="staff"?styles.tabActive:""} onClick={()=>setTab("staff")}>Staff & roles</button><button className={tab==="activity"?styles.tabActive:""} onClick={()=>setTab("activity")}>Activity log</button></div>{tab==="staff"?<div className={styles.teamGrid}><section className={styles.card}><div className={styles.cardHead}><div><h2>Admin team</h2><p>Add employees by email. They receive a setup link and choose their own password.</p></div><button className={styles.primary} onClick={()=>setShowEmployeeForm(true)}>Add member</button></div>{showEmployeeForm&&<div className={styles.roleForm}><label>Member email<input value={employeeEmail} onChange={e=>setEmployeeEmail(e.target.value)} placeholder="employee@company.com"/></label><label>Role<select className={styles.selectField} value={employeeRole} onChange={e=>setEmployeeRole(e.target.value)}>{roles.map(role=><option key={role.id} value={role.name}>{role.name}</option>)}</select></label><div><button className={styles.secondary} onClick={()=>setShowEmployeeForm(false)}>Cancel</button><button className={styles.primary} onClick={addEmployee}>Send invite</button></div></div>}{staffMessage&&<div className={styles.staffNotice}>{staffMessage}</div>}<div className={styles.staffList}><div><span className={styles.avatar}>SA</span><div><strong>Store admin</strong><small>Default local administrator</small></div><i className={`${styles.tag} ${styles.tagGreen}`}>Owner</i><small>Full workspace access</small><button>⋯</button></div>{staffUsers.map(user=><div key={user.id}><span className={styles.avatar}>{initials(user.email)}</span><div><strong>{user.email}</strong><small>{user.status==="invited"?"Invite pending":"Active"} · Added {new Date(user.createdAt).toLocaleDateString()}</small></div><i className={`${styles.tag} ${user.status==="active"?styles.tagBlue:styles.tagGray}`}>{user.role}</i><small>{user.status==="invited"?"Needs password":"Employee login"}</small><div className={styles.staffActions}><button onClick={()=>resetEmployee(user)}>{user.status==="invited"?"Resend":"Reset"}</button><button onClick={()=>deleteEmployee(user)}>Delete</button></div></div>)}</div></section><section className={styles.card}><div className={styles.cardHead}><div><h2>Roles</h2><p>Create role templates for staff accounts.</p></div><button className={styles.primary} onClick={()=>setShowRoleForm(true)}>Add role</button></div>{showRoleForm&&<div className={styles.roleForm}><label>Role name<input value={roleName} onChange={e=>setRoleName(e.target.value)} placeholder="Content manager"/></label><label>Access scope<input value={roleScope} onChange={e=>setRoleScope(e.target.value)} placeholder="Content and campaigns"/></label><label>Description<textarea rows={3} value={roleDescription} onChange={e=>setRoleDescription(e.target.value)} placeholder="What can this role do?"/></label><div><button className={styles.secondary} onClick={()=>setShowRoleForm(false)}>Cancel</button><button className={styles.primary} onClick={addRole}>Save role</button></div></div>}<div className={styles.roleList}>{rolesWithMembers.map(role=><article key={role.id}><div><strong>{role.name}</strong><small>{role.scope}</small><p>{role.description}</p></div><span>{role.members} member{role.members===1?"":"s"}</span></article>)}</div></section></div>:<section className={styles.card}><div className={styles.cardHead}><div><h2>Activity log</h2><p>No persistent audit database is connected.</p></div></div><div className={styles.timeline}>{["Admin login configured","Homepage editor available","Push campaign tracking enabled"].map((item)=><div key={item}><span>✓</span><div><strong>{item}</strong><small>Local workspace event</small></div></div>)}</div></section>}</div>
}

function initials(email:string){return email.slice(0,2).toUpperCase()}

function Settings(){const [maintenance,setMaintenance]=useState(false);return <div className={styles.content}><section className={styles.settingsHero}><div><p>ADMIN SETTINGS</p><h2>Production configuration</h2><span>Manage the app identity, service endpoints, and customer-facing controls.</span></div><i className={`${styles.tag} ${styles.tagBlue}`}>Local workspace</i></section><div className={styles.settingsGridPro}><section className={`${styles.card} ${styles.proSettingsCard}`}><div className={styles.cardHead}><div><h2>Workspace identity</h2><p>Used across the admin panel and app preview.</p></div><i className={`${styles.tag} ${styles.tagGreen}`}>Secured</i></div><div className={styles.settingsFormGrid}><label>Application name<input defaultValue="Carter's App Studio"/></label><label>Admin username<input className={styles.disabledInput} defaultValue="Set with ADMIN_USERNAME" disabled /></label><label>Public app preview URL<input placeholder="https://app.carters.com.lb"/></label><label>Supabase project URL<input placeholder="https://project.supabase.co"/></label></div><div className={styles.settingsFooter}><small>Secrets should be stored in environment variables before deployment.</small><button className={styles.primary}>Save configuration</button></div></section><section className={`${styles.card} ${styles.proSettingsCard}`}><div className={styles.cardHead}><div><h2>App controls</h2><p>Feature switches take effect after publishing.</p></div></div><div className={styles.controlStack}><div className={styles.controlRowPro}><div><strong>Maintenance mode</strong><small>Show a temporary maintenance screen</small></div><label className={styles.switch}><input type="checkbox" checked={maintenance} onChange={e=>setMaintenance(e.target.checked)}/><span/></label></div><div className={styles.controlRowPro}><div><strong>Customer chat</strong><small>Allow visitors to start conversations</small></div><label className={styles.switch}><input type="checkbox" defaultChecked/><span/></label></div><div className={styles.controlRowPro}><div><strong>Wishlist</strong><small>Let customers save products</small></div><label className={styles.switch}><input type="checkbox" defaultChecked/><span/></label></div></div><div className={styles.settingsFormGrid}><label>Minimum app version<input defaultValue="1.0.0"/></label><label>Update message<input defaultValue="A newer version is available with important improvements."/></label></div><div className={styles.settingsFooter}><small>Controls are saved locally until production persistence is connected.</small><button className={styles.primary}>Publish app controls</button></div></section><aside className={styles.settingsRail}><div><strong>Connected</strong><small>Admin login and content publishing</small></div><div><strong>Needs setup</strong><small>Supabase realtime, Shopify Admin API, push credentials</small></div><div><strong>Recommended</strong><small>Add audit storage before adding more staff users</small></div></aside></div></div>}
