import { LoyaltyDiscountRequest, LoyaltyDiscountResult } from "@/lib/loyalty";
import { shopifyAdminGraphql } from "@/lib/shopify-admin";

type ShopifyCustomer = { id: string; email?: string | null };

async function resolveCustomer(request: LoyaltyDiscountRequest) {
  let customer: ShopifyCustomer | null = null;
  let currencyCode = "USD";
  if (request.account.customerId.startsWith("gid://shopify/Customer/")) {
    const data = await shopifyAdminGraphql(
      `query loyaltyCustomer($id: ID!) { customer(id: $id) { id email } shop { currencyCode } }`,
      { id: request.account.customerId },
    );
    customer = data?.customer || null;
    currencyCode = data?.shop?.currencyCode || currencyCode;
  }
  if (!customer && request.account.email) {
    const data = await shopifyAdminGraphql(
      `query loyaltyCustomerByEmail($query: String!) { customers(first: 10, query: $query) { nodes { id email } } shop { currencyCode } }`,
      { query: `email:${request.account.email}` },
    );
    const normalized = request.account.email.toLowerCase();
    customer = (data?.customers?.nodes || []).find((item: ShopifyCustomer) => item.email?.toLowerCase() === normalized) || null;
    currencyCode = data?.shop?.currencyCode || currencyCode;
  }
  if (!customer) throw new Error("The customer must exist in Shopify before points can be redeemed.");
  return { customer, currencyCode };
}

export async function createShopifyLoyaltyDiscount(request: LoyaltyDiscountRequest): Promise<LoyaltyDiscountResult> {
  const { customer, currencyCode } = await resolveCustomer(request);
  const mutation = `mutation createLoyaltyReward($input: DiscountCodeBasicInput!) {
    discountCodeBasicCreate(basicCodeDiscount: $input) {
      codeDiscountNode { id }
      userErrors { field message }
    }
  }`;
  const data = await shopifyAdminGraphql(mutation, {
    input: {
      title: `Loyalty reward · ${request.account.email || request.account.name} · ${request.points} points`,
      code: request.code,
      startsAt: request.startsAt,
      endsAt: request.endsAt,
      customerSelection: { customers: { add: [customer.id] } },
      customerGets: {
        value: { discountAmount: { amount: request.amount.toFixed(2), appliesOnEachItem: false } },
        items: { all: true },
      },
      minimumRequirement: { quantity: { greaterThanOrEqualToQuantity: "1" } },
      appliesOncePerCustomer: true,
      usageLimit: 1,
      combinesWith: { orderDiscounts: true, productDiscounts: true, shippingDiscounts: true },
    },
  });
  const result = data?.discountCodeBasicCreate;
  const errors = result?.userErrors || [];
  if (errors.length) throw new Error(errors.map((error: { message?: string }) => error.message).filter(Boolean).join(" | "));
  const discountId = result?.codeDiscountNode?.id;
  if (!discountId) throw new Error("Shopify did not confirm the loyalty discount.");
  return { discountId, currencyCode };
}

export async function mergeShopifyLoyaltyDiscounts(input:{primaryDiscountId:string;secondaryDiscountIds:string[];amount:number}){
  const updateMutation=`mutation updateLoyaltyReward($id:ID!,$input:DiscountCodeBasicInput!){discountCodeBasicUpdate(id:$id,basicCodeDiscount:$input){codeDiscountNode{id}userErrors{message}}}`;
  const updated=await shopifyAdminGraphql(updateMutation,{id:input.primaryDiscountId,input:{customerGets:{value:{discountAmount:{amount:input.amount.toFixed(2),appliesOnEachItem:false}},items:{all:true}},combinesWith:{orderDiscounts:true,productDiscounts:true,shippingDiscounts:true}}});
  const updateErrors=updated?.discountCodeBasicUpdate?.userErrors||[];
  if(updateErrors.length)throw new Error(updateErrors.map((error:{message?:string})=>error.message).filter(Boolean).join(" | "));
  const deleteMutation=`mutation deleteLoyaltyReward($id:ID!){discountCodeDelete(id:$id){deletedCodeDiscountId userErrors{message}}}`;
  for(const id of input.secondaryDiscountIds){const deleted=await shopifyAdminGraphql(deleteMutation,{id});const errors=deleted?.discountCodeDelete?.userErrors||[];if(errors.length)throw new Error(errors.map((error:{message?:string})=>error.message).filter(Boolean).join(" | "))}
}
