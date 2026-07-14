import { fetchAdmin } from "@/services/admin-api";
import bundledContent from "@/config/published-app-content.json";

export type AdminPlacement = "before-hero" | "after-hero" | "after-promos" | "after-ages" | "after-top-picks" | "after-categories" | "after-explore" | "after-essentials" | "after-brands" | "after-latest";
export type AdminSection = { id: string; type: "hero" | "text" | "products" | "announcement"; title: string; subtitle: string; image: string; buttonLabel: string; background: string; enabled: boolean; placement?: AdminPlacement; customCss?: string };
export function getBundledAdminSections(): AdminSection[] {
  return (bundledContent.sections as AdminSection[]).filter((item) => item.enabled);
}
export async function getAdminSections(): Promise<AdminSection[]> {
  try {
    const response = await fetchAdmin("/api/content");
    if (!response.ok) throw new Error(`Admin content returned ${response.status}`);
    const data = await response.json();
    return Array.isArray(data?.sections) ? data.sections.filter((item: AdminSection) => item.enabled) : [];
  } catch {
    return getBundledAdminSections();
  }
}
