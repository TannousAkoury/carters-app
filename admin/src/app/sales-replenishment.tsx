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
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setMessage("");
    try {
      const params = new URLSearchParams({ grouping, start, end });
      const response = await fetch(`/api/shopify/sales-replenishment?${params}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load sold items.");
      setData(result);
      setLocationId((current) => result.locations.some((location: { id: string }) => location.id === current) ? current : result.locations[0]?.id || "");
      if (result.truncated) setMessage("This range contains more records than the live report limit. Shorten the date range for a complete item breakdown.");
    } catch (error) {
      setData(null); setMessage(error instanceof Error ? error.message : "Unable to load sold items.");
    } finally { setLoading(false); }
  }, [grouping, start, end]);

  useEffect(() => { /* eslint-disable react-hooks/set-state-in-effect */ void load(); /* eslint-enable react-hooks/set-state-in-effect */ }, [load]);

  const visibleGroups = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data?.groups || [];
    return (data?.groups || []).map((group) => ({ ...group, items: group.items.filter((item) => `${item.title} ${item.variant} ${item.sku}`.toLowerCase().includes(term)) })).filter((group) => group.items.length);
  }, [data, search]);

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

  return <div className={styles.page}>
    <section className={styles.hero}>
      <div><p>SALES OPERATIONS</p><h2>Sales &amp; replenishment</h2><span>Review every net item sold in the selected period and replenish Shopify stock without leaving this page.</span></div>
      <button type="button" onClick={() => void load()} disabled={loading}>{loading ? "Refreshing…" : "↻ Refresh report"}</button>
    </section>

    <section className={styles.controls}>
      <div className={styles.grouping} aria-label="Group sold items"><button type="button" className={grouping === "day" ? styles.active : ""} onClick={() => setGrouping("day")}>By day</button><button type="button" className={grouping === "month" ? styles.active : ""} onClick={() => setGrouping("month")}>By month</button></div>
      <label>From<input type="date" value={start} max={end} onChange={(event) => setStart(event.target.value)} /></label>
      <label>To<input type="date" value={end} min={start} max={dateValue(new Date())} onChange={(event) => setEnd(event.target.value)} /></label>
      <label className={styles.location}>Replenish location<select value={locationId} onChange={(event) => setLocationId(event.target.value)}><option value="">Choose location</option>{data?.locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
      <label className={styles.search}>Search items<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Product, variant, or SKU" /></label>
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
