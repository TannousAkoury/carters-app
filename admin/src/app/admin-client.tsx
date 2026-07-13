"use client";

import { useEffect, useMemo, useState } from "react";
import baseStyles from "./page.module.css";
import extraStyles from "./admin-extra.module.css";

const styles = { ...baseStyles, ...extraStyles };

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
};
type View = "dashboard" | "editor" | "inventory" | "promotions" | "analytics" | "marketing" | "orders" | "customers" | "chat" | "team" | "settings";
type Placement = "before-hero" | "after-hero" | "after-promos" | "after-ages" | "after-top-picks" | "after-categories" | "after-explore" | "after-essentials" | "after-brands" | "after-latest";
type AdminRole = { id: string; name: string; scope: string; description: string; members: number };
type StaffUser = { id: string; email: string; role: string; status: "invited" | "active"; inviteExpiresAt?: string; createdAt: string; updatedAt: string };
type AdminCustomer = { id:string; name:string; firstName:string; lastName:string; email:string; phone:string; location:string; orders:number; totalSpent?:{amount:string;currencyCode:string}|null; status:string; lastOrderAt?:string|null; createdAt?:string|null; updatedAt?:string|null };
type OrderAddress = { firstName:string; lastName:string; address1:string; address2:string; city:string; province:string; zip:string; country:string; phone:string };
type OrderLineItem = { name:string; quantity:number; sku?:string|null; variantTitle?:string|null; image?:{url?:string|null;altText?:string|null}|null };
type AdminOrder = { id:string; name:string; createdAt:string; financialStatus:string; fulfillmentStatus:string; canMarkAsPaid:boolean; cancelledAt?:string|null; note:string; tags:string[]; total?:{amount:string;currencyCode:string}|null; customer:string; email:string; destination:string; shippingAddress:OrderAddress; items:OrderLineItem[] };
type OrderDraft = { email:string; note:string; tags:string; shippingAddress:OrderAddress };
type InventoryLevel = { locationId:string; locationName:string; quantity:number };
type InventoryItem = { id:string; productId:string; inventoryItemId:string; name:string; product:string; variant:string; sku:string; barcode:string; price:string; compareAtPrice:string; quantity:number; policy:string; tracked:boolean; levels:InventoryLevel[]; availableForSale:boolean; productStatus:string; updatedAt?:string };
type InventoryLocation = { id:string; name:string; isActive:boolean };
type ProductDraft = { title:string; status:string; sku:string; barcode:string; price:string; compareAtPrice:string; inventoryPolicy:string; tracked:boolean };
type Promotion = { id:string; title:string; type:string; code:string; status:string; startsAt?:string|null; endsAt?:string|null; usageCount:number };
type AnalyticsSummary = { range:string; sessions:number; screenViews:number; productViews:number; cartViews:number; notificationDevices:number; purchases:number|null; days:{label:string;value:number}[] };
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
function newSection(type: SectionType): Section {
  return { id: `${type}-${Date.now()}`, type, title: sectionNames[type], subtitle: type === "text" ? "Write your message here." : "", image: "", buttonLabel: type === "announcement" ? "" : "Learn more", background: type === "announcement" ? "#0d416c" : "#ffffff", enabled: true, placement: "before-hero" };
}

export default function Home() {
  const [view, setView] = useState<View>("dashboard");
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
  const add = (type: SectionType, placement: Placement = "before-hero") => { const item = { ...newSection(type), placement }; setSections((items) => [...items, item]); setSelectedId(item.id); setSaved(false); };

  if (!ready) return null;
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}><span className={styles.brandMark}>C</span><div><strong>Carter&apos;s</strong><small>App Studio</small></div></div>
        <nav className={styles.nav}>
          <Nav active={view === "dashboard"} onClick={() => setView("dashboard")} icon="⌂" label="Dashboard" />
          <Nav active={view === "editor"} onClick={() => setView("editor")} icon="✦" label="App editor" />
          <Nav active={view === "inventory"} onClick={() => setView("inventory")} icon="▦" label="Inventory" />
          <Nav active={view === "promotions"} onClick={() => setView("promotions")} icon="%" label="Promotions" />
          <Nav active={view === "analytics"} onClick={() => setView("analytics")} icon="↗" label="Analytics" />
          <Nav active={view === "marketing"} onClick={() => setView("marketing")} icon="◈" label="Marketing" />
          <Nav active={view === "orders"} onClick={() => setView("orders")} icon="▤" label="Orders" />
          <Nav active={view === "customers"} onClick={() => setView("customers")} icon="♙" label="Customers" />
          <Nav active={view === "chat"} onClick={() => setView("chat")} icon="◌" label="Customer chat" badge="3" />
          <Nav active={view === "team"} onClick={() => setView("team")} icon="☷" label="Team & activity" />
          <Nav active={view === "settings"} onClick={() => setView("settings")} icon="⚙" label="Settings" />
        </nav>
        <div className={styles.sidebarFoot}><span className={styles.avatar}>CA</span><div><strong>Store admin</strong><small>Administrator</small></div></div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}><div className={styles.topbarTitle}><p className={styles.eyebrow}>CARTER&apos;S MOBILE APP</p><h1>{pageTitles[view].title}</h1><small>{pageTitles[view].copy}</small></div><div className={styles.topActions}><span className={styles.statusDot}>{publishMessage || "● App live"}</span>{view === "editor" && <><button className={styles.secondary} onClick={saveDraft}>{saved ? "Draft saved" : "Save draft"}</button><button className={styles.primary} onClick={publish}>Publish changes</button></>}<button className={styles.secondary} onClick={logout}>Log out</button></div></header>
        {view === "dashboard" && <Dashboard setView={setView} publishedAt={publishedAt} />}
        {view === "editor" && <Editor sections={sections} selected={selected} selectedId={selectedId} setSelectedId={setSelectedId} update={update} move={move} remove={remove} add={add} />}
        {view === "inventory" && <Inventory />}
        {view === "promotions" && <Promotions />}
        {view === "analytics" && <Analytics />}
        {view === "marketing" && <Marketing />}
        {view === "orders" && <Orders />}
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

