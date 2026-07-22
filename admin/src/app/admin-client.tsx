"use client";
/* eslint-disable @next/next/no-img-element */

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import baseStyles from "./page.module.css";
import extraStyles from "./admin-extra.module.css";
import customerStyles from "./customer-advanced.module.css";
import loyaltyStyles from "./loyalty-professional.module.css";
import AnalyticsDateRangePicker, { type AnalyticsDateRange } from "./analytics-date-range-picker";
import SalesReplenishment from "./sales-replenishment";

const styles = Object.fromEntries(
  [...new Set([...Object.keys(baseStyles), ...Object.keys(extraStyles), ...Object.keys(customerStyles), ...Object.keys(loyaltyStyles)])].map((className) => [
    className,
    [baseStyles[className], extraStyles[className], customerStyles[className], loyaltyStyles[className]].filter(Boolean).join(" "),
  ]),
) as typeof baseStyles & typeof extraStyles & typeof customerStyles & typeof loyaltyStyles;

type SectionType = "hero" | "text" | "products" | "announcement" | "image" | "categories" | "features" | "testimonials" | "newsletter" | "divider";
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
  items?: string[];
};
type View = "dashboard" | "notifications" | "editor" | "assets" | "inventory" | "replenishment" | "promotions" | "analytics" | "marketing" | "loyalty" | "orders" | "customers" | "chat" | "team" | "settings";
type OrderFilter = "all" | "pending" | "unfulfilled" | "unpaid" | "paid" | "cancelled";
type Placement = "before-hero" | "after-hero" | "after-promos" | "after-ages" | "after-top-picks" | "after-categories" | "after-explore" | "after-essentials" | "after-brands" | "after-latest";
type AdminRole = { id: string; name: string; scope: string; description: string; permissions: string[]; builtIn: boolean; createdAt: string };
type StaffUser = { id: string; email: string; role: string; status: "invited" | "active"; inviteExpiresAt?: string; createdAt: string; updatedAt: string };
type TeamActivity = { id:string; action:string; category:"access"|"member"|"role"|"security"; severity:"info"|"success"|"warning"; actor:string; target:string; detail:string; createdAt:string };
type AdminCustomer = { id:string; name:string; firstName:string; lastName:string; email:string; phone:string; location:string; orders:number; totalSpent?:{amount:string;currencyCode:string}|null; status:string; lastOrderAt?:string|null; createdAt?:string|null; updatedAt?:string|null; loyalty:{enrolled:boolean;points:number;lifetimePoints:number;updatedAt?:string|null;transactionCount:number;earnedPoints:number;redeemedPoints:number;lastActivityAt?:string|null;lastEarnedAt?:string|null} };
type CustomerLoyaltySettings = {enabled:boolean;programName:string;pointsPerItem:number;pointsPerCurrencyUnit:number;minimumRedemptionPoints:number;rewardExpiryDays:number;silverTierPoints:number;goldTierPoints:number;vipTierPoints:number};
type OrderAddress = { firstName:string; lastName:string; address1:string; address2:string; city:string; province:string; zip:string; country:string; phone:string };
type OrderLineItem = { name:string; quantity:number; sku?:string|null; variantTitle?:string|null; image?:{url?:string|null;altText?:string|null}|null };
type AdminOrder = { id:string; name:string; createdAt:string; financialStatus:string; fulfillmentStatus:string; canMarkAsPaid:boolean; cancelledAt?:string|null; note:string; tags:string[]; total?:{amount:string;currencyCode:string}|null; customer:string; email:string; destination:string; shippingAddress:OrderAddress; items:OrderLineItem[] };
type OrderDraft = { email:string; note:string; tags:string; shippingAddress:OrderAddress };
type SavedOrderView = {id:string;name:string;search:string;statusFilter:OrderFilter;paymentFilter:string;fulfillmentFilter:string;dateFrom:string;dateTo:string;minTotal:string;maxTotal:string;orderSort:string};
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
  discountPerformance:{
    buckets:{rate:number;label:string;itemsSold:number;orders:number;products:number;grossSales:number;discountAmount:number;netSales:number}[];
    products:{title:string;variant:string;sku:string;discountLabel:string;effectiveRate:number;quantity:number;orders:number;grossSales:number;discountAmount:number;netSales:number}[];
  };
  fulfillment:{label:string;value:number}[];
  financial:{label:string;value:number}[];
  sources:{label:string;value:number}[];
  customerTypes:{label:string;value:number}[];
  topCustomers:{id:string;name:string;email:string;orders:number;totalSpent:number;averageOrderValue:number;lastOrderAt:string;accountState:string;accountType:string;orderSource:string}[];
  truncated:boolean;
  generatedAt:string;
};
type CustomerDraft = { firstName:string; lastName:string; email:string; phone:string };
type AdminSettingsState = {
  workspace:{applicationName:string;storeName:string;supportEmail:string;supportPhone:string;timezone:string;locale:string};
  commerce:{currency:string;lowStockThreshold:number;freeShippingThreshold:number;orderPrefix:string;defaultInventoryLocation:string};
  app:{maintenanceMode:boolean;customerChat:boolean;wishlist:boolean;pushNotifications:boolean;guestCheckout:boolean;minimumVersion:string;forceUpdate:boolean;updateMessage:string;updateUrl:string};
  notifications:{newOrderAlerts:boolean;lowStockAlerts:boolean;newCustomerAlerts:boolean;failedPaymentAlerts:boolean;dailyDigest:boolean;digestEmail:string};
  security:{sessionTimeoutMinutes:number;auditRetentionDays:number;requireTwoFactor:boolean;allowStaffInvites:boolean};
};
type IntegrationStatus = {shopifyStorefront:boolean;shopifyAdmin:boolean;push:boolean;email:boolean;realtime:boolean};
type AdminNotification = {id:string;category:"orders"|"inventory"|"promotions"|"customers"|"system";severity:"critical"|"warning"|"info"|"success";title:string;message:string;createdAt:string;target:View;actionLabel:string;source:string};
type AdminSearchResult = {id:string;view:"orders"|"inventory"|"customers"|"promotions";icon:string;title:string;subtitle:string;group:string;query:string};
type ShopifyThemePreviewItem={title:string;subtitle:string;image:string};
type ShopifyThemeDirectoryItem={key:string;shopifyId:string;title:string;kind:string;position:number;automatic:boolean;preview?:{heading:string;copy:string;images:string[];items:ShopifyThemePreviewItem[]}};
type MediaAsset={fileName:string;name:string;url:string;size:number;createdAt:string;inUse:boolean};
function NotificationBellIcon(){return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"/><path d="M10 21h4"/><path d="M9 3.5A5.8 5.8 0 0 1 12 2a5.8 5.8 0 0 1 3 1.5"/></svg>}
const placements: { value: Placement; label: string }[] = [
  { value:"before-hero",label:"Before Shopify hero" },{ value:"after-hero",label:"After Shopify hero" },{ value:"after-promos",label:"After promo strip" },{ value:"after-ages",label:"After age groups" },{ value:"after-top-picks",label:"After top picks" },{ value:"after-categories",label:"After shop categories" },{ value:"after-explore",label:"After explore styles" },{ value:"after-essentials",label:"After tiny essentials" },{ value:"after-brands",label:"After brands" },{ value:"after-latest",label:"After latest collection" },
];
const shopifySections: { key:string; name:string; after:Placement }[] = [{key:"hero",name:"Hero banners",after:"after-hero"},{key:"promos",name:"Promo strip",after:"after-promos"},{key:"age-groups",name:"Age groups",after:"after-ages"},{key:"top-picks",name:"Top picks",after:"after-top-picks"},{key:"shop-categories",name:"Shop categories",after:"after-categories"},{key:"explore-styles",name:"Explore styles",after:"after-explore"},{key:"tiny-essentials",name:"Tiny essentials",after:"after-essentials"},{key:"our-brands",name:"Our brands",after:"after-brands"},{key:"latest-collection",name:"Latest collection",after:"after-latest"}];

const defaults: Section[] = [
  { id: "hero-1", type: "hero", title: "Made for little adventures", subtitle: "Discover soft, playful styles for every day.", image: "https://images.unsplash.com/photo-1522771930-78848d9293e8?auto=format&fit=crop&w=900&q=80", buttonLabel: "Shop new arrivals", background: "#f9e7df", enabled: true },
  { id: "notice-1", type: "announcement", title: "Free delivery on orders over $50", subtitle: "", image: "", buttonLabel: "", background: "#0d416c", enabled: true },
  { id: "products-1", type: "products", title: "Top picks this week", subtitle: "Popular with Carter's families", image: "", buttonLabel: "View all", background: "#ffffff", enabled: true },
];

const sectionNames: Record<SectionType, string> = { hero: "Hero banner", text: "Text block", products: "Product carousel", announcement: "Announcement", image:"Image banner", categories:"Category grid", features:"Feature highlights", testimonials:"Testimonials", newsletter:"Newsletter CTA", divider:"Spacer & divider" };
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
  const presets:Record<SectionType,Pick<Section,"title"|"subtitle"|"image"|"buttonLabel"|"background"|"items">>={
    hero:{title:"A new season of little adventures",subtitle:"Create a bold campaign moment with an image, message, and call to action.",image:"",buttonLabel:"Shop now",background:"#dcecf7",items:[]},
    text:{title:"A story worth sharing",subtitle:"Write your message here.",image:"",buttonLabel:"Learn more",background:"#ffffff",items:[]},
    products:{title:"Featured picks",subtitle:"A curated collection for your customers.",image:"",buttonLabel:"View all",background:"#ffffff",items:[]},
    announcement:{title:"Free delivery on qualifying orders",subtitle:"",image:"",buttonLabel:"",background:"#0d416c",items:[]},
    image:{title:"Made for every moment",subtitle:"Use a full-width image to highlight a collection or campaign.",image:"",buttonLabel:"Explore collection",background:"#e8eef2",items:[]},
    categories:{title:"Shop by category",subtitle:"Help customers jump directly into popular departments.",image:"",buttonLabel:"",background:"#ffffff",items:["Baby","Toddler","Kids","New arrivals"]},
    features:{title:"Why families choose us",subtitle:"Share the benefits that make your store special.",image:"",buttonLabel:"",background:"#f6f9fb",items:["Soft, trusted fabrics","Easy returns","Family-friendly delivery"]},
    testimonials:{title:"Loved by families",subtitle:"Show real customer feedback and build confidence.",image:"",buttonLabel:"",background:"#fff9f3",items:["Beautiful quality and so comfortable — Sarah","Fast delivery and an easy shopping experience — Maya"]},
    newsletter:{title:"Join the Carter's family",subtitle:"Be first to hear about new arrivals, offers, and family favorites.",image:"",buttonLabel:"Sign up",background:"#eaf3fa",items:[]},
    divider:{title:"Section divider",subtitle:"",image:"",buttonLabel:"",background:"#e3e9ee",items:[]},
  };
  return { id: `${type}-${Date.now()}`, type, ...presets[type], enabled: true, placement: "before-hero" };
}

const viewPermissions:Record<View,string>={dashboard:"Dashboard",notifications:"Dashboard",editor:"App editor",assets:"App editor",inventory:"Inventory",replenishment:"Inventory",promotions:"Promotions",analytics:"Analytics",marketing:"Marketing",loyalty:"Loyalty",orders:"Orders",customers:"Customers",chat:"Customer chat",team:"Team & activity",settings:"Settings"};
const viewLabels:Record<View,string>={dashboard:"Dashboard",notifications:"Notifications",editor:"App editor",assets:"Assets",inventory:"Inventory",replenishment:"Sales & replenishment",promotions:"Promotions",analytics:"Analytics",marketing:"Marketing",loyalty:"Loyalty",orders:"Orders",customers:"Customers",chat:"Customer chat",team:"Team & activity",settings:"Settings"};
const adminNavigation:{label:string;items:{view:View;icon:ReactNode;description:string}[]}[]=[
  {label:"Overview",items:[{view:"dashboard",icon:"⌂",description:"Storefront health and performance"},{view:"notifications",icon:<NotificationBellIcon/>,description:"Operational alerts and activity"}]},
  {label:"Commerce",items:[
    {view:"orders",icon:"▤",description:"Orders and fulfillment"},{view:"inventory",icon:"▦",description:"Products and stock"},{view:"replenishment",icon:"↻",description:"Sold items and stock replenishment"},{view:"promotions",icon:"%",description:"Discounts and offers"},{view:"customers",icon:"♙",description:"Customer records"},{view:"loyalty",icon:"★",description:"Rewards and points"},
  ]},
  {label:"Growth",items:[
    {view:"editor",icon:"✦",description:"Mobile storefront content"},{view:"assets",icon:"▧",description:"Uploaded images and media"},{view:"analytics",icon:"↗",description:"Traffic and conversion"},{view:"marketing",icon:"◈",description:"Push campaigns"},{view:"chat",icon:"◌",description:"Customer support"},
  ]},
  {label:"Administration",items:[
    {view:"team",icon:"☷",description:"People, roles, and audit log"},{view:"settings",icon:"⚙",description:"Connections and app controls"},
  ]},
];

const notificationReadKey="carters-admin-read-notifications";
function readNotificationIds(){if(typeof window==="undefined")return new Set<string>();try{return new Set<string>(JSON.parse(localStorage.getItem(notificationReadKey)||"[]"))}catch{return new Set<string>()}}
function saveNotificationIds(ids:Set<string>){localStorage.setItem(notificationReadKey,JSON.stringify([...ids].slice(-500)))}
async function loadAdminNotifications():Promise<AdminNotification[]>{
  const read=async(response:Response)=>response.ok?response.json().catch(()=>({})):{};
  const [ordersData,inventoryData,promotionsData,customersData,settingsData]=await Promise.all([
    fetch("/api/shopify/orders",{cache:"no-store"}).then(read).catch(()=>({})),
    fetch("/api/shopify/inventory?limit=100",{cache:"no-store"}).then(read).catch(()=>({})),
    fetch("/api/shopify/promotions",{cache:"no-store"}).then(read).catch(()=>({})),
    fetch("/api/shopify/customers",{cache:"no-store"}).then(read).catch(()=>({})),
    fetch("/api/settings",{cache:"no-store"}).then(read).catch(()=>({})),
  ]);
  const now=Date.now();const day=86400000;const alerts:AdminNotification[]=[];
  const orders=(Array.isArray(ordersData.orders)?ordersData.orders:[]) as AdminOrder[];
  orders.slice(0,30).forEach(order=>{if(order.cancelledAt)return;const unpaid=!/PAID|PARTIALLY_REFUNDED|REFUNDED/i.test(order.financialStatus);const unfulfilled=/UNFULFILLED|ON_HOLD|SCHEDULED/i.test(order.fulfillmentStatus);const recent=now-new Date(order.createdAt).getTime()<day;if(!unpaid&&!unfulfilled&&!recent)return;const severity=unpaid?"critical":unfulfilled?"warning":"info";const state=unpaid?"requires payment attention":unfulfilled?"is waiting for fulfillment":"was placed recently";alerts.push({id:`order:${order.id}:${severity}`,category:"orders",severity,title:`${order.name} ${state}`,message:`${order.customer} · ${order.total?`${order.total.amount} ${order.total.currencyCode}`:"Total unavailable"}`,createdAt:order.createdAt,target:"orders",actionLabel:"Open orders",source:"Shopify Orders"})});
  const inventory=(Array.isArray(inventoryData.inventory)?inventoryData.inventory:[]) as InventoryItem[];
  inventory.filter(item=>item.tracked&&item.quantity<=5).sort((a,b)=>a.quantity-b.quantity).slice(0,24).forEach(item=>{const empty=item.quantity<=0;alerts.push({id:`inventory:${item.id}:${empty?"out":"low"}`,category:"inventory",severity:empty?"critical":"warning",title:empty?`${item.product} is out of stock`:`${item.product} is running low`,message:`${item.variant} · ${item.quantity} available${item.sku?` · SKU ${item.sku}`:""}`,createdAt:item.updatedAt||new Date().toISOString(),target:"inventory",actionLabel:"Manage stock",source:"Shopify Inventory"})});
  const promotions=(Array.isArray(promotionsData.promotions)?promotionsData.promotions:[]) as Promotion[];
  promotions.filter(item=>item.status==="ACTIVE"&&item.endsAt).forEach(item=>{const remaining=new Date(item.endsAt!).getTime()-now;if(remaining<0||remaining>7*day)return;alerts.push({id:`promotion:${item.id}:ending`,category:"promotions",severity:remaining<=day?"critical":"warning",title:`${item.title} ends ${remaining<=day?"within 24 hours":"soon"}`,message:`Code ${item.code} · ${Math.max(1,Math.ceil(remaining/day))} day${Math.ceil(remaining/day)===1?"":"s"} remaining`,createdAt:item.endsAt!,target:"promotions",actionLabel:"Review promotion",source:"Shopify Promotions"})});
  const customers=(Array.isArray(customersData.customers)?customersData.customers:[]) as AdminCustomer[];
  customers.filter(item=>item.createdAt&&now-new Date(item.createdAt).getTime()<7*day).slice(0,12).forEach(item=>alerts.push({id:`customer:${item.id}:new`,category:"customers",severity:"success",title:`New customer: ${item.name||item.email}`,message:`Joined ${new Date(item.createdAt!).toLocaleDateString()} · ${item.orders} order${item.orders===1?"":"s"}`,createdAt:item.createdAt!,target:"customers",actionLabel:"View customer",source:"Shopify Customers"}));
  const integrations=settingsData.integrations as Partial<IntegrationStatus>|undefined;
  if(integrations)Object.entries({shopifyAdmin:"Shopify Admin",email:"Invitation email",push:"Push delivery",realtime:"Realtime updates"}).forEach(([key,label])=>{if(integrations[key as keyof IntegrationStatus]===false)alerts.push({id:`system:${key}:disconnected`,category:"system",severity:key==="shopifyAdmin"?"critical":"warning",title:`${label} is not configured`,message:`Complete the ${label.toLowerCase()} connection to enable all admin workflows.`,createdAt:new Date().toISOString(),target:"settings",actionLabel:"Open settings",source:"System Health"})});
  const weight={critical:0,warning:1,info:2,success:3};return alerts.sort((a,b)=>weight[a.severity]-weight[b.severity]||new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()).slice(0,80);
}

async function searchAdminRecords(query:string,signal:AbortSignal):Promise<AdminSearchResult[]>{
  const term=query.trim();if(term.length<2)return[];const read=async(response:Response)=>response.ok?response.json().catch(()=>({})):{};const encoded=encodeURIComponent(term);
  const [ordersData,inventoryData,customersData,promotionsData]=await Promise.all([
    fetch(`/api/shopify/orders?search=${encoded}`,{cache:"no-store",signal}).then(read).catch(()=>({})),
    fetch(`/api/shopify/inventory?limit=12&search=${encoded}`,{cache:"no-store",signal}).then(read).catch(()=>({})),
    fetch(`/api/shopify/customers?search=${encoded}`,{cache:"no-store",signal}).then(read).catch(()=>({})),
    fetch(`/api/shopify/promotions?search=${encoded}`,{cache:"no-store",signal}).then(read).catch(()=>({})),
  ]);
  const results:AdminSearchResult[]=[];
  ((Array.isArray(ordersData.orders)?ordersData.orders:[]) as AdminOrder[]).slice(0,5).forEach(item=>results.push({id:`order-${item.id}`,view:"orders",icon:"▤",title:item.name,subtitle:`${item.customer} · ${item.email||item.destination} · ${item.financialStatus.toLowerCase().replaceAll("_"," ")}`,group:"Orders",query:item.name}));
  ((Array.isArray(inventoryData.inventory)?inventoryData.inventory:[]) as InventoryItem[]).slice(0,5).forEach(item=>results.push({id:`inventory-${item.id}`,view:"inventory",icon:"▦",title:item.product,subtitle:`${item.variant}${item.sku?` · SKU ${item.sku}`:""} · ${item.quantity} available`,group:"Inventory",query:item.sku||item.name||item.product}));
  ((Array.isArray(customersData.customers)?customersData.customers:[]) as AdminCustomer[]).slice(0,5).forEach(item=>results.push({id:`customer-${item.id}`,view:"customers",icon:"♙",title:item.name||item.email,subtitle:`${item.email}${item.phone?` · ${item.phone}`:""} · ${item.orders} order${item.orders===1?"":"s"}`,group:"Customers",query:item.email||item.name}));
  ((Array.isArray(promotionsData.promotions)?promotionsData.promotions:[]) as Promotion[]).slice(0,5).forEach(item=>results.push({id:`promotion-${item.id}`,view:"promotions",icon:"%",title:item.title,subtitle:`${item.code} · ${item.status.toLowerCase()} · ${item.usageCount} uses`,group:"Promotions",query:item.code==="Automatic"?item.title:item.code}));
  return results;
}

