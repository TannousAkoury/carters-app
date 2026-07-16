import { adminApiUrls, fetchAdmin } from "@/services/admin-api";
import bundledContent from "@/config/published-app-content.json";

export type AdminPlacement = "before-hero" | "after-hero" | "after-promos" | "after-ages" | "after-top-picks" | "after-categories" | "after-explore" | "after-essentials" | "after-brands" | "after-latest";
export type AdminSectionType = "hero" | "text" | "products" | "announcement" | "image" | "categories" | "features" | "testimonials" | "newsletter" | "divider";
export type AdminSection = { id: string; type: AdminSectionType; title: string; subtitle: string; image: string; buttonLabel: string; background: string; enabled: boolean; placement?: AdminPlacement; customCss?: string; items?: string[] };
export type AdminHomepageConfig = { sections: AdminSection[]; shopifyVisibility: Record<string, boolean>;shopifyStyles:Record<string,string> };
function resolveSectionImages(sections:AdminSection[],baseUrl:string){return sections.map(section=>({...section,image:section.image?.startsWith("/")&&baseUrl?`${baseUrl}${section.image}`:section.image}))}
export function getBundledAdminHomepageConfig(): AdminHomepageConfig {
  const content=bundledContent as {sections?:AdminSection[];shopifyVisibility?:Record<string,boolean>;shopifyStyles?:Record<string,string>};
  return {sections:resolveSectionImages((content.sections??[]).filter(item=>item.enabled),adminApiUrls()[0]??""),shopifyVisibility:content.shopifyVisibility??{},shopifyStyles:content.shopifyStyles??{}};
}
export function getBundledAdminSections(): AdminSection[] {
  return getBundledAdminHomepageConfig().sections;
}
export async function getAdminHomepageConfig(): Promise<AdminHomepageConfig> {
  try {
    const response = await fetchAdmin("/api/content");
    if (!response.ok) throw new Error(`Admin content returned ${response.status}`);
    const data = await response.json();
    const baseUrl=response.url?new URL(response.url).origin:(adminApiUrls()[0]??"");
    return {sections:Array.isArray(data?.sections)?resolveSectionImages(data.sections.filter((item:AdminSection)=>item.enabled),baseUrl):[],shopifyVisibility:data?.shopifyVisibility&&typeof data.shopifyVisibility==="object"?data.shopifyVisibility:{},shopifyStyles:data?.shopifyStyles&&typeof data.shopifyStyles==="object"?data.shopifyStyles:{}};
  } catch {
    return getBundledAdminHomepageConfig();
  }
}
export async function getAdminSections(): Promise<AdminSection[]> { return (await getAdminHomepageConfig()).sections; }
