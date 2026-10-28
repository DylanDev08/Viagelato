import type {Order} from "@/lib/types";

/** Opciones acotadas para que el administrador nunca saltee un paso. */
export function nextOrderStep(order:Pick<Order,"status"|"shipping_method">):{status:"preparing"|"shipped"|"delivered";label:string}|null{
 if(order.status==="new")return {status:"preparing",label:"Preparar pedido"};
 if(order.status==="preparing"){
  return order.shipping_method==="pickup"?{status:"delivered",label:"Marcar entregado"}:{status:"shipped",label:"Marcar en camino"};
 }
 if(order.status==="shipped")return {status:"delivered",label:"Marcar entregado"};
 return null;
}
export function orderStatusLabel(value:string):string{
 return ({new:"Nuevo",preparing:"Preparando",shipped:"En camino",delivered:"Entregado",cancelled:"Cancelado",expired:"Vencido"} as Record<string,string>)[value]??"Estado desconocido";
}