function Dashboard({ setView, publishedAt }: { setView: (v: View) => void; publishedAt: string }) {
  type Summary = { sessions:number; screenViews:number; productViews:number; cartViews:number; notificationDevices:number; purchases:number|null; days:{label:string;value:number}[] };
  const [summary,setSummary]=useState<Summary|null>(null);
  const [analyticsError,setAnalyticsError]=useState("");
  useEffect(()=>{fetch("/api/analytics/summary").then(async response=>{if(!response.ok)throw new Error("Analytics API unavailable");setSummary(await response.json())}).catch(error=>setAnalyticsError(error.message))},[]);
  const metrics = [[summary?.sessions ?? "—", "Unique app devices", "Last 30 days"], [summary?.screenViews ?? "—", "Screen views", "Recorded in app"], [summary?.productViews ?? "—", "Product views", "Recorded in app"], [summary?.notificationDevices ?? "—", "Notification devices", "Currently registered"]];
  const maxDay=Math.max(1,...(summary?.days.map(day=>day.value)??[1]));
  return <div className={styles.content}>
    <section className={styles.opsHero}><div><p>STORE OPERATIONS</p><h2>Mobile app workspace</h2><span>Content, marketing, and customer operations are managed from one place.</span></div><div className={styles.opsHeroActions}><button className={styles.primary} onClick={() => setView("editor")}>Open editor</button><button className={styles.primary} onClick={() => setView("marketing")}>Create campaign</button></div></section>
    {analyticsError&&<section className={styles.card}>Analytics unavailable: {analyticsError}</section>}
    <div className={styles.metricGrid}>{metrics.map(([value, label, note]) => <article className={styles.metric} key={label}><div className={styles.metricIcon}>↗</div><p>{label}</p><strong>{value}</strong><span>{note}</span></article>)}</div>
    <div className={styles.dashboardGrid}>
      <section className={styles.card}><div className={styles.cardHead}><div><h2>Visitors overview</h2><p>Real recorded sessions · last 7 days</p></div></div><div className={styles.chart}>{(summary?.days??[]).map((day) => <div key={day.label} className={styles.barWrap}><div className={styles.bar} style={{height:`${Math.max(3,(day.value/maxDay)*100)}%`}} /><small>{day.label}</small></div>)}</div></section>
      <section className={styles.card}><div className={styles.cardHead}><div><h2>Quick actions</h2><p>Manage your app</p></div></div><button className={styles.quick} onClick={() => setView("editor")}><span>✦</span><div><strong>Edit app homepage</strong><small>Change sections, images and text</small></div><b>→</b></button><button className={styles.quick} onClick={() => setView("marketing")}><span>◈</span><div><strong>Send a notification</strong><small>{summary?.notificationDevices??0} registered devices</small></div><b>→</b></button><div className={styles.published}><span>✓</span><div><strong>Latest publish</strong><small>{publishedAt}</small></div></div></section>
    </div>
    <section className={styles.card}><div className={styles.cardHead}><div><h2>Production readiness</h2><p>Connection status for the features customers depend on.</p></div></div><div className={styles.readinessGrid}>{[["Content API","Connected","Live sections publish to bundled app content"],["Push delivery","Partial","Local queue works; production provider needs final credentials"],["Shopify customer data","Pending","Admin customer directory requires secure Admin API auth"],["Audit log","Pending","Persistent admin activity database is not connected"]].map(([title,status,copy])=><div className={styles.readinessItem} key={title}><span className={status==="Connected"?styles.readyOk:status==="Partial"?styles.readyWarn:styles.readyWait}>{status}</span><strong>{title}</strong><small>{copy}</small></div>)}</div></section>
    <section className={styles.card}><div className={styles.cardHead}><div><h2>Customer journey</h2><p>Only measured events are shown; purchases require a Shopify webhook.</p></div></div><div className={styles.funnel}>{[[summary?.sessions??0,"Visitors"],[summary?.productViews??0,"Product views"],[summary?.cartViews??0,"Cart views"],[summary?.purchases??"—","Purchased"]].map(([v,l],i)=><div key={String(l)}><strong>{v}</strong><span>{l}</span>{i<3 && <b>→</b>}</div>)}</div></section>
  </div>;
}

