import type {CartLine} from "./types";

/** Sanitiza carritos guardados por versiones anteriores sin confiar en localStorage. */
export function normalizeCartLines(raw:unknown,maxItems=50):CartLine[]{
 if(!Array.isArray(raw))return [];
 const lines:CartLine[]=[];
 const byId=new Map<string,number>();
 for(const item of raw){
  if(!item||typeof item!=="object")continue;
  const record=item as Record<string,unknown>;
  if(typeof record.id!=="string"||record.id.length<2||record.id.length>100||
    !Number.isInteger(record.quantity)||Number(record.quantity)<1||Number(record.quantity)>99)continue;
  const existing=byId.get(record.id);
  if(existing!==undefined){
   lines[existing].quantity=Math.min(99,lines[existing].quantity+Number(record.quantity));
   continue;
  }
  if(lines.length>=maxItems)break;
  byId.set(record.id,lines.length);
  lines.push({id:record.id,quantity:Number(record.quantity)});
 }
 return lines;
}
