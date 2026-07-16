"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./analytics-date-range-picker.module.css";

export type AnalyticsDateRange = { start: string; end: string };

type Props = {
  value: AnalyticsDateRange;
  loading: boolean;
  onApply: (range: AnalyticsDateRange) => void;
  align?: "left" | "right";
};

const DAY_MS = 86400000;
const presets = [{ label: "Last 7 days", days: 7 }, { label: "Last 30 days", days: 30 }, { label: "Last 90 days", days: 90 }];
const dateKey = (date: Date) => date.toISOString().slice(0, 10);
const parseDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};
const addDays = (date: Date, amount: number) => new Date(date.getTime() + amount * DAY_MS);
const addMonths = (date: Date, amount: number) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
const recentRange = (days: number): AnalyticsDateRange => {
  const end = new Date();
  const start = addDays(end, -(days - 1));
  return { start: dateKey(start), end: dateKey(end) };
};
const sameRange = (left: AnalyticsDateRange, right: AnalyticsDateRange) => left.start === right.start && left.end === right.end;
const shortDate = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const monthName = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric", timeZone: "UTC" });

export default function AnalyticsDateRangePicker({ value, loading, onApply, align="right" }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<AnalyticsDateRange>(value);
  const [selectingEnd, setSelectingEnd] = useState(false);
  const [month, setMonth] = useState(() => new Date(Date.UTC(parseDate(value.end).getUTCFullYear(), parseDate(value.end).getUTCMonth(), 1)));
  const rootRef = useRef<HTMLDivElement>(null);
  const today = dateKey(new Date());
  const todayMonth = `${today.slice(0, 7)}-01`;

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    const closeWithEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeWithEscape);
    return () => { document.removeEventListener("mousedown", closeOutside); document.removeEventListener("keydown", closeWithEscape); };
  }, [open]);

  const days = useMemo(() => {
    const first = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1));
    const gridStart = addDays(first, -first.getUTCDay());
    return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  }, [month]);

  const openPicker = () => {
    const focus = parseDate(value.end || value.start || today);
    setDraft(value);
    setSelectingEnd(false);
    setMonth(new Date(Date.UTC(focus.getUTCFullYear(), focus.getUTCMonth(), 1)));
    setOpen((current) => !current);
  };

  const chooseDay = (day: string) => {
    if (day > today) return;
    if (!selectingEnd || !draft.start) {
      setDraft({ start: day, end: "" });
      setSelectingEnd(true);
      return;
    }
    setDraft(day < draft.start ? { start: day, end: draft.start } : { start: draft.start, end: day });
    setSelectingEnd(false);
  };

  const choosePreset = (presetDays: number) => {
    const next = recentRange(presetDays);
    onApply(next);
    setOpen(false);
  };

  const apply = () => {
    if (!draft.start || !draft.end) return;
    onApply(draft);
    setOpen(false);
  };

  const displayValue = `${shortDate.format(parseDate(value.start))} – ${shortDate.format(parseDate(value.end))}`;

  return <div className={styles.root} ref={rootRef}>
    <button className={`${styles.trigger} ${open ? styles.triggerOpen : ""}`} type="button" onClick={openPicker} aria-haspopup="dialog" aria-expanded={open}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v3m10-3v3M4.5 9h15M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/></svg>
      <span><small>Date range</small><strong>{displayValue}</strong></span>
      <svg className={styles.chevron} viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>
    </button>

    {open && <div className={`${styles.popover} ${align==="left"?styles.popoverLeft:""}`} role="dialog" aria-label="Choose analytics date range">
      <aside className={styles.presets}>
        <strong>Quick select</strong>
        {presets.map((preset) => {
          const range = recentRange(preset.days);
          return <button type="button" key={preset.days} className={sameRange(draft, range) ? styles.presetActive : ""} disabled={loading} onClick={() => choosePreset(preset.days)}>{preset.label}<span>›</span></button>;
        })}
      </aside>

      <section className={styles.calendar}>
        <header>
          <button type="button" aria-label="Previous month" onClick={() => setMonth((current) => addMonths(current, -1))}>‹</button>
          <strong>{monthName.format(month)}</strong>
          <button type="button" aria-label="Next month" disabled={dateKey(month) >= todayMonth} onClick={() => setMonth((current) => addMonths(current, 1))}>›</button>
        </header>
        <div className={styles.weekdays}>{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => <span key={day}>{day}</span>)}</div>
        <div className={styles.days}>
          {days.map((date) => {
            const key = dateKey(date);
            const outside = date.getUTCMonth() !== month.getUTCMonth();
            const disabled = key > today;
            const start = key === draft.start;
            const end = key === draft.end;
            const inRange = Boolean(draft.start && draft.end && key > draft.start && key < draft.end);
            const className = [outside ? styles.outside : "", disabled ? styles.disabled : "", inRange ? styles.inRange : "", start ? styles.rangeStart : "", end ? styles.rangeEnd : ""].filter(Boolean).join(" ");
            return <button type="button" key={key} className={className} disabled={disabled} aria-label={shortDate.format(date)} aria-pressed={start || end} onClick={() => chooseDay(key)}>{date.getUTCDate()}</button>;
          })}
        </div>
        <footer>
          <div><small>{selectingEnd ? "Now choose an end date" : "Selected range"}</small><strong>{draft.start ? shortDate.format(parseDate(draft.start)) : "Start date"}{draft.end ? ` – ${shortDate.format(parseDate(draft.end))}` : " – End date"}</strong></div>
          <button className={styles.cancel} type="button" onClick={() => setOpen(false)}>Cancel</button>
          <button className={styles.apply} type="button" disabled={loading || !draft.start || !draft.end} onClick={apply}>{loading ? "Loading…" : "Apply range"}</button>
        </footer>
      </section>
    </div>}
  </div>;
}
