import { randomUUID } from "node:crypto";
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { readJson, writeJson } from "@/lib/json-store";
import { requirePermission } from "@/lib/shopify-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const INDEX_FILE="media-assets.json";
type AssetRecord={fileName:string;originalName:string;createdAt:string};
const imageTypes:Record<string,{extension:string;matches:(bytes:Uint8Array)=>boolean}>={
  "image/jpeg":{extension:"jpg",matches:bytes=>bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff},
  "image/png":{extension:"png",matches:bytes=>bytes[0]===0x89&&bytes[1]===0x50&&bytes[2]===0x4e&&bytes[3]===0x47},
  "image/webp":{extension:"webp",matches:bytes=>String.fromCharCode(...bytes.slice(0,4))==="RIFF"&&String.fromCharCode(...bytes.slice(8,12))==="WEBP"},
  "image/gif":{extension:"gif",matches:bytes=>["GIF87a","GIF89a"].includes(String.fromCharCode(...bytes.slice(0,6)))},
};

export async function GET(){
  const unauthorized=await requirePermission("App editor");
  if(unauthorized)return unauthorized;
  const directory=path.join(process.cwd(),"data","uploads");
  await mkdir(directory,{recursive:true});
  const [entries,index,published]=await Promise.all([readdir(directory,{withFileTypes:true}),readJson<AssetRecord[]>(INDEX_FILE,[]),readJson<{sections?:{image?:string}[]}>("app-content.json",{})]);
  const metadata=new Map(index.map(item=>[item.fileName,item]));
  const publishedImages=new Set((published.sections??[]).map(section=>section.image).filter(Boolean));
  const assets=(await Promise.all(entries.filter(entry=>entry.isFile()&&/\.(jpg|jpeg|png|webp|gif)$/i.test(entry.name)).map(async entry=>{const details=await stat(path.join(directory,entry.name));const record=metadata.get(entry.name);const url=`/api/uploads/${entry.name}`;return{fileName:entry.name,name:record?.originalName||"Uploaded image",url,size:details.size,createdAt:record?.createdAt||details.birthtime.toISOString(),inUse:publishedImages.has(url)}}))).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  return NextResponse.json({assets,total:assets.length});
}

export async function POST(request:Request){
  const unauthorized=await requirePermission("App editor");
  if(unauthorized)return unauthorized;
  try{
    const form=await request.formData();
    const upload=form.get("image");
    if(!(upload instanceof File))return NextResponse.json({error:"Choose an image to upload."},{status:400});
    if(upload.size<=0||upload.size>MAX_IMAGE_BYTES)return NextResponse.json({error:"Images must be smaller than 8 MB."},{status:400});
    const format=imageTypes[upload.type];
    if(!format)return NextResponse.json({error:"Use a JPG, PNG, WebP, or GIF image."},{status:415});
    const bytes=new Uint8Array(await upload.arrayBuffer());
    if(!format.matches(bytes))return NextResponse.json({error:"The selected file is not a valid image."},{status:415});
    const fileName=`${Date.now()}-${randomUUID()}.${format.extension}`;
    const directory=path.join(process.cwd(),"data","uploads");
    await mkdir(directory,{recursive:true});
    await writeFile(path.join(directory,fileName),bytes,{flag:"wx"});
    const url=`/api/uploads/${fileName}`;
    const index=await readJson<AssetRecord[]>(INDEX_FILE,[]);
    await writeJson(INDEX_FILE,[{fileName,originalName:upload.name.trim().slice(0,180)||"Uploaded image",createdAt:new Date().toISOString()},...index.filter(item=>item.fileName!==fileName)].slice(0,5000));
    return NextResponse.json({url,fileName,size:upload.size,type:upload.type},{status:201});
  }catch(error){
    console.error("Image upload failed",error);
    return NextResponse.json({error:"Unable to upload this image."},{status:500});
  }
}
