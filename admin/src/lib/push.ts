import { readJson, updateJson } from "@/lib/json-store";

export type PushDevice = {
  token: string;
  platform?: string;
  customerEmail?: string;
  customerPhone?: string;
  updatedAt: string;
};

export type PushMessage = {
  id: string;
  title: string;
  message: string;
  url: string;
  createdAt: string;
  recipientCount: number;
  status: "test-queued" | "submitted" | "failed";
  targetTokens?: string[];
  kind?: "campaign" | "order";
  receipts?: { id: string; token: string; status?: "ok" | "error"; error?: string }[];
};

type SendPushInput = {
  title: string;
  message: string;
  url?: string;
  devices?: PushDevice[];
  targetTokens?: string[];
  kind?: PushMessage["kind"];
  storeInInbox?: boolean;
};

export async function sendClientPush(input: SendPushInput) {
  const devices = input.devices ?? await readJson<PushDevice[]>("push-devices.json", []);
  const targetTokens = input.targetTokens?.length ? new Set(input.targetTokens) : null;
  const recipientMap = new Map((targetTokens ? devices.filter((device) => targetTokens.has(device.token)) : devices).filter(device=>device.token).map(device=>[device.token,device]));
  const recipients = [...recipientMap.values()];
  const notification: PushMessage = {
    id: crypto.randomUUID(),
    title: input.title,
    message: input.message,
    url: input.url || "/notifications",
    createdAt: new Date().toISOString(),
    recipientCount: recipients.length,
    status: recipients.length ? "submitted" : "test-queued",
    ...(targetTokens ? { targetTokens: [...targetTokens] } : {}),
    kind: input.kind ?? "campaign",
  };

  if (!recipients.length) {
    if (input.storeInInbox !== false) await updateJson<PushMessage[]>("push-messages.json", [], (messages) => [...messages.slice(-99), notification]);
    return { sent: 0, queued: true, campaignId: notification.id, mode: "local-test" };
  }

  const expoMessages = recipients.map(({ token }) => ({
    to: token,
    sound: "default",
    priority: "high",
    channelId: "default",
    title: notification.title,
    body: notification.message,
    data: { url: notification.url, campaignId: notification.id, kind: notification.kind },
  }));
  const tickets:{id:string;token:string}[]=[];const staleTokens=new Set<string>();let failedTickets=0;let firstTicketError="";let failedResponse:unknown=null;let failedStatus=502;
  for(let index=0;index<expoMessages.length;index+=100){
    const batchRecipients=recipients.slice(index,index+100);
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: pushHeaders(),
      body: JSON.stringify(expoMessages.slice(index,index+100)),
    });
    const result = await response.json().catch(() => ({ error: "Push provider returned an invalid response." }));
    if(!response.ok){failedResponse=result;failedStatus=response.status;break}
    const batchTickets=Array.isArray(result?.data)?result.data:[];
    batchRecipients.forEach((recipient,ticketIndex)=>{const ticket=batchTickets[ticketIndex] as {status?:string;id?:string;message?:string;details?:{error?:string}}|undefined;if(ticket?.status==="ok"&&ticket.id)tickets.push({id:ticket.id,token:recipient.token});else{failedTickets+=1;firstTicketError||=ticket?.message||"Expo rejected a push notification.";if(ticket?.details?.error==="DeviceNotRegistered")staleTokens.add(recipient.token)}});
  }
  if(staleTokens.size)await updateJson<PushDevice[]>("push-devices.json",[],devices=>devices.filter(device=>!staleTokens.has(device.token)));
  notification.recipientCount=tickets.length;
  notification.receipts=tickets;
  notification.status = failedResponse || !tickets.length ? "failed" : "submitted";
  if (input.storeInInbox !== false) await updateJson<PushMessage[]>("push-messages.json", [], (messages) => [...messages.slice(-99), notification]);
  if (failedResponse) return { error: failedResponse, status: failedStatus };
  if(!tickets.length)return {error:{error:firstTicketError||"Expo did not accept any notifications."},status:502};
  return { sent: tickets.length, failed: failedTickets, campaignId: notification.id, tickets: tickets.map(ticket=>ticket.id) };
}

function pushHeaders(){return {"Content-Type":"application/json",Accept:"application/json","Accept-Encoding":"gzip, deflate",...(process.env.EXPO_ACCESS_TOKEN?{Authorization:`Bearer ${process.env.EXPO_ACCESS_TOKEN}`}:{})}}

export async function refreshPushReceipts(){
  const messages=await readJson<PushMessage[]>("push-messages.json",[]);const now=Date.now();const pending=messages.flatMap(message=>{const age=now-new Date(message.createdAt).getTime();return age>=15*60_000&&age<24*60*60_000?(message.receipts||[]).filter(receipt=>!receipt.status).map(receipt=>({...receipt,messageId:message.id})):[]}).slice(0,1000);if(!pending.length)return {checked:0};
  const response=await fetch("https://exp.host/--/api/v2/push/getReceipts",{method:"POST",headers:pushHeaders(),body:JSON.stringify({ids:pending.map(receipt=>receipt.id)})});const result=await response.json().catch(()=>null);if(!response.ok||!result?.data)throw new Error("Unable to check Expo push receipts.");
  const staleTokens=new Set<string>();const receiptResults=result.data as Record<string,{status?:"ok"|"error";message?:string;details?:{error?:string}}>;
  await updateJson<PushMessage[]>("push-messages.json",[],current=>current.map(message=>{if(!message.receipts?.length)return message;const receipts=message.receipts.map(receipt=>{const checked=receiptResults[receipt.id];if(!checked)return receipt;if(checked.details?.error==="DeviceNotRegistered")staleTokens.add(receipt.token);return {...receipt,status:checked.status,error:checked.status==="error"?(checked.details?.error||checked.message||"Delivery failed"):undefined}});const completed=receipts.filter(receipt=>receipt.status);const status=completed.length===receipts.length&&completed.every(receipt=>receipt.status==="error")?"failed":message.status;return {...message,receipts,status}}));
  if(staleTokens.size)await updateJson<PushDevice[]>("push-devices.json",[],devices=>devices.filter(device=>!staleTokens.has(device.token)));
  return {checked:Object.keys(receiptResults).length,removedDevices:staleTokens.size};
}
