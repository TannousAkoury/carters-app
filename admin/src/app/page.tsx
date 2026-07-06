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
type View = "dashboard" | "editor" | "marketing" | "customers" | "chat" | "team" | "settings";
type Placement = "before-hero" | "after-hero" | "after-promos" | "after-ages" | "after-top-picks" | "after-categories" | "after-explore" | "after-essentials" | "after-brands" | "after-latest";
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
  const update = (patch: Partial<Section>) => {
    setSections((items) => items.map((item) => item.id === selectedId ? { ...item, ...patch } : item));
    setSaved(false);
  };
  const saveDraft = () => { localStorage.setItem("carters-admin-draft", JSON.stringify(sections)); setSaved(true); };
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
          <Nav active={view === "marketing"} onClick={() => setView("marketing")} icon="◈" label="Marketing" />
          <Nav active={view === "customers"} onClick={() => setView("customers")} icon="♙" label="Customers" />
          <Nav active={view === "chat"} onClick={() => setView("chat")} icon="◌" label="Customer chat" badge="3" />
          <Nav active={view === "team"} onClick={() => setView("team")} icon="☷" label="Team & activity" />
          <Nav active={view === "settings"} onClick={() => setView("settings")} icon="⚙" label="Settings" />
        </nav>
        <div className={styles.sidebarFoot}><span className={styles.avatar}>CA</span><div><strong>Store admin</strong><small>Administrator</small></div></div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}><div><p className={styles.eyebrow}>CARTER&apos;S MOBILE APP</p><h1>{{dashboard:"Good morning",editor:"App editor",marketing:"Marketing",customers:"Customers",chat:"Customer chat",team:"Team & activity",settings:"Settings"}[view]}</h1></div><div className={styles.topActions}><span className={styles.statusDot}>{publishMessage || "● App live"}</span>{view === "editor" && <><button className={styles.secondary} onClick={saveDraft}>{saved ? "Draft saved" : "Save draft"}</button><button className={styles.primary} onClick={publish}>Publish changes</button></>}</div></header>
        {view === "dashboard" && <Dashboard setView={setView} publishedAt={publishedAt} />}
        {view === "editor" && <Editor sections={sections} selected={selected} selectedId={selectedId} setSelectedId={setSelectedId} update={update} move={move} remove={remove} add={add} />}
        {view === "marketing" && <Marketing />}
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
    {analyticsError&&<section className={styles.card}>Analytics unavailable: {analyticsError}</section>}
    <div className={styles.metricGrid}>{metrics.map(([value, label, note]) => <article className={styles.metric} key={label}><div className={styles.metricIcon}>↗</div><p>{label}</p><strong>{value}</strong><span>{note}</span></article>)}</div>
    <div className={styles.dashboardGrid}>
      <section className={styles.card}><div className={styles.cardHead}><div><h2>Visitors overview</h2><p>Real recorded sessions · last 7 days</p></div></div><div className={styles.chart}>{(summary?.days??[]).map((day) => <div key={day.label} className={styles.barWrap}><div className={styles.bar} style={{height:`${Math.max(3,(day.value/maxDay)*100)}%`}} /><small>{day.label}</small></div>)}</div></section>
      <section className={styles.card}><div className={styles.cardHead}><div><h2>Quick actions</h2><p>Manage your app</p></div></div><button className={styles.quick} onClick={() => setView("editor")}><span>✦</span><div><strong>Edit app homepage</strong><small>Change sections, images and text</small></div><b>→</b></button><button className={styles.quick} onClick={() => setView("marketing")}><span>◈</span><div><strong>Send a notification</strong><small>{summary?.notificationDevices??0} registered devices</small></div><b>→</b></button><div className={styles.published}><span>✓</span><div><strong>Latest publish</strong><small>{publishedAt}</small></div></div></section>
    </div>
    <section className={styles.card}><div className={styles.cardHead}><div><h2>Customer journey</h2><p>Only measured events are shown; purchases require a Shopify webhook.</p></div></div><div className={styles.funnel}>{[[summary?.sessions??0,"Visitors"],[summary?.productViews??0,"Product views"],[summary?.cartViews??0,"Cart views"],[summary?.purchases??"—","Purchased"]].map(([v,l],i)=><div key={String(l)}><strong>{v}</strong><span>{l}</span>{i<3 && <b>→</b>}</div>)}</div></section>
  </div>;
}

