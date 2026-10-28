/**
 * Idempotencia de checkout en cliente.
 * Guardamos sólo SHA-256 del cuerpo del pedido, nunca nombres, direcciones ni teléfonos.
 */
export const CHECKOUT_KEY_STORAGE="viagelato-checkout-idempotency:v2";
type CheckoutKeyStorage=Pick<Storage,"getItem"|"setItem"|"removeItem">;
const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fingerprintPattern=/^[a-f0-9]{64}$/i;

export async function checkoutRequestFingerprint(body:string,cryptoProvider:Pick<Crypto,"subtle">=globalThis.crypto):Promise<string>{
 const digest=await cryptoProvider.subtle.digest("SHA-256",new TextEncoder().encode(body));
 return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,"0")).join("");
}

export function getOrCreateCheckoutKey(fingerprint:string,store:CheckoutKeyStorage,createUuid:()=>string):string {
 if(!fingerprintPattern.test(fingerprint))throw new Error("Huella de pedido inválida");
 try {
  const saved=store.getItem(CHECKOUT_KEY_STORAGE);
  if(saved){
   const parsed:unknown=JSON.parse(saved);
   if(parsed && typeof parsed==="object" && "fingerprint" in parsed && "key" in parsed &&
      parsed.fingerprint===fingerprint && typeof parsed.key==="string" && uuidPattern.test(parsed.key)){
    return parsed.key;
   }
  }
 }catch{ /* sessionStorage no disponible o registro anterior malformado */ }
 const key=createUuid();
 try{store.setItem(CHECKOUT_KEY_STORAGE,JSON.stringify({fingerprint,key}));}catch{ /* no impedir el intento sin almacenamiento */ }
 return key;
}

export function clearCheckoutKey(store:Pick<Storage,"removeItem">):void{
 try{store.removeItem(CHECKOUT_KEY_STORAGE);}catch{ /* no impedir la confirmación */ }
}
