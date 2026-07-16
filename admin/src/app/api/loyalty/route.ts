import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/shopify-admin";
import { adjustLoyaltyPoints, loyaltySnapshot, redeemLoyaltyPoints, saveLoyaltySettings } from "@/lib/loyalty";
import { createShopifyLoyaltyDiscount } from "@/lib/loyalty-shopify";

export const dynamic="force-dynamic";
export async function GET(){const unauthorized=await requirePermission("Loyalty");if(unauthorized)return unauthorized;return NextResponse.json(await loyaltySnapshot())}
export async function PATCH(request:Request){const unauthorized=await requirePermission("Loyalty");if(unauthorized)return unauthorized;const body=await request.json().catch(()=>null);try{if(body?.action==="settings")return NextResponse.json({settings:await saveLoyaltySettings(body.settings||{})});if(body?.action==="adjust")return NextResponse.json({account:await adjustLoyaltyPoints({accountId:body.accountId,email:body.email,points:Number(body.points),note:String(body.note||"")})});if(body?.action==="redeem")return NextResponse.json(await redeemLoyaltyPoints({accountId:body.accountId,email:body.email,points:Number(body.points)},createShopifyLoyaltyDiscount));return NextResponse.json({error:"Choose a valid loyalty action."},{status:400})}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Unable to update loyalty."},{status:400})}}