function Editor({ sections, selected, selectedId, setSelectedId, update, move, remove, add }: { sections: Section[]; selected?: Section; selectedId: string; setSelectedId: (id:string)=>void; update:(p:Partial<Section>)=>void; move:(i:number,d:-1|1)=>void; remove:(id:string)=>void; add:(t:SectionType,p?:Placement)=>void }) {
  const [showAdd, setShowAdd] = useState(false);
  return <div className={styles.editor}>
    <section className={styles.sectionPanel}><div className={`${styles.panelTitle} ${styles.panelTitlePro}`}><div><h2>Homepage sections</h2><p>Custom content around Shopify blocks</p></div><button className={styles.addButton} onClick={() => setShowAdd(!showAdd)}>＋</button></div>
      {showAdd && <div className={styles.addMenu}>{(Object.keys(sectionNames) as SectionType[]).map((type)=><button key={type} onClick={()=>{add(type);setShowAdd(false)}}><span>＋</span>{sectionNames[type]}</button>)}</div>}
      <div className={styles.sectionList}>{sections.map((section,index)=><div key={section.id} className={`${styles.sectionRow} ${selectedId===section.id?styles.sectionSelected:""}`} onClick={()=>setSelectedId(section.id)}><span className={styles.drag}>⠿</span><div><strong>{section.title || sectionNames[section.type]}</strong><small>{sectionNames[section.type]} · {placements.find(p=>p.value===(section.placement??"before-hero"))?.label}</small></div><div className={styles.rowActions}><button onClick={(e)=>{e.stopPropagation();move(index,-1)}}>↑</button><button onClick={(e)=>{e.stopPropagation();move(index,1)}}>↓</button></div></div>)}</div>
      <div className={styles.shopifyMap}><p>LIVE SHOPIFY SECTIONS</p><button className={styles.insertSlot} onClick={()=>add("text","before-hero")}>＋ Insert section before Shopify hero</button>{shopifySections.map((item,index)=><section key={item.name}><div className={styles.shopifyRow}><span>{index+1}</span><div><strong>{item.name}</strong><small>Content managed by Shopify</small></div><b>Locked</b></div><button className={styles.insertSlot} onClick={()=>add("text",item.after)}>＋ Insert section after {item.name}</button></section>)}</div>
    </section>
    <section className={`${styles.previewPanel} ${styles.previewWorkspace}`}><div className={`${styles.previewToolbar} ${styles.previewToolbarPro}`}><span>Live mobile preview</span><div><b>{sections.filter(s=>s.enabled).length}</b> active sections</div></div><div className={styles.phone}><div className={styles.phoneTop}><b>9:41</b><span>● ◒ ▰</span></div><div className={styles.appHeader}><span>☰</span><strong>Carter&apos;s</strong><span>⌕　♧</span></div><div className={styles.phoneBody}>{sections.filter(s=>s.enabled).map(section=><PreviewSection key={section.id} section={section} selected={section.id===selectedId} onClick={()=>setSelectedId(section.id)} />)}</div><div className={styles.appTabs}><span>⌂<small>Home</small></span><span>⌕<small>Search</small></span><span>♡<small>Wishlist</small></span><span>♙<small>Account</small></span></div></div></section>
    <section className={styles.settingsPanel}>{selected ? <><div className={`${styles.panelTitle} ${styles.panelTitlePro}`}><div><h2>Section inspector</h2><p>{sectionNames[selected.type]}</p></div><label className={styles.switch}><input type="checkbox" checked={selected.enabled} onChange={e=>update({enabled:e.target.checked})}/><span /></label></div><div className={styles.editorStatus}><span className={selected.enabled?styles.readyOk:styles.readyWait}>{selected.enabled?"Visible":"Hidden"}</span><small>{placements.find(p=>p.value===(selected.placement??"before-hero"))?.label}</small></div><div className={styles.editorForm}><label>Position in app<select className={styles.selectField} value={selected.placement??"before-hero"} onChange={e=>update({placement:e.target.value as Placement})}>{placements.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label>Title<input value={selected.title} onChange={e=>update({title:e.target.value})}/></label><label>Description<textarea rows={4} value={selected.subtitle} onChange={e=>update({subtitle:e.target.value})}/></label>{selected.type!=="announcement"&&<label>Button label<input value={selected.buttonLabel} onChange={e=>update({buttonLabel:e.target.value})}/></label>}{selected.type==="hero"&&<label>Image URL<input value={selected.image} placeholder="https://..." onChange={e=>update({image:e.target.value})}/></label>}<label>Background color<div className={styles.colorField}><input type="color" value={selected.background} onChange={e=>update({background:e.target.value})}/><input value={selected.background} onChange={e=>update({background:e.target.value})}/></div></label><div className={styles.dangerZone}><strong>Danger zone</strong><button className={styles.delete} onClick={()=>remove(selected.id)}>Delete section</button></div></div></>:<div className={styles.empty}>Select a section to edit it.</div>}</section>
  </div>;
}

function PreviewSection({section,selected,onClick}:{section:Section;selected:boolean;onClick:()=>void}) {
  if(section.type==="hero") return <section onClick={onClick} className={`${styles.previewHero} ${selected?styles.previewSelected:""}`} style={{backgroundColor:section.background,backgroundImage:section.image?`linear-gradient(90deg,rgba(0,0,0,.36),rgba(0,0,0,.02)),url(${section.image})`:undefined}}><h3>{section.title}</h3><p>{section.subtitle}</p><button>{section.buttonLabel}</button></section>;
  if(section.type==="announcement") return <section onClick={onClick} className={`${styles.previewNotice} ${selected?styles.previewSelected:""}`} style={{background:section.background}}>{section.title}</section>;
  if(section.type==="products") return <section onClick={onClick} className={`${styles.previewProducts} ${selected?styles.previewSelected:""}`}><h3>{section.title}</h3><p>{section.subtitle}</p><div>{["#f5ddd2","#dce8ef","#efe4d4"].map((c,i)=><span key={c} style={{background:c}}><i>Product {i+1}</i><b>${18+i*7}.00</b></span>)}</div></section>;
  return <section onClick={onClick} className={`${styles.previewText} ${selected?styles.previewSelected:""}`} style={{background:section.background}}><h3>{section.title}</h3><p>{section.subtitle}</p><button>{section.buttonLabel}</button></section>;
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
  const [pageInfo,setPageInfo]=useState<{hasNextPage:boolean;endCursor:string|null}>({hasNextPage:false,endCursor:null});
  const load=async(term:string,after:string|null)=>{setLoading(true);setMessage("");try{const params=new URLSearchParams();if(term.trim())params.set("search",term.trim());if(after)params.set("after",after);const response=await fetch(`/api/shopify/inventory?${params}`,{cache:"no-store"});const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to load inventory.");const next=Array.isArray(data.inventory)?data.inventory:[];setItems(current=>after?[...current,...next]:next);const nextLocations=Array.isArray(data.locations)?data.locations:[];setLocations(nextLocations);setLocationId(current=>current||nextLocations[0]?.id||"");setPageInfo(data.pageInfo||{hasNextPage:false,endCursor:null});if(!next.length)setMessage(term?"No inventory matches this search.":"No Shopify inventory was returned.")}catch(error){setMessage(error instanceof Error?error.message:"Unable to load inventory.");if(!after)setItems([])}finally{setLoading(false)}};
  useEffect(()=>{/* eslint-disable react-hooks/set-state-in-effect */void load("",null);/* eslint-enable react-hooks/set-state-in-effect */},[]);
  const quantityAt=(item:InventoryItem)=>locationId?(item.levels.find(level=>level.locationId===locationId)?.quantity??0):item.quantity;
  const filtered=items.filter(item=>{
    const quantity=quantityAt(item);
    const stockMatches=stockFilter==="all"||(stockFilter==="in"&&quantity>0)||(stockFilter==="low"&&quantity>0&&quantity<=5)||(stockFilter==="out"&&quantity<=0)||(stockFilter==="untracked"&&!item.tracked);
    return stockMatches&&(statusFilter==="all"||item.productStatus===statusFilter);
  });
  const toggle=(id:string)=>setSelected(current=>current.includes(id)?current.filter(item=>item!==id):[...current,id]);
  const selectVisible=()=>setSelected(current=>filtered.every(item=>current.includes(item.id))?current.filter(id=>!filtered.some(item=>item.id===id)):[...new Set([...current,...filtered.map(item=>item.id)])]);
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
    try{const response=await fetch("/api/shopify/inventory",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({changes})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to update inventory.");setMessage(`Updated ${data.changed} inventory item${data.changed===1?"":"s"}.`);setSelected([]);await load(search,null)}catch(error){setMessage(error instanceof Error?error.message:"Unable to update inventory.")}finally{setSaving(false)}
  };
  const openProduct=(item:InventoryItem)=>{setEditing(item);setProductDraft({title:item.product,status:item.productStatus,sku:item.sku,barcode:item.barcode,price:item.price,compareAtPrice:item.compareAtPrice||"",inventoryPolicy:item.policy,tracked:item.tracked});setMessage("")};
  const closeProduct=()=>{setEditing(null);setProductDraft(null)};
  const saveProduct=async()=>{
    if(!editing||!productDraft)return;
    if(!productDraft.title.trim()){setMessage("Product title is required.");return}
    setProductSaving(true);setMessage("Updating product in Shopify...");
    try{const response=await fetch("/api/shopify/inventory",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({productId:editing.productId,variantId:editing.id,product:{title:productDraft.title,status:productDraft.status},variant:{sku:productDraft.sku,barcode:productDraft.barcode,price:productDraft.price,compareAtPrice:productDraft.compareAtPrice,inventoryPolicy:productDraft.inventoryPolicy,tracked:productDraft.tracked}})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to update product.");setMessage(`${productDraft.title} was updated in Shopify.`);closeProduct();await load(search,null)}catch(error){setMessage(error instanceof Error?error.message:"Unable to update product.")}finally{setProductSaving(false)}
  };
  const lowStock=filtered.filter(item=>item.tracked&&quantityAt(item)>0&&quantityAt(item)<=5).length;const outOfStock=filtered.filter(item=>item.tracked&&quantityAt(item)<=0).length;const totalUnits=filtered.reduce((sum,item)=>sum+Math.max(0,quantityAt(item)),0);
  return <div className={styles.content}>
    <div className={styles.actionHeader}>
      <div><h2>Inventory</h2><p>Manage available Shopify stock by location.</p></div>
      <form className={styles.customerSearch} onSubmit={event=>{event.preventDefault();void load(search,null)}}>
        <input className={styles.smallSearch} placeholder="Search product, variant, or SKU" value={search} onChange={event=>setSearch(event.target.value)}/>
        <button className={styles.primary} disabled={loading}>Search</button>
        {search&&<button className={styles.secondary} type="button" onClick={()=>{setSearch("");void load("",null)}}>Clear</button>}
      </form>
    </div>
    <div className={styles.inventoryFilters}>
      <label>Location<select value={locationId} onChange={event=>{setLocationId(event.target.value);setSelected([])}}>{locations.map(location=><option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
      <label>Stock<select value={stockFilter} onChange={event=>setStockFilter(event.target.value)}><option value="all">All inventory</option><option value="in">In stock</option><option value="low">Low stock</option><option value="out">Out of stock</option><option value="untracked">Not tracked</option></select></label>
      <label>Product status<select value={statusFilter} onChange={event=>setStatusFilter(event.target.value)}><option value="all">All statuses</option><option value="ACTIVE">Active</option><option value="DRAFT">Draft</option><option value="ARCHIVED">Archived</option></select></label>
    </div>
    <div className={styles.segmentGrid}>{[["Variants","Matching filters",filtered.length],["Available units","At selected location",totalUnits],["Low stock","Five units or fewer",lowStock],["Out of stock","Tracked with no stock",outOfStock]].map(([title,copy,value])=><article className={styles.segment} key={title}><span>▦</span><div><strong>{title}</strong><small>{copy}</small></div><b>{value}</b></article>)}</div>
    {selected.length>0&&<div className={styles.bulkBar}><strong>{selected.length} selected</strong><select value={bulkMode} onChange={event=>setBulkMode(event.target.value as typeof bulkMode)}><option value="set">Set quantity to</option><option value="add">Add quantity</option><option value="subtract">Subtract quantity</option><option value="zero">Set to zero</option></select>{bulkMode!=="zero"&&<input type="number" min="0" value={bulkValue} onChange={event=>setBulkValue(event.target.value)}/>}<button className={styles.primary} disabled={saving} onClick={()=>void applyBulk()}>{saving?"Updating...":"Apply bulk edit"}</button><button className={styles.secondary} onClick={()=>setSelected([])}>Clear selection</button></div>}
    <section className={`${styles.card} ${styles.inventoryManageTable}`}>
      <div className={styles.cardHead}><div><h2>Stock directory</h2><p>{message||"Select variants to change quantities in bulk. Setting zero removes available stock, not the product."}</p></div><i className={`${styles.tag} ${message?styles.tagGray:styles.tagGreen}`}>{loading?"Loading":message?"Notice":"Connected"}</i></div>
      <div className={styles.dataTable}>
        <div className={styles.tableHead}><input type="checkbox" aria-label="Select visible inventory" checked={Boolean(filtered.length)&&filtered.every(item=>selected.includes(item.id))} onChange={selectVisible}/><span>Product</span><span>SKU</span><span>Price</span><span>Available</span><span>Status</span><span>Updated</span><span>Action</span></div>
        {filtered.length?filtered.map(item=><div className={styles.tableRow} key={item.id}><input type="checkbox" aria-label={`Select ${item.name}`} checked={selected.includes(item.id)} onChange={()=>toggle(item.id)}/><div className={styles.customerCell}><strong>{item.product}</strong><small>{item.variant} · {item.productStatus.toLowerCase()}</small></div><span>{item.sku||"—"}</span><span>{item.price}</span><strong className={quantityAt(item)<=0?styles.stockEmpty:quantityAt(item)<=5?styles.stockLow:styles.stockOk}>{item.tracked?quantityAt(item):"Not tracked"}</strong><span><i className={`${styles.tag} ${quantityAt(item)<=0?styles.tagGray:styles.tagGreen}`}>{quantityAt(item)>0?"In stock":"Out of stock"}</i></span><span>{item.updatedAt?new Date(item.updatedAt).toLocaleDateString():"—"}</span><button className={styles.secondary} type="button" onClick={()=>openProduct(item)}>View / edit</button></div>):<div className={styles.empty}>{loading?"Loading Shopify inventory...":message||"No inventory matches these filters."}</div>}
      </div>
      {pageInfo.hasNextPage&&<div className={styles.inlineActions}><button className={styles.secondary} disabled={loading} onClick={()=>void load(search,pageInfo.endCursor)}>Load more</button></div>}
    </section>
    {editing&&productDraft&&<section className={`${styles.card} ${styles.productEditor}`}>
      <div className={styles.cardHead}><div><h2>View or edit product</h2><p>{editing.variant} · Changes are saved directly to Shopify.</p></div><button className={styles.secondary} type="button" onClick={closeProduct}>Close</button></div>
      <div className={styles.productEditorGrid}>
        <label>Product title<input value={productDraft.title} onChange={event=>setProductDraft(current=>current&&({...current,title:event.target.value}))}/></label>
        <label>Product status<select value={productDraft.status} onChange={event=>setProductDraft(current=>current&&({...current,status:event.target.value}))}><option value="ACTIVE">Active</option><option value="DRAFT">Draft</option><option value="ARCHIVED">Archived</option></select></label>
        <label>SKU<input value={productDraft.sku} onChange={event=>setProductDraft(current=>current&&({...current,sku:event.target.value}))}/></label>
        <label>Barcode<input value={productDraft.barcode} onChange={event=>setProductDraft(current=>current&&({...current,barcode:event.target.value}))}/></label>
        <label>Price<input type="number" min="0" step="0.01" value={productDraft.price} onChange={event=>setProductDraft(current=>current&&({...current,price:event.target.value}))}/></label>
        <label>Compare-at price<input type="number" min="0" step="0.01" value={productDraft.compareAtPrice} onChange={event=>setProductDraft(current=>current&&({...current,compareAtPrice:event.target.value}))} placeholder="No compare-at price"/></label>
        <label>Out-of-stock policy<select value={productDraft.inventoryPolicy} onChange={event=>setProductDraft(current=>current&&({...current,inventoryPolicy:event.target.value}))}><option value="DENY">Stop selling</option><option value="CONTINUE">Continue selling</option></select></label>
        <label className={styles.productCheck}><input type="checkbox" checked={productDraft.tracked} onChange={event=>setProductDraft(current=>current&&({...current,tracked:event.target.checked}))}/>Track inventory for this variant</label>
      </div>
      <div className={styles.productLocations}><strong>Inventory by location</strong>{editing.levels.length?editing.levels.map(level=><div key={level.locationId}><span>{level.locationName}</span><b>{level.quantity}</b></div>):<small>No active inventory levels.</small>}</div>
      <div className={styles.inlineActions}><button className={styles.secondary} type="button" onClick={closeProduct}>Cancel</button><button className={styles.primary} type="button" disabled={productSaving} onClick={()=>void saveProduct()}>{productSaving?"Saving...":"Save product"}</button></div>
    </section>}
  </div>
}

function Promotions(){
  const [items,setItems]=useState<Promotion[]>([]);const [search,setSearch]=useState("");const [statusFilter,setStatusFilter]=useState("all");const [methodFilter,setMethodFilter]=useState("all");const [loading,setLoading]=useState(true);const [message,setMessage]=useState("");const [showCreate,setShowCreate]=useState(false);const [pageInfo,setPageInfo]=useState<{hasNextPage:boolean;endCursor:string|null}>({hasNextPage:false,endCursor:null});
  const [draft,setDraft]=useState({method:"code",title:"",code:"",valueType:"percentage",value:"10",minimumSubtotal:"",usageLimit:"",startsAt:"",endsAt:"",appliesOncePerCustomer:false});
  const load=async(term:string,after:string|null)=>{setLoading(true);setMessage("");try{const params=new URLSearchParams();if(term.trim())params.set("search",term.trim());if(after)params.set("after",after);const response=await fetch(`/api/shopify/promotions?${params}`,{cache:"no-store"});const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to load promotions.");const next=Array.isArray(data.promotions)?data.promotions:[];setItems(current=>after?[...current,...next]:next);setPageInfo(data.pageInfo||{hasNextPage:false,endCursor:null});if(!next.length)setMessage(term?"No promotions match this search.":"No Shopify promotions were returned.")}catch(error){setMessage(error instanceof Error?error.message:"Unable to load promotions.");if(!after)setItems([])}finally{setLoading(false)}};
  useEffect(()=>{/* eslint-disable react-hooks/set-state-in-effect */void load("",null);/* eslint-enable react-hooks/set-state-in-effect */},[]);
  const methodOf=(item:Promotion)=>item.type.startsWith("Automatic")?"automatic":"code";const filtered=items.filter(item=>(statusFilter==="all"||item.status===statusFilter)&&(methodFilter==="all"||methodOf(item)===methodFilter));
  const createPromotion=async()=>{setLoading(true);setMessage("Creating promotion in Shopify...");try{const payload={...draft,startsAt:draft.startsAt?new Date(draft.startsAt).toISOString():undefined,endsAt:draft.endsAt?new Date(draft.endsAt).toISOString():undefined};const response=await fetch("/api/shopify/promotions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to create promotion.");setMessage("Promotion created in Shopify.");setShowCreate(false);setDraft({method:"code",title:"",code:"",valueType:"percentage",value:"10",minimumSubtotal:"",usageLimit:"",startsAt:"",endsAt:"",appliesOncePerCustomer:false});await load("",null)}catch(error){setMessage(error instanceof Error?error.message:"Unable to create promotion.")}finally{setLoading(false)}};
  const deletePromotion=async(item:Promotion)=>{if(!window.confirm(`Delete ${item.title}? This permanently removes the promotion from Shopify.`))return;setLoading(true);setMessage("Deleting promotion...");try{const response=await fetch(`/api/shopify/promotions?id=${encodeURIComponent(item.id)}&method=${methodOf(item)}`,{method:"DELETE"});const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to delete promotion.");setItems(current=>current.filter(entry=>entry.id!==item.id));setMessage(`${item.title} was deleted.`)}catch(error){setMessage(error instanceof Error?error.message:"Unable to delete promotion.")}finally{setLoading(false)}};
  const active=filtered.filter(item=>item.status==="ACTIVE").length;const scheduled=filtered.filter(item=>item.status==="SCHEDULED").length;const uses=filtered.reduce((sum,item)=>sum+item.usageCount,0);
  return <div className={styles.content}><div className={styles.actionHeader}><div><h2>Promotions</h2><p>Create and manage Shopify discounts.</p></div><div className={styles.inlineActions}><button className={styles.primary} onClick={()=>setShowCreate(value=>!value)}>{showCreate?"Close creator":"Create promotion"}</button></div></div>{showCreate&&<section className={`${styles.card} ${styles.promotionCreator}`}><div className={styles.cardHead}><div><h2>New promotion</h2><p>Basic percentage or fixed-amount discount for all products.</p></div></div><div className={styles.promotionForm}><label>Method<select value={draft.method} onChange={event=>setDraft(current=>({...current,method:event.target.value}))}><option value="code">Discount code</option><option value="automatic">Automatic discount</option></select></label><label>Title<input value={draft.title} onChange={event=>setDraft(current=>({...current,title:event.target.value}))} placeholder="Summer sale"/></label>{draft.method==="code"&&<label>Code<input value={draft.code} onChange={event=>setDraft(current=>({...current,code:event.target.value.toUpperCase()}))} placeholder="SUMMER20"/></label>}<label>Value type<select value={draft.valueType} onChange={event=>setDraft(current=>({...current,valueType:event.target.value}))}><option value="percentage">Percentage</option><option value="fixed">Fixed amount</option></select></label><label>Discount value<input type="number" min="0.01" step="0.01" value={draft.value} onChange={event=>setDraft(current=>({...current,value:event.target.value}))}/></label><label>Minimum subtotal<input type="number" min="0" step="0.01" value={draft.minimumSubtotal} onChange={event=>setDraft(current=>({...current,minimumSubtotal:event.target.value}))} placeholder="No minimum"/></label>{draft.method==="code"&&<label>Usage limit<input type="number" min="1" value={draft.usageLimit} onChange={event=>setDraft(current=>({...current,usageLimit:event.target.value}))} placeholder="Unlimited"/></label>}<label>Starts<input type="datetime-local" value={draft.startsAt} onChange={event=>setDraft(current=>({...current,startsAt:event.target.value}))}/></label><label>Ends<input type="datetime-local" value={draft.endsAt} onChange={event=>setDraft(current=>({...current,endsAt:event.target.value}))}/></label>{draft.method==="code"&&<label className={styles.promotionCheck}><input type="checkbox" checked={draft.appliesOncePerCustomer} onChange={event=>setDraft(current=>({...current,appliesOncePerCustomer:event.target.checked}))}/>Limit to one use per customer</label>}</div><div className={styles.inlineActions}><button className={styles.secondary} onClick={()=>setShowCreate(false)}>Cancel</button><button className={styles.primary} disabled={loading} onClick={()=>void createPromotion()}>{loading?"Creating...":"Create in Shopify"}</button></div></section>}<div className={styles.promotionFilters}><form className={styles.customerSearch} onSubmit={event=>{event.preventDefault();void load(search,null)}}><input className={styles.smallSearch} placeholder="Search promotion title" value={search} onChange={event=>setSearch(event.target.value)}/><button className={styles.primary} disabled={loading}>Search</button></form><select value={statusFilter} onChange={event=>setStatusFilter(event.target.value)}><option value="all">All statuses</option><option value="ACTIVE">Active</option><option value="SCHEDULED">Scheduled</option><option value="EXPIRED">Expired</option></select><select value={methodFilter} onChange={event=>setMethodFilter(event.target.value)}><option value="all">All methods</option><option value="code">Discount code</option><option value="automatic">Automatic</option></select></div><div className={styles.segmentGrid}>{[["Promotions","Matching filters",filtered.length],["Active","Currently available",active],["Scheduled","Starting later",scheduled],["Uses","Reported by Shopify",uses]].map(([title,copy,value])=><article className={styles.segment} key={title}><span>%</span><div><strong>{title}</strong><small>{copy}</small></div><b>{value}</b></article>)}</div><section className={`${styles.card} ${styles.promotionManageTable}`}><div className={styles.cardHead}><div><h2>Promotion directory</h2><p>{message||"Shopify code and automatic discounts."}</p></div><i className={`${styles.tag} ${message?styles.tagGray:styles.tagGreen}`}>{loading?"Loading":message?"Notice":"Connected"}</i></div><div className={styles.dataTable}><div className={styles.tableHead}><span>Promotion</span><span>Method</span><span>Status</span><span>Starts</span><span>Ends</span><span>Uses</span><span>Action</span></div>{filtered.length?filtered.map(item=><div className={styles.tableRow} key={item.id}><div className={styles.customerCell}><strong>{item.title}</strong><small>{item.type.replace(/([a-z])([A-Z])/g,"$1 $2")}</small></div><strong>{item.code}</strong><span><i className={`${styles.tag} ${item.status==="ACTIVE"?styles.tagGreen:item.status==="SCHEDULED"?styles.tagBlue:styles.tagGray}`}>{item.status.toLowerCase()}</i></span><span>{item.startsAt?new Date(item.startsAt).toLocaleDateString():"Immediately"}</span><span>{item.endsAt?new Date(item.endsAt).toLocaleDateString():"No end date"}</span><strong>{item.usageCount}</strong><button className={styles.delete} disabled={loading} onClick={()=>void deletePromotion(item)}>Delete</button></div>):<div className={styles.empty}>{loading?"Loading Shopify promotions...":message||"No promotions match these filters."}</div>}</div>{pageInfo.hasNextPage&&<div className={styles.inlineActions}><button className={styles.secondary} disabled={loading} onClick={()=>void load(search,pageInfo.endCursor)}>Load more</button></div>}</section></div>
}

function Analytics(){
  const [summary,setSummary]=useState<AnalyticsSummary|null>(null);const [message,setMessage]=useState("");
  useEffect(()=>{fetch("/api/analytics/summary",{cache:"no-store"}).then(async response=>{if(!response.ok)throw new Error("Analytics API unavailable.");setSummary(await response.json())}).catch(error=>setMessage(error.message))},[]);
  const maxDay=Math.max(1,...(summary?.days.map(day=>day.value)||[1]));const productRate=summary?.screenViews?Math.round((summary.productViews/summary.screenViews)*100):0;const cartRate=summary?.productViews?Math.round((summary.cartViews/summary.productViews)*100):0;
  return <div className={styles.content}><section className={styles.opsHero}><div><p>APP ANALYTICS</p><h2>Last 30 days</h2><span>Recorded app sessions, screen activity and shopping intent.</span></div><i className={`${styles.tag} ${message?styles.tagGray:styles.tagGreen}`}>{message?"Unavailable":"Live records"}</i></section>{message&&<section className={styles.card}>{message}</section>}<div className={styles.metricGrid}>{[[summary?.sessions??"—","Unique devices","Recorded sessions"],[summary?.screenViews??"—","Screen views","All tracked screens"],[summary?.productViews??"—","Product views",`${productRate}% of screen views`],[summary?.cartViews??"—","Cart views",`${cartRate}% of product views`]].map(([value,label,note])=><article className={styles.metric} key={label}><div className={styles.metricIcon}>↗</div><p>{label}</p><strong>{value}</strong><span>{note}</span></article>)}</div><div className={styles.dashboardGrid}><section className={styles.card}><div className={styles.cardHead}><div><h2>Daily active devices</h2><p>Unique devices with screen views · last 7 days</p></div></div><div className={styles.chart}>{(summary?.days||[]).map(day=><div key={day.label} className={styles.barWrap}><div className={styles.bar} style={{height:`${Math.max(3,(day.value/maxDay)*100)}%`}}/><small>{day.label}</small></div>)}</div></section><section className={styles.card}><div className={styles.cardHead}><div><h2>Engagement signals</h2><p>Current local analytics coverage</p></div></div><div className={styles.analyticsSignals}><div><strong>{summary?.notificationDevices??"—"}</strong><small>Push-enabled devices</small></div><div><strong>{productRate}%</strong><small>Screen-to-product rate</small></div><div><strong>{cartRate}%</strong><small>Product-to-cart rate</small></div><div><strong>{summary?.purchases??"—"}</strong><small>Purchases require webhooks</small></div></div></section></div></div>
}

function Chat(){return <div className={styles.content}><div className={styles.actionHeader}><div><h2>Customer chat</h2><p>Realtime support inbox readiness.</p></div><button className={styles.secondary}>Configure inbox</button></div><div className={styles.supportGrid}><section className={styles.card}><div className={styles.cardHead}><div><h2>Inbox status</h2><p>Supabase Realtime is required before live chat can be enabled.</p></div></div><div className={styles.empty}>No recorded conversations yet.</div></section><section className={styles.card}><div className={styles.cardHead}><div><h2>Setup checklist</h2><p>Required production pieces.</p></div></div><div className={styles.checkList}>{["Create conversations table","Enable realtime channel","Add staff assignment rules","Connect notification alerts"].map((item)=><div key={item}><span>○</span><strong>{item}</strong></div>)}</div></section></div></div>}

function Marketing(){
  const [composer,setComposer]=useState(false);
  const [pushTitle,setPushTitle]=useState("New arrivals are here");
  const [pushMessage,setPushMessage]=useState("Discover the latest styles in the Carter's app.");
  const [pushUrl,setPushUrl]=useState("/collection/new-collection-ss26");
  const [sendStatus,setSendStatus]=useState("");
  const [campaigns,setCampaigns]=useState<{id:string;title:string;createdAt:string;recipientCount:number;status:string;opens:number;openRate:number|null}[]>([]);
  const [deviceCount,setDeviceCount]=useState<number|null>(null);
  const [refreshMessage,setRefreshMessage]=useState("");
  const refreshCampaigns=async()=>{setRefreshMessage("Refreshing…");try{const response=await fetch(`/api/push/campaigns?t=${Date.now()}`,{cache:"no-store"});if(!response.ok)throw new Error("Refresh failed");const data=await response.json();setCampaigns(Array.isArray(data.campaigns)?data.campaigns:[]);setRefreshMessage(`Updated ${new Date().toLocaleTimeString()}`)}catch{setRefreshMessage("Unable to refresh")}};
  useEffect(()=>{fetch("/api/analytics/summary").then(response=>response.json()).then(data=>setDeviceCount(Number(data.notificationDevices)||0)).catch(()=>setDeviceCount(null));fetch("/api/push/campaigns").then(response=>response.json()).then(data=>setCampaigns(Array.isArray(data.campaigns)?data.campaigns:[])).catch(()=>setCampaigns([]))},[]);
  const sendPush=async()=>{setSendStatus("Sending…");try{const response=await fetch("/api/push/send",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:pushTitle,message:pushMessage,url:pushUrl})});const result=await response.json();if(!response.ok)throw new Error(result.error||"Unable to send");setSendStatus(result.queued&&result.sent===0?"Queued for local app testing ✓":`Sent to ${result.sent} device${result.sent===1?"":"s"} ✓`);await refreshCampaigns()}catch(error){setSendStatus(error instanceof Error?error.message:"Unable to send")}};
  return <div className={styles.content}>
    <div className={styles.actionHeader}><div><h2>Push notifications</h2><p>Create campaigns, reminders and targeted offers.</p></div><button className={styles.primary} onClick={()=>setComposer(true)}>＋ New campaign</button></div>
    <div className={styles.metricGrid}><MiniMetric value={deviceCount===null?"—":String(deviceCount)} label="Reachable devices" note="Registered push tokens"/><MiniMetric value="—" label="Average open rate" note="Delivery receipts not connected"/><MiniMetric value="—" label="Campaign revenue" note="Shopify attribution not connected"/><MiniMetric value="0" label="Active automations" note="Scheduler not connected"/></div>
    {composer&&<section className={`${styles.card} ${styles.composer}`}><div className={styles.cardHead}><div><h2>Create push campaign</h2><p>Send immediately to registered app devices or the local test queue.</p></div><button className={styles.iconButton} onClick={()=>setComposer(false)}>×</button></div><div className={styles.formGrid}><label>Notification title<input value={pushTitle} onChange={e=>setPushTitle(e.target.value)}/></label><label>Audience<select defaultValue="all"><option value="all">All registered app users</option></select></label><label>Notification message<input value={pushMessage} onChange={e=>setPushMessage(e.target.value)}/></label><label>Deep link<input value={pushUrl} onChange={e=>setPushUrl(e.target.value)}/></label></div><div className={styles.inlineActions}>{sendStatus&&<span>{sendStatus}</span>}<button className={styles.secondary} onClick={()=>setComposer(false)}>Cancel</button><button className={styles.primary} onClick={sendPush}>Send now</button></div></section>}
    <section className={styles.card}><div className={styles.cardHead}><div><h2>Sent notifications</h2><p>Unique opens are recorded when a customer taps a notification. {refreshMessage}</p></div><button className={styles.secondary} onClick={refreshCampaigns}>Refresh</button></div>{campaigns.length?<div className={styles.dataTable}><div className={styles.tableHead}><span>Notification</span><span>Sent</span><span>Status</span><span>Recipients</span><span>Opens</span></div>{campaigns.map(c=><div className={styles.tableRow} key={c.id}><strong>{c.title}</strong><span>{new Date(c.createdAt).toLocaleString()}</span><span><i className={`${styles.tag} ${c.status==="submitted"?styles.tagGreen:styles.tagGray}`}>{c.status==="test-queued"?"Local test":c.status}</i></span><span>{c.recipientCount||"Test queue"}</span><span>{c.openRate===null?`${c.opens} test`:`${c.opens} (${c.openRate}%)`}</span></div>)}</div>:<div className={styles.empty}>No sent notifications yet.</div>}</section>
    <section className={styles.card}><div className={styles.cardHead}><div><h2>Automations</h2><p>These remain off until a persistent job scheduler is connected.</p></div></div><div className={styles.automationGrid}>{[["Cart reminder","Send 2 hours after cart abandonment"],["Back in stock","Notify customers watching a product"],["Birthday offer","Send a personal discount"]].map(([title,text])=><div className={styles.automation} key={title}><span>⚡</span><div><strong>{title}</strong><small>{text}</small></div><label className={styles.switch}><input type="checkbox" disabled/><span/></label></div>)}</div></section>
  </div>
}

function MiniMetric({value,label,note}:{value:string;label:string;note:string}){return <article className={styles.metric}><p>{label}</p><strong>{value}</strong><span>{note}</span></article>}

function OrderProductImage({item}:{item:OrderLineItem}){
  if(!item.image?.url)return <span className={styles.orderImageFallback}>▦</span>;
  // Shopify serves order product images from its CDN; preserve the exact historic line-item image URL.
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={styles.orderProductImage} src={item.image.url} alt={item.image.altText||item.name}/>;
}

function Orders(){
  const [orders,setOrders]=useState<AdminOrder[]>([]);
  const [search,setSearch]=useState("");
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState("");
  const [statusFilter,setStatusFilter]=useState("all");
  const [selectedOrderIds,setSelectedOrderIds]=useState<string[]>([]);
  const [bulkNotifyCustomer,setBulkNotifyCustomer]=useState(false);
  const [selectedId,setSelectedId]=useState("");
  const [saving,setSaving]=useState(false);
  const [notifyCustomer,setNotifyCustomer]=useState(false);
  const [draft,setDraft]=useState<OrderDraft|null>(null);
  const [pageInfo,setPageInfo]=useState<{hasNextPage:boolean;endCursor:string|null}>({hasNextPage:false,endCursor:null});
  const loadOrders=async(term:string,after:string|null)=>{
    setLoading(true);setMessage("");
    try{
      const params=new URLSearchParams();
      if(term.trim())params.set("search",term.trim());
      if(after)params.set("after",after);
      const response=await fetch(`/api/shopify/orders?${params.toString()}`,{cache:"no-store"});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Unable to load Shopify orders.");
      const next=Array.isArray(data.orders)?data.orders:[];
      setOrders(items=>after?[...items,...next]:next);
      setPageInfo(data.pageInfo||{hasNextPage:false,endCursor:null});
      if(!next.length)setMessage(term?"No Shopify orders match this search.":"No Shopify orders were returned.");
    }catch(error){setMessage(error instanceof Error?error.message:"Unable to load Shopify orders.");if(!after)setOrders([])}
    finally{setLoading(false)}
  };
  useEffect(()=>{
    /* eslint-disable react-hooks/set-state-in-effect */
    void loadOrders("",null);
    /* eslint-enable react-hooks/set-state-in-effect */
    // Initial Shopify load only; search and pagination are explicit actions.
  },[]);
  const money=(value:AdminOrder["total"])=>{if(!value)return "—";try{return new Intl.NumberFormat(undefined,{style:"currency",currency:value.currencyCode}).format(Number(value.amount))}catch{return `${value.amount} ${value.currencyCode}`}};
  const paidCount=orders.filter(order=>order.financialStatus==="PAID").length;
  const openFulfillmentCount=orders.filter(order=>!(["FULFILLED","RESTOCKED"] as string[]).includes(order.fulfillmentStatus)).length;
  const sales=orders.reduce((sum,order)=>sum+(Number(order.total?.amount)||0),0);
  const currency=orders.find(order=>order.total?.currencyCode)?.total?.currencyCode;
  const salesLabel=currency?money({amount:String(sales),currencyCode:currency}):"—";
  const filteredOrders=orders.filter(order=>statusFilter==="all"||(statusFilter==="unfulfilled"&&!order.cancelledAt&&order.fulfillmentStatus!=="FULFILLED")||(statusFilter==="unpaid"&&!order.cancelledAt&&order.financialStatus!=="PAID")||(statusFilter==="paid"&&!order.cancelledAt&&order.financialStatus==="PAID")||(statusFilter==="cancelled"&&Boolean(order.cancelledAt)));
  const selectedOrders=orders.filter(order=>selectedOrderIds.includes(order.id));
  const fulfillableSelected=selectedOrders.filter(order=>!order.cancelledAt&&order.fulfillmentStatus!=="FULFILLED");
  const selectedOrder=orders.find(order=>order.id===selectedId);
  const toggleOrder=(id:string)=>setSelectedOrderIds(current=>current.includes(id)?current.filter(value=>value!==id):[...current,id]);
  const selectVisibleOrders=()=>setSelectedOrderIds(current=>filteredOrders.every(order=>current.includes(order.id))?current.filter(id=>!filteredOrders.some(order=>order.id===id)):[...new Set([...current,...filteredOrders.map(order=>order.id)])]);
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
      await loadOrders(search,null);
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
      await loadOrders(search,null);
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
      await loadOrders(search,null);
    }catch(error){setMessage(error instanceof Error?error.message:"Unable to cancel order.")}
    finally{setSaving(false)}
  };
  return <div className={styles.content}>
    <div className={styles.actionHeader}><div><h2>Orders</h2><p>Live Shopify orders, newest first.</p></div><form className={styles.customerSearch} onSubmit={event=>{event.preventDefault();void loadOrders(search,null)}}><input className={styles.smallSearch} placeholder="Search order, customer, or email" value={search} onChange={event=>setSearch(event.target.value)}/><button className={styles.primary} disabled={loading} type="submit">Search</button>{search&&<button className={styles.secondary} disabled={loading} type="button" onClick={()=>{setSearch("");void loadOrders("",null)}}>Clear</button>}</form></div>
    <div className={styles.orderFilters} role="tablist" aria-label="Filter orders">{[["all","All"],["unfulfilled","Unfulfilled"],["unpaid","Unpaid"],["paid","Paid"],["cancelled","Cancelled"]].map(([value,label])=><button key={value} role="tab" aria-selected={statusFilter===value} className={statusFilter===value?styles.orderFilterActive:""} onClick={()=>{setStatusFilter(value);setSelectedOrderIds([])}}>{label}</button>)}</div>
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
      {pageInfo.hasNextPage&&<div className={styles.inlineActions}><button className={styles.secondary} disabled={loading} onClick={()=>void loadOrders(search,pageInfo.endCursor)}>Load more</button></div>}
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
  const [inactiveOnly,setInactiveOnly]=useState(false);
  const [inactiveMonths,setInactiveMonths]=useState("5");
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState("");
  const [editingId,setEditingId]=useState("");
  const [savingId,setSavingId]=useState("");
  const [draft,setDraft]=useState<CustomerDraft>({firstName:"",lastName:"",email:"",phone:""});
  const [pageInfo,setPageInfo]=useState<{hasNextPage:boolean;endCursor:string|null}>({hasNextPage:false,endCursor:null});
  const loadCustomers=async(nextSearch=search,after?:string|null)=>{
    setLoading(true); setMessage("");
    try{
      const params=new URLSearchParams();
      if(nextSearch.trim())params.set("search",nextSearch.trim());
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
  const filteredCustomers=customers.filter(customer=>{
    const spent=amountValue(customer);
    const lastOrderDate=customer.lastOrderAt?new Date(customer.lastOrderAt):null;
    return (statusFilter==="all"||customer.status===statusFilter)
      && (minOrderValue===null||customer.orders>=minOrderValue)
      && (maxOrderValue===null||customer.orders<=maxOrderValue)
      && (minSpentValue===null||spent>=minSpentValue)
      && (maxSpentValue===null||spent<=maxSpentValue)
      && (!inactiveOnly||!lastOrderDate||lastOrderDate<inactiveSince);
  });
  const totalOrders=filteredCustomers.reduce((sum,customer)=>sum+customer.orders,0);
  const activeCount=filteredCustomers.filter(customer=>customer.status==="ENABLED").length;
  const formatSpent=(value:AdminCustomer["totalSpent"])=>{if(!value)return "—";try{return new Intl.NumberFormat(undefined,{style:"currency",currency:value.currencyCode}).format(Number(value.amount))}catch{return `${value.amount} ${value.currencyCode}`}};
  const formatDate=(value?:string|null)=>value?new Date(value).toLocaleDateString():"—";
  const hasCustomerFilters=Boolean(search||statusFilter!=="all"||minOrders||maxOrders||minSpent||maxSpent||inactiveOnly);
  const resetFilters=()=>{setSearch("");setStatusFilter("all");setMinOrders("");setMaxOrders("");setMinSpent("");setMaxSpent("");setInactiveOnly(false);setInactiveMonths("5");void loadCustomers("",null)};
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
    link.download=`shopify-customers-${filterName}-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setMessage(`Exported ${filteredCustomers.length} customer${filteredCustomers.length===1?"":"s"}.`);
  };
  return <div className={styles.content}><div className={styles.actionHeader}><div><h2>Customers</h2><p>Live Shopify customer directory.</p></div><form className={styles.customerSearch} onSubmit={event=>{event.preventDefault();void loadCustomers(search,null)}}><input className={styles.smallSearch} placeholder="Search customers" value={search} onChange={event=>setSearch(event.target.value)} /><button className={styles.primary} disabled={loading} type="submit">Search</button><button className={styles.secondary} disabled={loading||!filteredCustomers.length} type="button" onClick={exportCustomers}>Export CSV</button>{hasCustomerFilters&&<button className={styles.secondary} disabled={loading} type="button" onClick={resetFilters}>Clear</button>}</form></div><div className={styles.customerFilterBar}><select className={styles.customerFilter} value={statusFilter} onChange={event=>setStatusFilter(event.target.value)}><option value="all">All statuses</option>{statusOptions.map(status=><option key={status} value={status}>{status.toLowerCase()}</option>)}</select><label>Orders from<input type="number" min="0" value={minOrders} onChange={event=>setMinOrders(event.target.value)} /></label><label>Orders to<input type="number" min="0" value={maxOrders} onChange={event=>setMaxOrders(event.target.value)} /></label><label>Spent from<input type="number" min="0" step="0.01" value={minSpent} onChange={event=>setMinSpent(event.target.value)} /></label><label>Spent to<input type="number" min="0" step="0.01" value={maxSpent} onChange={event=>setMaxSpent(event.target.value)} /></label><label className={styles.customerCheck}><input type="checkbox" checked={inactiveOnly} onChange={event=>setInactiveOnly(event.target.checked)} />No purchase in</label><label>Months<input type="number" min="1" value={inactiveMonths} onChange={event=>setInactiveMonths(event.target.value)} /></label></div><div className={styles.segmentGrid}>{[["Profiles","Loaded from Shopify Admin",String(customers.length)],["Filtered","Matching current filter",String(filteredCustomers.length)],["Active accounts","Enabled filtered records",String(activeCount)],["Orders","From filtered customers",String(totalOrders)]].map(([title,copy,value])=><article className={styles.segment} key={title}><span>♙</span><div><strong>{title}</strong><small>{copy}</small></div><b>{value}</b></article>)}</div><section className={`${styles.card} ${styles.customerTable}`}><div className={styles.cardHead}><div><h2>Customer directory</h2><p>{message||`Showing customers after search, order, spend, and inactivity filters. Inactive means no order since ${formatDate(inactiveSince.toISOString())}.`}</p></div><i className={`${styles.tag} ${message?styles.tagGray:styles.tagGreen}`}>{loading?"Loading":message?"Notice":"Connected"}</i></div><div className={styles.dataTable}><div className={styles.tableHead}><span>Customer</span><span>Location</span><span>Orders</span><span>Status</span><span>Last order</span></div>{filteredCustomers.length?filteredCustomers.map(customer=><div className={styles.customerRecord} key={customer.id}><div className={styles.tableRow}><div className={styles.customerCell}><strong>{customer.name}</strong><small>{customer.email||"No email"} · {customer.phone||"No phone"}</small><div className={styles.customerActions}><button className={styles.secondary} disabled={savingId===customer.id} onClick={()=>startEdit(customer)}>Edit</button><button className={styles.secondary} disabled={savingId===customer.id||customer.orders>0} title={customer.orders>0?"Shopify only allows deleting customers with no orders.":undefined} onClick={()=>void deleteCustomer(customer)}>Delete</button></div></div><span>{customer.location}</span><span>{customer.orders} · {formatSpent(customer.totalSpent)}</span><span><i className={`${styles.tag} ${customer.status==="ENABLED"?styles.tagGreen:styles.tagGray}`}>{customer.status.toLowerCase()}</i></span><span>{formatDate(customer.lastOrderAt)}</span></div>{editingId===customer.id&&<div className={styles.customerEditPanel}><label>First name<input value={draft.firstName} onChange={event=>setDraft(value=>({...value,firstName:event.target.value}))}/></label><label>Last name<input value={draft.lastName} onChange={event=>setDraft(value=>({...value,lastName:event.target.value}))}/></label><label>Email<input value={draft.email} onChange={event=>setDraft(value=>({...value,email:event.target.value}))}/></label><label>Phone<input value={draft.phone} onChange={event=>setDraft(value=>({...value,phone:event.target.value}))}/></label><div><button className={styles.secondary} disabled={savingId===customer.id} onClick={()=>setEditingId("")}>Cancel</button><button className={styles.primary} disabled={savingId===customer.id} onClick={saveCustomer}>{savingId===customer.id?"Saving":"Save"}</button></div></div>}</div>):<div className={styles.empty}>{loading?"Loading customers...":message||"No customers found for this filter."}</div>}</div>{pageInfo.hasNextPage&&<div className={styles.inlineActions}><button className={styles.secondary} disabled={loading} onClick={()=>loadCustomers(search,pageInfo.endCursor)}>Load more</button></div>}</section></div>
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