function Editor({ sections, selected, selectedId, setSelectedId, update, move, remove, add }: { sections: Section[]; selected?: Section; selectedId: string; setSelectedId: (id:string)=>void; update:(p:Partial<Section>)=>void; move:(i:number,d:-1|1)=>void; remove:(id:string)=>void; add:(t:SectionType,p?:Placement)=>void }) {
  const [showAdd, setShowAdd] = useState(false);
  return <div className={styles.editor}>
    <section className={styles.sectionPanel}><div className={styles.panelTitle}><div><h2>Homepage sections</h2><p>Choose a section to edit</p></div><button className={styles.addButton} onClick={() => setShowAdd(!showAdd)}>＋</button></div>
      {showAdd && <div className={styles.addMenu}>{(Object.keys(sectionNames) as SectionType[]).map((type)=><button key={type} onClick={()=>{add(type);setShowAdd(false)}}><span>＋</span>{sectionNames[type]}</button>)}</div>}
      <div className={styles.sectionList}>{sections.map((section,index)=><div key={section.id} className={`${styles.sectionRow} ${selectedId===section.id?styles.sectionSelected:""}`} onClick={()=>setSelectedId(section.id)}><span className={styles.drag}>⠿</span><div><strong>{section.title || sectionNames[section.type]}</strong><small>{sectionNames[section.type]} · {placements.find(p=>p.value===(section.placement??"before-hero"))?.label}</small></div><div className={styles.rowActions}><button onClick={(e)=>{e.stopPropagation();move(index,-1)}}>↑</button><button onClick={(e)=>{e.stopPropagation();move(index,1)}}>↓</button></div></div>)}</div>
      <div className={styles.shopifyMap}><p>LIVE SHOPIFY SECTIONS</p><button className={styles.insertSlot} onClick={()=>add("text","before-hero")}>＋ Insert section before Shopify hero</button>{shopifySections.map((item,index)=><section key={item.name}><div className={styles.shopifyRow}><span>{index+1}</span><div><strong>{item.name}</strong><small>Content managed by Shopify</small></div><b>Locked</b></div><button className={styles.insertSlot} onClick={()=>add("text",item.after)}>＋ Insert section after {item.name}</button></section>)}</div>
    </section>
    <section className={styles.previewPanel}><div className={styles.previewToolbar}><span>Live preview</span><div>▯ <b>Mobile</b></div></div><div className={styles.phone}><div className={styles.phoneTop}><b>9:41</b><span>● ◒ ▰</span></div><div className={styles.appHeader}><span>☰</span><strong>Carter&apos;s</strong><span>⌕　♧</span></div><div className={styles.phoneBody}>{sections.filter(s=>s.enabled).map(section=><PreviewSection key={section.id} section={section} selected={section.id===selectedId} onClick={()=>setSelectedId(section.id)} />)}</div><div className={styles.appTabs}><span>⌂<small>Home</small></span><span>⌕<small>Search</small></span><span>♡<small>Wishlist</small></span><span>♙<small>Account</small></span></div></div></section>
    <section className={styles.settingsPanel}>{selected ? <><div className={styles.panelTitle}><div><h2>Edit section</h2><p>{sectionNames[selected.type]}</p></div><label className={styles.switch}><input type="checkbox" checked={selected.enabled} onChange={e=>update({enabled:e.target.checked})}/><span /></label></div><div className={styles.form}><label>Position in app<select value={selected.placement??"before-hero"} onChange={e=>update({placement:e.target.value as Placement})}>{placements.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label>Title<input value={selected.title} onChange={e=>update({title:e.target.value})}/></label><label>Description<textarea rows={4} value={selected.subtitle} onChange={e=>update({subtitle:e.target.value})}/></label>{selected.type!=="announcement"&&<label>Button label<input value={selected.buttonLabel} onChange={e=>update({buttonLabel:e.target.value})}/></label>}{selected.type==="hero"&&<label>Image URL<input value={selected.image} placeholder="https://..." onChange={e=>update({image:e.target.value})}/></label>}<label>Background color<div className={styles.colorField}><input type="color" value={selected.background} onChange={e=>update({background:e.target.value})}/><input value={selected.background} onChange={e=>update({background:e.target.value})}/></div></label><button className={styles.delete} onClick={()=>remove(selected.id)}>Delete section</button></div></>:<div className={styles.empty}>Select a section to edit it.</div>}</section>
  </div>;
}

function PreviewSection({section,selected,onClick}:{section:Section;selected:boolean;onClick:()=>void}) {
  if(section.type==="hero") return <section onClick={onClick} className={`${styles.previewHero} ${selected?styles.previewSelected:""}`} style={{backgroundColor:section.background,backgroundImage:section.image?`linear-gradient(90deg,rgba(0,0,0,.36),rgba(0,0,0,.02)),url(${section.image})`:undefined}}><h3>{section.title}</h3><p>{section.subtitle}</p><button>{section.buttonLabel}</button></section>;
  if(section.type==="announcement") return <section onClick={onClick} className={`${styles.previewNotice} ${selected?styles.previewSelected:""}`} style={{background:section.background}}>{section.title}</section>;
  if(section.type==="products") return <section onClick={onClick} className={`${styles.previewProducts} ${selected?styles.previewSelected:""}`}><h3>{section.title}</h3><p>{section.subtitle}</p><div>{["#f5ddd2","#dce8ef","#efe4d4"].map((c,i)=><span key={c} style={{background:c}}><i>Product {i+1}</i><b>${18+i*7}.00</b></span>)}</div></section>;
  return <section onClick={onClick} className={`${styles.previewText} ${selected?styles.previewSelected:""}`} style={{background:section.background}}><h3>{section.title}</h3><p>{section.subtitle}</p><button>{section.buttonLabel}</button></section>;
}

function Chat(){return <div className={styles.content}><section className={styles.card}><div className={styles.cardHead}><div><h2>Customer chat</h2><p>No chat database is connected.</p></div></div><div className={styles.empty}>There are no recorded conversations. Connect Supabase Realtime before enabling chat in production.</div></section></div>}

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

function Customers(){
  return <div className={styles.content}><div className={styles.actionHeader}><div><h2>Customers</h2><p>No fabricated customer totals are displayed.</p></div></div><section className={styles.card}><div className={styles.cardHead}><div><h2>Customer directory</h2><p>Requires a secure Shopify Admin API connection.</p></div></div><div className={styles.empty}>Customer totals, order values, and segments are unavailable until Shopify Admin authentication is connected.</div></section></div>
}

function Team(){
  const [tab,setTab]=useState<"staff"|"activity">("staff");
  return <div className={styles.content}><div className={styles.tabBar}><button className={tab==="staff"?styles.tabActive:""} onClick={()=>setTab("staff")}>Staff & roles</button><button className={tab==="activity"?styles.tabActive:""} onClick={()=>setTab("activity")}>Activity log</button></div>{tab==="staff"?<section className={styles.card}><div className={styles.cardHead}><div><h2>Admin team</h2><p>No staff identities are invented.</p></div></div><div className={styles.empty}>Connect admin authentication to display real staff and roles.</div></section>:<section className={styles.card}><div className={styles.cardHead}><div><h2>Activity log</h2><p>No persistent audit database is connected.</p></div></div><div className={styles.empty}>No recorded admin activity.</div></section>}</div>
}

function Settings(){const [maintenance,setMaintenance]=useState(false);return <div className={styles.content}><div className={styles.settingsGrid}><section className={`${styles.card} ${styles.settingsCard}`}><h2>Admin configuration</h2><p>These connections are required before production deployment.</p><label>Application name<input defaultValue="Carter's App Studio"/></label><label>Public app preview URL<input placeholder="https://app.carters.com.lb"/></label><label>Supabase project URL<input placeholder="https://project.supabase.co"/></label><button className={styles.primary}>Save configuration</button></section><section className={`${styles.card} ${styles.settingsCard}`}><h2>App controls</h2><p>Feature switches take effect after publishing.</p><div className={styles.controlRow}><div><strong>Maintenance mode</strong><small>Show a temporary maintenance screen</small></div><label className={styles.switch}><input type="checkbox" checked={maintenance} onChange={e=>setMaintenance(e.target.checked)}/><span/></label></div><div className={styles.controlRow}><div><strong>Customer chat</strong><small>Allow visitors to start conversations</small></div><label className={styles.switch}><input type="checkbox" defaultChecked/><span/></label></div><div className={styles.controlRow}><div><strong>Wishlist</strong><small>Let customers save products</small></div><label className={styles.switch}><input type="checkbox" defaultChecked/><span/></label></div><label>Minimum app version<input defaultValue="1.0.0"/></label><label>Update message<input defaultValue="A newer version is available with important improvements."/></label><button className={styles.primary}>Publish app controls</button></section></div></div>}
