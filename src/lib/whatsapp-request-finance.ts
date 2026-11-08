import type {ShippingQuote} from "./shipping-quote";
import type {WhatsAppRequest} from "./types";

type FinancialRequest=Pick<WhatsAppRequest,
 "subtotal"|"shipping_cost"|"total"|"amount_paid"|"stock_confirmed">;

function cents(value:number){return Math.round(value*100);}

/**
 * Cotizar no significa confirmar. Antes de verificar stock y costo, el panel
 * muestra un total estimado, pero jamás habilita cobros basados en esa estimación.
 * Si la DB tiene montos parciales o contradictorios, se bloquean operaciones.
 */
export function resolveWhatsAppRequestFinance(request:FinancialRequest,quote:ShippingQuote){
 const subtotal=Number(request.subtotal);
 const shippingCost=request.shipping_cost===null?null:Number(request.shipping_cost);
 const total=request.total===null?null:Number(request.total);
 const amountPaid=Number(request.amount_paid);
 const hasAmounts=shippingCost!==null&&total!==null;
 const partialAmounts=(shippingCost===null)!==(total===null);
 const inconsistent=partialAmounts||
  (shippingCost!==null&&(!Number.isFinite(shippingCost)||shippingCost<0))||
  (total!==null&&(!Number.isFinite(total)||total<0))||
  !Number.isFinite(subtotal)||subtotal<0||
  !Number.isFinite(amountPaid)||amountPaid<0||
  Boolean(!hasAmounts&&amountPaid>0)||
  Boolean(hasAmounts&&cents(total!)!==cents(subtotal)+cents(shippingCost!))||
  Boolean(hasAmounts&&cents(amountPaid)>cents(total!));
 const amountsConfirmed=hasAmounts&&!inconsistent;
 const termsComplete=request.stock_confirmed&&amountsConfirmed;
 const displayedTotal=inconsistent?null:amountsConfirmed?total:quote.total;
 const displayedShippingCost=inconsistent?null:amountsConfirmed?shippingCost:quote.shippingCost;
 const remaining=termsComplete?Math.max(0,(cents(total!)-cents(amountPaid))/100):null;
 return {
  inconsistent,amountsConfirmed,termsComplete,
  displayedShippingCost,displayedTotal,
  remaining
 };
}
