"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./sales-replenishment.module.css";

type Level = { locationId: string; locationName: string; quantity: number };
type SoldItem = { variantId: string; inventoryItemId: string; tracked: boolean; title: string; variant: string; sku: string; image?: { url?: string; altText?: string | null } | null; units: number; revenue: number; orders: number; levels: Level[] };
type SalesGroup = { key: string; label: string; units: number; revenue: number; orders: number; items: SoldItem[] };
type SalesResponse = { grouping: "day" | "month"; range: { start: string; end: string }; currencyCode: string; timeZone: string; locations: { id: string; name: string; isActive: boolean }[]; groups: SalesGroup[]; totals: { units: number; revenue: number; orders: number; variants: number }; truncated: boolean; error?: string };

const dateValue = (date: Date) => date.toISOString().slice(0, 10);
const initialDates = () => { const end = new Date(); const start = new Date(end); start.setUTCDate(start.getUTCDate() - 29); return { start: dateValue(start), end: dateValue(end) }; };
const printText = (value: string | number) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] || character);

export default function SalesReplenishment() {
  const initial = useMemo(() => initialDates(), []);
  const [grouping, setGrouping] = useState<"day" | "month">("day");
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [data, setData] = useState<SalesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [locationId, setLocationId] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [trackingFilter, setTrackingFilter] = useState("all");
  const [minUnits, setMinUnits] = useState("");
  const [maxUnits, setMaxUnits] = useState("");
  const [sortBy, setSortBy] = useState("units-desc");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  const load = useCallback(async (forceFresh = false) => {
    setLoading(true); setMessage("");
    try {
      const params = new URLSearchParams({ grouping, start, end });
      if (forceFresh) params.set("fresh", "1");
      const response = await fetch(`/api/shopify/sales-replenishment?${params}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load sold items.");
      setData(result);
      setLastUpdated(new Date().toLocaleString());
      setLocationId((current) => result.locations.some((location: { id: string }) => location.id === current) ? current : result.locations[0]?.id || "");
      if (result.truncated) setMessage("This range contains more records than the live report limit. Shorten the date range for a complete item breakdown.");
    } catch (error) {
      setData(null); setMessage(error instanceof Error ? error.message : "Unable to load sold items.");
    } finally { setLoading(false); }
  }, [grouping, start, end]);

  useEffect(() => { /* eslint-disable react-hooks/set-state-in-effect */ void load(false); /* eslint-enable react-hooks/set-state-in-effect */ }, [load]);

  const visibleGroups = useMemo(() => {
    const term = search.trim().toLowerCase();
    const minimum = minUnits === "" ? null : Number(minUnits);
    const maximum = maxUnits === "" ? null : Number(maxUnits);
    const quantityAtLocation = (item: SoldItem) => item.levels.find((level) => level.locationId === locationId)?.quantity ?? 0;
    return (data?.groups || []).map((group) => {
      const items = group.items.filter((item) => {
        const stock = quantityAtLocation(item);
        if (term && !`${item.title} ${item.variant} ${item.sku}`.toLowerCase().includes(term)) return false;
        if (trackingFilter === "tracked" && !item.tracked) return false;
        if (trackingFilter === "untracked" && item.tracked) return false;
        if (stockFilter === "out" && (!item.tracked || stock > 0)) return false;
        if (stockFilter === "low" && (!item.tracked || stock <= 0 || stock > 5)) return false;
        if (stockFilter === "available" && (!item.tracked || stock <= 5)) return false;
        if (minimum !== null && Number.isFinite(minimum) && item.units < minimum) return false;
        if (maximum !== null && Number.isFinite(maximum) && item.units > maximum) return false;
        return true;
      }).sort((a, b) => sortBy === "units-asc" ? a.units - b.units : sortBy === "revenue-desc" ? b.revenue - a.revenue : sortBy === "stock-asc" ? quantityAtLocation(a) - quantityAtLocation(b) : sortBy === "name" ? a.title.localeCompare(b.title) : b.units - a.units);
      return { ...group, units: items.reduce((sum, item) => sum + item.units, 0), revenue: items.reduce((sum, item) => sum + item.revenue, 0), items };
    }).filter((group) => group.items.length);
  }, [data, locationId, maxUnits, minUnits, search, sortBy, stockFilter, trackingFilter]);

  const visibleItemCount = visibleGroups.reduce((sum, group) => sum + group.items.length, 0);
  const hasAdvancedFilters = Boolean(search || stockFilter !== "all" || trackingFilter !== "all" || minUnits || maxUnits || sortBy !== "units-desc");
  const applyPreset = (days: number) => { const nextEnd = new Date(); const nextStart = new Date(nextEnd); nextStart.setUTCDate(nextStart.getUTCDate() - days + 1); setStart(dateValue(nextStart)); setEnd(dateValue(nextEnd)); };
  const clearFilters = () => { setSearch(""); setStockFilter("all"); setTrackingFilter("all"); setMinUnits(""); setMaxUnits(""); setSortBy("units-desc"); };

  const money = (value: number) => { try { return new Intl.NumberFormat(undefined, { style: "currency", currency: data?.currencyCode || "USD" }).format(value); } catch { return `${value.toFixed(2)} ${data?.currencyCode || ""}`; } };
  const rowKey = (group: SalesGroup, item: SoldItem) => `${group.key}|${item.variantId || item.sku || item.title}`;
  const stockAt = (item: SoldItem) => item.levels.find((level) => level.locationId === locationId)?.quantity ?? 0;

  const replenish = async (group: SalesGroup, item: SoldItem) => {
    const key = rowKey(group, item);
    const quantity = Number(quantities[key]);
    if (!locationId) { setMessage("Choose an inventory location first."); return; }
    if (!item.inventoryItemId || !item.tracked) { setMessage(`${item.title} does not have tracked Shopify inventory.`); return; }
    if (!Number.isInteger(quantity) || quantity <= 0) { setMessage("Enter a positive whole-number replenishment quantity."); return; }
    setSavingKey(key); setMessage(`Adding ${quantity} units of ${item.title}…`);
    try {
      const activeAtLocation = item.levels.some((level) => level.locationId === locationId);
      const change = activeAtLocation ? { inventoryItemId: item.inventoryItemId, locationId, delta: quantity } : { inventoryItemId: item.inventoryItemId, locationId, activateQuantity: quantity };
      const response = await fetch("/api/shopify/inventory", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ changes: [change] }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to replenish inventory.");
      setData((current) => current ? { ...current, groups: current.groups.map((currentGroup) => ({ ...currentGroup, items: currentGroup.items.map((currentItem) => {
        if (currentItem.variantId !== item.variantId) return currentItem;
        const existing = currentItem.levels.find((level) => level.locationId === locationId);
        const locationName = current.locations.find((location) => location.id === locationId)?.name || "Location";
        return { ...currentItem, levels: existing ? currentItem.levels.map((level) => level.locationId === locationId ? { ...level, quantity: level.quantity + quantity } : level) : [...currentItem.levels, { locationId, locationName, quantity }] };
      }) })) } : current);
      setQuantities((current) => ({ ...current, [key]: "" }));
      setMessage(`${quantity} units of ${item.title} were added to Shopify inventory.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to replenish inventory."); }
    finally { setSavingKey(""); }
  };

  const printReport = () => {
    const printWindow = window.open("", "carters-sales-report", "width=1200,height=800");
    if (!printWindow) { setMessage("Allow pop-ups for the admin site to open the print report."); return; }
    printWindow.opener = null;
    const filteredUnits = visibleGroups.reduce((sum, group) => sum + group.units, 0);
    const filteredRevenue = visibleGroups.reduce((sum, group) => sum + group.revenue, 0);
    const locationName = data?.locations.find((location) => location.id === locationId)?.name || "All inventory";
    const periods = visibleGroups.map((group) => `<section><header><div><h2>${printText(group.label)}</h2><p>${group.units.toLocaleString()} matching units · ${group.orders.toLocaleString()} orders</p></div><strong>${printText(money(group.revenue))}</strong></header><table><thead><tr><th>Sold item</th><th>Variant</th><th>SKU</th><th>Units</th><th>Item sales</th><th>Available</th></tr></thead><tbody>${group.items.map((item) => `<tr><td><b>${printText(item.title)}</b></td><td>${printText(item.variant)}</td><td>${printText(item.sku || "—")}</td><td>${item.units.toLocaleString()}</td><td>${printText(money(item.revenue))}</td><td>${item.tracked ? stockAt(item).toLocaleString() : "Not tracked"}</td></tr>`).join("")}</tbody></table></section>`).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Sales and replenishment report</title><style>@page{size:landscape;margin:10mm}*{box-sizing:border-box}body{margin:0;color:#183e59;background:#fff;font:11px Arial,sans-serif}main{width:100%}.title{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;border-bottom:2px solid #183e59;padding-bottom:12px}.title p,.title span{margin:0;color:#6b7d89;font-size:9px}.title h1{margin:4px 0;font-size:24px}.title>div:last-child{text-align:right}.title strong{display:block;font-size:13px}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:12px 0}.metrics div{border:1px solid #cfd9df;border-radius:6px;padding:9px}.metrics span{display:block;color:#70818d;font-size:8px;font-weight:700;text-transform:uppercase}.metrics b{display:block;margin-top:4px;font-size:15px}section{border:1px solid #ccd7de;margin:0 0 9px;break-inside:auto}section>header{display:flex;align-items:center;justify-content:space-between;background:#f2f6f8;padding:7px 10px}section h2{margin:0;font-size:12px}section p{margin:3px 0 0;color:#758691;font-size:8px}section header strong{font-size:10px}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border-top:1px solid #dfe5e9;padding:6px 8px;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{color:#677985;background:#fafbfc;font-size:7px;text-transform:uppercase}th:nth-child(1),td:nth-child(1){width:27%}th:nth-child(2),td:nth-child(2){width:18%}th:nth-child(3),td:nth-child(3){width:16%}th:nth-child(n+4),td:nth-child(n+4){width:13%}tr{break-inside:avoid}footer{border-top:1px solid #ccd7de;margin-top:12px;padding-top:7px;color:#72838e;font-size:8px;text-align:right}@media screen{body{padding:18px;background:#edf1f4}main{max-width:1180px;margin:auto;background:#fff;padding:18px;box-shadow:0 10px 35px #15344b22}}</style></head><body><main><header class="title"><div><p>CARTER'S SALES OPERATIONS</p><h1>Sales &amp; replenishment report</h1><span>${printText(start)} to ${printText(end)} · Grouped by ${printText(grouping)} · ${printText(data?.timeZone || "Shopify store time")}</span></div><div><strong>${visibleItemCount.toLocaleString()} matching rows</strong><span>${printText(lastUpdated ? `Prepared ${lastUpdated}` : "Live Shopify report")}</span></div></header><div class="metrics"><div><span>Orders analyzed</span><b>${data?.totals.orders.toLocaleString() || "0"}</b></div><div><span>Filtered units</span><b>${filteredUnits.toLocaleString()}</b></div><div><span>Filtered item sales</span><b>${printText(money(filteredRevenue))}</b></div><div><span>Inventory location</span><b>${printText(locationName)}</b></div></div>${periods}<footer>Generated from Carter's Admin · Current search and advanced filters applied</footer></main></body></html>`;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    window.setTimeout(() => { printWindow.focus(); printWindow.print(); }, 100);
  };

  return <div className={styles.page}>
    <section className={styles.hero}>
      <div><p>SALES OPERATIONS</p><h2>Sales &amp; replenishment</h2><span>Review every net item sold in the selected period and replenish Shopify stock without leaving this page.</span></div>
      <div className={styles.heroActions}><button type="button" className={styles.printButton} onClick={printReport} disabled={loading || !visibleItemCount}>▣ Print filtered report</button><button type="button" onClick={() => void load(true)} disabled={loading}>{loading ? "Refreshing…" : "↻ Refresh report"}</button></div>
    </section>

    <section className={styles.controls}>
      <header><div><p>ADVANCED FILTERS</p><h3>Find the items that need attention</h3><span>Search sales, choose a period, and narrow the list by performance or inventory condition.</span></div><label className={styles.search}><span>Search sold items</span><div><b>⌕</b><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Product name, variant, or SKU" />{search && <button type="button" onClick={() => setSearch("")}>×</button>}</div></label></header>
      <div className={styles.filterGrid}>
        <fieldset><legend>Reporting period</legend><div className={styles.grouping} aria-label="Group sold items"><button type="button" className={grouping === "day" ? styles.active : ""} onClick={() => setGrouping("day")}>By day</button><button type="button" className={grouping === "month" ? styles.active : ""} onClick={() => setGrouping("month")}>By month</button></div><div className={styles.presets}>{[[7,"7 days"],[30,"30 days"],[90,"90 days"],[365,"12 months"]].map(([days,label]) => <button type="button" key={days} onClick={() => applyPreset(Number(days))}>{label}</button>)}</div><div className={styles.dateRange}><label>From<input type="date" value={start} max={end} onChange={(event) => setStart(event.target.value)} /></label><label>To<input type="date" value={end} min={start} max={dateValue(new Date())} onChange={(event) => setEnd(event.target.value)} /></label></div></fieldset>
        <fieldset><legend>Inventory condition</legend><label>Replenishment location<select value={locationId} onChange={(event) => setLocationId(event.target.value)}><option value="">Choose location</option>{data?.locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label><label>Stock status<select value={stockFilter} onChange={(event) => setStockFilter(event.target.value)}><option value="all">All stock levels</option><option value="out">Out of stock</option><option value="low">Low stock · 1–5 units</option><option value="available">Healthy stock · 6+ units</option></select></label><label>Inventory tracking<select value={trackingFilter} onChange={(event) => setTrackingFilter(event.target.value)}><option value="all">Tracked and untracked</option><option value="tracked">Tracked inventory only</option><option value="untracked">Untracked items only</option></select></label></fieldset>
        <fieldset><legend>Sales performance</legend><div className={styles.unitsRange}><label>Units sold from<input type="number" min="0" value={minUnits} onChange={(event) => setMinUnits(event.target.value)} placeholder="0" /></label><label>Units sold to<input type="number" min="0" value={maxUnits} onChange={(event) => setMaxUnits(event.target.value)} placeholder="Any" /></label></div><label>Sort items<select value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="units-desc">Highest units sold</option><option value="units-asc">Lowest units sold</option><option value="revenue-desc">Highest item sales</option><option value="stock-asc">Lowest stock first</option><option value="name">Product name A–Z</option></select></label><div className={styles.filterResult}><span>Matching sold-item rows</span><strong>{visibleItemCount.toLocaleString()}</strong></div></fieldset>
      </div>
      <footer><span>Filters update the directory immediately. Date changes reload live Shopify sales.</span><button type="button" disabled={!hasAdvancedFilters} onClick={clearFilters}>Reset advanced filters</button></footer>
    </section>

    {message && <div className={styles.notice}>{message}</div>}

    <section className={styles.metrics}>
      <article><span>▤</span><div><small>Orders analyzed</small><strong>{data?.totals.orders.toLocaleString() || "0"}</strong></div></article>
      <article><span>▦</span><div><small>Net units sold</small><strong>{data?.totals.units.toLocaleString() || "0"}</strong></div></article>
      <article><span>◇</span><div><small>Sold variants</small><strong>{data?.totals.variants.toLocaleString() || "0"}</strong></div></article>
      <article><span>↗</span><div><small>Net item sales</small><strong>{money(data?.totals.revenue || 0)}</strong></div></article>
    </section>

    <section className={styles.report}>
      <header><div><p>SOLD ITEM DIRECTORY</p><h3>{grouping === "day" ? "Daily" : "Monthly"} item performance</h3><span>{data ? `${data.range.start} to ${data.range.end} · ${data.timeZone}` : "Loading Shopify sales…"}</span></div><b>{visibleGroups.length} period{visibleGroups.length === 1 ? "" : "s"}</b></header>
      {loading && !data ? <div className={styles.empty}>Loading sold items from Shopify…</div> : visibleGroups.length ? visibleGroups.map((group) => <article className={styles.period} key={group.key}>
        <header><div><strong>{group.label}</strong><span>{group.units.toLocaleString()} units · {group.orders.toLocaleString()} orders</span></div><b>{money(group.revenue)}</b></header>
        <div className={styles.table}>
          <div className={styles.tableHead}><span>Sold item</span><span>SKU</span><span>Units sold</span><span>Item sales</span><span>Available</span><span>Replenish</span></div>
          {group.items.map((item) => { const key = rowKey(group, item); const saving = savingKey === key; return <div className={styles.row} key={key}>
            <div className={styles.product}>{item.image?.url ? <img src={item.image.url} alt={item.image.altText || item.title} /> : <i>▦</i>}<span><strong>{item.title}</strong><small>{item.variant} · {item.orders} order{item.orders === 1 ? "" : "s"}</small></span></div>
            <span>{item.sku || "—"}</span><strong>{item.units.toLocaleString()}</strong><strong>{money(item.revenue)}</strong>
            <span className={stockAt(item) <= 0 ? styles.out : stockAt(item) <= 5 ? styles.low : styles.stock}>{item.tracked ? stockAt(item).toLocaleString() : "Not tracked"}</span>
            <form onSubmit={(event) => { event.preventDefault(); void replenish(group, item); }}><input type="number" min="1" step="1" inputMode="numeric" aria-label={`Replenishment quantity for ${item.title}`} value={quantities[key] || ""} onChange={(event) => setQuantities((current) => ({ ...current, [key]: event.target.value }))} placeholder="Qty" disabled={!item.tracked || saving} /><button disabled={!item.tracked || saving || !locationId}>{saving ? "Adding…" : "+ Add stock"}</button></form>
          </div>; })}
        </div>
      </article>) : <div className={styles.empty}>{search ? "No sold items match your search." : "No sold items were found in this period."}</div>}
    </section>
  </div>;
}
