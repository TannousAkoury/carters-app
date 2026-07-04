export function numericPrice(value?: string | number | null) {
  if (typeof value === "number") return value;
  if (!value) return 0;
  return Number(String(value).replace(/[^0-9.]/g, ""));
}

export function salePercentage(current?: string | number | null, original?: string | number | null) {
  const currentAmount = numericPrice(current);
  const originalAmount = numericPrice(original);
  if (!Number.isFinite(currentAmount) || !Number.isFinite(originalAmount) || currentAmount <= 0 || originalAmount <= currentAmount) return null;
  return Math.round(((originalAmount - currentAmount) / originalAmount) * 100);
}
