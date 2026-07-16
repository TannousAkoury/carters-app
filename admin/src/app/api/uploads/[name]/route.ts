import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { readJson, writeJson } from "@/lib/json-store";
import { requirePermission } from "@/lib/shopify-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const contentTypes:Record<string,string>={jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",webp:"image/webp",gif:"image/gif"};
type AssetRecord={fileName:string;originalName:string;createdAt:string};

export async function GET(_request:Request,context:RouteContext<"/api/uploads/[name]">){
  const {name}=await context.params;
  if(!/^[a-zA-Z0-9-]+\.(jpg|jpeg|png|webp|gif)$/.test(name))return new NextResponse("Not found",{status:404});
  try{
    const file=await readFile(path.join(process.cwd(),"data","uploads",name));
    const extension=name.split(".").at(-1)?.toLowerCase()??"";
    return new NextResponse(file,{headers:{"Content-Type":contentTypes[extension]??"application/octet-stream","Cache-Control":"public, max-age=31536000, immutable","X-Content-Type-Options":"nosniff"}});
  }catch{return new NextResponse("Not found",{status:404})}
}

export async function DELETE(_request:Request,context:RouteContext<"/api/uploads/[name]">){
  const unauthorized=await requirePermission("App editor");
  if(unauthorized)return unauthorized;
  const {name}=await context.params;
  if(!/^[a-zA-Z0-9-]+\.(jpg|jpeg|png|webp|gif)$/.test(name))return NextResponse.json({error:"Asset was not found."},{status:404});
  const url=`/api/uploads/${name}`;
  const published=await readJson<{sections?:{image?:string}[]}>("app-content.json",{});
  if((published.sections??[]).some(section=>section.image===url))return NextResponse.json({error:"This image is used by published app content. Replace and publish that section before deleting it."},{status:409});
  try{await unlink(path.join(process.cwd(),"data","uploads",name))}catch{return NextResponse.json({error:"Asset was not found."},{status:404})}
  const index=await readJson<AssetRecord[]>("media-assets.json",[]);
  await writeJson("media-assets.json",index.filter(item=>item.fileName!==name));
  return NextResponse.json({deleted:true,fileName:name});
}