export default function Home({sessionUser,permissions}:{sessionUser:{id:string;email:string;role:string};permissions:string[]}) {
  const [view, setView] = useState<View>("dashboard");
  const [sidebarCollapsed,setSidebarCollapsed]=useState(false);
  const [mobileNavOpen,setMobileNavOpen]=useState(false);
  const [notificationCount,setNotificationCount]=useState(0);
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("all");
  const [sections, setSections] = useState<Section[]>(defaults);
  const [selectedId, setSelectedId] = useState(defaults[0].id);
  const [saved, setSaved] = useState(true);
  const [publishedAt, setPublishedAt] = useState("Not published yet");
  const [publishMessage, setPublishMessage] = useState("");
  const [shopifyVisibility,setShopifyVisibility]=useState<Record<string,boolean>>({});
  const [shopifyStyles,setShopifyStyles]=useState<Record<string,string>>({});
  const [ready, setReady] = useState(false);
  const [commandOpen,setCommandOpen]=useState(false);
  const [commandQuery,setCommandQuery]=useState("");
  const [commandRecords,setCommandRecords]=useState<AdminSearchResult[]>([]);
  const [commandSearching,setCommandSearching]=useState(false);
  const [recordTarget,setRecordTarget]=useState<{view:View;query:string;filter?:string;nonce:number}|null>(null);
  const [appStatus,setAppStatus]=useState<"checking"|"active"|"maintenance"|"unavailable">("checking");
  const can=useCallback((target:View)=>permissions.includes("All permissions")||permissions.includes(viewPermissions[target]),[permissions]);
  const navigate=useCallback((target:View)=>{if(can(target)){setView(target);setMobileNavOpen(false)}},[can]);

  useEffect(() => {
    const draft = localStorage.getItem("carters-admin-draft");
    const published = localStorage.getItem("carters-admin-published-at");
    const visibilityDraft=localStorage.getItem("carters-admin-shopify-visibility");
    const stylesDraft=localStorage.getItem("carters-admin-shopify-styles");
    const savedSidebarState=localStorage.getItem("carters-admin-sidebar-collapsed");
    // Hydrate the browser-only draft after the initial server render.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (draft) { try { setSections(JSON.parse(draft)); } catch { /* keep defaults */ } }
    if (published) setPublishedAt(published);
    if(visibilityDraft){try{setShopifyVisibility(JSON.parse(visibilityDraft))}catch{/* keep defaults */}}
    if(stylesDraft){try{setShopifyStyles(JSON.parse(stylesDraft))}catch{/* keep defaults */}}
    if(savedSidebarState!==null)setSidebarCollapsed(savedSidebarState==="true");
    if(!visibilityDraft||!stylesDraft)fetch("/api/content",{cache:"no-store"}).then(response=>response.json()).then(data=>{if(!visibilityDraft&&data?.shopifyVisibility)setShopifyVisibility(data.shopifyVisibility);if(!stylesDraft&&data?.shopifyStyles)setShopifyStyles(data.shopifyStyles)}).catch(()=>undefined);
    if(!can("dashboard")){const first=(Object.keys(viewPermissions) as View[]).find(target=>can(target));if(first)setView(first)}
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [can]);

  useEffect(()=>{
    const checkStatus=async()=>{try{const response=await fetch("/api/mobile-settings",{cache:"no-store",credentials:"same-origin"});if(!response.ok)throw new Error("status unavailable");const data=await response.json();setAppStatus(data?.app?.maintenanceMode?"maintenance":"active")}catch{setAppStatus("unavailable")}};
    void checkStatus();
    const timer=window.setInterval(()=>void checkStatus(),30000);
    return()=>window.clearInterval(timer);
  },[]);

  useEffect(()=>{
    const handleShortcut=(event:KeyboardEvent)=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k"){event.preventDefault();setCommandOpen(open=>!open)}else if(event.key==="Escape")setCommandOpen(false)};
    window.addEventListener("keydown",handleShortcut);
    return()=>window.removeEventListener("keydown",handleShortcut);
  },[]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(()=>{const term=commandQuery.trim();if(!commandOpen||term.length<2){setCommandRecords([]);setCommandSearching(false);return}const controller=new AbortController();setCommandSearching(true);const timer=window.setTimeout(()=>{searchAdminRecords(term,controller.signal).then(setCommandRecords).catch(()=>setCommandRecords([])).finally(()=>setCommandSearching(false))},300);return()=>{window.clearTimeout(timer);controller.abort()}},[commandOpen,commandQuery]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(()=>{let active=true;const refresh=()=>loadAdminNotifications().then(alerts=>{if(active){const readIds=readNotificationIds();setNotificationCount(alerts.filter(alert=>!readIds.has(alert.id)).length)}}).catch(()=>undefined);void refresh();const timer=window.setInterval(refresh,60000);return()=>{active=false;window.clearInterval(timer)}},[]);

  const selected = useMemo(() => sections.find((item) => item.id === selectedId), [sections, selectedId]);
  const pageTitles: Record<View, { title: string; copy: string }> = {
    dashboard: { title: "Command center", copy: "Monitor app health, traffic, and publishing status." },
    notifications: { title: "Notification center", copy: "Review operational alerts, activity, and items requiring attention." },
    editor: { title: "App editor", copy: "Arrange custom content around live Shopify sections." },
    assets: { title: "Assets", copy: "Upload, organize, and reuse mobile storefront imagery." },
    inventory: { title: "Inventory", copy: "Monitor Shopify product variants and stock levels." },
    replenishment: { title: "Sales & replenishment", copy: "Analyze sold items and restore Shopify inventory." },
    promotions: { title: "Promotions", copy: "Review Shopify discount codes and automatic offers." },
    analytics: { title: "Analytics", copy: "Understand app traffic and customer engagement." },
    marketing: { title: "Marketing", copy: "Create push campaigns and review notification performance." },
    loyalty: { title: "Loyalty", copy: "Reward repeat customers and manage points." },
    orders: { title: "Orders", copy: "Review live orders from Shopify." },
    customers: { title: "Customers", copy: "Prepare Shopify-backed customer operations." },
    chat: { title: "Customer chat", copy: "Review support readiness and realtime connection state." },
    team: { title: "Team & activity", copy: "Manage admin roles and audit readiness." },
    settings: { title: "Settings", copy: "Configure production connections and app controls." },
  };
  const commandItems=adminNavigation.flatMap(group=>group.items.map(item=>({...item,group:group.label,label:viewLabels[item.view]}))).filter(item=>can(item.view)&&`${item.label} ${item.description} ${item.group}`.toLowerCase().includes(commandQuery.trim().toLowerCase()));
  const chooseCommand=(target:View)=>{navigate(target);setCommandOpen(false);setCommandQuery("")};
  const chooseRecord=(record:AdminSearchResult)=>{setRecordTarget({view:record.view,query:record.query,nonce:Date.now()});navigate(record.view);setCommandOpen(false);setCommandQuery("");setCommandRecords([])};
  const statusLabel=appStatus==="active"?"App active":appStatus==="maintenance"?"Maintenance mode":appStatus==="checking"?"Checking app":"Status unavailable";
  const update = (patch: Partial<Section>) => {
    setSections((items) => items.map((item) => item.id === selectedId ? { ...item, ...patch } : item));
    setSaved(false);
  };
  const saveDraft = () => { localStorage.setItem("carters-admin-draft", JSON.stringify(sections));localStorage.setItem("carters-admin-shopify-visibility",JSON.stringify(shopifyVisibility));localStorage.setItem("carters-admin-shopify-styles",JSON.stringify(shopifyStyles)); setSaved(true); };
  const logout = async () => { await fetch("/api/logout", { method: "POST" }); window.location.href = "/login"; };
  const publish = async () => {
    setPublishMessage("Publishing…");
    try {
      const response = await fetch("/api/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sections,shopifyVisibility,shopifyStyles }) });
      if (!response.ok) throw new Error("Publish failed");
      const result = await response.json();
      const stamp = new Date(result.publishedAt).toLocaleString();
      localStorage.setItem("carters-admin-published", JSON.stringify(sections));
      localStorage.setItem("carters-admin-shopify-visibility",JSON.stringify(shopifyVisibility));
      localStorage.setItem("carters-admin-shopify-styles",JSON.stringify(shopifyStyles));
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
  const useAssetInEditor=(url:string)=>{const current=sections.find(item=>item.id===selectedId);if(current&&(["hero","image"] as SectionType[]).includes(current.type)){setSections(items=>items.map(item=>item.id===current.id?{...item,image:url}:item));setSelectedId(current.id)}else{const item={...newSection("image"),id:`image-${Date.now()}`,image:url,placement:"before-hero" as Placement};setSections(items=>[...items,item]);setSelectedId(item.id)}setSaved(false);setView("editor")};
  const openOrders = (filter: OrderFilter = "all") => { if(!can("orders"))return;setOrderFilter(filter);setRecordTarget(null);setView("orders");setMobileNavOpen(false); };
  const openDashboardTarget=(target:View,{query="",filter}:{query?:string;filter?:string}={})=>{if(!can(target))return;if(target==="orders"&&filter)setOrderFilter(filter as OrderFilter);setRecordTarget({view:target,query,filter,nonce:Date.now()});setView(target);setMobileNavOpen(false)};
  const toggleSidebar=()=>setSidebarCollapsed(collapsed=>{const next=!collapsed;localStorage.setItem("carters-admin-sidebar-collapsed",String(next));return next});

  if (!ready) return null;
  return (
    <div className={`${styles.shell} ${styles.professionalShell} ${sidebarCollapsed?styles.shellCollapsed:""}`}>
      <aside className={`${styles.sidebar} ${styles.professionalSidebar} ${sidebarCollapsed?styles.sidebarCollapsed:""} ${mobileNavOpen?styles.mobileNavOpen:""}`}>
        <div className={styles.mobileNavBar}>
          <Image src="/carters-logo.png" alt="Carter's and OshKosh B'gosh" width={153} height={46} priority />
          <div><small>ADMIN</small><strong>{viewLabels[view]}</strong></div>
          <button type="button" onClick={()=>setMobileNavOpen(open=>!open)} aria-label={mobileNavOpen?"Close navigation menu":"Open navigation menu"} aria-expanded={mobileNavOpen} aria-controls="admin-navigation"><span/><span/><span/></button>
        </div>
        <div className={styles.brand}>
          <Image className={styles.brandLogo} src="/carters-logo.png" alt="Carter's and OshKosh B'gosh" width={306} height={91} priority />
        </div>
        <nav className={styles.nav} id="admin-navigation">
          {adminNavigation.map(group=>{const items=group.items.filter(item=>can(item.view));return items.length?<div className={styles.navGroup} key={group.label}><p className={styles.navGroupLabel}>{group.label}</p>{items.map(item=><Nav key={item.view} active={view===item.view} onClick={()=>item.view==="orders"?openOrders("all"):navigate(item.view)} icon={item.icon} label={viewLabels[item.view]} badge={item.view==="notifications"?notificationCount:0}/>)}</div>:null})}
        </nav>
        <div className={styles.sidebarFoot}><span className={styles.avatar}>{initials(sessionUser.email)}</span><div><strong>{sessionUser.email}</strong><small>{sessionUser.role}</small></div></div>
      </aside>

      <main className={styles.main}>
        <header className={`${styles.topbar} ${styles.professionalTopbar}`}><div className={styles.topbarIdentity}><button className={styles.desktopNavToggle} type="button" onClick={toggleSidebar} aria-label={sidebarCollapsed?"Open navigation":"Close navigation"} aria-expanded={!sidebarCollapsed} title={sidebarCollapsed?"Open navigation":"Close navigation"}><span>{sidebarCollapsed?"☰":"‹"}</span><b>{sidebarCollapsed?"Open menu":"Hide menu"}</b></button><div className={styles.topbarTitle}><p className={styles.eyebrow}>CARTER&apos;S MOBILE APP <span>/</span> {viewLabels[view]}</p><h1>{pageTitles[view].title}</h1><small>{pageTitles[view].copy}</small></div></div><div className={styles.topActions}><button className={styles.notificationBell} type="button" onClick={()=>navigate("notifications")} aria-label={`${notificationCount} unread admin notifications`} title="Open notifications"><span><NotificationBellIcon/></span>{notificationCount>0&&<b>{notificationCount>99?"99+":notificationCount}</b>}</button><button className={styles.adminSearchButton} onClick={()=>setCommandOpen(true)} aria-label="Search admin"><span>⌕</span><b>Search admin</b><kbd>Ctrl K</kbd></button><span className={`${styles.appStatusPill} ${appStatus==="active"?styles.appStatusActive:appStatus==="maintenance"?styles.appStatusMaintenance:styles.appStatusUnknown}`}><i/>{publishMessage||statusLabel}</span>{view === "editor" && <><button className={styles.secondary} onClick={saveDraft}>{saved ? "Draft saved" : "Save draft"}</button><button className={styles.primary} onClick={publish}>Publish changes</button></>}<button className={styles.secondary} onClick={logout}>Log out</button></div></header>
        {view === "dashboard" && <Dashboard setView={navigate} openOrders={openOrders} openTarget={openDashboardTarget} publishedAt={publishedAt} can={can} userName={sessionUser.email.split("@")[0]} />}
        {view === "notifications" && <Notifications onNavigate={navigate} onCountChange={setNotificationCount} />}
        {view === "editor" && <Editor sections={sections} selected={selected} selectedId={selectedId} setSelectedId={setSelectedId} update={update} move={move} remove={remove} duplicate={duplicate} setSectionVisibility={setSectionVisibility} add={add} shopifyVisibility={shopifyVisibility} setShopifyVisibility={setShopifyVisibility} shopifyStyles={shopifyStyles} setShopifyStyles={setShopifyStyles} markUnsaved={()=>setSaved(false)} onOpenAssets={()=>setView("assets")} />}
        {view === "assets" && <Assets onUse={useAssetInEditor} draftImages={new Set(sections.map(section=>section.image).filter(Boolean))} />}
        {view === "inventory" && <Inventory key={recordTarget?.view==="inventory"?recordTarget.nonce:"inventory"} initialSearch={recordTarget?.view==="inventory"?recordTarget.query:""} initialStockFilter={recordTarget?.view==="inventory"?recordTarget.filter:"all"} />}
        {view === "replenishment" && <SalesReplenishment />}
        {view === "promotions" && <Promotions key={recordTarget?.view==="promotions"?recordTarget.nonce:"promotions"} initialSearch={recordTarget?.view==="promotions"?recordTarget.query:""} initialStatusFilter={recordTarget?.view==="promotions"?recordTarget.filter:"all"} />}
        {view === "analytics" && <Analytics />}
        {view === "marketing" && <Marketing />}
        {view === "loyalty" && <Loyalty />}
        {view === "orders" && <Orders key={recordTarget?.view==="orders"?recordTarget.nonce:"orders"} initialFilter={orderFilter} initialSearch={recordTarget?.view==="orders"?recordTarget.query:""} />}
        {view === "customers" && <Customers key={recordTarget?.view==="customers"?recordTarget.nonce:"customers"} initialSearch={recordTarget?.view==="customers"?recordTarget.query:""} />}
        {view === "chat" && <Chat />}
        {view === "team" && <Team />}
        {view === "settings" && <Settings />}
      </main>
      {commandOpen&&<div className={styles.commandBackdrop} role="presentation" onMouseDown={()=>setCommandOpen(false)}><section className={styles.commandPalette} role="dialog" aria-modal="true" aria-label="Universal admin search" onMouseDown={event=>event.stopPropagation()}><header><span>⌕</span><input autoFocus value={commandQuery} onChange={event=>setCommandQuery(event.target.value)} onKeyDown={event=>{if(event.key==="Enter"&&commandRecords[0])chooseRecord(commandRecords[0]);else if(event.key==="Enter"&&commandItems[0])chooseCommand(commandItems[0].view)}} placeholder="Search orders, customers, products, SKUs, promotions…" aria-label="Search admin records and pages"/><kbd>Esc</kbd></header><div className={styles.commandResults}>{commandRecords.length>0&&<><p className={styles.commandSectionLabel}>Records</p>{commandRecords.map(record=><button key={record.id} onClick={()=>chooseRecord(record)}><span className={styles.commandItemIcon}>{record.icon}</span><span className={styles.commandItemCopy}><strong>{record.title}</strong><small>{record.subtitle}</small></span><span className={styles.commandItemGroup}>{record.group}</span></button>)}</>}{commandItems.length>0&&<><p className={styles.commandSectionLabel}>Pages and tools</p>{commandItems.map(item=><button key={item.view} onClick={()=>chooseCommand(item.view)}><span className={styles.commandItemIcon}>{item.icon}</span><span className={styles.commandItemCopy}><strong>{item.label}</strong><small>{item.description}</small></span><span className={styles.commandItemGroup}>{item.group}</span></button>)}</>}{commandSearching&&<div className={styles.commandSearching}><span>◌</span> Searching live admin records…</div>}{!commandSearching&&!commandItems.length&&!commandRecords.length&&<div className={styles.commandEmpty}><span>⌕</span><strong>No matching records</strong><small>Try an order number, customer email, product, SKU, or promotion code.</small></div>}</div><footer><span>Universal record search</span><span><kbd>Enter</kbd> open &nbsp; <kbd>Esc</kbd> close</span></footer></section></div>}
    </div>
  );
}

function Nav({ active, onClick, icon, label, badge=0 }: { active: boolean; onClick: () => void; icon: ReactNode; label: string; badge?:number }) {
  return <button className={`${styles.navItem} ${active ? styles.navActive : ""}`} onClick={onClick} aria-label={label} title={label}><span className={styles.navIcon}>{icon}</span><span className={styles.navText}>{label}</span>{badge>0&&<b>{badge>99?"99+":badge}</b>}</button>;
}

function DashboardEngagementChart({data,loading}:{data:{label:string;value:number}[];loading:boolean}){
  const width=760;const height=220;const left=42;const right=14;const top=16;const bottom=24;const max=Math.max(1,...data.map(point=>point.value));const step=data.length>1?(width-left-right)/(data.length-1):0;
  const points=data.map((point,index)=>({...point,x:left+index*step,y:top+(1-point.value/max)*(height-top-bottom)}));
  const line=points.map(point=>`${point.x},${point.y}`).join(" ");const area=points.length?`M ${points[0].x} ${height-bottom} L ${points.map(point=>`${point.x} ${point.y}`).join(" L ")} L ${points.at(-1)?.x} ${height-bottom} Z`:"";const labelEvery=Math.max(1,Math.ceil(data.length/7));
  if(!data.length)return <div className={styles.dashboardChartEmpty}>{loading?"Loading engagement…":"No recorded sessions yet"}</div>;
  return <div className={styles.dashboardEngagementPlot}><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Daily app sessions over the selected period"><defs><linearGradient id="dashboard-engagement-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#397ab5" stopOpacity=".3"/><stop offset="100%" stopColor="#397ab5" stopOpacity=".02"/></linearGradient></defs>{[0,.25,.5,.75,1].map(level=>{const y=top+level*(height-top-bottom);const tick=Math.round(max*(1-level));return <g key={level}><line x1={left} x2={width-right} y1={y} y2={y} stroke="#e6edf2" strokeDasharray={level===1?"0":"4 5"}/><text x={left-9} y={y+3} textAnchor="end">{tick}</text></g>})}{area&&<path d={area} fill="url(#dashboard-engagement-area)"/>}<polyline points={line} fill="none" stroke="#397ab5" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>{points.map((point,index)=><g key={`${point.label}-${index}`}><circle cx={point.x} cy={point.y} r="4" fill="#fff" stroke="#397ab5" strokeWidth="2.5"/><circle cx={point.x} cy={point.y} r="11" fill="transparent"><title>{point.label}: {point.value.toLocaleString()} sessions</title></circle>{(index%labelEvery===0||index===points.length-1)&&<text className={styles.dashboardEngagementLabel} x={point.x} y={height-5} textAnchor={index===0?"start":index===points.length-1?"end":"middle"}>{point.label}</text>}</g>)}</svg></div>;
}

function DashboardCommerceChart({title,copy,value,data,color,formatPoint,onClick}:{title:string;copy:string;value:string;data:{date:string;label:string;value:number}[];color:string;formatPoint:(value:number)=>string;onClick?:()=>void}){
  const width=560;const height=170;const inset=12;const max=Math.max(1,...data.map(point=>point.value));const step=data.length>1?(width-inset*2)/(data.length-1):0;const average=data.length?data.reduce((sum,point)=>sum+point.value,0)/data.length:0;const peak=data.length?Math.max(...data.map(point=>point.value)):0;
  const midpoint=Math.max(1,Math.floor(data.length/2));const first=data.slice(0,midpoint).reduce((sum,point)=>sum+point.value,0);const second=data.slice(midpoint).reduce((sum,point)=>sum+point.value,0);const trend=first?((second-first)/first)*100:second?100:0;
  const points=data.map((point,index)=>({...point,x:inset+index*step,y:height-inset-(point.value/max)*(height-inset*2)}));
  const line=points.map(point=>`${point.x},${point.y}`).join(" ");const area=points.length?`M ${points[0].x} ${height-inset} L ${points.map(point=>`${point.x} ${point.y}`).join(" L ")} L ${points.at(-1)?.x} ${height-inset} Z`:"";const labelEvery=Math.max(1,Math.ceil(data.length/5));const gradientId=`dashboard-${title.toLowerCase().replaceAll(" ","-")}`;
  const content=<><header><div><p>{title}</p><div className={styles.dashboardCommerceValue}><strong>{value}</strong><i className={trend>0?styles.dashboardTrendUp:trend<0?styles.dashboardTrendDown:styles.dashboardTrendFlat}>{trend>0?"↗":trend<0?"↘":"—"} {Math.abs(trend).toFixed(1)}%</i></div><small>{copy}</small></div><span style={{background:`${color}18`,color}}>{onClick?"→":"↗"}</span></header><div className={styles.dashboardCommerceChart}>{data.length?<><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title} over the selected period`}><defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".28"/><stop offset="100%" stopColor={color} stopOpacity=".02"/></linearGradient></defs>{[.25,.5,.75,1].map(level=><line key={level} x1={inset} x2={width-inset} y1={height-inset-level*(height-inset*2)} y2={height-inset-level*(height-inset*2)} stroke="#e9eef2" strokeDasharray="4 5"/>)}{area&&<path d={area} fill={`url(#${gradientId})`}/>}<polyline points={line} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>{points.map(point=><g key={point.date}><circle cx={point.x} cy={point.y} r="3" fill="#fff" stroke={color} strokeWidth="2"/><circle cx={point.x} cy={point.y} r="10" fill="transparent"><title>{point.label}: {formatPoint(point.value)}</title></circle></g>)}</svg><div className={styles.dashboardCommerceAxis}>{data.map((point,index)=>index%labelEvery===0||index===data.length-1?<span key={point.date}>{point.label}</span>:null)}</div><div className={styles.dashboardCommerceStats}><span>Daily average <b>{formatPoint(average)}</b></span><span>Peak <b>{formatPoint(peak)}</b></span></div></>:<div className={styles.dashboardEmpty}>No commerce activity in this period</div>}</div></>;
  return onClick?<button type="button" className={`${styles.dashboardCommerceCard} ${styles.dashboardCommerceCardButton}`} onClick={onClick} aria-label={`Open ${title.toLowerCase()}`}>{content}</button>:<article className={styles.dashboardCommerceCard}>{content}</article>;
}

function Notifications({onNavigate,onCountChange}:{onNavigate:(view:View)=>void;onCountChange:(count:number)=>void}){
  const [alerts,setAlerts]=useState<AdminNotification[]>([]);const [readIds,setReadIds]=useState<Set<string>>(new Set());const [loading,setLoading]=useState(true);const [message,setMessage]=useState("");const [category,setCategory]=useState("all");const [severity,setSeverity]=useState("all");const [status,setStatus]=useState("unread");const [search,setSearch]=useState("");const [clock,setClock]=useState(0);
  const refresh=useCallback(async()=>{setLoading(true);setMessage("");try{const next=await loadAdminNotifications();const saved=readNotificationIds();setAlerts(next);setReadIds(saved);setClock(Date.now());onCountChange(next.filter(item=>!saved.has(item.id)).length)}catch(error){setMessage(error instanceof Error?error.message:"Unable to load admin notifications.")}finally{setLoading(false)}},[onCountChange]);
  useEffect(()=>{/* eslint-disable react-hooks/set-state-in-effect */void refresh();/* eslint-enable react-hooks/set-state-in-effect */},[refresh]);
  const unread=alerts.filter(item=>!readIds.has(item.id)).length;const critical=alerts.filter(item=>item.severity==="critical"&&!readIds.has(item.id)).length;const warning=alerts.filter(item=>item.severity==="warning"&&!readIds.has(item.id)).length;
  const visible=alerts.filter(item=>(category==="all"||item.category===category)&&(severity==="all"||item.severity===severity)&&(status==="all"||(status==="unread"&&!readIds.has(item.id))||(status==="read"&&readIds.has(item.id)))&&`${item.title} ${item.message} ${item.source}`.toLowerCase().includes(search.trim().toLowerCase()));
  const saveRead=(next:Set<string>)=>{setReadIds(next);saveNotificationIds(next);onCountChange(alerts.filter(item=>!next.has(item.id)).length)};
  const markRead=(id:string)=>{const next=new Set(readIds);next.add(id);saveRead(next)};
  const markUnread=(id:string)=>{const next=new Set(readIds);next.delete(id);saveRead(next)};
  const markAllRead=()=>saveRead(new Set([...readIds,...alerts.map(item=>item.id)]));
  const openAlert=(item:AdminNotification)=>{markRead(item.id);onNavigate(item.target)};
  const relative=(value:string)=>{const time=new Date(value).getTime();if(!Number.isFinite(time)||!clock)return "Recently";const minutes=Math.max(0,Math.floor((clock-time)/60000));if(minutes<1)return "Just now";if(minutes<60)return `${minutes}m ago`;const hours=Math.floor(minutes/60);if(hours<24)return `${hours}h ago`;const days=Math.floor(hours/24);return days<7?`${days}d ago`:new Date(value).toLocaleDateString()};
  return <div className={`${styles.content} ${styles.notificationPage}`}>
    <section className={styles.notificationHero}><div><p>OPERATIONS INBOX</p><h2>Everything requiring your attention</h2><span>Live signals from commerce, customers, campaigns, and system connections.</span></div><div><button className={styles.secondary} type="button" disabled={loading} onClick={()=>void refresh()}>{loading?"Refreshing…":"↻ Refresh"}</button><button className={styles.primary} type="button" disabled={!unread} onClick={markAllRead}>Mark all as read</button></div></section>
    <div className={styles.notificationMetrics}><article><span className={styles.notificationMetricUnread}>●</span><div><small>Unread</small><strong>{unread}</strong></div></article><article><span className={styles.notificationMetricCritical}>!</span><div><small>Critical</small><strong>{critical}</strong></div></article><article><span className={styles.notificationMetricWarning}>△</span><div><small>Warnings</small><strong>{warning}</strong></div></article><article><span className={styles.notificationMetricAll}>♢</span><div><small>All signals</small><strong>{alerts.length}</strong></div></article></div>
    <section className={styles.notificationToolbar}><label className={styles.notificationSearch}><span>⌕</span><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search notifications"/></label><label>Category<select value={category} onChange={event=>setCategory(event.target.value)}><option value="all">All categories</option><option value="orders">Orders</option><option value="inventory">Inventory</option><option value="promotions">Promotions</option><option value="customers">Customers</option><option value="system">System</option></select></label><label>Priority<select value={severity} onChange={event=>setSeverity(event.target.value)}><option value="all">All priorities</option><option value="critical">Critical</option><option value="warning">Warning</option><option value="info">Information</option><option value="success">Positive</option></select></label><label>Status<select value={status} onChange={event=>setStatus(event.target.value)}><option value="unread">Unread</option><option value="all">All notifications</option><option value="read">Read</option></select></label></section>
    <section className={styles.notificationInbox}><header><div><h3>Activity inbox</h3><p>{message||`${visible.length} notification${visible.length===1?"":"s"} in this view`}</p></div><span>{loading?"Updating":"Live"}</span></header><div className={styles.notificationList}>{visible.length?visible.map(item=>{const isRead=readIds.has(item.id);return <article key={item.id} className={`${styles.notificationItem} ${isRead?styles.notificationRead:""}`}><button className={styles.notificationReadToggle} type="button" onClick={()=>isRead?markUnread(item.id):markRead(item.id)} aria-label={isRead?"Mark unread":"Mark read"} title={isRead?"Mark unread":"Mark read"}><i/></button><span className={`${styles.notificationIcon} ${styles[`notification${item.severity[0].toUpperCase()}${item.severity.slice(1)}` as keyof typeof styles]}`}>{item.category==="orders"?"▤":item.category==="inventory"?"▦":item.category==="promotions"?"%":item.category==="customers"?"♙":"⚙"}</span><div className={styles.notificationCopy}><div><strong>{item.title}</strong><span className={styles.notificationSource}>{item.source}</span></div><p>{item.message}</p><small>{relative(item.createdAt)}</small></div><button className={styles.notificationAction} type="button" onClick={()=>openAlert(item)}>{item.actionLabel} <span>→</span></button></article>}):<div className={styles.notificationEmpty}><span>{loading?"◌":"✓"}</span><strong>{loading?"Loading notifications…":"You are all caught up"}</strong><small>{loading?"Checking live admin data.":"No notifications match the selected filters."}</small></div>}</div></section>
  </div>;
}

function Dashboard({ setView, openOrders, openTarget, publishedAt, can, userName }: { setView: (v: View) => void; openOrders: (filter: OrderFilter) => void; openTarget:(view:View,options?:{query?:string;filter?:string})=>void; publishedAt: string; can:(view:View)=>boolean; userName:string }) {
  type Summary = { sessions:number; screenViews:number; productViews:number; cartViews:number; notificationDevices:number; purchases:number|null; days:{label:string;value:number}[] };
  type Operations = { orders:AdminOrder[]; inventory:InventoryItem[]; promotions:Promotion[]; pendingOrders:number };
  const [summary,setSummary]=useState<Summary|null>(null);
  const [operations,setOperations]=useState<Operations>({orders:[],inventory:[],promotions:[],pendingOrders:0});
  const [commerce,setCommerce]=useState<CommerceAnalytics|null>(null);
  const initialRange=useMemo(()=>recentAnalyticsRange(30),[]);
  const [range,setRange]=useState<AnalyticsDateRange>(initialRange);
  const [loading,setLoading]=useState(true);
  const [analyticsError,setAnalyticsError]=useState("");
  const [commerceError,setCommerceError]=useState("");
  const refresh=useCallback(async()=>{
    setLoading(true);setAnalyticsError("");setCommerceError("");
    const params=new URLSearchParams(range);
    const requests=await Promise.allSettled([
      fetch(`/api/analytics/summary?${params}`,{cache:"no-store"}),fetch("/api/shopify/orders",{cache:"no-store"}),fetch("/api/shopify/inventory?limit=50",{cache:"no-store"}),fetch("/api/shopify/promotions",{cache:"no-store"}),fetch(`/api/analytics/commerce?${params}`,{cache:"no-store"}),
    ]);
    const read=async(result:PromiseSettledResult<Response>)=>{if(result.status!=="fulfilled"||!result.value.ok)return null;return result.value.json()};
    const [analytics,orders,inventory,promotions,commerceData]=await Promise.all(requests.map(read));
    if(analytics)setSummary(analytics);else setAnalyticsError("Some live dashboard data is temporarily unavailable.");
    if(commerceData)setCommerce(commerceData);else setCommerceError("Shopify commerce charts are temporarily unavailable.");
    setOperations({orders:Array.isArray(orders?.orders)?orders.orders:[],inventory:Array.isArray(inventory?.inventory)?inventory.inventory:[],promotions:Array.isArray(promotions?.promotions)?promotions.promotions:[],pendingOrders:Number(orders?.counts?.pending||0)});
    setLoading(false);
  },[range]);
  useEffect(()=>{/* eslint-disable react-hooks/set-state-in-effect */void refresh();/* eslint-enable react-hooks/set-state-in-effect */},[refresh]);
  const unfulfilled=operations.orders.filter(order=>!order.cancelledAt&&order.fulfillmentStatus.toUpperCase()!=="FULFILLED").length;
  const outOfStock=operations.inventory.filter(item=>item.tracked&&item.quantity<=0).length;
  const lowStock=operations.inventory.filter(item=>item.tracked&&item.quantity>0&&item.quantity<=5).length;
  const activePromotions=operations.promotions.filter(item=>item.status==="ACTIVE").length;
  const revenue=operations.orders.reduce((sum,order)=>sum+Number(order.total?.amount||0),0);
  const currency=operations.orders.find(order=>order.total?.currencyCode)?.total?.currencyCode||"USD";
  const commerceCurrency=commerce?.currencyCode||currency;
  const selectedDays=Math.round((Date.parse(`${range.end}T00:00:00Z`)-Date.parse(`${range.start}T00:00:00Z`))/86400000)+1;
  const selectedPeriod=`${new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"}).format(new Date(`${range.start}T00:00:00Z`))} – ${new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"}).format(new Date(`${range.end}T00:00:00Z`))}`;
  const formatCommerceMoney=(amount:number)=>{try{return new Intl.NumberFormat(undefined,{style:"currency",currency:commerceCurrency,maximumFractionDigits:2}).format(amount)}catch{return `${amount.toFixed(2)} ${commerceCurrency}`}};
  const metrics:{value:number|string;label:string;note:string;icon:ReactNode;tone:string;action:string;onClick?:()=>void}[] = [
    {value:summary?.sessions ?? "—",label:"App sessions",note:`Selected ${selectedDays}-day period`,icon:"↗",tone:styles.dashboardIconBlue,action:"View analytics",onClick:can("analytics")?()=>setView("analytics"):undefined},
    {value:operations.orders.length||"—",label:"Recent orders",note:revenue?`${new Intl.NumberFormat(undefined,{style:"currency",currency}).format(revenue)} loaded value`:"Latest Shopify activity",icon:"▤",tone:styles.dashboardIconGreen,action:"View orders",onClick:can("orders")?()=>openOrders("all"):undefined},
    {value:operations.pendingOrders,label:"Pending orders",note:"All open Shopify orders",icon:"◷",tone:operations.pendingOrders?styles.dashboardIconAmber:styles.dashboardIconGreen,action:"Open queue",onClick:can("orders")?()=>openOrders("pending"):undefined},
    {value:summary?.notificationDevices ?? "—",label:"Push audience",note:"Registered devices",icon:<NotificationBellIcon/>,tone:styles.dashboardIconPurple,action:"Open marketing",onClick:can("marketing")?()=>setView("marketing"):undefined},
    {value:outOfStock,label:"Out of stock",note:`${lowStock} additional low-stock variants`,icon:"!",tone:outOfStock?styles.dashboardIconRed:styles.dashboardIconAmber,action:"View inventory",onClick:can("inventory")?()=>openTarget("inventory",{filter:"out"}):undefined},
  ];
  const engagementDays=summary?.days??[];
  const engagementPeak=engagementDays.length?Math.max(...engagementDays.map(day=>day.value)):0;
  const engagementAverage=engagementDays.length?engagementDays.reduce((sum,day)=>sum+day.value,0)/engagementDays.length:0;
  const actionItems=[
    {count:unfulfilled,title:"Orders need fulfillment",copy:"Open the unfulfilled Shopify order queue.",view:"orders" as View,tone:unfulfilled?styles.dashboardActionWarn:"",onClick:()=>openOrders("unfulfilled")},
    {count:outOfStock,title:"Variants are out of stock",copy:"Open inventory filtered to unavailable variants.",view:"inventory" as View,tone:outOfStock?styles.dashboardActionDanger:"",onClick:()=>openTarget("inventory",{filter:"out"})},
    {count:lowStock,title:"Low-stock variants",copy:"Review variants with five units or fewer.",view:"inventory" as View,tone:lowStock?styles.dashboardActionWarn:"",onClick:()=>openTarget("inventory",{filter:"low"})},
    {count:activePromotions,title:"Active promotions",copy:"Review offers currently available to customers.",view:"promotions" as View,tone:styles.dashboardActionBlue,onClick:()=>openTarget("promotions",{filter:"ACTIVE"})},
  ].filter(item=>can(item.view));
  return <div className={`${styles.content} ${styles.dashboardPage}`}>
    <section className={styles.dashboardWelcome}><div className={styles.dashboardWelcomeCopy}><div className={styles.dashboardWelcomeStatus}><span><i/> Live operations</span><b>{new Intl.DateTimeFormat(undefined,{weekday:"long",month:"long",day:"numeric"}).format(new Date())}</b></div><h2>Good to see you, {userName}.</h2><p>Your commerce, customer, and mobile-app performance in one workspace.</p><small>Reporting period · {selectedPeriod}</small></div><div className={styles.dashboardHeroActions}><AnalyticsDateRangePicker value={range} loading={loading} align="left" onApply={next=>setRange(next)}/><div className={styles.dashboardHeroButtons}><button className={styles.secondary} disabled={loading} onClick={()=>void refresh()}>{loading?"Refreshing…":"↻ Refresh data"}</button>{can("editor")&&<button className={styles.primary} onClick={()=>setView("editor")}>Open app editor</button>}</div></div></section>
    {analyticsError&&<div className={styles.dashboardNotice}><span>!</span>{analyticsError}</div>}
    <section className={styles.dashboardOverview}><header className={styles.dashboardSectionHeader}><div><p>BUSINESS OVERVIEW</p><h2>Key performance indicators</h2><span>Live operational data across the selected reporting period</span></div><i className={`${styles.tag} ${styles.tagBlue}`}>Click cards for details</i></header><div className={styles.dashboardMetricGrid}>{metrics.map(metric=>metric.onClick?<button type="button" className={`${styles.dashboardMetric} ${styles.dashboardMetricButton}`} key={metric.label} onClick={metric.onClick}><div className={styles.dashboardMetricTop}><span className={`${styles.dashboardMetricIcon} ${metric.tone}`}>{metric.icon}</span><i>{loading?"Updating":metric.action} <b>→</b></i></div><p>{metric.label}</p><strong>{metric.value}</strong><small>{metric.note}</small></button>:<article className={styles.dashboardMetric} key={metric.label}><div className={styles.dashboardMetricTop}><span className={`${styles.dashboardMetricIcon} ${metric.tone}`}>{metric.icon}</span><i>{loading?"Updating":"Live"}</i></div><p>{metric.label}</p><strong>{metric.value}</strong><small>{metric.note}</small></article>)}</div></section>
    <section className={styles.dashboardMainGrid}>
      <article className={`${styles.dashboardCard} ${styles.dashboardChartCard}`}><header className={styles.dashboardCardHeader}><div><span className={styles.dashboardCardEyebrow}>MOBILE APP</span><h3>App engagement</h3><p>Daily sessions across {selectedPeriod}</p></div>{can("analytics")&&<button onClick={()=>setView("analytics")}>Open full report →</button>}</header><div className={styles.dashboardChartSummary}><div><span>Total sessions</span><strong>{summary?.sessions?.toLocaleString()??"—"}</strong><small>Selected {selectedDays}-day period</small></div><div><span>Screen views</span><strong>{summary?.screenViews?.toLocaleString()??"—"}</strong><small>{summary?.sessions?`${(summary.screenViews/summary.sessions).toFixed(1)} per session`:"Engagement depth"}</small></div><div><span>Product views</span><strong>{summary?.productViews?.toLocaleString()??"—"}</strong><small>{summary?.screenViews?`${((summary.productViews/summary.screenViews)*100).toFixed(1)}% of screen views`:"Product discovery"}</small></div></div><div className={styles.dashboardChartMeta}><span><i/> Daily sessions</span><div><span>Average <b>{engagementAverage.toFixed(1)}</b></span><span>Peak <b>{engagementPeak.toLocaleString()}</b></span></div></div><DashboardEngagementChart data={engagementDays} loading={loading}/></article>
      <article className={`${styles.dashboardCard} ${styles.dashboardActions}`}><header className={styles.dashboardCardHeader}><div><h3>Action center</h3><p>Click an item to open its filtered workspace</p></div><span className={styles.dashboardBadge}>{actionItems.reduce((sum,item)=>sum+item.count,0)} items</span></header><div>{actionItems.map(item=><button type="button" key={item.title} className={`${styles.dashboardActionItem} ${item.tone}`} onClick={item.onClick}><span>{item.count}</span><div><strong>{item.title}</strong><small>{item.copy}</small></div><b>›</b></button>)}</div></article>
    </section>
    <section className={styles.dashboardCommerceSection}><header className={styles.dashboardSectionHeader}><div><p>SHOPIFY COMMERCE</p><h2>Store performance</h2><span>Non-cancelled order activity · {selectedPeriod}</span></div><i className={`${styles.tag} ${commerceError?styles.tagGray:styles.tagGreen}`}>{loading?"Loading":commerceError?"Unavailable":"Live Shopify data"}</i></header>{commerceError&&<div className={styles.dashboardNotice}><span>!</span>{commerceError}</div>}<div className={styles.dashboardCommerceGrid}>{commerce? <><DashboardCommerceChart title="Sales" copy={`Gross order value · ${commerceCurrency}`} value={formatCommerceMoney(commerce.totals.sales)} color="#397ab5" formatPoint={formatCommerceMoney} data={commerce.daily.map(day=>({date:day.date,label:day.label,value:day.sales}))} onClick={can("analytics")?()=>setView("analytics"):undefined}/><DashboardCommerceChart title="Revenue" copy={`Payments received minus refunds · ${commerceCurrency}`} value={formatCommerceMoney(commerce.totals.revenue)} color="#19805c" formatPoint={formatCommerceMoney} data={commerce.daily.map(day=>({date:day.date,label:day.label,value:day.revenue}))} onClick={can("analytics")?()=>setView("analytics"):undefined}/><DashboardCommerceChart title="Customers" copy="Unique purchasing customers" value={commerce.totals.customers.toLocaleString()} color="#7254a5" formatPoint={value=>`${value.toLocaleString()} customer${value===1?"":"s"}`} data={commerce.daily.map(day=>({date:day.date,label:day.label,value:day.customers}))} onClick={can("customers")?()=>setView("customers"):undefined}/><DashboardCommerceChart title="Orders" copy="Non-cancelled orders" value={commerce.totals.orders.toLocaleString()} color="#a86b13" formatPoint={value=>`${value.toLocaleString()} order${value===1?"":"s"}`} data={commerce.daily.map(day=>({date:day.date,label:day.label,value:day.orders}))} onClick={can("orders")?()=>openOrders("all"):undefined}/></>:Array.from({length:4},(_,index)=><article className={`${styles.dashboardCommerceCard} ${styles.dashboardCommerceSkeleton}`} key={index}/>)}</div>{commerce?.truncated&&<small className={styles.dashboardCommerceWarning}>The chart reached the safe Shopify pagination limit; totals may be incomplete for this period.</small>}</section>
    <section className={styles.dashboardQuickSection}><header className={styles.dashboardSectionHeader}><div><p>SHORTCUTS</p><h2>Quick actions</h2><span>Jump directly into your most-used admin workflows</span></div></header><div className={styles.dashboardQuickGrid}>{[
      ["✦","Customize app","Edit homepage sections and content","editor"],["◈","Create campaign","Send a push notification","marketing"],["▦","Update inventory","Manage stock and variants","inventory"],["%","Manage offers","Review active promotions","promotions"],
    ].filter(([, , ,target])=>can(target as View)).map(([icon,title,copy,target])=><button className={styles.dashboardQuickAction} key={title} onClick={()=>setView(target as View)}><span>{icon}</span><div><strong>{title}</strong><small>{copy}</small></div><b>→</b></button>)}</div></section>
    <section className={styles.dashboardLowerGrid}>
      <article className={styles.dashboardCard}><header className={styles.dashboardCardHeader}><div><h3>Recent orders</h3><p>Select an order to open its record</p></div><button onClick={()=>openOrders("all")}>View all orders →</button></header><div className={styles.dashboardOrderList}>{operations.orders.length?operations.orders.slice(0,5).map(order=><button type="button" key={order.id} className={styles.dashboardOrderRow} onClick={()=>openTarget("orders",{query:order.name,filter:"all"})}><span className={styles.dashboardOrderIcon}>▤</span><div><strong>{order.name}</strong><small>{order.customer} · {new Date(order.createdAt).toLocaleDateString()}</small></div><div className={styles.dashboardOrderMeta}><strong>{order.total?new Intl.NumberFormat(undefined,{style:"currency",currency:order.total.currencyCode}).format(Number(order.total.amount)):"—"}</strong><small>{order.fulfillmentStatus.toLowerCase().replaceAll("_"," ")} · Open →</small></div></button>):<div className={styles.dashboardEmpty}>{loading?"Loading Shopify orders…":"No orders were returned"}</div>}</div></article>
      <article className={`${styles.dashboardCard} ${styles.dashboardHealth}`}><header className={styles.dashboardCardHeader}><div><h3>Store health</h3><p>Live service and publishing status</p></div></header><div className={styles.dashboardHealthList}><div><span className={styles.dashboardHealthOk}/><div><strong>Shopify connection</strong><small>{operations.orders.length||operations.inventory.length?"Live commerce data connected":"Waiting for commerce data"}</small></div><b>{operations.orders.length||operations.inventory.length?"Connected":"Check"}</b></div><div><span className={styles.dashboardHealthOk}/><div><strong>Mobile content</strong><small>Latest app homepage publication</small></div><b>{publishedAt}</b></div><div><span className={summary?.notificationDevices?styles.dashboardHealthOk:styles.dashboardHealthWarn}/><div><strong>Push delivery</strong><small>{summary?.notificationDevices?`${summary.notificationDevices} registered devices`:"Expo Go local delivery mode"}</small></div><b>{summary?.notificationDevices?"Ready":"Development"}</b></div><div><span className={styles.dashboardHealthOk}/><div><strong>Analytics recording</strong><small>Mobile engagement events</small></div><b>{summary?"Active":"Loading"}</b></div></div></article>
    </section>
    <section className={`${styles.dashboardCard} ${styles.dashboardJourney}`}><header className={styles.dashboardCardHeader}><div><h3>Customer journey</h3><p>Measured mobile events from discovery through checkout</p></div></header><div className={styles.funnel}>{[[summary?.sessions??0,"Sessions"],[summary?.productViews??0,"Product views"],[summary?.cartViews??0,"Cart views"],[summary?.purchases??"—","Purchases"]].map(([value,label],index)=><div key={String(label)}><strong>{value}</strong><span>{label}</span>{index<3&&<b>→</b>}</div>)}</div></section>
  </div>;
}

function Editor({ sections, selected, selectedId, setSelectedId, update, move, remove, duplicate, setSectionVisibility, add,shopifyVisibility,setShopifyVisibility,shopifyStyles,setShopifyStyles,markUnsaved,onOpenAssets }: { sections: Section[]; selected?: Section; selectedId: string; setSelectedId: (id:string)=>void; update:(p:Partial<Section>)=>void; move:(i:number,d:-1|1)=>void; remove:(id:string)=>void; duplicate:(id:string)=>void; setSectionVisibility:(id:string,enabled:boolean)=>void; add:(t:SectionType,p?:Placement)=>void;shopifyVisibility:Record<string,boolean>;setShopifyVisibility:(value:Record<string,boolean>)=>void;shopifyStyles:Record<string,string>;setShopifyStyles:(value:Record<string,string>)=>void;markUnsaved:()=>void;onOpenAssets:()=>void }) {
  const [showAdd,setShowAdd]=useState(false);
  const [search,setSearch]=useState("");
  const [device,setDevice]=useState<"mobile"|"tablet">("mobile");
  const [inspectorTab,setInspectorTab]=useState<"content"|"design">("content");
  const [themeDirectory,setThemeDirectory]=useState<ShopifyThemeDirectoryItem[]>([]);const [themeLoading,setThemeLoading]=useState(true);const [themeMessage,setThemeMessage]=useState("");
  const [editingShopifyCss,setEditingShopifyCss]=useState("");
  const [imageUploading,setImageUploading]=useState(false);
  const [imageUploadMessage,setImageUploadMessage]=useState("");
  const loadThemeSections=useCallback(async()=>{setThemeLoading(true);setThemeMessage("");try{const response=await fetch("/api/shopify/theme-sections",{cache:"no-store"});const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to inspect Shopify theme.");setThemeDirectory(data.sections||[])}catch(error){setThemeMessage(error instanceof Error?error.message:"Unable to inspect Shopify theme.")}finally{setThemeLoading(false)}},[]);
  useEffect(()=>{/* eslint-disable react-hooks/set-state-in-effect */void loadThemeSections();/* eslint-enable react-hooks/set-state-in-effect */},[loadThemeSections]);
  const sectionDescriptions:Record<SectionType,string>={hero:"Large campaign image and call to action",text:"Flexible editorial copy and button",products:"Curated product collection",announcement:"Compact store-wide message",image:"Full-width editorial image and CTA",categories:"Tappable category tiles",features:"Store benefits in a clean list",testimonials:"Customer quotes and social proof",newsletter:"Email signup call to action",divider:"Add controlled space between sections"};
  const sectionIcons:Record<SectionType,string>={hero:"▣",text:"¶",products:"▦",announcement:"◇",image:"▧",categories:"▦",features:"✓",testimonials:"❝",newsletter:"✉",divider:"—"};
  const visibleSections=sections.filter(section=>`${section.title} ${sectionNames[section.type]}`.toLowerCase().includes(search.trim().toLowerCase()));
  const previewDirectory=(themeDirectory.length?themeDirectory:shopifySections.map((item,index)=>({key:item.key,shopifyId:"",title:item.name,kind:"Known Shopify section",position:index,automatic:false,preview:{heading:item.name,copy:"Published Shopify content",images:[],items:[]}}))).filter(item=>shopifyVisibility[item.key]!==false);
  const visibleCustom=sections.filter(section=>section.enabled);
  const renderedCustom=new Set<string>();
  const previewNodes:ReactNode[]=[];
  const addCustomAt=(placement:Placement)=>visibleCustom.filter(section=>(section.placement??"before-hero")===placement).forEach(section=>{renderedCustom.add(section.id);previewNodes.push(<PreviewSection key={`custom-${section.id}`} section={section} selected={section.id===selectedId} onClick={()=>setSelectedId(section.id)}/>)});
  addCustomAt("before-hero");
  previewDirectory.forEach(item=>{previewNodes.push(<ShopifyPreviewSection key={`shopify-${item.key}`} item={item} customCss={shopifyStyles[item.key]||""}/>);const known=shopifySections.find(section=>section.key===item.key);if(known)addCustomAt(known.after)});
  visibleCustom.filter(section=>!renderedCustom.has(section.id)).forEach(section=>previewNodes.push(<PreviewSection key={`custom-tail-${section.id}`} section={section} selected={section.id===selectedId} onClick={()=>setSelectedId(section.id)}/>));
  const selectedIndex=selected?sections.findIndex(section=>section.id===selected.id):-1;
  const deleteSelected=()=>{if(selected&&window.confirm(`Delete “${selected.title||sectionNames[selected.type]}”?`))remove(selected.id)};
  const uploadSectionImage=async(file?:File)=>{if(!file)return;setImageUploadMessage("");if(file.size>8*1024*1024){setImageUploadMessage("Choose an image smaller than 8 MB.");return}setImageUploading(true);try{const form=new FormData();form.append("image",file);const response=await fetch("/api/uploads",{method:"POST",body:form,credentials:"same-origin"});const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to upload image.");update({image:data.url});setImageUploadMessage("Image uploaded and added to this section.")}catch(error){setImageUploadMessage(error instanceof Error?error.message:"Unable to upload image.")}finally{setImageUploading(false)}};
  return <div className={styles.editor}>
    <section className={styles.sectionPanel}>
      <div className={`${styles.panelTitle} ${styles.panelTitlePro}`}><div><h2>Homepage</h2><p>{sections.length} custom sections · {sections.filter(item=>item.enabled).length} visible</p></div><button className={styles.addButton} type="button" aria-label="Add section" onClick={()=>setShowAdd(value=>!value)}>{showAdd?"×":"＋"}</button></div>
      {showAdd&&<div className={styles.editorAddMenu}><div><strong>Add section</strong><small>Choose a block for your homepage</small></div>{(Object.keys(sectionNames) as SectionType[]).map(type=><button key={type} type="button" onClick={()=>{add(type);setShowAdd(false)}}><span>{sectionIcons[type]}</span><div><strong>{sectionNames[type]}</strong><small>{sectionDescriptions[type]}</small></div><b>＋</b></button>)}</div>}
      <div className={styles.editorSearch}><span>⌕</span><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search sections"/>{search&&<button type="button" onClick={()=>setSearch("")}>×</button>}</div>
      <div className={styles.sectionList}>{visibleSections.length?visibleSections.map(section=><div key={section.id} className={`${styles.sectionRow} ${selectedId===section.id?styles.sectionSelected:""} ${!section.enabled?styles.sectionHidden:""}`} onClick={()=>{setSelectedId(section.id);setInspectorTab("content")}}><span className={styles.sectionTypeIcon}>{sectionIcons[section.type]}</span><div><strong>{section.title||sectionNames[section.type]}</strong><small>{sectionNames[section.type]} · {section.enabled?"Visible":"Hidden"}</small></div><span className={styles.sectionChevron}>›</span></div>):<div className={styles.editorEmptyState}><span>⌕</span><strong>No sections found</strong><small>Try a different search.</small></div>}</div>
      <details className={styles.shopifyMap} open><summary>Shopify sections <span>{themeLoading?"syncing":`${themeDirectory.length||shopifySections.length} detected`}</span></summary><div className={styles.shopifySyncHead}><small>{themeMessage||"Published Shopify sections appear automatically. Turn off App visibility to keep a section website-only."}</small><button type="button" onClick={()=>void loadThemeSections()}>↻</button></div><button className={styles.insertSlot} onClick={()=>add("text","before-hero")}>＋ Insert before Shopify hero</button>{(themeDirectory.length?themeDirectory:shopifySections.map((item,index)=>({key:item.key,shopifyId:"",title:item.name,kind:"Known Shopify section",position:index,automatic:false}))).map((item,index)=>{const known=shopifySections.find(section=>section.key===item.key);const visible=shopifyVisibility[item.key]!==false;const editing=editingShopifyCss===item.key;return <section key={item.key}><div className={`${styles.shopifyRow} ${!visible?styles.shopifyRowHidden:""}`}><span>{index+1}</span><div><strong>{item.title}</strong><small>{item.kind} · {visible?"Visible in app":"Shopify website only"}</small></div><button className={styles.shopifyCssToggle} type="button" onClick={()=>setEditingShopifyCss(editing?"":item.key)}>{editing?"Close":"{ } CSS"}</button><label className={styles.switch} title="App visibility"><input type="checkbox" checked={visible} onChange={event=>{setShopifyVisibility({...shopifyVisibility,[item.key]:event.target.checked});markUnsaved()}}/><span/></label></div>{editing&&<div className={styles.shopifyCssEditor}><label>App-only CSS<textarea rows={8} maxLength={4000} spellCheck={false} value={shopifyStyles[item.key]??""} onChange={event=>{setShopifyStyles({...shopifyStyles,[item.key]:event.target.value});markUnsaved()}} placeholder={".section {\n  margin: 0;\n  padding: 0;\n}\n.image {\n  object-fit: cover;\n  border-radius: 0;\n}"}/></label><small>Supported: margin, padding, height, aspect-ratio, object-fit, border-radius, background color, text color, and text-align. Publish changes to update the app.</small><button type="button" onClick={()=>{setShopifyStyles({...shopifyStyles,[item.key]:".section {\n  margin: 0;\n  padding: 0;\n}\n.image {\n  object-fit: cover;\n  border-radius: 0;\n}"});markUnsaved()}}>Use full-width preset</button></div>}{known&&<button className={styles.insertSlot} onClick={()=>add("text",known.after)}>＋ Insert after {item.title}</button>}</section>})}</details>
    </section>
    <section className={`${styles.previewPanel} ${styles.previewWorkspace}`}>
      <div className={`${styles.previewToolbar} ${styles.previewToolbarPro}`}><div className={styles.previewTitle}><span>Preview</span><small>Shopify + app · live draft</small></div><div className={styles.deviceSwitcher}><button type="button" className={device==="mobile"?styles.deviceActive:""} onClick={()=>setDevice("mobile")}>▯ <span>Mobile</span></button><button type="button" className={device==="tablet"?styles.deviceActive:""} onClick={()=>setDevice("tablet")}>▭ <span>Tablet</span></button></div><div className={styles.previewCount}><b>{previewDirectory.length+visibleCustom.length}</b> visible</div></div>
      <div className={`${styles.deviceStage} ${device==="tablet"?styles.deviceStageTablet:""}`}><div className={styles.phone}><div className={styles.phoneTop}><b>9:41</b><span>● ◒ ▰</span></div><div className={styles.appHeader}><span>☰</span><strong>Carter&apos;s</strong><span>⌕　♧</span></div><div className={styles.phoneBody}>{previewNodes.length?previewNodes:<div className={styles.previewEmpty}><span>＋</span><strong>Your homepage is empty</strong><small>Enable an app or Shopify section to preview it.</small></div>}</div><div className={styles.appTabs}><span>⌂<small>Home</small></span><span>⌕<small>Search</small></span><span>♡<small>Wishlist</small></span><span>♙<small>Account</small></span></div></div></div>
    </section>
    <section className={styles.settingsPanel}>{selected?<>
      <div className={`${styles.panelTitle} ${styles.panelTitlePro}`}><div><h2>{selected.title||sectionNames[selected.type]}</h2><p>{sectionNames[selected.type]}</p></div><label className={styles.switch} title={selected.enabled?"Visible":"Hidden"}><input type="checkbox" checked={selected.enabled} onChange={event=>update({enabled:event.target.checked})}/><span/></label></div>
      <div className={styles.inspectorSectionActions}><button type="button" onClick={()=>setSectionVisibility(selected.id,!selected.enabled)}>{selected.enabled?"○ Hide":"◉ Show"}</button><button type="button" onClick={()=>duplicate(selected.id)}>⧉ Duplicate</button><button type="button" disabled={selectedIndex<=0} onClick={()=>move(selectedIndex,-1)}>↑ Up</button><button type="button" disabled={selectedIndex<0||selectedIndex>=sections.length-1} onClick={()=>move(selectedIndex,1)}>↓ Down</button></div>
      <div className={styles.inspectorTabs}><button type="button" className={inspectorTab==="content"?styles.inspectorTabActive:""} onClick={()=>setInspectorTab("content")}>Content</button><button type="button" className={inspectorTab==="design"?styles.inspectorTabActive:""} onClick={()=>setInspectorTab("design")}>Design</button></div>
      <div className={styles.editorForm}>{inspectorTab==="content"?<>
        <label>Title<input maxLength={80} value={selected.title} onChange={event=>update({title:event.target.value})}/><small>{selected.title.length}/80</small></label>
        {selected.type!=="divider"&&<label>Description<textarea rows={5} maxLength={220} value={selected.subtitle} onChange={event=>update({subtitle:event.target.value})}/><small>{selected.subtitle.length}/220</small></label>}
        {(["categories","features","testimonials"] as SectionType[]).includes(selected.type)&&<label>Items <small>One item per line</small><textarea rows={7} maxLength={1000} value={(selected.items??[]).join("\n")} onChange={event=>update({items:event.target.value.split("\n").map(item=>item.trim()).filter(Boolean).slice(0,8)})}/><small>{selected.items?.length??0}/8 items</small></label>}
        {!(["announcement","categories","features","testimonials","divider"] as SectionType[]).includes(selected.type)&&<label>Button label<input maxLength={32} value={selected.buttonLabel} onChange={event=>update({buttonLabel:event.target.value})}/><small>{selected.buttonLabel.length}/32</small></label>}
      </>:<>
        <label>Position<select className={styles.selectField} value={selected.placement??"before-hero"} onChange={event=>update({placement:event.target.value as Placement})}>{placements.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        {(["hero","image"] as SectionType[]).includes(selected.type)&&<>
          <div className={styles.imageUploadControl}><div><strong>Section image</strong><small>Upload a new file or reuse one from Assets.</small></div><div className={styles.imageUploadActions}><button type="button" onClick={onOpenAssets}>▧ Browse assets</button><label className={styles.imageUploadButton}><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={imageUploading} onChange={event=>{void uploadSectionImage(event.target.files?.[0]);event.target.value=""}}/><span>{imageUploading?"Uploading…":"↑ Upload new"}</span></label></div></div>
          {imageUploadMessage&&<p className={imageUploadMessage.startsWith("Image uploaded")?styles.imageUploadSuccess:styles.imageUploadError}>{imageUploadMessage}</p>}
          <label>Or paste an image URL<input value={selected.image} placeholder="https://..." onChange={event=>{update({image:event.target.value});setImageUploadMessage("")}}/>{selected.image&&<span className={styles.imagePreview} style={{backgroundImage:`url(${selected.image})`}}/>}</label>
        </>}
        <label>Background color<div className={styles.colorField}><input type="color" value={selected.background} onChange={event=>update({background:event.target.value})}/><input value={selected.background} onChange={event=>update({background:event.target.value})}/></div></label>
        <label className={styles.customCssField}>Custom CSS<textarea rows={14} maxLength={4000} spellCheck={false} value={selected.customCss??""} onChange={event=>update({customCss:event.target.value})} placeholder={customCssExample}/><small>{(selected.customCss??"").length}/4000</small></label>
        <div className={styles.customCssHelp}><strong>Supported selectors</strong><code>.section</code><code>.title</code><code>.description</code><code>.button</code><p>Use standard declarations such as color, font-size, padding, border-radius, text-align, and background-color. Styles are scoped to this section and translated for the mobile app.</p><button type="button" onClick={()=>update({customCss:customCssExample})}>Insert example</button></div>
      </>}<div className={styles.inspectorDelete}><button className={styles.delete} type="button" onClick={deleteSelected}>Delete section</button></div></div>
    </>:<div className={styles.editorEmptyState}><span>✦</span><strong>Select a section</strong><small>Choose a block from the list or preview to edit it.</small></div>}</section>
  </div>;
}

function ShopifyPreviewSection({item,customCss}:{item:ShopifyThemeDirectoryItem;customCss:string}){
  const custom=parsePreviewCustomCss(customCss);const content=item.preview;const heading=content?.heading||item.title;const copy=content?.copy||item.kind;const images=content?.images||[];const supplied=content?.items||[];const fallback=["New arrivals","Family favorites","Everyday essentials","Seasonal picks"].map((title,index)=>({title,subtitle:"Shop now",image:images[index]||""}));const items=(supplied.length?supplied:fallback).slice(0,4);
  if(item.key==="hero")return <section className={styles.shopifyPreviewHero} style={{backgroundImage:images[0]?`linear-gradient(90deg,rgba(6,30,48,.52),rgba(6,30,48,.06)),url(${images[0]})`:undefined,...custom.section}}><span>LIVE SHOPIFY</span><h3 style={custom.title}>{heading}</h3><p style={custom.description}>{copy}</p><button style={custom.button}>Shop now</button></section>;
  if(item.key==="promos")return <section className={styles.shopifyPreviewPromos} style={custom.section}>{items.slice(0,3).map((entry,index)=><div key={`${entry.title}-${index}`}><i>{["✓","♢","↻"][index]}</i><span><b>{entry.title}</b><small>{entry.subtitle||"Shopify offer"}</small></span></div>)}</section>;
  if(["top-picks","latest-collection"].includes(item.key))return <section className={styles.shopifyPreviewProducts} style={custom.section}><header><div><small>SHOPIFY COLLECTION</small><h3 style={custom.title}>{heading}</h3></div><b>View all</b></header><p style={custom.description}>{copy}</p><div>{items.slice(0,3).map((entry,index)=><article key={`${entry.title}-${index}`}>{entry.image?<img src={entry.image} alt=""/>:<i/>}<strong>{entry.title}</strong><small>{entry.subtitle||"Live product"}</small></article>)}</div></section>;
  if(["age-groups","shop-categories","explore-styles","tiny-essentials","our-brands"].includes(item.key))return <section className={styles.shopifyPreviewGrid} style={custom.section}><small>SHOPIFY SECTION</small><h3 style={custom.title}>{heading}</h3><p style={custom.description}>{copy}</p><div>{items.map((entry,index)=><article key={`${entry.title}-${index}`}>{entry.image?<img src={entry.image} alt=""/>:<i>{["♡","★","☀","✦"][index%4]}</i>}<strong>{entry.title}</strong><small>{entry.subtitle}</small></article>)}</div></section>;
  return <section className={images[0]?styles.shopifyPreviewImage:styles.shopifyPreviewText} style={{backgroundImage:images[0]?`linear-gradient(0deg,rgba(10,37,56,.55),rgba(10,37,56,.04)),url(${images[0]})`:undefined,...custom.section}}><small>SHOPIFY THEME</small><h3 style={custom.title}>{heading}</h3><p style={custom.description}>{copy}</p></section>;
}

function PreviewSection({section,selected,onClick}:{section:Section;selected:boolean;onClick:()=>void}) {
  const custom=parsePreviewCustomCss(section.customCss);
  if(section.type==="hero") return <section onClick={onClick} className={`${styles.previewHero} ${selected?styles.previewSelected:""}`} style={{backgroundColor:section.background,backgroundImage:section.image?`linear-gradient(90deg,rgba(0,0,0,.36),rgba(0,0,0,.02)),url(${section.image})`:undefined,...custom.section}}><h3 style={custom.title}>{section.title}</h3><p style={custom.description}>{section.subtitle}</p><button style={custom.button}>{section.buttonLabel}</button></section>;
  if(section.type==="announcement") return <section onClick={onClick} className={`${styles.previewNotice} ${selected?styles.previewSelected:""}`} style={{background:section.background,...custom.section}}><span style={custom.title}>{section.title}</span></section>;
  if(section.type==="products") return <section onClick={onClick} className={`${styles.previewProducts} ${selected?styles.previewSelected:""}`} style={custom.section}><h3 style={custom.title}>{section.title}</h3><p style={custom.description}>{section.subtitle}</p><div>{["#f5ddd2","#dce8ef","#efe4d4"].map((c,i)=><span key={c} style={{background:c}}><i>Product {i+1}</i><b>${18+i*7}.00</b></span>)}</div></section>;
  if(section.type==="image") return <section onClick={onClick} className={`${styles.previewImageBanner} ${selected?styles.previewSelected:""}`} style={{backgroundColor:section.background,backgroundImage:section.image?`linear-gradient(0deg,rgba(8,35,55,.55),rgba(8,35,55,.04)),url(${section.image})`:undefined,...custom.section}}><div><h3 style={custom.title}>{section.title}</h3><p style={custom.description}>{section.subtitle}</p>{section.buttonLabel&&<button style={custom.button}>{section.buttonLabel}</button>}</div></section>;
  if(section.type==="categories") return <section onClick={onClick} className={`${styles.previewCategorySection} ${selected?styles.previewSelected:""}`} style={{background:section.background,...custom.section}}><h3 style={custom.title}>{section.title}</h3><p style={custom.description}>{section.subtitle}</p><div>{(section.items??[]).map((item,index)=><span key={`${item}-${index}`}><i>{["♡","★","☀","✦"][index%4]}</i><b>{item}</b></span>)}</div></section>;
  if(section.type==="features") return <section onClick={onClick} className={`${styles.previewFeatureSection} ${selected?styles.previewSelected:""}`} style={{background:section.background,...custom.section}}><h3 style={custom.title}>{section.title}</h3><p style={custom.description}>{section.subtitle}</p><div>{(section.items??[]).map((item,index)=><span key={`${item}-${index}`}><i>✓</i><b>{item}</b></span>)}</div></section>;
  if(section.type==="testimonials") return <section onClick={onClick} className={`${styles.previewTestimonialSection} ${selected?styles.previewSelected:""}`} style={{background:section.background,...custom.section}}><h3 style={custom.title}>{section.title}</h3><p style={custom.description}>{section.subtitle}</p><div>{(section.items??[]).slice(0,2).map((item,index)=><blockquote key={`${item}-${index}`}>“{item}”<small>★★★★★</small></blockquote>)}</div></section>;
  if(section.type==="newsletter") return <section onClick={onClick} className={`${styles.previewNewsletter} ${selected?styles.previewSelected:""}`} style={{background:section.background,...custom.section}}><span>✉</span><h3 style={custom.title}>{section.title}</h3><p style={custom.description}>{section.subtitle}</p><button style={custom.button}>{section.buttonLabel}</button></section>;
  if(section.type==="divider") return <section onClick={onClick} aria-label="Spacer and divider" className={`${styles.previewDivider} ${selected?styles.previewSelected:""}`} style={custom.section}><span style={{background:section.background}}/></section>;
  return <section onClick={onClick} className={`${styles.previewText} ${selected?styles.previewSelected:""}`} style={{background:section.background,...custom.section}}><h3 style={custom.title}>{section.title}</h3><p style={custom.description}>{section.subtitle}</p><button style={custom.button}>{section.buttonLabel}</button></section>;
}

function Assets({onUse,draftImages}:{onUse:(url:string)=>void;draftImages:Set<string>}){
  const [assets,setAssets]=useState<MediaAsset[]>([]);const [loading,setLoading]=useState(true);const [uploading,setUploading]=useState(false);const [message,setMessage]=useState("");const [search,setSearch]=useState("");const [copied,setCopied]=useState("");
  const loadAssets=useCallback(async()=>{setLoading(true);setMessage("");try{const response=await fetch("/api/uploads",{cache:"no-store",credentials:"same-origin"});const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to load assets.");setAssets(Array.isArray(data.assets)?data.assets:[])}catch(error){setMessage(error instanceof Error?error.message:"Unable to load assets.")}finally{setLoading(false)}},[]);
  useEffect(()=>{/* eslint-disable react-hooks/set-state-in-effect */void loadAssets();/* eslint-enable react-hooks/set-state-in-effect */},[loadAssets]);
  const upload=async(file?:File)=>{if(!file)return;setMessage("");if(file.size>8*1024*1024){setMessage("Choose an image smaller than 8 MB.");return}setUploading(true);try{const form=new FormData();form.append("image",file);const response=await fetch("/api/uploads",{method:"POST",body:form,credentials:"same-origin"});const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to upload image.");setMessage("Image uploaded to your asset library.");await loadAssets()}catch(error){setMessage(error instanceof Error?error.message:"Unable to upload image.")}finally{setUploading(false)}};
  const removeAsset=async(asset:MediaAsset)=>{if(asset.inUse||draftImages.has(asset.url)){setMessage("This image is used in app content. Replace it before deleting.");return}if(!window.confirm(`Delete “${asset.name}” from Assets?`))return;setMessage("");try{const response=await fetch(`/api/uploads/${asset.fileName}`,{method:"DELETE",credentials:"same-origin"});const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to delete asset.");setAssets(items=>items.filter(item=>item.fileName!==asset.fileName));setMessage("Asset deleted.")}catch(error){setMessage(error instanceof Error?error.message:"Unable to delete asset.")}};
  const copyUrl=async(asset:MediaAsset)=>{try{await navigator.clipboard.writeText(new URL(asset.url,window.location.origin).toString());setCopied(asset.fileName);window.setTimeout(()=>setCopied(""),1800)}catch{setMessage("Unable to copy the image URL in this browser.")}};
  const filtered=assets.filter(asset=>`${asset.name} ${asset.fileName}`.toLowerCase().includes(search.trim().toLowerCase()));
  const totalBytes=assets.reduce((sum,asset)=>sum+asset.size,0);const formatSize=(bytes:number)=>bytes>=1024*1024?`${(bytes/1024/1024).toFixed(1)} MB`:`${Math.max(1,Math.round(bytes/1024))} KB`;
  return <div className={`${styles.content} ${styles.assetsPage}`}>
    <section className={styles.assetsHero}><div><p>MEDIA LIBRARY</p><h2>Your reusable storefront assets</h2><span>Upload once, then use the same image across banners and campaigns whenever you need it.</span></div><div className={styles.assetsHeroActions}><button className={styles.secondary} disabled={loading} onClick={()=>void loadAssets()}>↻ Refresh</button><label className={styles.assetsUploadButton}><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploading} onChange={event=>{void upload(event.target.files?.[0]);event.target.value=""}}/><span>{uploading?"Uploading…":"↑ Upload image"}</span></label></div></section>
    {message&&<div className={styles.assetsNotice}><span>i</span>{message}<button onClick={()=>setMessage("")}>×</button></div>}
    <section className={styles.assetsMetrics}>{[["▧",assets.length,"Images"],["◫",formatSize(totalBytes),"Storage used"],["✓",assets.filter(asset=>asset.inUse||draftImages.has(asset.url)).length,"Used in content"]].map(([icon,value,label])=><article key={String(label)}><span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></article>)}</section>
    <section className={styles.assetsWorkspace}><header><div><h3>All assets</h3><p>{filtered.length} of {assets.length} images</p></div><label className={styles.assetsSearch}><span>⌕</span><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search assets"/>{search&&<button onClick={()=>setSearch("")}>×</button>}</label></header>
      <div className={styles.assetGrid}>{filtered.length?filtered.map(asset=>{const used=asset.inUse||draftImages.has(asset.url);return <article key={asset.fileName}><div className={styles.assetPreview}><img src={asset.url} alt={asset.name}/>{used&&<span>Used in app</span>}</div><div className={styles.assetInfo}><strong title={asset.name}>{asset.name}</strong><small>{formatSize(asset.size)} · {new Date(asset.createdAt).toLocaleDateString()}</small></div><div className={styles.assetActions}><button className={styles.assetUse} onClick={()=>onUse(asset.url)}>Use in editor</button><button onClick={()=>void copyUrl(asset)}>{copied===asset.fileName?"Copied ✓":"Copy URL"}</button><button className={styles.assetDelete} disabled={used} title={used?"Replace this image in app content before deleting it.":"Delete asset"} onClick={()=>void removeAsset(asset)}>Delete</button></div></article>}):<div className={styles.assetsEmpty}><span>{loading?"◌":"▧"}</span><strong>{loading?"Loading assets…":search?"No matching assets":"Your asset library is empty"}</strong><small>{loading?"Reading saved uploads.":search?"Try a different search.":"Upload an image to reuse it throughout the app."}</small></div>}</div>
    </section>
  </div>;
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

function Inventory({initialSearch="",initialStockFilter="all"}:{initialSearch?:string;initialStockFilter?:string}){
  const [items,setItems]=useState<InventoryItem[]>([]);
  const [locations,setLocations]=useState<InventoryLocation[]>([]);
  const [locationId,setLocationId]=useState("");
  const [search,setSearch]=useState(initialSearch);
  const [stockFilter,setStockFilter]=useState(initialStockFilter);
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
  const [quickStock,setQuickStock]=useState<Record<string,string>>({});
  const [quickSaving,setQuickSaving]=useState<string|null>(null);
  const [pageInfo,setPageInfo]=useState<{hasNextPage:boolean;endCursor:string|null}>({hasNextPage:false,endCursor:null});
  const load=async(term:string,after:string|null,limit=50)=>{setLoading(true);setMessage("");try{const params=new URLSearchParams();params.set("limit",String(limit));if(term.trim())params.set("search",term.trim());if(after)params.set("after",after);const response=await fetch(`/api/shopify/inventory?${params}`,{cache:"no-store"});const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to load inventory.");const next=Array.isArray(data.inventory)?data.inventory:[];setItems(current=>after?[...current,...next]:next);const nextLocations=Array.isArray(data.locations)?data.locations:[];setLocations(nextLocations);setLocationId(current=>current||nextLocations[0]?.id||"");setPageInfo(data.pageInfo||{hasNextPage:false,endCursor:null});if(!next.length)setMessage(term?"No inventory matches this search.":"No Shopify inventory was returned.")}catch(error){setMessage(error instanceof Error?error.message:"Unable to load inventory.");if(!after)setItems([])}finally{setLoading(false)}};
  useEffect(()=>{/* eslint-disable react-hooks/set-state-in-effect */void load(initialSearch,null);/* eslint-enable react-hooks/set-state-in-effect */},[initialSearch]);
  const quantityAt=(item:InventoryItem)=>locationId?(item.levels.find(level=>level.locationId===locationId)?.quantity??0):item.quantity;
  const filtered=items.filter(item=>{
    const quantity=quantityAt(item);
    const stockMatches=stockFilter==="all"||(stockFilter==="in"&&item.tracked&&quantity>0)||(stockFilter==="low"&&item.tracked&&quantity>0&&quantity<=5)||(stockFilter==="out"&&item.tracked&&quantity<=0)||(stockFilter==="untracked"&&!item.tracked);
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
  const addQuickStock=async(item:InventoryItem)=>{
    const amount=Math.floor(Number(quickStock[item.id]||0));
    if(!locationId){setMessage("Choose an inventory location first.");return}
    if(!item.tracked||!item.inventoryItemId){setMessage(`${item.product} does not have inventory tracking enabled.`);return}
    if(!Number.isFinite(amount)||amount<0){setMessage("Enter zero to mark out of stock, or a positive quantity to add.");return}
    const level=item.levels.find(entry=>entry.locationId===locationId);
    if(amount===0&&(!level||level.quantity<=0)){setQuickStock(current=>({...current,[item.id]:""}));setMessage(`${item.product} is already out of stock at this location.`);return}
    const change=amount===0?{inventoryItemId:item.inventoryItemId,locationId,delta:-(level?.quantity||0)}:level?{inventoryItemId:item.inventoryItemId,locationId,delta:amount}:{inventoryItemId:item.inventoryItemId,locationId,activateQuantity:amount};
    setQuickSaving(item.id);setMessage(amount===0?`Setting ${item.product} out of stock...`:`Adding ${amount} unit${amount===1?"":"s"} to ${item.product}...`);
    try{
      const response=await fetch("/api/shopify/inventory",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({changes:[change]})});
      const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to add stock.");
      const locationName=locations.find(location=>location.id===locationId)?.name||"Selected location";const updatedAt=new Date().toISOString();
      setItems(current=>current.map(entry=>{if(entry.id!==item.id)return entry;const hasLevel=entry.levels.some(stock=>stock.locationId===locationId);const previousAtLocation=entry.levels.find(stock=>stock.locationId===locationId)?.quantity||0;const quantityChange=amount===0?-previousAtLocation:amount;const levels=hasLevel?entry.levels.map(stock=>stock.locationId===locationId?{...stock,quantity:amount===0?0:stock.quantity+amount}:stock):[...entry.levels,{locationId,locationName,quantity:amount}];const quantity=Math.max(0,entry.quantity+quantityChange);return{...entry,quantity,levels,availableForSale:quantity>0,updatedAt}}));
      setQuickStock(current=>({...current,[item.id]:""}));setMessage(amount===0?`${item.product} is now out of stock at the selected location.`:`Added ${amount} unit${amount===1?"":"s"} to ${item.product}.`);
    }catch(error){setMessage(error instanceof Error?error.message:"Unable to add stock.")}finally{setQuickSaving(null)}
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
      <label>Location<select value={locationId} onChange={event=>{setLocationId(event.target.value);setSelected([]);setQuickStock({})}}>{locations.map(location=><option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
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
      <div className={styles.cardHead}><div><h2>Stock directory</h2><p>{message||"Select variants to change quantities in bulk. Setting zero removes available stock, not the product."}</p></div><div className={styles.inventoryDirectoryStatus}><label className={styles.inventoryMobileSelect}><input type="checkbox" aria-label="Select visible inventory" checked={Boolean(filtered.length)&&filtered.every(item=>selected.includes(item.id))} onChange={selectVisible}/><span>Select visible</span></label><i className={`${styles.tag} ${message?styles.tagGray:styles.tagGreen}`}>{loading?"Loading":message?"Notice":"Connected"}</i></div></div>
      <div className={styles.dataTable}>
        <div className={styles.tableHead}><input type="checkbox" aria-label="Select visible inventory" checked={Boolean(filtered.length)&&filtered.every(item=>selected.includes(item.id))} onChange={selectVisible}/><span>Product</span><span>SKU</span><span>Price</span><span>Available</span><span>Quick stock</span><span>Status</span><span>Image</span><span>Updated</span><span>Action</span></div>
        {filtered.length?filtered.map(item=><div className={styles.tableRow} key={item.id}><input className={styles.inventoryRowCheck} type="checkbox" aria-label={`Select ${item.name}`} checked={selected.includes(item.id)} onChange={()=>toggle(item.id)}/><div className={styles.customerCell} data-label="Product"><strong>{item.product}</strong><small>{item.variant} · {item.productStatus.toLowerCase()}</small></div><span data-label="SKU">{item.sku||"—"}</span><span data-label="Price">{item.price}</span><strong data-label="Available" className={quantityAt(item)<=0?styles.stockEmpty:quantityAt(item)<=5?styles.stockLow:styles.stockOk}>{item.tracked?quantityAt(item):"Not tracked"}</strong><form data-label="Quick stock" className={styles.inventoryQuickStock} onSubmit={event=>{event.preventDefault();void addQuickStock(item)}}><input type="number" min="0" step="1" inputMode="numeric" aria-label={`Stock adjustment for ${item.name}; zero marks it out of stock`} value={quickStock[item.id]||""} onChange={event=>setQuickStock(current=>({...current,[item.id]:event.target.value}))} placeholder="Qty" disabled={!item.tracked||quickSaving===item.id}/><button className={styles.primary} type="submit" disabled={!item.tracked||quickSaving===item.id||quickStock[item.id]===undefined||quickStock[item.id]===""}>{quickSaving===item.id?"…":quickStock[item.id]==="0"?"Set zero":"+ Add"}</button></form><span data-label="Status"><i className={`${styles.tag} ${quantityAt(item)<=0?styles.tagGray:styles.tagGreen}`}>{quantityAt(item)>0?"In stock":"Out of stock"}</i></span><span data-label="Image" className={styles.inventoryImageCell}><InventoryProductImage item={item}/></span><span data-label="Updated">{item.updatedAt?new Date(item.updatedAt).toLocaleDateString():"—"}</span><button className={styles.secondary} type="button" onClick={()=>openProduct(item)}>View / edit</button></div>):<div className={styles.empty}>{loading?"Loading Shopify inventory...":message||"No inventory matches these filters."}</div>}
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

function Promotions({initialSearch="",initialStatusFilter="all"}:{initialSearch?:string;initialStatusFilter?:string}){
  const [items,setItems]=useState<Promotion[]>([]);const [search,setSearch]=useState(initialSearch);const [statusFilter,setStatusFilter]=useState(initialStatusFilter);const [methodFilter,setMethodFilter]=useState("all");const [loading,setLoading]=useState(true);const [message,setMessage]=useState("");const [showCreate,setShowCreate]=useState(false);const [editing,setEditing]=useState<Promotion|null>(null);const [pageInfo,setPageInfo]=useState<{hasNextPage:boolean;endCursor:string|null}>({hasNextPage:false,endCursor:null});
  const [draft,setDraft]=useState<PromotionDraft>(emptyPromotionDraft);
  const load=async(term:string,after:string|null)=>{setLoading(true);setMessage("");try{const params=new URLSearchParams();if(term.trim())params.set("search",term.trim());if(after)params.set("after",after);const response=await fetch(`/api/shopify/promotions?${params}`,{cache:"no-store"});const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to load promotions.");const next=Array.isArray(data.promotions)?data.promotions:[];setItems(current=>after?[...current,...next]:next);setPageInfo(data.pageInfo||{hasNextPage:false,endCursor:null});if(!next.length)setMessage(term?"No promotions match this search.":"No Shopify promotions were returned.")}catch(error){setMessage(error instanceof Error?error.message:"Unable to load promotions.");if(!after)setItems([])}finally{setLoading(false)}};
  useEffect(()=>{/* eslint-disable react-hooks/set-state-in-effect */void load(initialSearch,null);/* eslint-enable react-hooks/set-state-in-effect */},[initialSearch]);
  const methodOf=(item:Promotion):PromotionDraft["method"]=>item.type.startsWith("Automatic")?"automatic":"code";const filtered=items.filter(item=>(statusFilter==="all"||item.status===statusFilter)&&(methodFilter==="all"||methodOf(item)===methodFilter));
  const closePromotionForm=()=>{setShowCreate(false);setEditing(null);setDraft(emptyPromotionDraft())};
  const openCreatePromotion=()=>{if(showCreate&&!editing){closePromotionForm();return}setEditing(null);setDraft(emptyPromotionDraft());setShowCreate(true)};
  const openEditPromotion=(item:Promotion)=>{if(!item.editable){setMessage("This promotion is controlled by a Shopify app and must be edited in Shopify.");return}setEditing(item);setDraft({method:methodOf(item),title:item.title,code:methodOf(item)==="code"?item.code:"",valueType:item.valueType||"percentage",value:String(item.value||10),minimumSubtotal:item.minimumSubtotal||"",usageLimit:item.usageLimit?String(item.usageLimit):"",startsAt:toDateTimeLocal(item.startsAt),endsAt:toDateTimeLocal(item.endsAt),appliesOncePerCustomer:Boolean(item.appliesOncePerCustomer)});setShowCreate(true);window.scrollTo({top:0,behavior:"smooth"})};
  const savePromotion=async()=>{const updating=Boolean(editing);setLoading(true);setMessage(updating?"Updating promotion in Shopify...":"Creating promotion in Shopify...");try{const payload={...draft,id:editing?.id,type:editing?.type,startsAt:draft.startsAt?new Date(draft.startsAt).toISOString():undefined,endsAt:draft.endsAt?new Date(draft.endsAt).toISOString():undefined};const response=await fetch("/api/shopify/promotions",{method:updating?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});const data=await response.json();if(!response.ok)throw new Error(data.error||(updating?"Unable to update promotion.":"Unable to create promotion."));setMessage(updating?"Promotion updated in Shopify.":"Promotion created in Shopify.");closePromotionForm();await load("",null)}catch(error){setMessage(error instanceof Error?error.message:updating?"Unable to update promotion.":"Unable to create promotion.")}finally{setLoading(false)}};
  const stopPromotion=async(item:Promotion)=>{if(!window.confirm(`Stop ${item.title}? Customers will no longer be able to use this promotion, but it will remain in Shopify.`))return;setLoading(true);setMessage("Stopping promotion in Shopify...");try{const response=await fetch("/api/shopify/promotions",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"stop",id:item.id,method:methodOf(item)})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to stop promotion.");const stoppedAt=new Date().toISOString();setItems(current=>current.map(entry=>entry.id===item.id?{...entry,status:"EXPIRED",endsAt:stoppedAt}:entry));setMessage(`${item.title} was stopped. It remains available in Shopify if you want to reactivate it later.`)}catch(error){setMessage(error instanceof Error?error.message:"Unable to stop promotion.")}finally{setLoading(false)}};
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
          <div className={styles.promotionActions}><button className={styles.secondary} disabled={loading||!item.editable} title={item.editable?"Edit promotion":"App-controlled promotions must be edited in Shopify"} onClick={()=>openEditPromotion(item)}>Edit</button>{(item.status==="ACTIVE"||item.status==="SCHEDULED")&&<button className={styles.promotionStop} disabled={loading} title="Stop this promotion without deleting it" onClick={()=>void stopPromotion(item)}>Stop</button>}<button className={styles.delete} disabled={loading} onClick={()=>void deletePromotion(item)}>Delete</button></div>
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

type CommerceReportView="sales"|"products"|"discounts"|"orders"|"customers";
function commerceMoney(value:number,currencyCode:string){try{return new Intl.NumberFormat(undefined,{style:"currency",currency:currencyCode,maximumFractionDigits:2}).format(value)}catch{return `${value.toFixed(2)} ${currencyCode}`}}
function exportCommerceReport(data:CommerceAnalytics,report:CommerceReportView){
  const quote=(value:string|number)=>`"${String(value).replaceAll('"','""')}"`;
  let headers:string[]=[];let rows:(string|number)[][]=[];
  if(report==="sales"){headers=["Date","Gross sales","Net payments","Refunds","Discounts","Orders","Items sold","Average order value"];rows=data.daily.map(day=>[day.date,day.sales,day.revenue,day.refunds,day.discounts,day.orders,day.itemsSold,day.averageOrderValue])}
  if(report==="products"){headers=["Product","Net product sales","Items sold"];rows=data.topProducts.map(item=>[item.title,item.sales,item.quantity])}
  if(report==="discounts"){headers=["Product","Variant","SKU","Discount","Effective discount rate","Units sold","Orders","Gross sales","Discount amount","Net sales"];rows=data.discountPerformance.products.map(item=>[item.title,item.variant,item.sku,item.discountLabel,`${item.effectiveRate}%`,item.quantity,item.orders,item.grossSales,item.discountAmount,item.netSales])}
  if(report==="orders"){headers=["Report","Status or source","Orders"];rows=[[...data.fulfillment.map(item=>["Fulfillment",item.label,item.value]),...data.financial.map(item=>["Payment",item.label,item.value]),...data.sources.map(item=>["Sales channel",item.label,item.value])]].flat() as (string|number)[][]}
  if(report==="customers"){headers=["Customer","Email","Account type","Order source","Orders","Total spent","Average order value","Latest order"];rows=data.topCustomers.map(customer=>[customer.name,customer.email,customer.accountType,customer.orderSource,customer.orders,customer.totalSpent,customer.averageOrderValue,customer.lastOrderAt])}
  const csv=[headers,...rows].map(row=>row.map(quote).join(",")).join("\n");const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});const link=document.createElement("a");link.href=URL.createObjectURL(blob);link.download=`carters-${report}-report-${data.range.start.slice(0,10)}-${data.range.end.slice(0,10)}.csv`;link.click();URL.revokeObjectURL(link.href);
}
function CommerceReport({data,view}:{data:CommerceAnalytics;view:CommerceReportView}){
  const money=(value:number)=>commerceMoney(value,data.currencyCode);
  const [customerSort,setCustomerSort]=useState<"spend"|"orders">("spend");
  const [customerType,setCustomerType]=useState<"all"|"registered"|"guest">("all");
  const [discountSearch,setDiscountSearch]=useState("");
  const [discountRate,setDiscountRate]=useState("discounted");
  const [discountSort,setDiscountSort]=useState<"discount"|"units"|"net">("discount");
  const rankedCustomers=data.topCustomers.filter(customer=>customerType==="all"||(customerType==="registered"?customer.accountState==="ENABLED":customer.accountState!=="ENABLED")).sort((a,b)=>customerSort==="orders"?b.orders-a.orders||b.totalSpent-a.totalSpent:b.totalSpent-a.totalSpent||b.orders-a.orders);
  const discountProducts=(data.discountPerformance?.products||[]).filter(item=>{const matchesRate=discountRate==="all"||(discountRate==="discounted"?item.effectiveRate>0:item.effectiveRate===Number(discountRate));const term=discountSearch.trim().toLowerCase();return matchesRate&&(!term||`${item.title} ${item.variant} ${item.sku} ${item.discountLabel}`.toLowerCase().includes(term))}).sort((a,b)=>discountSort==="units"?b.quantity-a.quantity:discountSort==="net"?b.netSales-a.netSales:b.discountAmount-a.discountAmount);
  const discountVisibleTotals=discountProducts.reduce((totals,item)=>({quantity:totals.quantity+item.quantity,orders:totals.orders+item.orders,grossSales:totals.grossSales+item.grossSales,discountAmount:totals.discountAmount+item.discountAmount,netSales:totals.netSales+item.netSales}),{quantity:0,orders:0,grossSales:0,discountAmount:0,netSales:0});
  if(view==="products")return <div className={styles.analyticsReportTable}><div className={styles.analyticsReportHead}><span>#</span><span>Product</span><span>Items sold</span><span>Net product sales</span></div>{data.topProducts.length?data.topProducts.map((product,index)=><div className={styles.analyticsReportRow} key={product.title}><b>{index+1}</b><strong>{product.title}</strong><span>{product.quantity.toLocaleString()}</span><strong>{money(product.sales)}</strong></div>):<div className={styles.analyticsReportEmpty}>No product sales were returned for this period.</div>}</div>;
  if(view==="discounts"){const discountedBuckets=(data.discountPerformance?.buckets||[]).filter(bucket=>bucket.rate>0);return <div className={styles.discountReport}><div className={styles.discountReportMetrics}><article><span>Total quantity</span><strong>{discountVisibleTotals.quantity.toLocaleString()}</strong><small>Units matching current filters</small></article><article><span>Gross amount</span><strong>{money(discountVisibleTotals.grossSales)}</strong><small>Value before discount</small></article><article><span>Total discount</span><strong>{money(discountVisibleTotals.discountAmount)}</strong><small>Reduction applied</small></article><article><span>Total amount</span><strong>{money(discountVisibleTotals.netSales)}</strong><small>Final amount after discount</small></article></div><section className={styles.discountBucketSection}><header><div><h3>Performance by discount level</h3><p>Includes website compare-at sale prices and discounts applied during checkout.</p></div></header><div className={styles.discountBucketGrid}>{discountedBuckets.length?discountedBuckets.map(bucket=><button type="button" key={bucket.rate} className={discountRate===String(bucket.rate)?styles.discountBucketActive:""} onClick={()=>setDiscountRate(discountRate===String(bucket.rate)?"discounted":String(bucket.rate))}><span>{bucket.label}</span><strong>{bucket.itemsSold.toLocaleString()} units</strong><small>{bucket.orders} orders · {bucket.products} products</small><i><b style={{width:`${Math.max(4,(bucket.netSales/Math.max(1,...discountedBuckets.map(item=>item.netSales)))*100)}%`}}/></i><em>{money(bucket.netSales)} net</em></button>):<div className={styles.analyticsReportEmpty}>No discounted sales were found for this period.</div>}</div></section><div className={styles.discountReportToolbar}><label><span>Search sold items</span><input value={discountSearch} onChange={event=>setDiscountSearch(event.target.value)} placeholder="Product, variant, SKU, or discount code"/></label><label><span>Discount level</span><select value={discountRate} onChange={event=>setDiscountRate(event.target.value)}><option value="discounted">All discounted sales</option><option value="all">Include full-price sales</option>{(data.discountPerformance?.buckets||[]).map(bucket=><option key={bucket.rate} value={String(bucket.rate)}>{bucket.label}</option>)}</select></label><label><span>Sort report</span><select value={discountSort} onChange={event=>setDiscountSort(event.target.value as typeof discountSort)}><option value="discount">Highest discount value</option><option value="units">Most units sold</option><option value="net">Highest net sales</option></select></label></div><div className={`${styles.analyticsReportTable} ${styles.discountProductTable}`}><div className={styles.analyticsReportHead}><span>Product</span><span>Sale source</span><span>Rate</span><span>Units</span><span>Orders</span><span>Original value</span><span>Savings</span><span>Amount paid</span></div>{discountProducts.length?<>{discountProducts.map((item,index)=><div className={styles.analyticsReportRow} key={`${item.title}-${item.variant}-${item.effectiveRate}-${index}`}><div><strong>{item.title}</strong><small>{item.variant}{item.sku?` · ${item.sku}`:""}</small></div><span>{item.discountLabel}</span><strong><i className={`${styles.tag} ${item.effectiveRate?styles.tagBlue:styles.tagGray}`}>{item.effectiveRate}%</i></strong><span>{item.quantity.toLocaleString()}</span><span>{item.orders.toLocaleString()}</span><span>{money(item.grossSales)}</span><span className={styles.analyticsNegative}>−{money(item.discountAmount)}</span><strong>{money(item.netSales)}</strong></div>)}<div className={`${styles.analyticsReportRow} ${styles.discountReportTotal}`}><div><strong>Filtered totals</strong><small>{discountProducts.length} matching product rows</small></div><span>—</span><span>—</span><strong>{discountVisibleTotals.quantity.toLocaleString()}</strong><span>—</span><strong>{money(discountVisibleTotals.grossSales)}</strong><strong>−{money(discountVisibleTotals.discountAmount)}</strong><strong>{money(discountVisibleTotals.netSales)}</strong></div></>:<div className={styles.analyticsReportEmpty}>No sold items match these discount filters.</div>}</div></div>}
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
    ].map(([value,label,copy])=><article key={label}><span>{label}</span><strong>{typeof value==="number"?value.toLocaleString():value}</strong><small>{copy}</small></article>)}</div><nav className={styles.analyticsReportTabs} aria-label="Commerce reports">{([['sales','Sales over time','↗'],['products','Sales by product','▦'],['discounts','Discount performance','%'],['orders','Order analysis','▤'],['customers','Customer analysis','♙']] as [CommerceReportView,string,string][]).map(([value,label,icon])=><button type="button" key={value} className={reportView===value?styles.analyticsReportTabActive:""} onClick={()=>setReportView(value)}><span>{icon}</span>{label}</button>)}</nav><div className={styles.analyticsReportBody}>{commerce?<CommerceReport data={commerce} view={reportView}/>:<div className={styles.analyticsReportLoading}>{loading?"Loading Shopify report…":"No Shopify report data available."}</div>}</div>{commerce?.truncated&&<small className={styles.analyticsReportWarning}>The safe Shopify pagination limit was reached, so large-period totals may be incomplete.</small>}</section>
    <div className={styles.analyticsSectionTitle}><div><p>MOBILE APP REPORTS</p><h2>Customer behavior</h2></div><span>Events recorded inside the Carter&apos;s app</span></div>
    <div className={styles.commerceMetricGrid}>{loading&&!analytics?Array.from({length:5},(_,index)=><article className={`${styles.metric} ${styles.analyticsSkeleton}`} key={index}/>):metrics.map(metric=><article className={styles.metric} key={metric.label}><div className={styles.metricIcon}>{metric.change>=0?"↗":"↘"}</div><p>{metric.label}</p><strong>{metric.value.toLocaleString()}</strong><span className={metric.change>=0?styles.analyticsPositive:styles.analyticsNegative}>{metric.change>=0?"+":""}{metric.change}% <i>vs previous period</i></span></article>)}</div>
    <div className={styles.analyticsPrimaryGrid}><section className={styles.card}><div className={styles.cardHead}><div><h2>App activity over time</h2><p>Daily screen views · {analytics?analyticsPeriodLabel(analytics.range):"selected period"}</p></div><span className={styles.analyticsRefunds}>{analytics?.metrics.viewsPerSession??"—"} views / session</span></div>{analytics?<AppActivityChart data={analytics.daily}/>:<div className={styles.analyticsChartEmpty}>Loading app activity...</div>}</section><section className={styles.card}><div className={styles.cardHead}><div><h2>Active devices</h2><p>Unique devices active each day</p></div></div>{analytics?<DeviceActivityChart data={analytics.daily}/>:<div className={styles.analyticsChartEmpty}>Loading devices...</div>}</section></div>
    <div className={styles.analyticsPrimaryGrid}><section className={styles.card}><div className={styles.cardHead}><div><h2>Engagement funnel</h2><p>How active devices move from browsing to cart</p></div></div><div className={styles.analyticsFunnel}>{analytics?.funnel.map((step,index)=><div key={step.label}><span>{index+1}</span><div><strong>{step.label}</strong><small>{step.rate}% of active devices</small><i><b style={{width:`${step.rate}%`}}/></i></div><em>{step.value}</em></div>)}</div></section><section className={`${styles.card} ${styles.analyticsBreakdowns}`}><AnalyticsBreakdown title="Device platform" items={analytics?.platforms||[]}/><AnalyticsBreakdown title="New vs returning" items={analytics?.audience||[]}/></section></div>
    <div className={styles.analyticsPrimaryGrid}><section className={styles.card}><div className={styles.cardHead}><div><h2>Popular screens</h2><p>Most-viewed destinations in the app</p></div></div><div className={styles.analyticsScreenList}>{analytics?.screens.length?analytics.screens.map((screen,index)=><div key={screen.path}><b>{index+1}</b><div><strong>{screen.label}</strong><small>{screen.path} · {screen.devices} device{screen.devices===1?"":"s"}</small><span><i style={{width:`${Math.max(3,(screen.views/maxScreen)*100)}%`}}/></span></div><em>{screen.views} views</em></div>):<div className={styles.empty}>No screen views in this period.</div>}</div></section><section className={styles.card}><div className={styles.cardHead}><div><h2>Activity by hour</h2><p>Screen views by local hour</p></div></div><div className={styles.analyticsHourly}>{analytics?.hours.map(hour=><div key={hour.hour} title={`${hour.hour}:00 · ${hour.value} views`}><span style={{height:`${Math.max(3,(hour.value/maxHour)*100)}%`}}/><small>{hour.hour%6===0?`${hour.hour}:00`:""}</small></div>)}</div></section></div>
    <div className={styles.analyticsPrimaryGrid}><section className={styles.card}><div className={styles.cardHead}><div><h2>Top viewed products</h2><p>Product pages receiving the most app attention</p></div></div><div className={styles.analyticsProducts}>{analytics?.topProducts.length?analytics.topProducts.map((product,index)=><div key={product.path}><b>{index+1}</b>{product.image?.url?<img className={styles.analyticsProductImage} src={product.image.url} alt={product.image.altText||product.label}/>:<span className={styles.analyticsProductFallback}>▦</span>}<div><strong>{product.label}</strong><small>{product.devices} device{product.devices===1?"":"s"}</small><span><i style={{width:`${Math.max(3,(product.views/maxProduct)*100)}%`}}/></span></div><em>{product.views} views</em></div>):<div className={styles.empty}>No product views in this period.</div>}</div></section><section className={styles.card}><div className={styles.cardHead}><div><h2>Engagement quality</h2><p>Supporting app health indicators</p></div></div><div className={styles.appAnalyticsStrip}>{[[analytics?.metrics.viewsPerSession??"—","Views / session"],[analytics?`${analytics.metrics.bounceRate}%`:"—","Single-view sessions"],[analytics?.metrics.activeDevices24h??"—","Active devices · 24h"],[analytics?.metrics.notificationOpens??"—","Notification opens"],[analytics?.metrics.pushDevices??"—","Push-enabled devices"],[analytics?.recordingSince?new Date(analytics.recordingSince).toLocaleDateString():"—","Recording since"]].map(([value,label])=><div key={label}><strong>{value}</strong><small>{label}</small></div>)}</div></section></div>
  </div>
}

function Chat(){return <div className={styles.content}><div className={styles.actionHeader}><div><h2>Customer chat</h2><p>Realtime support inbox readiness.</p></div><button className={styles.secondary}>Configure inbox</button></div><div className={styles.supportGrid}><section className={styles.card}><div className={styles.cardHead}><div><h2>Inbox status</h2><p>Supabase Realtime is required before live chat can be enabled.</p></div></div><div className={styles.empty}>No recorded conversations yet.</div></section><section className={styles.card}><div className={styles.cardHead}><div><h2>Setup checklist</h2><p>Required production pieces.</p></div></div><div className={styles.checkList}>{["Create conversations table","Enable realtime channel","Add staff assignment rules","Connect notification alerts"].map((item)=><div key={item}><span>○</span><strong>{item}</strong></div>)}</div></section></div></div>}

function Loyalty(){
  type Settings={enabled:boolean;programName:string;pointsPerItem:number;pointsPerCurrencyUnit:number;minimumRedemptionPoints:number;rewardExpiryDays:number;silverTierPoints:number;goldTierPoints:number;vipTierPoints:number};
  type Account={id:string;customerId:string;email:string;name:string;points:number;lifetimePoints:number;updatedAt:string};
  type Transaction={id:string;accountId:string;email:string;type:string;points:number;orderName?:string;rewardCode?:string;rewardAmount?:number;currencyCode?:string;expiresAt?:string;note:string;createdAt:string};
  const [settings,setSettings]=useState<Settings>({enabled:true,programName:"Carter's Rewards",pointsPerItem:1,pointsPerCurrencyUnit:10,minimumRedemptionPoints:50,rewardExpiryDays:30,silverTierPoints:50,goldTierPoints:250,vipTierPoints:500});
  const [accounts,setAccounts]=useState<Account[]>([]);
  const [transactions,setTransactions]=useState<Transaction[]>([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");
  const [email,setEmail]=useState("");
  const [points,setPoints]=useState("");
  const [note,setNote]=useState("");
  const [redeemEmail,setRedeemEmail]=useState("");
  const [redeemPoints,setRedeemPoints]=useState("50");
  const [reward,setReward]=useState<{code:string;amount:number;currencyCode:string;expiresAt:string}|null>(null);
  const [accountQuery,setAccountQuery]=useState("");
  const [tierFilter,setTierFilter]=useState("all");
  const [balanceFilter,setBalanceFilter]=useState("all");
  const [activityFilter,setActivityFilter]=useState("all");
  const [selectedAccountId,setSelectedAccountId]=useState("");
  const [loyaltyReferenceTime]=useState(()=>Date.now());
  const [memberMinPoints,setMemberMinPoints]=useState("");
  const [memberMaxPoints,setMemberMaxPoints]=useState("");
  const [memberMinLifetime,setMemberMinLifetime]=useState("");
  const [memberMaxLifetime,setMemberMaxLifetime]=useState("");
  const [memberActivity,setMemberActivity]=useState("all");
  const [memberSort,setMemberSort]=useState("balance-desc");

  const load=async()=>{setLoading(true);try{const response=await fetch("/api/loyalty",{cache:"no-store"});const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to load loyalty.");setSettings(data.settings);setAccounts(data.accounts||[]);setTransactions(data.transactions||[])}catch(error){setMessage(error instanceof Error?error.message:"Unable to load loyalty.")}finally{setLoading(false)}};
  useEffect(()=>{/* eslint-disable react-hooks/set-state-in-effect */void load();/* eslint-enable react-hooks/set-state-in-effect */},[]);
  const saveSettings=async()=>{setSaving(true);setMessage("Saving loyalty settings...");try{const response=await fetch("/api/loyalty",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"settings",settings})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to save settings.");setSettings(data.settings);setMessage("Loyalty settings saved.")}catch(error){setMessage(error instanceof Error?error.message:"Unable to save settings.")}finally{setSaving(false)}};
  const adjust=async()=>{if(!/^\S+@\S+\.\S+$/.test(email.trim())||!Number.isInteger(Number(points))||Number(points)===0){setMessage("Enter a customer email and a positive or negative whole-number adjustment.");return}setSaving(true);setMessage("Updating loyalty balance...");try{const response=await fetch("/api/loyalty",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"adjust",email:email.trim(),points:Number(points),note})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to adjust points.");setEmail("");setPoints("");setNote("");setSelectedAccountId(data.account.id);await load();setMessage(`Updated ${data.account.name}'s loyalty balance.`)}catch(error){setMessage(error instanceof Error?error.message:"Unable to adjust points.")}finally{setSaving(false)}};
  const redeem=async()=>{if(!/^\S+@\S+\.\S+$/.test(redeemEmail.trim())||!Number.isInteger(Number(redeemPoints))){setMessage("Enter a customer email and a whole number of points to redeem.");return}setSaving(true);setReward(null);setMessage("Creating a secure Shopify reward...");try{const response=await fetch("/api/loyalty",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"redeem",email:redeemEmail.trim(),points:Number(redeemPoints)})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to create reward.");setReward(data.reward);await load();setMessage(`Reward ${data.reward.code} created. ${redeemPoints} points were deducted.`)}catch(error){setMessage(error instanceof Error?error.message:"Unable to create reward.")}finally{setSaving(false)}};

  const accountTier=(account:Account)=>account.lifetimePoints>=settings.vipTierPoints?"vip":account.lifetimePoints>=settings.goldTierPoints?"gold":account.lifetimePoints>=settings.silverTierPoints?"silver":"member";
  const tierLabel=(tier:string)=>tier==="vip"?"VIP":tier==="gold"?"Gold":tier==="silver"?"Silver":"Member";
  const active=accounts.filter(account=>account.points>0).length;
  const issued=transactions.filter(transaction=>transaction.points>0).reduce((sum,transaction)=>sum+transaction.points,0);
  const outstanding=accounts.reduce((sum,account)=>sum+account.points,0);
  const redeemed=Math.abs(transactions.filter(transaction=>transaction.type==="redemption").reduce((sum,transaction)=>sum+transaction.points,0));
  const redemptionReady=accounts.filter(account=>account.points>=settings.minimumRedemptionPoints).length;
  const averageBalance=accounts.length?Math.round(outstanding/accounts.length):0;
  const liability=outstanding/Math.max(1,settings.pointsPerCurrencyUnit);
  const accountLastActivity=(account:Account)=>transactions.find(transaction=>transaction.accountId===account.id)?.createdAt||account.updatedAt;
  const filteredAccounts=accounts.filter(account=>{const query=accountQuery.trim().toLowerCase();const minAvailable=memberMinPoints===""?null:Number(memberMinPoints);const maxAvailable=memberMaxPoints===""?null:Number(memberMaxPoints);const minLifetime=memberMinLifetime===""?null:Number(memberMinLifetime);const maxLifetime=memberMaxLifetime===""?null:Number(memberMaxLifetime);const lastActivity=new Date(accountLastActivity(account)).getTime();const activityAge=loyaltyReferenceTime-lastActivity;return(!query||account.name.toLowerCase().includes(query)||account.email.toLowerCase().includes(query)||account.customerId.toLowerCase().includes(query))&&(tierFilter==="all"||accountTier(account)===tierFilter)&&(balanceFilter==="all"||(balanceFilter==="ready"&&account.points>=settings.minimumRedemptionPoints)||(balanceFilter==="active"&&account.points>0)||(balanceFilter==="zero"&&account.points===0))&&(minAvailable===null||account.points>=minAvailable)&&(maxAvailable===null||account.points<=maxAvailable)&&(minLifetime===null||account.lifetimePoints>=minLifetime)&&(maxLifetime===null||account.lifetimePoints<=maxLifetime)&&(memberActivity==="all"||(memberActivity==="30"&&activityAge<=30*86400000)||(memberActivity==="90"&&activityAge<=90*86400000)||(memberActivity==="inactive-90"&&activityAge>90*86400000))}).sort((a,b)=>memberSort==="balance-asc"?a.points-b.points:memberSort==="lifetime-desc"?b.lifetimePoints-a.lifetimePoints:memberSort==="activity-desc"?accountLastActivity(b).localeCompare(accountLastActivity(a)):memberSort==="name"?a.name.localeCompare(b.name):b.points-a.points);
  const selectedAccount=accounts.find(account=>account.id===selectedAccountId)||filteredAccounts[0]||null;
  const selectedTransactions=selectedAccount?transactions.filter(transaction=>transaction.accountId===selectedAccount.id).slice(0,8):[];
  const visibleTransactions=transactions.filter(transaction=>activityFilter==="all"||transaction.type===activityFilter).slice(0,60);
  const chooseReward=(account:Account)=>{setSelectedAccountId(account.id);setRedeemEmail(account.email);setRedeemPoints(String(settings.minimumRedemptionPoints));window.scrollTo({top:0,behavior:"smooth"})};
  const hasMemberFilters=Boolean(accountQuery||tierFilter!=="all"||balanceFilter!=="all"||memberMinPoints||memberMaxPoints||memberMinLifetime||memberMaxLifetime||memberActivity!=="all"||memberSort!=="balance-desc");
  const resetMemberFilters=()=>{setAccountQuery("");setTierFilter("all");setBalanceFilter("all");setMemberMinPoints("");setMemberMaxPoints("");setMemberMinLifetime("");setMemberMaxLifetime("");setMemberActivity("all");setMemberSort("balance-desc");setSelectedAccountId("")};
  const exportLoyaltyMembers=()=>{if(!filteredAccounts.length)return;const rows=[["Member","Email","Tier","Available points","Lifetime points","Reward ready","Last activity"],...filteredAccounts.map(account=>[account.name,account.email,tierLabel(accountTier(account)),String(account.points),String(account.lifetimePoints),account.points>=settings.minimumRedemptionPoints?"Yes":"No",accountLastActivity(account)])];const csv=rows.map(row=>row.map(value=>`"${String(value).replaceAll('"','""')}"`).join(",")).join("\r\n");const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=`loyalty-members-${new Date(loyaltyReferenceTime).toISOString().slice(0,10)}.csv`;link.click();URL.revokeObjectURL(url)};

  return <div className={`${styles.content} ${styles.loyaltyPage} ${styles.loyaltyProPage}`}>
    <section className={styles.loyaltyProHero}><div><p>CUSTOMER RETENTION</p><h2>{settings.programName}</h2><span>Manage member value, rewards, tiers, balances, and every loyalty event from one workspace.</span></div><div className={styles.loyaltyHeroStatus}><i className={`${styles.tag} ${settings.enabled?styles.tagGreen:styles.tagGray}`}>{settings.enabled?"Program active":"Program paused"}</i><button className={styles.secondary} disabled={loading} onClick={()=>void load()}>{loading?"Refreshing...":"↻ Refresh data"}</button></div></section>
    {message&&<div className={styles.loyaltyProNotice}>{message}</div>}

    <section className={styles.loyaltyMetricGrid}>
      {[["Members",accounts.length,"Enrolled loyalty accounts","♙"],["Reward ready",redemptionReady,"Can redeem now","✓"],["Outstanding",outstanding,"Available customer points","★"],["Reward liability",liability.toFixed(2),"Store currency units","$"],["Redeemed",redeemed,"Lifetime redeemed points","↗"]].map(([label,value,copy,icon])=><article key={String(label)}><span>{icon}</span><div><small>{label}</small><strong>{typeof value==="number"?value.toLocaleString():value}</strong><p>{copy}</p></div></article>)}
    </section>

    <section className={styles.loyaltyHealthGrid}>
      <article className={styles.loyaltyTierOverview}><header><div><p>PROGRAM HEALTH</p><h3>Member tiers</h3></div><span>{accounts.length} total</span></header><div>{["member","silver","gold","vip"].map(tier=>{const count=accounts.filter(account=>accountTier(account)===tier).length;const share=accounts.length?Math.round(count/accounts.length*100):0;return <div key={tier}><i className={styles[`loyaltyTier${tier[0].toUpperCase()+tier.slice(1)}`]}/><strong>{tierLabel(tier)}</strong><span>{count} members</span><b>{share}%</b><em><i style={{width:`${share}%`}}/></em></div>})}</div></article>
      <article className={styles.loyaltyProgramSummary}><header><p>VALUE SNAPSHOT</p><h3>Program economics</h3></header><div><span>Average available balance<strong>{averageBalance.toLocaleString()} points</strong></span><span>Lifetime points issued<strong>{issued.toLocaleString()}</strong></span><span>Active balances<strong>{active.toLocaleString()} members</strong></span><span>Current conversion<strong>{settings.pointsPerCurrencyUnit} pts = 1 unit</strong></span></div></article>
    </section>

    <section className={styles.loyaltyOperationsGrid}>
      <article className={styles.loyaltyProCard}><header><div><p>PROGRAM CONFIGURATION</p><h3>Rules and earning</h3><span>Control how members earn and redeem value.</span></div><i className={`${styles.tag} ${settings.enabled?styles.tagGreen:styles.tagGray}`}>{settings.enabled?"Enabled":"Paused"}</i></header><div className={styles.loyaltyProForm}>
        <label className={styles.loyaltyProWide}>Program name<input value={settings.programName} onChange={event=>setSettings(current=>({...current,programName:event.target.value}))}/></label>
        <label>Points per purchased item<input type="number" min="0" step="1" value={settings.pointsPerItem} onChange={event=>setSettings(current=>({...current,pointsPerItem:Math.max(0,Math.floor(Number(event.target.value)||0))}))}/></label>
        <label>Points per currency unit<input type="number" min="1" step="1" value={settings.pointsPerCurrencyUnit} onChange={event=>setSettings(current=>({...current,pointsPerCurrencyUnit:Math.max(1,Math.floor(Number(event.target.value)||1))}))}/></label>
        <label>Minimum redemption<input type="number" min="1" step="1" value={settings.minimumRedemptionPoints} onChange={event=>setSettings(current=>({...current,minimumRedemptionPoints:Math.max(1,Math.floor(Number(event.target.value)||1))}))}/></label>
        <label>Reward validity (days)<input type="number" min="1" max="365" step="1" value={settings.rewardExpiryDays} onChange={event=>setSettings(current=>({...current,rewardExpiryDays:Math.max(1,Math.floor(Number(event.target.value)||1))}))}/></label>
        <label>Silver tier (lifetime points)<input type="number" min="1" step="1" value={settings.silverTierPoints} onChange={event=>setSettings(current=>({...current,silverTierPoints:Math.max(1,Math.floor(Number(event.target.value)||1))}))}/></label>
        <label>Gold tier (lifetime points)<input type="number" min={settings.silverTierPoints+1} step="1" value={settings.goldTierPoints} onChange={event=>setSettings(current=>({...current,goldTierPoints:Math.max(current.silverTierPoints+1,Math.floor(Number(event.target.value)||current.silverTierPoints+1))}))}/></label>
        <label>VIP tier (lifetime points)<input type="number" min={settings.goldTierPoints+1} step="1" value={settings.vipTierPoints} onChange={event=>setSettings(current=>({...current,vipTierPoints:Math.max(current.goldTierPoints+1,Math.floor(Number(event.target.value)||current.goldTierPoints+1))}))}/></label>
        <label className={`${styles.loyaltyProToggle} ${styles.loyaltyProWide}`}><input type="checkbox" checked={settings.enabled} onChange={event=>setSettings(current=>({...current,enabled:event.target.checked}))}/><span><strong>Enable loyalty program</strong><small>Paid orders earn points and members can redeem rewards.</small></span></label>
      </div><div className={styles.loyaltyRuleStrip}><span>{settings.pointsPerCurrencyUnit} points = 1 currency unit</span><span>Minimum reward value {Math.ceil(settings.minimumRedemptionPoints/settings.pointsPerCurrencyUnit)} units</span><span>Silver {settings.silverTierPoints.toLocaleString()} pts</span><span>Gold {settings.goldTierPoints.toLocaleString()} pts</span><span>VIP {settings.vipTierPoints.toLocaleString()} pts</span><span>Expires after {settings.rewardExpiryDays} days</span></div><button className={styles.primary} disabled={saving} onClick={()=>void saveSettings()}>{saving?"Saving...":"Save program rules"}</button></article>

      <article className={`${styles.loyaltyProCard} ${styles.loyaltyRewardComposer}`}><header><div><p>MEMBER REWARD</p><h3>Issue secure reward</h3><span>Create a one-use Shopify discount and deduct points.</span></div><i className={`${styles.tag} ${styles.tagBlue}`}>Protected</i></header><div className={styles.loyaltyProForm}>
        <label className={styles.loyaltyProWide}>Customer email<input type="email" value={redeemEmail} onChange={event=>setRedeemEmail(event.target.value)} placeholder="customer@example.com"/></label>
        <label>Points to redeem<input type="number" min={settings.minimumRedemptionPoints} step={settings.pointsPerCurrencyUnit} value={redeemPoints} onChange={event=>setRedeemPoints(event.target.value)}/></label>
        <div className={styles.loyaltyRewardPreview}><span>Customer reward</span><strong>{Number(redeemPoints)>0?(Number(redeemPoints)/settings.pointsPerCurrencyUnit).toFixed(2):"0.00"}</strong><small>currency units · {settings.rewardExpiryDays}-day validity</small></div>
      </div>{reward&&<div className={styles.loyaltyRewardSuccess}><span>Reward created</span><strong>{reward.code}</strong><small>{reward.amount.toFixed(2)} {reward.currencyCode} off · expires {new Date(reward.expiresAt).toLocaleDateString()}</small></div>}<button className={styles.primary} disabled={saving||!settings.enabled} onClick={()=>void redeem()}>{saving?"Creating...":"Create reward & deduct points"}</button></article>
    </section>

    <section className={styles.loyaltyMembersWorkspace}>
      <header><div><p>MEMBER DIRECTORY</p><h3>Customer loyalty cards</h3><span>Search balances, review tier progress, and open a complete member profile.</span></div><div className={styles.loyaltyDirectoryActions}><span><strong>{filteredAccounts.length.toLocaleString()}</strong> of {accounts.length.toLocaleString()} members</span><button className={styles.secondary} disabled={!filteredAccounts.length} onClick={exportLoyaltyMembers}>Export CSV</button>{hasMemberFilters&&<button className={styles.secondary} onClick={resetMemberFilters}>Reset filters</button>}</div></header>
      <div className={styles.loyaltyAdvancedFilters}><label className={styles.loyaltyAdvancedSearch}><span>Search</span><input value={accountQuery} onChange={event=>setAccountQuery(event.target.value)} placeholder="Name, email, or customer ID"/></label><label><span>Tier</span><select value={tierFilter} onChange={event=>setTierFilter(event.target.value)}><option value="all">All tiers</option><option value="vip">VIP</option><option value="gold">Gold</option><option value="silver">Silver</option><option value="member">Member</option></select></label><label><span>Reward status</span><select value={balanceFilter} onChange={event=>setBalanceFilter(event.target.value)}><option value="all">All balances</option><option value="ready">Reward ready</option><option value="active">Has points</option><option value="zero">Zero balance</option></select></label><div className={styles.loyaltyAdvancedRange}><label><span>Available from</span><input type="number" min="0" value={memberMinPoints} onChange={event=>setMemberMinPoints(event.target.value)} placeholder="0"/></label><label><span>Available to</span><input type="number" min="0" value={memberMaxPoints} onChange={event=>setMemberMaxPoints(event.target.value)} placeholder="Any"/></label></div><div className={styles.loyaltyAdvancedRange}><label><span>Lifetime from</span><input type="number" min="0" value={memberMinLifetime} onChange={event=>setMemberMinLifetime(event.target.value)} placeholder="0"/></label><label><span>Lifetime to</span><input type="number" min="0" value={memberMaxLifetime} onChange={event=>setMemberMaxLifetime(event.target.value)} placeholder="Any"/></label></div><label><span>Member activity</span><select value={memberActivity} onChange={event=>setMemberActivity(event.target.value)}><option value="all">Any activity date</option><option value="30">Active in last 30 days</option><option value="90">Active in last 90 days</option><option value="inactive-90">Inactive over 90 days</option></select></label><label><span>Sort members</span><select value={memberSort} onChange={event=>setMemberSort(event.target.value)}><option value="balance-desc">Highest available points</option><option value="balance-asc">Lowest available points</option><option value="lifetime-desc">Highest lifetime points</option><option value="activity-desc">Most recent activity</option><option value="name">Member name A–Z</option></select></label></div>
      <div className={styles.loyaltyMemberLayout}><div className={styles.loyaltyMemberTable}><div className={styles.loyaltyMemberHead}><span>Member</span><span>Tier</span><span>Available</span><span>Lifetime</span><span>Reward status</span><span>Action</span></div>{filteredAccounts.length?filteredAccounts.map(account=><div className={`${styles.loyaltyMemberRow} ${selectedAccount?.id===account.id?styles.loyaltyMemberSelected:""}`} key={account.id}><button className={styles.loyaltyMemberIdentity} onClick={()=>setSelectedAccountId(account.id)}><span>{account.name.slice(0,2).toUpperCase()}</span><div><strong>{account.name}</strong><small>{account.email||account.customerId}</small></div></button><i className={`${styles.loyaltyTierBadge} ${styles[`loyaltyTierBadge${accountTier(account)[0].toUpperCase()+accountTier(account).slice(1)}`]}`}>{tierLabel(accountTier(account))}</i><strong>{account.points.toLocaleString()} pts</strong><span>{account.lifetimePoints.toLocaleString()}</span><span>{account.points>=settings.minimumRedemptionPoints?<b className={styles.loyaltyReady}>Reward ready</b>:<small>{(settings.minimumRedemptionPoints-account.points).toLocaleString()} pts needed</small>}</span><button className={styles.secondary} disabled={!account.email||account.points<settings.minimumRedemptionPoints} onClick={()=>chooseReward(account)}>Redeem</button></div>):<div className={styles.loyaltyEmpty}>No members match these filters.</div>}</div>
        <aside className={styles.loyaltyMemberProfile}>{selectedAccount?<><div className={`${styles.loyaltyProfileCard} ${styles[`loyaltyProfileCard${accountTier(selectedAccount)[0].toUpperCase()+accountTier(selectedAccount).slice(1)}`]}`}><header><span>CARTER&apos;S REWARDS</span><b>{tierLabel(accountTier(selectedAccount))}</b></header><h3>{selectedAccount.name}</h3><p>{selectedAccount.points.toLocaleString()} available points</p><i><span style={{width:`${Math.min(100,selectedAccount.points/settings.minimumRedemptionPoints*100)}%`}}/></i><small>{selectedAccount.points>=settings.minimumRedemptionPoints?"Ready to create a reward":`${settings.minimumRedemptionPoints-selectedAccount.points} points until reward`}</small></div><div className={styles.loyaltyProfileStats}><span>Reward value<strong>{(selectedAccount.points/settings.pointsPerCurrencyUnit).toFixed(2)}</strong></span><span>Lifetime earned<strong>{selectedAccount.lifetimePoints.toLocaleString()}</strong></span><span>Last updated<strong>{new Date(selectedAccount.updatedAt).toLocaleDateString()}</strong></span></div><div className={styles.loyaltyProfileActivity}><h4>Recent activity</h4>{selectedTransactions.length?selectedTransactions.map(transaction=><div key={transaction.id}><span className={transaction.points>=0?styles.loyaltyPositive:styles.loyaltyNegative}>{transaction.points>=0?"+":""}{transaction.points}</span><p><strong>{transaction.orderName||transaction.type}</strong><small>{new Date(transaction.createdAt).toLocaleString()}</small></p></div>):<small>No activity recorded for this member.</small>}</div></>:<div className={styles.loyaltyEmpty}>Select a member to view their loyalty card.</div>}</aside></div>
    </section>

    <section className={styles.loyaltyLowerGrid}>
      <article className={styles.loyaltyActivityPanel}><header><div><p>POINTS LEDGER</p><h3>Recent activity</h3></div><select value={activityFilter} onChange={event=>setActivityFilter(event.target.value)}><option value="all">All activity</option><option value="earn">Earned</option><option value="redemption">Redemptions</option><option value="adjustment">Adjustments</option><option value="reversal">Reversals</option></select></header><div>{visibleTransactions.length?visibleTransactions.map(transaction=><article key={transaction.id}><span className={transaction.points>=0?styles.loyaltyPositive:styles.loyaltyNegative}>{transaction.points>=0?"+":""}{transaction.points}</span><div><strong>{transaction.email||"Customer"}</strong><small>{transaction.orderName||transaction.note} · {new Date(transaction.createdAt).toLocaleString()}</small>{transaction.rewardCode&&<code>{transaction.rewardCode}</code>}</div><i className={`${styles.tag} ${transaction.type==="earn"?styles.tagGreen:transaction.type==="redemption"?styles.tagBlue:styles.tagGray}`}>{transaction.type}</i></article>):<div className={styles.loyaltyEmpty}>No loyalty activity for this filter.</div>}</div></article>
      <article className={styles.loyaltyAdjustmentPanel}><header><p>BALANCE CONTROL</p><h3>Manual adjustment</h3><span>Use for verified corrections or customer-service goodwill.</span></header><div className={styles.loyaltyProForm}><label className={styles.loyaltyProWide}>Customer email<input type="email" value={email} onChange={event=>setEmail(event.target.value)} placeholder="customer@example.com"/></label><label>Points adjustment<input type="number" step="1" value={points} onChange={event=>setPoints(event.target.value)} placeholder="50 or -20"/></label><label>Reason<input value={note} onChange={event=>setNote(event.target.value)} placeholder="Reason for audit trail"/></label></div><button className={styles.secondary} disabled={saving} onClick={()=>void adjust()}>{saving?"Updating...":"Adjust member balance"}</button><div className={styles.loyaltyAdjustmentNote}><span>!</span><p>Every manual adjustment is saved in the points ledger with its reason and timestamp.</p></div></article>
    </section>

    <aside className={styles.loyaltyWebhookNotice}><span>!</span><div><strong>Secure Shopify webhook required</strong><p>Set SHOPIFY_WEBHOOK_SECRET and send orders/paid plus orders/cancelled events to the existing order webhook. Reward creation also requires Shopify Admin API scopes read_customers and write_discounts.</p></div></aside>
  </div>
}
function Marketing(){
  type Campaign={id:string;title:string;message:string;url:string;createdAt:string;recipientCount:number;status:string;opens:number;openRate:number|null};
  type MarketingTab="overview"|"campaigns"|"tools"|"integrations";
  const templates=[{name:"New arrivals",icon:"✦",title:"New arrivals are here",message:"Discover fresh styles made for every little adventure.",url:"/collection/new-collection-ss26"},{name:"Limited offer",icon:"%",title:"A special offer just for you",message:"Open the Carter's app and shop the latest limited-time offer.",url:"/promotions"},{name:"Back in stock",icon:"↻",title:"Your favorite is back",message:"The item you were waiting for is available again. Shop before it sells out.",url:"/notifications"}];
  const [activeTab,setActiveTab]=useState<MarketingTab>("overview");const [composer,setComposer]=useState(false);const [step,setStep]=useState<"compose"|"review">("compose");const [sending,setSending]=useState(false);
  const [pushTitle,setPushTitle]=useState("New arrivals are here");const [pushMessage,setPushMessage]=useState("Discover fresh styles made for every little adventure.");const [pushUrl,setPushUrl]=useState("/collection/new-collection-ss26");
  const [sendStatus,setSendStatus]=useState("");const [campaigns,setCampaigns]=useState<Campaign[]>([]);const [deviceCount,setDeviceCount]=useState<number|null>(null);const [refreshMessage,setRefreshMessage]=useState("");
  const [campaignQuery,setCampaignQuery]=useState("");const [campaignStatus,setCampaignStatus]=useState("all");const [campaignPeriod,setCampaignPeriod]=useState("all");
  const [linkDestination,setLinkDestination]=useState("/collection/new-collection-ss26");const [utmSource,setUtmSource]=useState("instagram");const [utmMedium,setUtmMedium]=useState("paid_social");const [utmCampaign,setUtmCampaign]=useState("new_arrivals");const [toolNotice,setToolNotice]=useState("");
  const validUrl=pushUrl.startsWith("/")||/^https:\/\//i.test(pushUrl);const canReview=Boolean(pushTitle.trim()&&pushMessage.trim()&&pushTitle.length<=65&&pushMessage.length<=180&&validUrl);
  const measuredRates=campaigns.flatMap(campaign=>campaign.openRate===null?[]:[campaign.openRate]);const averageOpenRate=measuredRates.length?Math.round(measuredRates.reduce((sum,value)=>sum+value,0)/measuredRates.length*10)/10:null;const totalRecipients=campaigns.reduce((sum,campaign)=>sum+campaign.recipientCount,0);const totalOpens=campaigns.reduce((sum,campaign)=>sum+campaign.opens,0);const bestCampaign=[...campaigns].filter(campaign=>campaign.openRate!==null).sort((a,b)=>(b.openRate||0)-(a.openRate||0))[0];
  const campaignReferenceTime=campaigns.reduce((latest,campaign)=>Math.max(latest,new Date(campaign.createdAt).getTime()),0);const filteredCampaigns=campaigns.filter(campaign=>{const query=campaignQuery.trim().toLowerCase();const matchesQuery=!query||campaign.title.toLowerCase().includes(query)||campaign.message.toLowerCase().includes(query);const matchesStatus=campaignStatus==="all"||campaign.status===campaignStatus;const matchesPeriod=campaignPeriod==="all"||campaignReferenceTime-new Date(campaign.createdAt).getTime()<=Number(campaignPeriod)*86400000;return matchesQuery&&matchesStatus&&matchesPeriod});
  const trackingLink=useMemo(()=>{const destination=linkDestination.trim();if(!destination)return "";const params=new URLSearchParams();if(utmSource.trim())params.set("utm_source",utmSource.trim());if(utmMedium.trim())params.set("utm_medium",utmMedium.trim());if(utmCampaign.trim())params.set("utm_campaign",utmCampaign.trim());const query=params.toString();return query?`${destination}${destination.includes("?")?"&":"?"}${query}`:destination},[linkDestination,utmSource,utmMedium,utmCampaign]);
  const refreshCampaigns=async()=>{setRefreshMessage("Refreshing…");try{const response=await fetch(`/api/push/campaigns?t=${Date.now()}`,{cache:"no-store"});if(!response.ok)throw new Error("Refresh failed");const data=await response.json();setCampaigns(Array.isArray(data.campaigns)?data.campaigns:[]);setRefreshMessage(`Updated ${new Date().toLocaleTimeString()}`)}catch{setRefreshMessage("Unable to refresh")}};
  useEffect(()=>{fetch("/api/analytics/summary").then(response=>response.json()).then(data=>setDeviceCount(Number(data.notificationDevices)||0)).catch(()=>setDeviceCount(null));fetch("/api/push/campaigns").then(response=>response.json()).then(data=>setCampaigns(Array.isArray(data.campaigns)?data.campaigns:[])).catch(()=>setCampaigns([]))},[]);
  const openComposer=(campaign?:Campaign)=>{if(campaign){setPushTitle(campaign.title);setPushMessage(campaign.message);setPushUrl(campaign.url)}setActiveTab("campaigns");setStep("compose");setSendStatus("");setComposer(true);window.scrollTo({top:0,behavior:"smooth"})};
  const applyTemplate=(template:(typeof templates)[number])=>{setPushTitle(template.title);setPushMessage(template.message);setPushUrl(template.url);setSendStatus("")};
  const useTrackingLink=()=>{if(!trackingLink)return;setPushUrl(trackingLink);setActiveTab("campaigns");setComposer(true);setStep("compose");setToolNotice("")};
  const copyTrackingLink=async()=>{if(!trackingLink)return;try{await navigator.clipboard.writeText(trackingLink);setToolNotice("Tracking link copied.")}catch{setToolNotice("Copy is unavailable. Select the link and copy it manually.")}};
  const exportCampaigns=()=>{const rows=[["Campaign","Message","Destination","Sent","Status","Recipients","Opens","Open rate"],...filteredCampaigns.map(campaign=>[campaign.title,campaign.message,campaign.url,campaign.createdAt,campaign.status,String(campaign.recipientCount),String(campaign.opens),campaign.openRate===null?"":String(campaign.openRate)])];const csv=rows.map(row=>row.map(value=>`"${String(value).replaceAll('"','""')}"`).join(",")).join("\r\n");const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const anchor=document.createElement("a");anchor.href=url;anchor.download=`carters-marketing-${new Date().toISOString().slice(0,10)}.csv`;anchor.click();URL.revokeObjectURL(url)};
  const sendPush=async()=>{if(!canReview||sending)return;setSending(true);setSendStatus("Sending campaign…");try{const response=await fetch("/api/push/send",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:pushTitle,message:pushMessage,url:pushUrl})});const result=await response.json();if(!response.ok)throw new Error(result.error||"Unable to send campaign.");setSendStatus(result.queued&&result.sent===0?"Campaign added to the local test inbox.":`Campaign sent to ${result.sent} device${result.sent===1?"":"s"}.${result.failed?` ${result.failed} invalid registration${result.failed===1?" was":"s were"} skipped.`:""}`);setComposer(false);setStep("compose");await refreshCampaigns()}catch(error){setSendStatus(error instanceof Error?error.message:"Unable to send campaign.")}finally{setSending(false)}};
  return <div className={`${styles.content} ${styles.notificationPage}`}>
    <section className={`${styles.notificationHero} ${styles.marketingHero}`}><div><p>MARKETING CENTER</p><h2>Turn customer attention into growth</h2><span>Plan campaigns, understand engagement, and prepare your advertising channels from one workspace.</span></div><button className={styles.primary} onClick={()=>openComposer()}>＋ Create push campaign</button></section>
    <nav className={styles.marketingTabs} aria-label="Marketing sections">{([['overview','Overview'],['campaigns','Push campaigns'],['tools','Campaign tools'],['integrations','Integrations']] as [MarketingTab,string][]).map(([id,label])=><button type="button" key={id} className={activeTab===id?styles.marketingTabActive:""} onClick={()=>setActiveTab(id)}>{label}{id==="campaigns"&&campaigns.length?<span>{campaigns.length}</span>:null}</button>)}</nav>
    {sendStatus&&!composer&&<div className={styles.notificationNotice}>{sendStatus}</div>}
    {activeTab==="overview"&&<>
      <div className={styles.metricGrid}><MiniMetric value={deviceCount===null?"—":deviceCount.toLocaleString()} label="Reachable audience" note="Registered push devices"/><MiniMetric value={averageOpenRate===null?"—":`${averageOpenRate}%`} label="Average open rate" note="Across measured campaigns"/><MiniMetric value={totalOpens.toLocaleString()} label="Campaign opens" note="Unique recorded opens"/><MiniMetric value={campaigns.length.toLocaleString()} label="Campaigns sent" note="Latest 100 retained"/></div>
      <div className={styles.marketingOverviewGrid}>
        <section className={`${styles.card} ${styles.marketingPerformance}`}><div className={styles.cardHead}><div><h2>Campaign performance</h2><p>A quick view of your push marketing health.</p></div><button className={styles.secondary} type="button" onClick={()=>setActiveTab("campaigns")}>View campaigns</button></div><div className={styles.marketingPerformanceBody}><div className={styles.marketingScore}><strong>{averageOpenRate===null?"—":`${averageOpenRate}%`}</strong><span>Average open rate</span><i><b style={{width:`${Math.min(100,averageOpenRate||0)}%`}}/></i></div><div className={styles.marketingHighlights}><article><span>Best campaign</span><strong>{bestCampaign?.title||"No measured campaign yet"}</strong><small>{bestCampaign?.openRate===null||bestCampaign===undefined?"Send a campaign to begin measuring.":`${bestCampaign.openRate}% open rate · ${bestCampaign.opens} opens`}</small></article><article><span>Total delivery</span><strong>{totalRecipients.toLocaleString()} notifications</strong><small>{deviceCount?`${deviceCount.toLocaleString()} devices are currently reachable.`:"Register a production device to enable delivery."}</small></article></div></div></section>
        <section className={`${styles.card} ${styles.marketingChannels}`}><div className={styles.cardHead}><div><h2>Channel readiness</h2><p>Your available customer acquisition channels.</p></div></div><div><article><span className={styles.channelPush}>◇</span><div><strong>Push notifications</strong><small>Owned mobile audience</small></div><i className={`${styles.tag} ${deviceCount?styles.tagGreen:styles.tagBlue}`}>{deviceCount?"Ready":"Development"}</i></article><article><span className={styles.channelMeta}>f</span><div><strong>Meta Ads</strong><small>Facebook and Instagram</small></div><i className={`${styles.tag} ${styles.tagGray}`}>Not connected</i></article><article><span className={styles.channelGoogle}>G</span><div><strong>Google Ads</strong><small>App campaigns and conversions</small></div><i className={`${styles.tag} ${styles.tagGray}`}>Not connected</i></article></div><button className={styles.secondary} type="button" onClick={()=>setActiveTab("integrations")}>Review integrations</button></section>
      </div>
      <section className={`${styles.card} ${styles.marketingRecent}`}><div className={styles.cardHead}><div><h2>Recent activity</h2><p>Your latest customer messages and results.</p></div><button className={styles.secondary} type="button" onClick={()=>openComposer()}>Create campaign</button></div>{campaigns.length?<div>{campaigns.slice(0,3).map(c=><article key={c.id}><span className={styles.notificationAppIcon}>C</span><div><strong>{c.title}</strong><small>{new Date(c.createdAt).toLocaleString()} · {c.recipientCount||"Test"} recipients</small></div><b>{c.openRate===null?`${c.opens} opens`:`${c.openRate}% open rate`}</b><button className={styles.secondary} type="button" onClick={()=>openComposer(c)}>Use again</button></article>)}</div>:<div className={styles.notificationEmpty}><span>◇</span><strong>No campaign activity yet</strong><p>Create your first push campaign to start measuring engagement.</p><button className={styles.primary} onClick={()=>openComposer()}>Create campaign</button></div>}</section>
    </>}
    {activeTab==="campaigns"&&<>
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
    <section className={`${styles.card} ${styles.notificationHistory}`}><div className={styles.cardHead}><div><h2>Campaign history</h2><p>Search, filter, reuse, and export your customer messages. {refreshMessage}</p></div><button className={styles.secondary} onClick={refreshCampaigns}>↻ Refresh</button></div><div className={styles.marketingCampaignToolbar}><label><span>Search</span><input value={campaignQuery} onChange={event=>setCampaignQuery(event.target.value)} placeholder="Campaign title or message"/></label><label><span>Status</span><select value={campaignStatus} onChange={event=>setCampaignStatus(event.target.value)}><option value="all">All statuses</option><option value="submitted">Submitted</option><option value="test-queued">Local test</option><option value="failed">Failed</option></select></label><label><span>Period</span><select value={campaignPeriod} onChange={event=>setCampaignPeriod(event.target.value)}><option value="all">All time</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></label><button className={styles.secondary} type="button" disabled={!filteredCampaigns.length} onClick={exportCampaigns}>⇩ Export CSV</button></div>{filteredCampaigns.length?<><p className={styles.marketingResultCount}>{filteredCampaigns.length} of {campaigns.length} campaign{campaigns.length===1?"":"s"}</p><div className={styles.dataTable}><div className={styles.tableHead}><span>Campaign</span><span>Sent</span><span>Status</span><span>Recipients</span><span>Performance</span><span>Action</span></div>{filteredCampaigns.map(c=><div className={styles.tableRow} key={c.id}><div className={styles.notificationCampaignCell}><strong>{c.title}</strong><small>{c.message}</small></div><span>{new Date(c.createdAt).toLocaleString()}</span><span><i className={`${styles.tag} ${c.status==="submitted"?styles.tagGreen:c.status==="failed"?styles.tagGray:styles.tagBlue}`}>{c.status==="test-queued"?"Local test":c.status}</i></span><strong>{c.recipientCount||"Test"}</strong><span>{c.openRate===null?`${c.opens} opens`:`${c.opens} opens · ${c.openRate}%`}</span><button className={styles.secondary} type="button" onClick={()=>openComposer(c)}>Use again</button></div>)}</div></>:<div className={styles.notificationEmpty}><span>⌕</span><strong>{campaigns.length?"No campaigns match these filters":"No campaigns yet"}</strong><p>{campaigns.length?"Try changing the search, status, or period.":"Create your first notification to start measuring customer engagement."}</p>{!campaigns.length&&<button className={styles.primary} onClick={()=>openComposer()}>Create campaign</button>}</div>}</section>
    <section className={styles.notificationAutomationNotice}><span>⚙</span><div><strong>Automations are not enabled yet</strong><p>Cart reminders, back-in-stock alerts, and birthday messages require a persistent scheduler and customer targeting rules.</p></div><i className={`${styles.tag} ${styles.tagGray}`}>Setup required</i></section>
    </>}
    {activeTab==="tools"&&<>
      {toolNotice&&<div className={styles.notificationNotice}>{toolNotice}</div>}
      <div className={styles.marketingToolsGrid}>
        <section className={`${styles.card} ${styles.marketingLinkBuilder}`}><div className={styles.cardHead}><div><h2>Campaign link builder</h2><p>Create consistent UTM links for Instagram, Facebook, Google, email, or push.</p></div><span className={`${styles.tag} ${styles.tagBlue}`}>Tracking tool</span></div><div className={styles.marketingToolForm}><label className={styles.marketingToolWide}><span>Destination</span><input value={linkDestination} onChange={event=>setLinkDestination(event.target.value)} placeholder="/collection/new-arrivals or https://…"/></label><label><span>Source</span><input value={utmSource} onChange={event=>setUtmSource(event.target.value)} placeholder="instagram"/></label><label><span>Medium</span><input value={utmMedium} onChange={event=>setUtmMedium(event.target.value)} placeholder="paid_social"/></label><label><span>Campaign name</span><input value={utmCampaign} onChange={event=>setUtmCampaign(event.target.value)} placeholder="summer_sale"/></label></div><div className={styles.marketingGeneratedLink}><span>Generated tracking link</span><strong>{trackingLink||"Complete the destination to generate a link."}</strong><div><button className={styles.secondary} type="button" disabled={!trackingLink} onClick={copyTrackingLink}>Copy link</button><button className={styles.primary} type="button" disabled={!trackingLink} onClick={useTrackingLink}>Use in push campaign</button></div></div></section>
        <section className={`${styles.card} ${styles.marketingChecklist}`}><div className={styles.cardHead}><div><h2>Launch checklist</h2><p>Review the essentials before publishing.</p></div></div>{[["Clear objective","Choose one action: shop, discover, register, or return."],["Focused audience","Send the message only to customers who should receive it."],["Trackable destination","Use a campaign link so traffic can be attributed."],["Final mobile review","Check the title, message, destination, and offer details."],["Post-launch measurement","Review opens, conversions, revenue, and unsubscribes."]].map(([title,copy],index)=><article key={title}><span>{index+1}</span><div><strong>{title}</strong><small>{copy}</small></div></article>)}</section>
      </div>
      <section className={`${styles.card} ${styles.marketingTemplateLibrary}`}><div className={styles.cardHead}><div><h2>Campaign starter library</h2><p>Professional starting points that remain fully editable.</p></div></div><div>{templates.map(template=><article key={template.name}><span>{template.icon}</span><div><small>{template.name}</small><strong>{template.title}</strong><p>{template.message}</p><code>{template.url}</code></div><button className={styles.secondary} type="button" onClick={()=>{applyTemplate(template);openComposer()}}>Use template</button></article>)}</div></section>
    </>}
    {activeTab==="integrations"&&<section className={styles.marketingIntegrationGrid}>
      <article className={styles.marketingIntegrationCard}><header><span className={styles.channelPush}>◇</span><i className={`${styles.tag} ${deviceCount?styles.tagGreen:styles.tagBlue}`}>{deviceCount?"Ready":"Development"}</i></header><h3>Push notifications</h3><p>Reach customers directly with product launches, offers, and service messages.</p><div><span>Audience</span><strong>{deviceCount===null?"Unavailable":`${deviceCount.toLocaleString()} devices`}</strong></div><footer><small>{deviceCount?"Expo push delivery is receiving device registrations.":"Use a development build and register a device for production delivery."}</small><button className={styles.primary} type="button" onClick={()=>openComposer()}>Create campaign</button></footer></article>
      <article className={styles.marketingIntegrationCard}><header><span className={styles.channelMeta}>f</span><i className={`${styles.tag} ${styles.tagGray}`}>Not connected</i></header><h3>Meta Ads</h3><p>Bring Facebook and Instagram campaign spend, clicks, and attributed purchases into this workspace.</p><div><span>Required setup</span><strong>Meta business and app credentials</strong></div><footer><small>Credentials must be stored securely on the admin server before live reporting can be enabled.</small></footer></article>
      <article className={styles.marketingIntegrationCard}><header><span className={styles.channelGoogle}>G</span><i className={`${styles.tag} ${styles.tagGray}`}>Not connected</i></header><h3>Google Ads</h3><p>Measure app campaign installs, commerce events, conversions, and advertising return.</p><div><span>Required setup</span><strong>Firebase and Google Ads linking</strong></div><footer><small>Firebase app analytics must be configured in a development build before conversion data is available.</small></footer></article>
      <aside className={styles.marketingSetupNotice}><span>i</span><div><strong>Advertising data is not connected yet</strong><p>These cards show the real integration status. No estimated spend, revenue, or return is displayed until verified platform data is available.</p></div></aside>
    </section>}
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

function Orders({initialFilter,initialSearch=""}:{initialFilter:OrderFilter;initialSearch?:string}){
  const [orders,setOrders]=useState<AdminOrder[]>([]);
  const [pendingCount,setPendingCount]=useState(0);
  const [search,setSearch]=useState(initialSearch);
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState("");
  const [statusFilter,setStatusFilter]=useState<OrderFilter>(initialFilter);
  const [paymentFilter,setPaymentFilter]=useState("all");
  const [fulfillmentFilter,setFulfillmentFilter]=useState("all");
  const [dateFrom,setDateFrom]=useState("");
  const [dateTo,setDateTo]=useState("");
  const [minTotal,setMinTotal]=useState("");
  const [maxTotal,setMaxTotal]=useState("");
  const [orderSort,setOrderSort]=useState("newest");
  const [savedViews,setSavedViews]=useState<SavedOrderView[]>([]);
  const [savedViewName,setSavedViewName]=useState("");
  const [selectedOrderIds,setSelectedOrderIds]=useState<string[]>([]);
  const [bulkNotifyCustomer,setBulkNotifyCustomer]=useState(false);
  const [selectedId,setSelectedId]=useState("");
  const [saving,setSaving]=useState(false);
  const [notifyCustomer,setNotifyCustomer]=useState(false);
  const [draft,setDraft]=useState<OrderDraft|null>(null);
  const [pageInfo,setPageInfo]=useState<{hasNextPage:boolean;endCursor:string|null}>({hasNextPage:false,endCursor:null});
  const loadOrders=useCallback(async(term:string,after:string|null,filter:OrderFilter,rangeFrom="",rangeTo="")=>{
    setLoading(true);setMessage("");
    try{
      const params=new URLSearchParams();
      if(term.trim())params.set("search",term.trim());
      if(filter==="pending")params.set("status","pending");
      if(rangeFrom)params.set("dateFrom",rangeFrom);
      if(rangeTo)params.set("dateTo",rangeTo);
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
    void loadOrders(initialSearch,null,initialFilter);
    /* eslint-enable react-hooks/set-state-in-effect */
    // Initial Shopify load only; search and pagination are explicit actions.
  },[initialFilter,initialSearch,loadOrders]);
  useEffect(()=>{/* eslint-disable react-hooks/set-state-in-effect */try{const stored=JSON.parse(localStorage.getItem("carters-admin-order-views")||"[]");if(Array.isArray(stored))setSavedViews(stored.slice(0,20))}catch{/* keep empty */}/* eslint-enable react-hooks/set-state-in-effect */},[]);
  const money=(value:AdminOrder["total"])=>{if(!value)return "—";try{return new Intl.NumberFormat(undefined,{style:"currency",currency:value.currencyCode}).format(Number(value.amount))}catch{return `${value.amount} ${value.currencyCode}`}};
  const paidCount=orders.filter(order=>order.financialStatus==="PAID").length;
  const openFulfillmentCount=orders.filter(order=>!(["FULFILLED","RESTOCKED"] as string[]).includes(order.fulfillmentStatus)).length;
  const sales=orders.reduce((sum,order)=>sum+(Number(order.total?.amount)||0),0);
  const currency=orders.find(order=>order.total?.currencyCode)?.total?.currencyCode;
  const salesLabel=currency?money({amount:String(sales),currencyCode:currency}):"—";
  const query=search.trim().toLowerCase();const minimum=minTotal===""?null:Number(minTotal);const maximum=maxTotal===""?null:Number(maxTotal);
  const filteredOrders=orders.filter(order=>{
    const statusMatches=statusFilter==="all"||statusFilter==="pending"||(statusFilter==="unfulfilled"&&!order.cancelledAt&&order.fulfillmentStatus!=="FULFILLED")||(statusFilter==="unpaid"&&!order.cancelledAt&&order.financialStatus!=="PAID")||(statusFilter==="paid"&&!order.cancelledAt&&order.financialStatus==="PAID")||(statusFilter==="cancelled"&&Boolean(order.cancelledAt));
    const searchable=`${order.name} ${order.customer} ${order.email} ${order.destination} ${order.tags.join(" ")} ${order.items.map(item=>`${item.name} ${item.sku||""}`).join(" ")}`.toLowerCase();
    const paymentMatches=paymentFilter==="all"||(paymentFilter==="paid"&&order.financialStatus==="PAID")||(paymentFilter==="unpaid"&&!(["PAID","REFUNDED"] as string[]).includes(order.financialStatus))||(paymentFilter==="refunded"&&/REFUND/.test(order.financialStatus));
    const fulfillmentMatches=fulfillmentFilter==="all"||(fulfillmentFilter==="fulfilled"&&order.fulfillmentStatus==="FULFILLED")||(fulfillmentFilter==="unfulfilled"&&order.fulfillmentStatus!=="FULFILLED")||(fulfillmentFilter==="cancelled"&&Boolean(order.cancelledAt));
    const orderDay=order.createdAt.slice(0,10);const total=Number(order.total?.amount)||0;
    return statusMatches&&(!query||searchable.includes(query))&&paymentMatches&&fulfillmentMatches&&(!dateFrom||orderDay>=dateFrom)&&(!dateTo||orderDay<=dateTo)&&(minimum===null||total>=minimum)&&(maximum===null||total<=maximum);
  }).sort((a,b)=>orderSort==="oldest"?new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime():orderSort==="highest"?(Number(b.total?.amount)||0)-(Number(a.total?.amount)||0):orderSort==="lowest"?(Number(a.total?.amount)||0)-(Number(b.total?.amount)||0):new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime());
  const selectedOrders=orders.filter(order=>selectedOrderIds.includes(order.id));
  const fulfillableSelected=selectedOrders.filter(order=>!order.cancelledAt&&order.fulfillmentStatus!=="FULFILLED");
  const selectedOrder=orders.find(order=>order.id===selectedId);
  const toggleOrder=(id:string)=>setSelectedOrderIds(current=>current.includes(id)?current.filter(value=>value!==id):[...current,id]);
  const selectVisibleOrders=()=>setSelectedOrderIds(current=>filteredOrders.every(order=>current.includes(order.id))?current.filter(id=>!filteredOrders.some(order=>order.id===id)):[...new Set([...current,...filteredOrders.map(order=>order.id)])]);
  const changeOrderFilter=(filter:OrderFilter)=>{setStatusFilter(filter);setSelectedOrderIds([]);void loadOrders(search,null,filter,dateFrom,dateTo)};
  const resetOrderFilters=()=>{setSearch("");setStatusFilter("all");setPaymentFilter("all");setFulfillmentFilter("all");setDateFrom("");setDateTo("");setMinTotal("");setMaxTotal("");setOrderSort("newest");setSelectedOrderIds([]);void loadOrders("",null,"all")};
  const applyOrderDatePreset=(preset:"7"|"30"|"month")=>{const end=new Date();const start=preset==="month"?new Date(end.getFullYear(),end.getMonth(),1):new Date(end.getFullYear(),end.getMonth(),end.getDate()-(Number(preset)-1));const localDate=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;const from=localDate(start);const to=localDate(end);setDateFrom(from);setDateTo(to);void loadOrders(search,null,statusFilter,from,to)};
  const persistOrderViews=(views:SavedOrderView[])=>{setSavedViews(views);localStorage.setItem("carters-admin-order-views",JSON.stringify(views))};
  const saveCurrentOrderView=()=>{const name=savedViewName.trim();if(!name){setMessage("Enter a name for this saved view.");return}const snapshot:SavedOrderView={id:`order-view-${Date.now()}`,name:name.slice(0,40),search,statusFilter,paymentFilter,fulfillmentFilter,dateFrom,dateTo,minTotal,maxTotal,orderSort};const existing=savedViews.findIndex(item=>item.name.toLowerCase()===name.toLowerCase());const next=existing>=0?savedViews.map((item,index)=>index===existing?{...snapshot,id:item.id}:item):[...savedViews,snapshot].slice(-20);persistOrderViews(next);setSavedViewName("");setMessage(`Saved order view “${snapshot.name}”.`)};
  const applySavedOrderView=(saved:SavedOrderView)=>{setSearch(saved.search);setStatusFilter(saved.statusFilter);setPaymentFilter(saved.paymentFilter);setFulfillmentFilter(saved.fulfillmentFilter);setDateFrom(saved.dateFrom);setDateTo(saved.dateTo);setMinTotal(saved.minTotal);setMaxTotal(saved.maxTotal);setOrderSort(saved.orderSort);setSelectedOrderIds([]);void loadOrders(saved.search,null,saved.statusFilter,saved.dateFrom,saved.dateTo)};
  const deleteSavedOrderView=(id:string)=>persistOrderViews(savedViews.filter(item=>item.id!==id));
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
      await loadOrders(search,null,statusFilter,dateFrom,dateTo);
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
      await loadOrders(search,null,statusFilter,dateFrom,dateTo);
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
      await loadOrders(search,null,statusFilter,dateFrom,dateTo);
    }catch(error){setMessage(error instanceof Error?error.message:"Unable to cancel order.")}
    finally{setSaving(false)}
  };
  return <div className={styles.content}>
    <div className={styles.actionHeader}><div><h2>Orders</h2><p>Live Shopify orders, newest first.</p></div><form className={styles.customerSearch} onSubmit={event=>{event.preventDefault();void loadOrders(search,null,statusFilter,dateFrom,dateTo)}}><input className={styles.smallSearch} placeholder="Search order, customer, email, product, or SKU" value={search} onChange={event=>setSearch(event.target.value)}/><button className={styles.primary} disabled={loading} type="submit">Search</button>{search&&<button className={styles.secondary} disabled={loading} type="button" onClick={()=>{setSearch("");void loadOrders("",null,statusFilter,dateFrom,dateTo)}}>Clear</button>}</form></div>
    <div className={styles.orderFilters} role="tablist" aria-label="Filter orders">{([["all","All"],["pending",`Pending (${pendingCount})`],["unfulfilled","Unfulfilled"],["unpaid","Unpaid"],["paid","Paid"],["cancelled","Cancelled"]] as [OrderFilter,string][]).map(([value,label])=><button key={value} role="tab" aria-selected={statusFilter===value} className={statusFilter===value?styles.orderFilterActive:""} onClick={()=>changeOrderFilter(value)}>{label}</button>)}</div>
    <section className={styles.orderSavedViews}><div className={styles.orderSavedViewsTitle}><span>★</span><div><strong>Saved views</strong><small>Reuse important order searches and filters</small></div></div><div className={styles.orderSavedViewList}>{savedViews.length?savedViews.map(saved=><article key={saved.id}><button type="button" onClick={()=>applySavedOrderView(saved)}>{saved.name}</button><button type="button" aria-label={`Delete saved view ${saved.name}`} title="Delete saved view" onClick={()=>deleteSavedOrderView(saved.id)}>×</button></article>):<small>No saved views yet</small>}</div><form onSubmit={event=>{event.preventDefault();saveCurrentOrderView()}}><input maxLength={40} value={savedViewName} onChange={event=>setSavedViewName(event.target.value)} placeholder="Name this view"/><button className={styles.secondary} type="submit">Save current</button></form></section>
    <section className={styles.orderAdvancedFilters}><div className={styles.orderFilterHeading}><div><strong>Advanced filters</strong><small>{filteredOrders.length} of {orders.length} loaded orders shown</small></div><div className={styles.orderDatePresets}><button type="button" onClick={()=>applyOrderDatePreset("7")}>Last 7 days</button><button type="button" onClick={()=>applyOrderDatePreset("30")}>Last 30 days</button><button type="button" onClick={()=>applyOrderDatePreset("month")}>This month</button><button type="button" onClick={()=>void loadOrders(search,null,statusFilter,dateFrom,dateTo)}>Apply range</button><button className={styles.orderResetFilters} type="button" onClick={resetOrderFilters}>Reset filters</button></div></div><div className={styles.orderFilterGrid}><label>Payment<select value={paymentFilter} onChange={event=>setPaymentFilter(event.target.value)}><option value="all">All payment states</option><option value="paid">Paid</option><option value="unpaid">Unpaid / pending</option><option value="refunded">Refunded</option></select></label><label>Fulfillment<select value={fulfillmentFilter} onChange={event=>setFulfillmentFilter(event.target.value)}><option value="all">All fulfillment states</option><option value="fulfilled">Fulfilled</option><option value="unfulfilled">Not fulfilled</option><option value="cancelled">Cancelled</option></select></label><label>From<input type="date" value={dateFrom} max={dateTo||undefined} onChange={event=>setDateFrom(event.target.value)}/></label><label>To<input type="date" value={dateTo} min={dateFrom||undefined} onChange={event=>setDateTo(event.target.value)}/></label><label>Minimum total<input type="number" min="0" step="0.01" inputMode="decimal" placeholder="Any" value={minTotal} onChange={event=>setMinTotal(event.target.value)}/></label><label>Maximum total<input type="number" min="0" step="0.01" inputMode="decimal" placeholder="Any" value={maxTotal} onChange={event=>setMaxTotal(event.target.value)}/></label><label>Sort orders<select value={orderSort} onChange={event=>setOrderSort(event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="highest">Highest total</option><option value="lowest">Lowest total</option></select></label></div></section>
    {selectedOrders.length>0&&<div className={styles.orderBulkBar}><strong>{selectedOrders.length} selected</strong><label><input type="checkbox" checked={bulkNotifyCustomer} onChange={event=>setBulkNotifyCustomer(event.target.checked)}/>Notify customers</label><button className={styles.secondary} type="button" onClick={printSelectedOrders}>Print orders</button><button className={styles.primary} type="button" disabled={saving||!fulfillableSelected.length} onClick={()=>void bulkFulfillOrders()}>{saving?"Fulfilling...":`Mark fulfilled (${fulfillableSelected.length})`}</button><button className={styles.secondary} type="button" onClick={()=>setSelectedOrderIds([])}>Clear</button></div>}
    <div className={styles.segmentGrid}>{([{title:"Loaded orders",copy:"Show every loaded order",value:String(orders.length),filter:"all"},{title:"Paid",copy:"Show paid orders",value:String(paidCount),filter:"paid"},{title:"Needs fulfillment",copy:"Show open fulfillments",value:String(openFulfillmentCount),filter:"unfulfilled"},{title:"Order value",copy:"Loaded page total",value:salesLabel,filter:"all"}] as {title:string;copy:string;value:string;filter:OrderFilter}[]).map(item=>{const active=statusFilter===item.filter&&item.title!=="Order value";return <button className={`${styles.segment} ${styles.orderSummaryFilter} ${active?styles.orderSummaryFilterActive:""}`} type="button" key={item.title} aria-pressed={active} onClick={()=>changeOrderFilter(item.filter)}><span>▤</span><div><strong>{item.title}</strong><small>{item.copy}</small></div><b>{item.value}</b><i>View →</i></button>})}</div>
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
      {pageInfo.hasNextPage&&<div className={styles.inlineActions}><button className={styles.secondary} disabled={loading} onClick={()=>void loadOrders(search,pageInfo.endCursor,statusFilter,dateFrom,dateTo)}>Load more</button></div>}
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

function Customers({initialSearch=""}:{initialSearch?:string}){
  const [referenceTime]=useState(()=>Date.now());
  const [customers,setCustomers]=useState<AdminCustomer[]>([]);
  const [search,setSearch]=useState(initialSearch);
  const [statusFilter,setStatusFilter]=useState("all");
  const [minOrders,setMinOrders]=useState("");
  const [maxOrders,setMaxOrders]=useState("");
  const [minSpent,setMinSpent]=useState("");
  const [maxSpent,setMaxSpent]=useState("");
  const [createdFrom,setCreatedFrom]=useState("");
  const [createdTo,setCreatedTo]=useState("");
  const [inactiveOnly,setInactiveOnly]=useState(false);
  const [inactiveMonths,setInactiveMonths]=useState("2");
  const [segmentFilter,setSegmentFilter]=useState("all");
  const [loyaltyFilter,setLoyaltyFilter]=useState("all");
  const [loyaltyTierFilter,setLoyaltyTierFilter]=useState("all");
  const [minPoints,setMinPoints]=useState("");
  const [maxPoints,setMaxPoints]=useState("");
  const [lastOrderFrom,setLastOrderFrom]=useState("");
  const [lastOrderTo,setLastOrderTo]=useState("");
  const [sortBy,setSortBy]=useState("recent");
  const [loading,setLoading]=useState(true);
  const [loadedAll,setLoadedAll]=useState(false);
  const [expandedLoyaltyId,setExpandedLoyaltyId]=useState("");
  const [customerLoyaltySettings,setCustomerLoyaltySettings]=useState<CustomerLoyaltySettings>({enabled:true,programName:"Carter's Rewards",pointsPerItem:1,pointsPerCurrencyUnit:10,minimumRedemptionPoints:50,rewardExpiryDays:30,silverTierPoints:50,goldTierPoints:250,vipTierPoints:500});
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
       if(data.loyaltySettings)setCustomerLoyaltySettings(data.loyaltySettings);
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
       setCustomers(items=>items.map(item=>item.id===editingId?{...data.customer,loyalty:item.loyalty}:item));
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
    void loadCustomers(initialSearch,null);
    /* eslint-enable react-hooks/set-state-in-effect */
    // The initial load should run once; subsequent loads are driven by search and pagination actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[initialSearch]);
  const statusOptions=Array.from(new Set(customers.map(customer=>customer.status).filter(Boolean)));
  const amountValue=(customer:AdminCustomer)=>Number(customer.totalSpent?.amount??0)||0;
  const minOrderValue=minOrders===""?null:Number(minOrders);
  const maxOrderValue=maxOrders===""?null:Number(maxOrders);
  const minSpentValue=minSpent===""?null:Number(minSpent);
  const maxSpentValue=maxSpent===""?null:Number(maxSpent);
  const minPointsValue=minPoints===""?null:Number(minPoints);
  const maxPointsValue=maxPoints===""?null:Number(maxPoints);
  const inactiveMonthValue=Math.max(1,Number(inactiveMonths)||2);
  const inactiveSince=new Date();
  inactiveSince.setMonth(inactiveSince.getMonth()-inactiveMonthValue);
  const sixtyDaysAgo=new Date(referenceTime-60*86400000);
  const oneYearAgo=new Date(referenceTime);oneYearAgo.setFullYear(oneYearAgo.getFullYear()-1);
  const loyaltyTier=(customer:AdminCustomer)=>{if(!customer.loyalty.enrolled)return "none";if(customer.loyalty.lifetimePoints>=customerLoyaltySettings.vipTierPoints)return "vip";if(customer.loyalty.lifetimePoints>=customerLoyaltySettings.goldTierPoints)return "gold";if(customer.loyalty.lifetimePoints>=customerLoyaltySettings.silverTierPoints)return "silver";return "member"};
  const customerSegment=(customer:AdminCustomer)=>{
    const lastOrder=customer.lastOrderAt?new Date(customer.lastOrderAt):null;
    const dormant=customer.orders>0&&(!lastOrder||lastOrder<sixtyDaysAgo);
    if(customer.orders===1&&lastOrder&&lastOrder>=oneYearAgo)return "one-time-year";
    if(dormant&&!customer.loyalty.enrolled)return "dormant-non-loyal";
    if(dormant)return "at-risk";
    if(customer.loyalty.enrolled&&customer.loyalty.lifetimePoints>0)return "loyal";
    if(customer.orders===0)return "prospect";
    return "active";
  };
  const loadAllCustomers=async()=>{
    setLoading(true);setMessage("Loading the complete customer audience...");
    try{
      const all:AdminCustomer[]=[];let after:string|null=null;let hasNext=true;let pages=0;
      while(hasNext&&pages<100){const params=new URLSearchParams();if(search.trim())params.set("search",search.trim());if(createdFrom)params.set("createdFrom",createdFrom);if(createdTo)params.set("createdTo",createdTo);if(after)params.set("after",after);const response=await fetch(`/api/shopify/customers?${params}`,{cache:"no-store"});const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to load the complete customer audience.");all.push(...(Array.isArray(data.customers)?data.customers:[]));if(data.loyaltySettings)setCustomerLoyaltySettings(data.loyaltySettings);hasNext=Boolean(data.pageInfo?.hasNextPage&&data.pageInfo?.endCursor);after=hasNext?data.pageInfo.endCursor:null;pages+=1;if(hasNext)setMessage(`Preparing retention analysis... ${all.length} customers loaded.`)}
      if(hasNext)throw new Error("Customer analysis reached the 5,000-profile safety limit. Narrow the creation dates and try again.");
      setCustomers(all);setPageInfo({hasNextPage:false,endCursor:null});setLoadedAll(true);setMessage(`Retention analysis ready for ${all.length} customer${all.length===1?"":"s"}.`);
    }catch(error){setMessage(error instanceof Error?error.message:"Unable to prepare retention analysis.")}finally{setLoading(false)}
  };
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
      && (!lastOrderFrom||Boolean(customer.lastOrderAt&&customer.lastOrderAt.slice(0,10)>=lastOrderFrom))
      && (!lastOrderTo||Boolean(customer.lastOrderAt&&customer.lastOrderAt.slice(0,10)<=lastOrderTo))
      && (!inactiveOnly||(customer.orders>0&&(!lastOrderDate||lastOrderDate<inactiveSince)))
      && (segmentFilter==="all"||customerSegment(customer)===segmentFilter)
      && (loyaltyFilter==="all"||(loyaltyFilter==="enrolled"&&customer.loyalty.enrolled)||(loyaltyFilter==="not-enrolled"&&!customer.loyalty.enrolled)||(loyaltyFilter==="balance"&&customer.loyalty.points>0)||(loyaltyFilter==="zero"&&customer.loyalty.enrolled&&customer.loyalty.points===0))
      && (loyaltyTierFilter==="all"||loyaltyTier(customer)===loyaltyTierFilter)
      && (minPointsValue===null||customer.loyalty.points>=minPointsValue)
      && (maxPointsValue===null||customer.loyalty.points<=maxPointsValue);
  };
  const filteredCustomers=customers.filter(matchesCustomer).sort((a,b)=>sortBy==="points"?b.loyalty.points-a.loyalty.points:sortBy==="lifetime-points"?b.loyalty.lifetimePoints-a.loyalty.lifetimePoints:sortBy==="orders"?b.orders-a.orders:sortBy==="spent"?amountValue(b)-amountValue(a):sortBy==="oldest-order"?String(a.lastOrderAt||"").localeCompare(String(b.lastOrderAt||"")):String(b.lastOrderAt||"").localeCompare(String(a.lastOrderAt||"")));
  const totalOrders=filteredCustomers.reduce((sum,customer)=>sum+customer.orders,0);
  const activeCount=filteredCustomers.filter(customer=>customer.status==="ENABLED").length;
  const oneTimeCount=customers.filter(customer=>customerSegment(customer)==="one-time-year").length;
  const dormantNonLoyalCount=customers.filter(customer=>customerSegment(customer)==="dormant-non-loyal").length;
  const loyaltyCount=customers.filter(customer=>customer.loyalty.enrolled).length;
  const outstandingPoints=filteredCustomers.reduce((sum,customer)=>sum+customer.loyalty.points,0);
  const segmentLabel=(segment:string)=>segment==="one-time-year"?"One-time buyer":segment==="dormant-non-loyal"?"Dormant non-loyal":segment==="at-risk"?"At risk":segment==="loyal"?"Loyalty member":segment==="prospect"?"No purchases":"Active customer";
  const segmentTone=(segment:string)=>segment==="loyal"?styles.tagGreen:segment==="dormant-non-loyal"||segment==="at-risk"?styles.tagGray:styles.tagBlue;
  const formatSpent=(value:AdminCustomer["totalSpent"])=>{if(!value)return "—";try{return new Intl.NumberFormat(undefined,{style:"currency",currency:value.currencyCode}).format(Number(value.amount))}catch{return `${value.amount} ${value.currencyCode}`}};
  const formatDate=(value?:string|null)=>value?new Date(value).toLocaleDateString():"—";
  const hasCustomerFilters=Boolean(search||statusFilter!=="all"||minOrders||maxOrders||minSpent||maxSpent||createdFrom||createdTo||lastOrderFrom||lastOrderTo||inactiveOnly||segmentFilter!=="all"||loyaltyFilter!=="all"||loyaltyTierFilter!=="all"||minPoints||maxPoints||sortBy!=="recent");
  const resetFilters=()=>{setSearch("");setStatusFilter("all");setMinOrders("");setMaxOrders("");setMinSpent("");setMaxSpent("");setCreatedFrom("");setCreatedTo("");setLastOrderFrom("");setLastOrderTo("");setInactiveOnly(false);setInactiveMonths("2");setSegmentFilter("all");setLoyaltyFilter("all");setLoyaltyTierFilter("all");setMinPoints("");setMaxPoints("");setSortBy("recent");setExpandedLoyaltyId("");void loadCustomers("",null,"","")};
  const exportCustomers=()=>{
    if(!filteredCustomers.length){setMessage("No customers match this export filter.");return}
    const columns=["Name","First name","Last name","Email","Phone","Location","Orders","Total spent","Status","Segment","Loyalty member","Available points","Lifetime points","Last order","Created at","Updated at"];
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
      customerSegment(customer),
      customer.loyalty.enrolled?"Yes":"No",
      customer.loyalty.points,
      customer.loyalty.lifetimePoints,
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
       const payload={schemaVersion:2,exportedAt:new Date().toISOString(),source:"Shopify Admin + Carter's Rewards",upsertKey:"shopifyId",creationRange:{from:createdFrom||null,to:createdTo||null},customers:selected.map(customer=>({shopifyId:customer.id,name:customer.name,firstName:customer.firstName,lastName:customer.lastName,email:customer.email||null,phone:customer.phone||null,location:customer.location,orders:customer.orders,totalSpent:customer.totalSpent?Number(customer.totalSpent.amount):0,currencyCode:customer.totalSpent?.currencyCode||null,status:customer.status,segment:customerSegment(customer),loyalty:customer.loyalty,lastOrderAt:customer.lastOrderAt||null,createdAt:customer.createdAt||null,updatedAt:customer.updatedAt||null}))};
      const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=`shopify-customers-database-${createdFrom||"beginning"}-to-${createdTo||"today"}.json`;document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);setMessage(`Prepared all ${selected.length} matching customers for database upsert.`)
    }catch(error){setMessage(error instanceof Error?error.message:"Unable to prepare the customer database export.")}finally{setLoading(false)}
  };
  return (
    <div className={`${styles.content} ${styles.customerAdvancedPage}`}>
      <section className={styles.customerHero}>
        <div>
          <p>CUSTOMER RETENTION</p>
          <h2>Customer intelligence</h2>
          <span>Identify one-time buyers, customers at risk of churn, and loyalty opportunities using live Shopify and Carter&apos;s Rewards data.</span>
        </div>
        <div className={styles.customerHeroActions}>
          <form className={styles.customerSearch} onSubmit={event=>{event.preventDefault();void loadCustomers(search,null)}}>
            <input className={styles.smallSearch} placeholder="Search name, email, or phone" value={search} onChange={event=>setSearch(event.target.value)} />
            <button className={styles.primary} disabled={loading} type="submit">Search</button>
          </form>
          <button className={styles.secondary} disabled={loading||loadedAll} type="button" onClick={()=>void loadAllCustomers()}>{loadedAll?"Full audience loaded":"Load all for analysis"}</button>
          <button className={styles.secondary} disabled={loading||!filteredCustomers.length} type="button" onClick={exportCustomers}>Export CSV</button>
          <button className={styles.secondary} disabled={loading} type="button" onClick={()=>void exportCustomersForDatabase()}>Database JSON</button>
          {hasCustomerFilters&&<button className={styles.secondary} disabled={loading} type="button" onClick={resetFilters}>Reset filters</button>}
        </div>
      </section>

      {message&&<div className={styles.customerNotice}>{message}</div>}

      <section className={styles.customerSegmentGrid}>
        {[
          {id:"all",label:"All customers",copy:loadedAll?"Complete audience":"Currently loaded",value:customers.length,icon:"♙"},
          {id:"one-time-year",label:"One-time buyers",copy:"Exactly 1 purchase · last 12 months",value:oneTimeCount,icon:"1"},
          {id:"dormant-non-loyal",label:"Dormant non-loyal",copy:"No loyalty card · inactive 60+ days",value:dormantNonLoyalCount,icon:"!"},
          {id:"loyal",label:"Loyalty customers",copy:"Members with earned points",value:loyaltyCount,icon:"★"},
        ].map(segment=><button type="button" key={segment.id} className={`${styles.customerSegmentCard} ${segmentFilter===segment.id?styles.customerSegmentActive:""}`} onClick={()=>setSegmentFilter(segment.id)}><span>{segment.icon}</span><div><strong>{segment.label}</strong><small>{segment.copy}</small></div><b>{segment.value.toLocaleString()}</b></button>)}
      </section>

      <section className={styles.customerFilterPanel}>
        <header>
          <div><p>ADVANCED FILTERS</p><h3>Build a customer segment</h3><span>All filters work together and update the customer directory immediately.</span></div>
          <div className={styles.customerFilterSummary}><strong>{filteredCustomers.length.toLocaleString()}</strong><span>matching customers</span></div>
        </header>
        <div className={styles.customerFilterSections}>
          <fieldset>
            <legend>Relationship</legend>
            <label>Customer segment<select value={segmentFilter} onChange={event=>setSegmentFilter(event.target.value)}><option value="all">All customer segments</option><option value="one-time-year">One-time buyer in last 12 months</option><option value="dormant-non-loyal">Dormant non-loyal · 60+ days</option><option value="at-risk">Loyalty member at risk · 60+ days</option><option value="loyal">Loyalty member with earnings</option><option value="active">Active returning customer</option><option value="prospect">Registered with no purchases</option></select></label>
            <label>Loyalty membership<select value={loyaltyFilter} onChange={event=>setLoyaltyFilter(event.target.value)}><option value="all">All loyalty statuses</option><option value="enrolled">Has loyalty card</option><option value="not-enrolled">No loyalty card</option><option value="balance">Has available points</option><option value="zero">Member with zero points</option></select></label>
            <label>Loyalty tier<select value={loyaltyTierFilter} onChange={event=>setLoyaltyTierFilter(event.target.value)}><option value="all">All loyalty tiers</option><option value="vip">VIP</option><option value="gold">Gold</option><option value="silver">Silver</option><option value="member">Member</option><option value="none">Not enrolled</option></select></label>
            <label>Shopify status<select value={statusFilter} onChange={event=>setStatusFilter(event.target.value)}><option value="all">All account statuses</option>{statusOptions.map(status=><option key={status} value={status}>{status.toLowerCase()}</option>)}</select></label>
          </fieldset>
          <fieldset>
            <legend>Purchase behavior</legend>
            <div className={styles.customerRange}><label>Orders from<input type="number" min="0" value={minOrders} onChange={event=>setMinOrders(event.target.value)} placeholder="0"/></label><label>Orders to<input type="number" min="0" value={maxOrders} onChange={event=>setMaxOrders(event.target.value)} placeholder="Any"/></label></div>
            <div className={styles.customerRange}><label>Spent from<input type="number" min="0" step="0.01" value={minSpent} onChange={event=>setMinSpent(event.target.value)} placeholder="0"/></label><label>Spent to<input type="number" min="0" step="0.01" value={maxSpent} onChange={event=>setMaxSpent(event.target.value)} placeholder="Any"/></label></div>
            <label className={styles.customerInlineCheck}><input type="checkbox" checked={inactiveOnly} onChange={event=>setInactiveOnly(event.target.checked)}/><span>Inactive for at least</span><input type="number" min="1" value={inactiveMonths} onChange={event=>setInactiveMonths(event.target.value)}/><span>months</span></label>
          </fieldset>
          <fieldset>
            <legend>Loyalty points</legend>
            <div className={styles.customerRange}><label>Available points from<input type="number" min="0" value={minPoints} onChange={event=>setMinPoints(event.target.value)} placeholder="0"/></label><label>Available points to<input type="number" min="0" value={maxPoints} onChange={event=>setMaxPoints(event.target.value)} placeholder="Any"/></label></div>
            <label>Sort directory<select value={sortBy} onChange={event=>setSortBy(event.target.value)}><option value="recent">Most recent purchase</option><option value="oldest-order">Longest since purchase</option><option value="points">Highest available points</option><option value="lifetime-points">Highest lifetime points</option><option value="orders">Most orders</option><option value="spent">Highest spend</option></select></label>
            <div className={styles.customerPointsSummary}><span>Points in filtered audience</span><strong>{outstandingPoints.toLocaleString()}</strong></div>
          </fieldset>
          <fieldset>
            <legend>Date ranges</legend>
            <div className={styles.customerRange}><label>Last purchase from<input type="date" value={lastOrderFrom} max={lastOrderTo||undefined} onChange={event=>setLastOrderFrom(event.target.value)}/></label><label>Last purchase to<input type="date" value={lastOrderTo} min={lastOrderFrom||undefined} onChange={event=>setLastOrderTo(event.target.value)}/></label></div>
            <div className={styles.customerRange}><label>Customer created from<input type="date" value={createdFrom} max={createdTo||undefined} onChange={event=>setCreatedFrom(event.target.value)}/></label><label>Customer created to<input type="date" value={createdTo} min={createdFrom||undefined} onChange={event=>setCreatedTo(event.target.value)}/></label></div>
          </fieldset>
        </div>
      </section>

      <section className={styles.customerInsightGrid}>
        <article><span>◎</span><div><small>Matching customers</small><strong>{filteredCustomers.length.toLocaleString()}</strong></div></article>
        <article><span>▤</span><div><small>Total orders</small><strong>{totalOrders.toLocaleString()}</strong></div></article>
        <article><span>★</span><div><small>Available points</small><strong>{outstandingPoints.toLocaleString()}</strong></div></article>
        <article><span>✓</span><div><small>Enabled accounts</small><strong>{activeCount.toLocaleString()}</strong></div></article>
      </section>

      <section className={`${styles.card} ${styles.customerTable} ${styles.customerAdvancedTable}`}>
        <div className={styles.cardHead}><div><h2>Customer directory</h2><p>{loadedAll?"Complete audience analysis":"Showing loaded Shopify customers. Load all customers for complete retention totals."}</p></div><i className={`${styles.tag} ${message?styles.tagGray:styles.tagGreen}`}>{loading?"Loading":loadedAll?"Full audience":"Live data"}</i></div>
        <div className={styles.dataTable}>
          <div className={styles.tableHead}><span>Customer</span><span>Relationship</span><span>Commerce</span><span>Loyalty card</span><span>Last purchase</span><span>Actions</span></div>
          {filteredCustomers.length?filteredCustomers.map(customer=>{const segment=customerSegment(customer);return <div className={styles.customerRecord} key={customer.id}><div className={styles.tableRow}>
            <div className={styles.customerCell}><strong>{customer.name}</strong><small>{customer.email||"No email"}</small><small>{customer.location}</small></div>
            <div className={styles.customerRelationship}><i className={`${styles.tag} ${segmentTone(segment)}`}>{segmentLabel(segment)}</i><small>{customer.status.toLowerCase()}</small></div>
            <div className={styles.customerCommerce}><strong>{customer.orders} order{customer.orders===1?"":"s"}</strong><small>{formatSpent(customer.totalSpent)} spent</small></div>
            <div className={styles.customerLoyaltyCell}>{customer.loyalty.enrolled?<><strong>{customer.loyalty.points.toLocaleString()} points</strong><small>{loyaltyTier(customer).toUpperCase()} · {customer.loyalty.lifetimePoints.toLocaleString()} lifetime</small></>:<><strong className={styles.customerNoLoyalty}>Not enrolled</strong><small>No loyalty card</small></>}</div>
            <div className={styles.customerLastOrder}><strong>{formatDate(customer.lastOrderAt)}</strong><small>{customer.lastOrderAt?Math.max(0,Math.floor((referenceTime-new Date(customer.lastOrderAt).getTime())/86400000)).toLocaleString()+" days ago":"No purchase yet"}</small></div>
            <div className={styles.customerActions}><button className={styles.customerLoyaltyButton} onClick={()=>setExpandedLoyaltyId(current=>current===customer.id?"":customer.id)}>Loyalty</button><button className={styles.secondary} disabled={savingId===customer.id} onClick={()=>startEdit(customer)}>Edit</button><button className={styles.secondary} disabled={savingId===customer.id||customer.orders>0} title={customer.orders>0?"Shopify only allows deleting customers with no orders.":undefined} onClick={()=>void deleteCustomer(customer)}>Delete</button></div>
          </div>{expandedLoyaltyId===customer.id&&<div className={styles.customerLoyaltyProfile}><div className={`${styles.customerLoyaltyCard} ${styles[`customerLoyaltyCard${loyaltyTier(customer)[0].toUpperCase()+loyaltyTier(customer).slice(1)}`]}`}><header><span>CARTER&apos;S REWARDS</span><b>{loyaltyTier(customer).toUpperCase()}</b></header><h3>{customer.name}</h3><p>{customer.loyalty.enrolled?`${customer.loyalty.points.toLocaleString()} available points`:"Not enrolled in the loyalty program"}</p><div className={styles.customerLoyaltyProgress}><i style={{width:`${Math.min(100,customer.loyalty.points/Math.max(1,customerLoyaltySettings.minimumRedemptionPoints)*100)}%`}}/></div><small>{customer.loyalty.enrolled?customer.loyalty.points>=customerLoyaltySettings.minimumRedemptionPoints?"Reward ready":`${(customerLoyaltySettings.minimumRedemptionPoints-customer.loyalty.points).toLocaleString()} points until next reward`:"Create a loyalty account with a manual adjustment"}</small></div><div className={styles.customerLoyaltyFacts}><article><span>Reward value</span><strong>{(customer.loyalty.points/Math.max(1,customerLoyaltySettings.pointsPerCurrencyUnit)).toFixed(2)}</strong><small>store currency units</small></article><article><span>Lifetime earned</span><strong>{customer.loyalty.lifetimePoints.toLocaleString()}</strong><small>{customer.loyalty.earnedPoints.toLocaleString()} recorded positive points</small></article><article><span>Redeemed</span><strong>{customer.loyalty.redeemedPoints.toLocaleString()}</strong><small>{customer.loyalty.transactionCount.toLocaleString()} total activities</small></article><article><span>Last activity</span><strong>{formatDate(customer.loyalty.lastActivityAt)}</strong><small>Last earned {formatDate(customer.loyalty.lastEarnedAt)}</small></article></div></div>}{editingId===customer.id&&<div className={styles.customerEditPanel}><label>First name<input value={draft.firstName} onChange={event=>setDraft(value=>({...value,firstName:event.target.value}))}/></label><label>Last name<input value={draft.lastName} onChange={event=>setDraft(value=>({...value,lastName:event.target.value}))}/></label><label>Email<input value={draft.email} onChange={event=>setDraft(value=>({...value,email:event.target.value}))}/></label><label>Phone<input value={draft.phone} onChange={event=>setDraft(value=>({...value,phone:event.target.value}))}/></label><div><button className={styles.secondary} disabled={savingId===customer.id} onClick={()=>setEditingId("")}>Cancel</button><button className={styles.primary} disabled={savingId===customer.id} onClick={saveCustomer}>{savingId===customer.id?"Saving":"Save"}</button></div></div>}</div>}):<div className={styles.customerEmpty}><span>⌕</span><strong>{loading?"Loading customers...":"No customers match this segment"}</strong><small>{message||"Adjust the advanced filters or reset the segment."}</small></div>}
        </div>
        {pageInfo.hasNextPage&&<div className={styles.customerTableFooter}><span>Filters currently apply to {customers.length} loaded profiles.</span><button className={styles.secondary} disabled={loading} onClick={()=>loadCustomers(search,pageInfo.endCursor)}>Load 50 more</button><button className={styles.primary} disabled={loading} onClick={()=>void loadAllCustomers()}>Load complete audience</button></div>}
      </section>
    </div>
  );
}

function Team(){
  const permissionOptions=["Dashboard","App editor","Inventory","Promotions","Analytics","Marketing","Loyalty","Orders","Customers","Customer chat","Settings"];
  const [tab,setTab]=useState<"people"|"roles"|"activity">("people");
  const [showRoleForm,setShowRoleForm]=useState(false);
  const [editingRoleId,setEditingRoleId]=useState("");
  const [showEmployeeForm,setShowEmployeeForm]=useState(false);
  const [roleName,setRoleName]=useState("Content manager");
  const [roleScope,setRoleScope]=useState("Content and campaigns");
  const [roleDescription,setRoleDescription]=useState("Can edit app sections and prepare push campaigns.");
  const [rolePermissions,setRolePermissions]=useState<string[]>(["App editor","Marketing"]);
  const [employeeEmail,setEmployeeEmail]=useState("");
  const [employeeRole,setEmployeeRole]=useState("Marketing");
  const [staffUsers,setStaffUsers]=useState<StaffUser[]>([]);
  const [roles,setRoles]=useState<AdminRole[]>([]);
  const [events,setEvents]=useState<TeamActivity[]>([]);
  const [staffMessage,setStaffMessage]=useState("");
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [search,setSearch]=useState("");
  const [statusFilter,setStatusFilter]=useState<"all"|"active"|"invited">("all");
  const [activityFilter,setActivityFilter]=useState<"all"|TeamActivity["category"]>("all");
  const loadWorkspace=useCallback(async()=>{setLoading(true);try{const [staffResponse,rolesResponse,activityResponse]=await Promise.all([fetch("/api/admin-users",{cache:"no-store"}),fetch("/api/team/roles",{cache:"no-store"}),fetch("/api/team/activity",{cache:"no-store"})]);const [staffData,rolesData,activityData]=await Promise.all([staffResponse.json(),rolesResponse.json(),activityResponse.json()]);if(!staffResponse.ok||!rolesResponse.ok||!activityResponse.ok)throw new Error(staffData.error||rolesData.error||activityData.error||"Unable to load team workspace.");setStaffUsers(Array.isArray(staffData.users)?staffData.users:[]);setRoles(Array.isArray(rolesData.roles)?rolesData.roles:[]);setEvents(Array.isArray(activityData.events)?activityData.events:[])}catch(error){setStaffMessage(error instanceof Error?error.message:"Unable to load team workspace.")}finally{setLoading(false)}},[]);
  useEffect(()=>{
    /* eslint-disable react-hooks/set-state-in-effect */
    void loadWorkspace();
    /* eslint-enable react-hooks/set-state-in-effect */
  },[loadWorkspace]);
  const saveRole=async()=>{setSaving(true);setStaffMessage("");try{const response=await fetch(editingRoleId?`/api/team/roles/${editingRoleId}`:"/api/team/roles",{method:editingRoleId?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:roleName,scope:roleScope,description:roleDescription,permissions:rolePermissions})});const data=await response.json();if(!response.ok)throw new Error(data.error||(editingRoleId?"Unable to update role.":"Unable to create role."));setRoleName("");setRoleScope("");setRoleDescription("");setRolePermissions([]);setEditingRoleId("");setShowRoleForm(false);setStaffMessage(editingRoleId?"Role permissions updated.":"Role created and saved.");await loadWorkspace()}catch(error){setStaffMessage(error instanceof Error?error.message:"Unable to save role.")}finally{setSaving(false)}};
  const openRoleForm=(role?:AdminRole)=>{setEditingRoleId(role?.id||"");setRoleName(role?.name||"");setRoleScope(role?.scope||"");setRoleDescription(role?.description||"");setRolePermissions(role?.permissions.includes("All permissions")?[...permissionOptions]:role?.permissions||[]);setShowRoleForm(true)};
  const removeRole=async(role:AdminRole)=>{if(!window.confirm(`Delete the ${role.name} role?`))return;setSaving(true);try{const response=await fetch(`/api/team/roles/${role.id}`,{method:"DELETE"});const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to delete role.");setStaffMessage(`${role.name} role deleted.`);await loadWorkspace()}catch(error){setStaffMessage(error instanceof Error?error.message:"Unable to delete role.")}finally{setSaving(false)}};
  const addEmployee=async()=>{setSaving(true);setStaffMessage("Sending invite email...");try{const response=await fetch("/api/admin-users",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:employeeEmail,role:employeeRole})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to invite employee.");setEmployeeEmail("");setShowEmployeeForm(false);setStaffMessage(data.email?.mode==="local-outbox"?`Invite saved to local email outbox. Setup link: ${data.email.setupUrl}`:"Invitation sent successfully.");await loadWorkspace()}catch(error){setStaffMessage(error instanceof Error?error.message:"Unable to invite employee.")}finally{setSaving(false)}};
  const deleteEmployee=async(user:StaffUser)=>{if(!window.confirm(`Revoke all admin access for ${user.email}?`))return;setSaving(true);try{const response=await fetch(`/api/admin-users/${user.id}`,{method:"DELETE"});if(!response.ok)throw new Error("Unable to revoke access.");setStaffMessage("Member access revoked.");await loadWorkspace()}catch(error){setStaffMessage(error instanceof Error?error.message:"Unable to revoke access.")}finally{setSaving(false)}};
  const resetEmployee=async(user:StaffUser)=>{if(!window.confirm(`Issue a new secure setup link to ${user.email}?`))return;setSaving(true);try{const response=await fetch(`/api/admin-users/${user.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"reset"})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to send setup link.");setStaffMessage(data.email?.mode==="local-outbox"?`Setup saved to local email outbox: ${data.email.setupUrl}`:"Secure setup link sent.");await loadWorkspace()}catch(error){setStaffMessage(error instanceof Error?error.message:"Unable to send setup link.")}finally{setSaving(false)}};
  const changeRole=async(user:StaffUser,role:string)=>{setSaving(true);try{const response=await fetch(`/api/admin-users/${user.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"role",role})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to update role.");setStaffMessage(`${user.email} is now ${role}.`);await loadWorkspace()}catch(error){setStaffMessage(error instanceof Error?error.message:"Unable to update role.")}finally{setSaving(false)}};
  const activeCount=staffUsers.filter(user=>user.status==="active").length+1;const pendingCount=staffUsers.filter(user=>user.status==="invited").length;
  const filteredUsers=staffUsers.filter(user=>(statusFilter==="all"||user.status===statusFilter)&&(!search.trim()||`${user.email} ${user.role}`.toLowerCase().includes(search.trim().toLowerCase())));
  const filteredEvents=events.filter(event=>(activityFilter==="all"||event.category===activityFilter)&&(!search.trim()||`${event.action} ${event.actor} ${event.target} ${event.detail}`.toLowerCase().includes(search.trim().toLowerCase())));
  const exportActivity=()=>{const rows=[["Date","Action","Category","Actor","Target","Details"],...filteredEvents.map(event=>[event.createdAt,event.action,event.category,event.actor,event.target,event.detail])];const csv=rows.map(row=>row.map(value=>`"${String(value).replaceAll('"','""')}"`).join(",")).join("\n");const url=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));const link=document.createElement("a");link.href=url;link.download=`team-activity-${new Date().toISOString().slice(0,10)}.csv`;link.click();URL.revokeObjectURL(url)};
  const rolesWithMembers=roles.map(role=>({...role,members:(role.name==="Owner"?1:0)+staffUsers.filter(user=>user.role===role.name).length}));
  return <div className={`${styles.content} ${styles.teamPage}`}>
    <section className={styles.teamHero}><div><p>ACCESS MANAGEMENT</p><h2>Team & activity</h2><span>Control workspace access, assign clear responsibilities, and review every team security event.</span></div><div className={styles.teamHeroActions}><button className={styles.secondary} disabled={loading} onClick={()=>void loadWorkspace()}>↻ Refresh</button><button className={styles.primary} onClick={()=>{setTab("people");setShowEmployeeForm(true)}}>+ Invite member</button></div></section>
    <div className={styles.teamMetrics}><article><span className={styles.teamMetricBlue}>♙</span><div><small>Total members</small><strong>{staffUsers.length+1}</strong><p>Including workspace owner</p></div></article><article><span className={styles.teamMetricGreen}>✓</span><div><small>Active access</small><strong>{activeCount}</strong><p>Ready to sign in</p></div></article><article><span className={pendingCount?styles.teamMetricAmber:styles.teamMetricGreen}>⌛</span><div><small>Pending invites</small><strong>{pendingCount}</strong><p>{pendingCount?"Awaiting account setup":"No invitations waiting"}</p></div></article><article><span className={styles.teamMetricPurple}>◇</span><div><small>Access roles</small><strong>{roles.length}</strong><p>{roles.filter(role=>!role.builtIn).length} custom roles</p></div></article></div>
    {staffMessage&&<div className={styles.teamNotice}><span>i</span><p>{staffMessage}</p><button onClick={()=>setStaffMessage("")}>×</button></div>}
    <div className={styles.teamToolbar}><div className={styles.teamTabs}><button className={tab==="people"?styles.teamTabActive:""} onClick={()=>setTab("people")}>People <b>{staffUsers.length+1}</b></button><button className={tab==="roles"?styles.teamTabActive:""} onClick={()=>setTab("roles")}>Roles & permissions <b>{roles.length}</b></button><button className={tab==="activity"?styles.teamTabActive:""} onClick={()=>setTab("activity")}>Activity log <b>{events.length}</b></button></div><div className={styles.teamSearch}><span>⌕</span><input value={search} onChange={event=>setSearch(event.target.value)} placeholder={tab==="activity"?"Search activity":"Search people or roles"}/></div></div>
    {tab==="people"?<section className={`${styles.card} ${styles.peopleCard}`}><div className={styles.teamSectionHead}><div><h2>Workspace members</h2><p>Manage invitations, assigned roles, and sign-in access.</p></div><select value={statusFilter} onChange={event=>setStatusFilter(event.target.value as typeof statusFilter)}><option value="all">All members</option><option value="active">Active</option><option value="invited">Invited</option></select></div>{showEmployeeForm&&<div className={styles.teamInvitePanel}><div><strong>Invite a team member</strong><p>They will receive a secure link that expires after seven days.</p></div><label>Work email<input type="email" value={employeeEmail} onChange={event=>setEmployeeEmail(event.target.value)} placeholder="name@company.com"/></label><label>Access role<select value={employeeRole} onChange={event=>setEmployeeRole(event.target.value)}>{roles.filter(role=>role.name!=="Owner").map(role=><option key={role.id} value={role.name}>{role.name}</option>)}</select></label><div><button className={styles.secondary} onClick={()=>setShowEmployeeForm(false)}>Cancel</button><button className={styles.primary} disabled={saving||!employeeEmail.includes("@")} onClick={()=>void addEmployee()}>{saving?"Sending…":"Send invitation"}</button></div></div>}<div className={styles.peopleTable}><div className={styles.peopleTableHead}><span>Member</span><span>Status</span><span>Role</span><span>Last updated</span><span>Actions</span></div><div className={styles.peopleRow}><span className={styles.teamAvatarOwner}>SA</span><div><strong>Store administrator</strong><small>Primary workspace owner</small></div><i className={`${styles.tag} ${styles.tagGreen}`}>Active</i><strong>Owner</strong><small>Protected account</small><span className={styles.ownerLock}>⌑ Owner</span></div>{filteredUsers.map(user=>{const expired=user.status==="invited"&&user.inviteExpiresAt&&new Date(user.inviteExpiresAt)<new Date();return <div className={styles.peopleRow} key={user.id}><span className={styles.teamAvatar}>{initials(user.email)}</span><div><strong>{user.email}</strong><small>Added {new Date(user.createdAt).toLocaleDateString()}</small></div><i className={`${styles.tag} ${user.status==="active"?styles.tagGreen:expired?styles.tagRed:styles.tagGray}`}>{user.status==="active"?"Active":expired?"Invite expired":"Invite pending"}</i><select disabled={saving} value={user.role} onChange={event=>void changeRole(user,event.target.value)}>{roles.filter(role=>role.name!=="Owner").map(role=><option key={role.id} value={role.name}>{role.name}</option>)}{!roles.some(role=>role.name===user.role)&&<option value={user.role}>{user.role}</option>}</select><small>{new Date(user.updatedAt).toLocaleDateString()}</small><div className={styles.peopleActions}><button disabled={saving} onClick={()=>void resetEmployee(user)}>{user.status==="invited"?"Resend invite":"Reset password"}</button><button disabled={saving} className={styles.dangerAction} onClick={()=>void deleteEmployee(user)}>Revoke</button></div></div>})}{!loading&&!filteredUsers.length&&<div className={styles.teamEmpty}><span>♙</span><strong>No members found</strong><p>Adjust the search or status filter.</p></div>}</div></section>:null}
    {tab==="roles"?<div className={styles.roleWorkspace}><section className={`${styles.card} ${styles.roleCatalog}`}><div className={styles.teamSectionHead}><div><h2>Roles & permissions</h2><p>These permissions now control navigation and protected admin APIs.</p></div><button className={styles.primary} onClick={()=>openRoleForm()}>+ Create role</button></div>{showRoleForm&&<div className={styles.proRoleForm}><div className={styles.proRoleFields}><label>Role name<input disabled={Boolean(editingRoleId)} value={roleName} onChange={event=>setRoleName(event.target.value)} placeholder="Content manager"/></label><label>Access summary<input value={roleScope} onChange={event=>setRoleScope(event.target.value)} placeholder="Content and campaigns"/></label><label className={styles.proRoleWide}>Description<textarea rows={3} value={roleDescription} onChange={event=>setRoleDescription(event.target.value)}/></label></div><div className={styles.permissionPicker}><strong>Enforced permissions</strong><p>Members can only open and call the selected admin areas.</p><div>{permissionOptions.map(permission=><label key={permission}><input type="checkbox" checked={rolePermissions.includes(permission)} onChange={event=>setRolePermissions(items=>event.target.checked?[...items,permission]:items.filter(item=>item!==permission))}/><span>{permission}</span></label>)}</div></div><footer><button className={styles.secondary} onClick={()=>{setShowRoleForm(false);setEditingRoleId("")}}>Cancel</button><button className={styles.primary} disabled={saving||!roleName.trim()} onClick={()=>void saveRole()}>{saving?"Saving…":editingRoleId?"Save permissions":"Create role"}</button></footer></div>}<div className={styles.proRoleList}>{rolesWithMembers.filter(role=>!search.trim()||`${role.name} ${role.scope} ${role.description}`.toLowerCase().includes(search.toLowerCase())).map(role=><article key={role.id}><header><span className={role.builtIn?styles.roleBuiltInIcon:styles.roleCustomIcon}>{role.name.slice(0,1)}</span><div><strong>{role.name}</strong><small>{role.builtIn?"Built-in role":"Custom role"}</small></div><b>{role.members} member{role.members===1?"":"s"}</b></header><h3>{role.scope}</h3><p>{role.description}</p><div className={styles.permissionChips}>{role.permissions.map(permission=><span key={permission}>{permission}</span>)}</div>{role.name!=="Owner"&&<footer className={styles.roleCardActions}><button disabled={saving} onClick={()=>openRoleForm(role)}>Edit permissions</button>{!role.builtIn&&<button disabled={saving||role.members>0} title={role.members?"Reassign members before deleting this role.":undefined} onClick={()=>void removeRole(role)}>Delete role</button>}</footer>}</article>)}</div></section><aside className={styles.roleGuide}><span>◇</span><h3>Enforced least privilege</h3><p>Navigation and server APIs both verify the signed-in member&apos;s assigned role.</p><ul><li>Owner remains protected and unrestricted</li><li>Changes apply on the member&apos;s next page load</li><li>Assigned custom roles cannot be deleted</li></ul></aside></div>:null}
    {tab==="activity"?<section className={`${styles.card} ${styles.activityCard}`}><div className={styles.teamSectionHead}><div><h2>Audit activity</h2><p>Persistent record of membership, access, role, and security changes.</p></div><div className={styles.activityActions}><select value={activityFilter} onChange={event=>setActivityFilter(event.target.value as typeof activityFilter)}><option value="all">All activity</option><option value="member">Members</option><option value="access">Access</option><option value="role">Roles</option><option value="security">Security</option></select><button className={styles.secondary} disabled={!filteredEvents.length} onClick={exportActivity}>Export CSV</button></div></div><div className={styles.auditSummary}><span><b>{events.filter(event=>new Date(event.createdAt).toDateString()===new Date().toDateString()).length}</b> events today</span><span><b>{events.filter(event=>event.severity==="warning").length}</b> attention events</span><span><b>1,000</b> event storage limit</span></div><div className={styles.auditList}>{filteredEvents.map(event=><article key={event.id}><span className={`${styles.auditIcon} ${event.severity==="success"?styles.auditSuccess:event.severity==="warning"?styles.auditWarning:styles.auditInfo}`}>{event.category==="security"?"◇":event.category==="role"?"♙":event.severity==="warning"?"!":"✓"}</span><div><header><strong>{event.action}</strong><i>{event.category}</i></header><p>{event.detail}</p><small><b>{event.actor}</b> · {event.target} · {new Date(event.createdAt).toLocaleString()}</small></div></article>)}{!loading&&!filteredEvents.length&&<div className={styles.teamEmpty}><span>◎</span><strong>No activity found</strong><p>Team actions will appear here automatically.</p></div>}</div></section>:null}
  </div>
}

function initials(email:string){return email.slice(0,2).toUpperCase()}

const defaultAdminSettings:AdminSettingsState={
  workspace:{applicationName:"Carter's App Studio",storeName:"Carter's & OshKosh Lebanon",supportEmail:"",supportPhone:"",timezone:"Asia/Beirut",locale:"en-LB"},
  commerce:{currency:"USD",lowStockThreshold:5,freeShippingThreshold:50,orderPrefix:"CAR",defaultInventoryLocation:""},
  app:{maintenanceMode:false,customerChat:true,wishlist:true,pushNotifications:true,guestCheckout:true,minimumVersion:"1.0.0",forceUpdate:false,updateMessage:"A newer version is available with important improvements.",updateUrl:""},
  notifications:{newOrderAlerts:true,lowStockAlerts:true,newCustomerAlerts:false,failedPaymentAlerts:true,dailyDigest:true,digestEmail:""},
  security:{sessionTimeoutMinutes:480,auditRetentionDays:90,requireTwoFactor:false,allowStaffInvites:true},
};

function Settings(){
  const [settings,setSettings]=useState<AdminSettingsState>(defaultAdminSettings);
  const [integrations,setIntegrations]=useState<IntegrationStatus>({shopifyStorefront:false,shopifyAdmin:false,push:false,email:false,realtime:false});
  const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [message,setMessage]=useState("");const [savedAt,setSavedAt]=useState("");
  const requestSettings=useCallback(async(init?:RequestInit)=>{let lastError:unknown;for(let attempt=0;attempt<2;attempt+=1){try{const response=await fetch("/api/settings",{cache:"no-store",credentials:"same-origin",...init});if(response.status===401){window.location.assign("/login");throw new Error("Your admin session expired. Redirecting to sign in...")}const data=await response.json().catch(()=>({error:`Settings returned HTTP ${response.status}.`}));if(!response.ok)throw new Error(data.error||"Unable to reach settings.");return data}catch(error){lastError=error;if(error instanceof Error&&error.message.includes("session expired"))throw error;if(attempt===0)await new Promise(resolve=>setTimeout(resolve,350))}}throw new Error(lastError instanceof TypeError?"Cannot connect to the admin settings service. Refresh this page and make sure you use the same admin address you signed in with.":lastError instanceof Error?lastError.message:"Unable to reach settings.")},[]);
  const load=useCallback(async()=>{setLoading(true);setMessage("");try{const data=await requestSettings();setSettings(data.settings);setIntegrations(data.integrations)}catch(error){setMessage(error instanceof Error?error.message:"Unable to load settings.")}finally{setLoading(false)}},[requestSettings]);
  useEffect(()=>{/* eslint-disable react-hooks/set-state-in-effect */void load();/* eslint-enable react-hooks/set-state-in-effect */},[load]);
  function updateGroup<K extends keyof AdminSettingsState>(group:K,patch:Partial<AdminSettingsState[K]>){setSettings(current=>({...current,[group]:{...current[group],...patch}}))}
  const save=async()=>{setSaving(true);setMessage("Saving settings...");try{const data=await requestSettings({method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({settings})});setSettings(data.settings);setIntegrations(data.integrations);setSavedAt(new Date(data.savedAt).toLocaleString());setMessage("All settings saved.")}catch(error){setMessage(error instanceof Error?error.message:"Unable to save settings.")}finally{setSaving(false)}};
  const reset=()=>{setSettings(defaultAdminSettings);setMessage("Defaults restored in the form. Save to apply them.")};
  if(loading)return <div className={styles.content}><section className={styles.settingsHero}><div><p>ADMIN SETTINGS</p><h2>Loading configuration...</h2><span>Reading saved workspace preferences and integration status.</span></div></section></div>;
  return <div className={styles.content}>
    <section className={styles.settingsHero}><div><p>ADMIN SETTINGS</p><h2>Operations & app configuration</h2><span>Manage store defaults, app features, alerts, access policies, and production readiness.</span></div><div className={styles.settingsHeroActions}><button className={styles.secondary} onClick={reset}>Restore defaults</button><button className={styles.primary} disabled={saving} onClick={()=>void save()}>{saving?"Saving...":"Save all settings"}</button></div></section>
    {message&&<div className={`${styles.settingsNotice} ${message.includes("Unable")?styles.settingsNoticeError:""}`}><strong>{message}</strong>{savedAt&&<small>Last saved {savedAt}</small>}</div>}
    <div className={styles.settingsPageGrid}><div className={styles.settingsCards}>
      <section className={`${styles.card} ${styles.proSettingsCard}`}><div className={styles.cardHead}><div><h2>Workspace identity</h2><p>Names, support contacts, language, and regional defaults.</p></div><span className={styles.settingsCardIcon}>◎</span></div><div className={styles.settingsFormGrid}>
        <label>Admin application name<input value={settings.workspace.applicationName} onChange={e=>updateGroup("workspace",{applicationName:e.target.value})}/></label>
        <label>Store display name<input value={settings.workspace.storeName} onChange={e=>updateGroup("workspace",{storeName:e.target.value})}/></label>
        <label>Support email<input type="email" placeholder="support@company.com" value={settings.workspace.supportEmail} onChange={e=>updateGroup("workspace",{supportEmail:e.target.value})}/></label>
        <label>Support phone<input type="tel" placeholder="+961 ..." value={settings.workspace.supportPhone} onChange={e=>updateGroup("workspace",{supportPhone:e.target.value})}/></label>
        <label>Timezone<select value={settings.workspace.timezone} onChange={e=>updateGroup("workspace",{timezone:e.target.value})}><option value="Asia/Beirut">Asia/Beirut</option><option value="UTC">UTC</option><option value="Asia/Dubai">Asia/Dubai</option><option value="Europe/London">Europe/London</option></select></label>
        <label>Locale<select value={settings.workspace.locale} onChange={e=>updateGroup("workspace",{locale:e.target.value})}><option value="en-LB">English (Lebanon)</option><option value="ar-LB">Arabic (Lebanon)</option><option value="fr-LB">French (Lebanon)</option><option value="en-US">English (United States)</option></select></label>
      </div></section>
      <section className={`${styles.card} ${styles.proSettingsCard}`}><div className={styles.cardHead}><div><h2>Commerce defaults</h2><p>Operational values used for inventory and order workflows.</p></div><span className={styles.settingsCardIcon}>$</span></div><div className={styles.settingsFormGrid}>
        <label>Store currency<select value={settings.commerce.currency} onChange={e=>updateGroup("commerce",{currency:e.target.value})}><option value="USD">USD — US Dollar</option><option value="LBP">LBP — Lebanese Pound</option><option value="EUR">EUR — Euro</option><option value="GBP">GBP — Pound Sterling</option></select></label>
        <label>Low-stock threshold<input type="number" min="0" value={settings.commerce.lowStockThreshold} onChange={e=>updateGroup("commerce",{lowStockThreshold:Number(e.target.value)})}/></label>
        <label>Free-shipping threshold<input type="number" min="0" step="0.01" value={settings.commerce.freeShippingThreshold} onChange={e=>updateGroup("commerce",{freeShippingThreshold:Number(e.target.value)})}/></label>
        <label>Order reference prefix<input maxLength={12} value={settings.commerce.orderPrefix} onChange={e=>updateGroup("commerce",{orderPrefix:e.target.value.toUpperCase()})}/></label>
        <label className={styles.settingsWide}>Default inventory location<input placeholder="Shopify location name or ID" value={settings.commerce.defaultInventoryLocation} onChange={e=>updateGroup("commerce",{defaultInventoryLocation:e.target.value})}/></label>
      </div></section>
      <section className={`${styles.card} ${styles.proSettingsCard}`}><div className={styles.cardHead}><div><h2>Mobile app controls</h2><p>Customer-facing availability and feature preferences.</p></div><span className={styles.settingsCardIcon}>▣</span></div><div className={styles.controlStack}>
        <SettingToggle label="Maintenance mode" copy="Prepare a temporary maintenance state for the mobile app" checked={settings.app.maintenanceMode} onChange={value=>updateGroup("app",{maintenanceMode:value})}/>
        <SettingToggle label="Customer chat" copy="Allow customers to start support conversations" checked={settings.app.customerChat} onChange={value=>updateGroup("app",{customerChat:value})}/>
        <SettingToggle label="Wishlist" copy="Allow customers to save products for later" checked={settings.app.wishlist} onChange={value=>updateGroup("app",{wishlist:value})}/>
        <SettingToggle label="Push notifications" copy="Enable notification registration and campaigns" checked={settings.app.pushNotifications} onChange={value=>updateGroup("app",{pushNotifications:value})}/>
        <SettingToggle label="Guest checkout" copy="Allow checkout without a customer account" checked={settings.app.guestCheckout} onChange={value=>updateGroup("app",{guestCheckout:value})}/>
        <SettingToggle label="Force app update" copy="Require customers below the minimum version to update" checked={settings.app.forceUpdate} onChange={value=>updateGroup("app",{forceUpdate:value})}/>
      </div><div className={styles.settingsFormGrid}><label>Minimum app version<input value={settings.app.minimumVersion} onChange={e=>updateGroup("app",{minimumVersion:e.target.value})}/></label><label>App Store / Play Store URL<input placeholder="https://..." value={settings.app.updateUrl} onChange={e=>updateGroup("app",{updateUrl:e.target.value})}/></label><label className={styles.settingsWide}>Update message<textarea rows={3} maxLength={240} value={settings.app.updateMessage} onChange={e=>updateGroup("app",{updateMessage:e.target.value})}/></label></div></section>
      <section className={`${styles.card} ${styles.proSettingsCard}`}><div className={styles.cardHead}><div><h2>Admin notifications</h2><p>Choose the operational events your team should receive.</p></div><span className={styles.settingsCardIcon}>◈</span></div><div className={styles.controlStack}>
        <SettingToggle label="New order alerts" copy="Notify the team when Shopify receives an order" checked={settings.notifications.newOrderAlerts} onChange={value=>updateGroup("notifications",{newOrderAlerts:value})}/>
        <SettingToggle label="Low-stock alerts" copy={`Alert when inventory reaches ${settings.commerce.lowStockThreshold} units`} checked={settings.notifications.lowStockAlerts} onChange={value=>updateGroup("notifications",{lowStockAlerts:value})}/>
        <SettingToggle label="New customer alerts" copy="Notify when a new customer account is created" checked={settings.notifications.newCustomerAlerts} onChange={value=>updateGroup("notifications",{newCustomerAlerts:value})}/>
        <SettingToggle label="Failed-payment alerts" copy="Escalate orders that need payment attention" checked={settings.notifications.failedPaymentAlerts} onChange={value=>updateGroup("notifications",{failedPaymentAlerts:value})}/>
        <SettingToggle label="Daily summary" copy="Send a daily commerce and engagement digest" checked={settings.notifications.dailyDigest} onChange={value=>updateGroup("notifications",{dailyDigest:value})}/>
      </div><div className={styles.settingsFormGrid}><label className={styles.settingsWide}>Alert recipient<input type="email" placeholder="operations@company.com" value={settings.notifications.digestEmail} onChange={e=>updateGroup("notifications",{digestEmail:e.target.value})}/></label></div></section>
      <section className={`${styles.card} ${styles.proSettingsCard}`}><div className={styles.cardHead}><div><h2>Security & governance</h2><p>Workspace access and data-retention policy preferences.</p></div><span className={styles.settingsCardIcon}>◇</span></div><div className={styles.settingsFormGrid}>
        <label>Session timeout (minutes)<input type="number" min="15" max="10080" value={settings.security.sessionTimeoutMinutes} onChange={e=>updateGroup("security",{sessionTimeoutMinutes:Number(e.target.value)})}/></label>
        <label>Audit retention (days)<input type="number" min="7" max="2555" value={settings.security.auditRetentionDays} onChange={e=>updateGroup("security",{auditRetentionDays:Number(e.target.value)})}/></label>
      </div><div className={styles.controlStack}><SettingToggle label="Require two-factor authentication" copy="Policy preference for a future identity-provider connection" checked={settings.security.requireTwoFactor} onChange={value=>updateGroup("security",{requireTwoFactor:value})}/><SettingToggle label="Allow staff invitations" copy="Permit owners to invite employees from Team & activity" checked={settings.security.allowStaffInvites} onChange={value=>updateGroup("security",{allowStaffInvites:value})}/></div><div className={styles.settingsPolicyNote}>Authentication secrets remain in environment variables. This page never displays or stores tokens.</div></section>
    </div><aside className={styles.settingsRail}>
      <div className={styles.integrationCard}><header><strong>Integration health</strong><small>Configuration detected from secure environment variables.</small></header><IntegrationRow label="Shopify Storefront" ready={integrations.shopifyStorefront}/><IntegrationRow label="Shopify Admin" ready={integrations.shopifyAdmin}/><IntegrationRow label="Expo push" ready={integrations.push}/><IntegrationRow label="Transactional email" ready={integrations.email}/><IntegrationRow label="Supabase realtime" ready={integrations.realtime}/></div>
      <div><strong>Admin authentication</strong><small>Credentials and session signing remain protected in server environment variables.</small><i className={`${styles.tag} ${styles.tagGreen}`}>Connected</i></div>
      <div><strong>Storage</strong><small>Settings persist in <code>admin/data/admin-settings.json</code>. Use managed storage before multi-instance deployment.</small></div>
      <div><strong>Mobile controls</strong><small>The mobile app now reads maintenance, update, wishlist, notifications, and customer chat controls from the public settings endpoint.</small></div>
    </aside></div>
    <div className={styles.settingsBottomBar}><span>{savedAt?`Last saved ${savedAt}`:"Review your configuration, then save all settings."}</span><button className={styles.primary} disabled={saving} onClick={()=>void save()}>{saving?"Saving...":"Save all settings"}</button></div>
  </div>
}

function SettingToggle({label,copy,checked,onChange}:{label:string;copy:string;checked:boolean;onChange:(value:boolean)=>void}){return <div className={styles.controlRowPro}><div><strong>{label}</strong><small>{copy}</small></div><label className={styles.switch}><input type="checkbox" checked={checked} onChange={event=>onChange(event.target.checked)}/><span/></label></div>}
function IntegrationRow({label,ready}:{label:string;ready:boolean}){return <div className={styles.integrationRow}><span className={ready?styles.integrationReady:styles.integrationMissing}/><strong>{label}</strong><small>{ready?"Configured":"Needs setup"}</small></div>}
