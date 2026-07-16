import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/shopify-admin";

export const dynamic = "force-dynamic";

const known = [
  { marker:"carters-hero-split",key:"hero",title:"Hero banners",kind:"Shopify hero" },
  { marker:"__banner_image_",key:"hero",title:"Hero banners",kind:"Shopify banner" },
  { marker:"mc-feature-row",key:"promos",title:"Promo strip",kind:"Shopify feature row" },
  { marker:"category-circle-grid",key:"age-groups",title:"Shop by age",kind:"Shopify category circles" },
  { marker:"carters-products-carousel",key:"latest-collection",title:"Latest collection",kind:"Shopify product carousel" },
  { marker:"shop-by-category-cards",key:"shop-categories",title:"Shop categories",kind:"Shopify category cards" },
  { marker:"deals-for-you-section",key:"explore-styles",title:"Explore styles",kind:"Shopify deal cards" },
  { marker:"new-trending-three-images",key:"tiny-essentials",title:"Tiny essentials",kind:"Shopify image cards" },
  { marker:"brands-showcase-section",key:"our-brands",title:"Our brands",kind:"Shopify brand showcase" },
];

function clean(value="") { return value.replace(/<br\s*\/?>/gi," ").replace(/<[^>]+>/g," ").replace(/&amp;/g,"&").replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g," ").trim(); }

function directory(html:string) {
  const starts=[...html.matchAll(/<[^>]+id=["']shopify-section-([^"']+)["'][^>]*>/gi)];
  const seen=new Set<string>();
  const result:{key:string;shopifyId:string;title:string;kind:string;position:number;automatic:boolean}[]=[];
  starts.forEach((start,index)=>{
    const source=html.slice(start.index??0,starts[index+1]?.index??html.length);
    const match=known.find(item=>source.includes(item.marker));
    if(match&&!seen.has(match.key)){seen.add(match.key);result.push({key:match.key,shopifyId:start[1],title:match.title,kind:match.kind,position:index,automatic:false});return}
    const shopifyId=start[1];
    if(!shopifyId||/header|footer|announcement-bar|apps/i.test(shopifyId))return;
    const title=clean(source.match(/<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/i)?.[1]||source.match(/<img\b[^>]*alt=["']([^"']+)["']/i)?.[1]||"");
    const hasImage=/<img\b/i.test(source);const hasCopy=/<p\b/i.test(source);
    if(!title&&!hasImage&&!hasCopy)return;
    result.push({key:`theme:${shopifyId}`,shopifyId,title:title||"Untitled Shopify section",kind:hasImage?"Automatic image section":"Automatic text section",position:index,automatic:true});
  });
  const fixed=[{key:"top-picks",title:"Top picks"},{key:"latest-collection",title:"Latest collection"}];
  for(const item of fixed)if(!result.some(section=>section.key===item.key))result.push({key:item.key,shopifyId:"",title:item.title,kind:"Mobile Shopify products",position:result.length+100,automatic:false});
  return result.sort((a,b)=>a.position-b.position);
}

export async function GET(){
  const unauthorized=await requireAdmin();if(unauthorized)return unauthorized;
  const site=(process.env.SHOPIFY_PUBLIC_SITE_URL||process.env.NEXT_PUBLIC_SHOPIFY_SITE_URL||"https://carters.com.lb").replace(/\/$/,"");
  try{const response=await fetch(site,{cache:"no-store",headers:{"User-Agent":"Carter-Mobile-Admin/1.0"}});if(!response.ok)throw new Error(`Storefront returned HTTP ${response.status}`);return NextResponse.json({sections:directory(await response.text()),source:site});}
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Unable to inspect the published Shopify theme.",sections:[]},{status:502})}
}
