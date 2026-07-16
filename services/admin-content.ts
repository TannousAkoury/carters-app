import { fetchAdmin } from "@/services/admin-api";
import bundledContent from "@/config/published-app-content.json";

export type AdminPlacement = "before-hero" | "after-hero" | "after-promos" | "after-ages" | "after-top-picks" | "after-categories" | "after-explore" | "after-essentials" | "after-brands" | "after-latest";
export type AdminSection = { id: string; type: "hero" | "text" | "products" | "announcement"; title: string; subtitle: string; image: string; buttonLabel: string; background: string; enabled: boolean; placement?: AdminPlacement; customCss?: string };
export type AdminHomepageConfig = { sections: AdminSection[]; shopifyVisibility: Record<string, boolean>;shopifyStyles:Record<string,string> };
export function getBundledAdminHomepageConfig(): AdminHomepageConfig {
  const content=bundledContent as {sections?:AdminSection[];shopifyVisibility?:Record<string,boolean>;shopifyStyles?:Record<string,string>};
  return {sections:(content.sections??[]).filter(item=>item.enabled),shopifyVisibility:content.shopifyVisibility??{},shopifyStyles:content.shopifyStyles??{}};
}
export function getBundledAdminSections(): AdminSection[] {
  return getBundledAdminHomepageConfig().sections;
}
export async function getAdminHomepageConfig(): Promise<AdminHomepageConfig> {
  try {
    const response = await fetchAdmin("/api/content");
    if (!response.ok) throw new Error(`Admin content returned ${response.status}`);
    const data = await response.json();
    return {sections:Array.isArray(data?.sections)?data.sections.filter((item:AdminSection)=>item.enabled):[],shopifyVisibility:data?.shopifyVisibility&&typeof data.shopifyVisibility==="object"?data.shopifyVisibility:{},shopifyStyles:data?.shopifyStyles&&typeof data.shopifyStyles==="object"?data.shopifyStyles:{}};
  } catch {
    return getBundledAdminHomepageConfig();
  }
}
export async function getAdminSections(): Promise<AdminSection[]> { return (await getAdminHomepageConfig()).sections; }
