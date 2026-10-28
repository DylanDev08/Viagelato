import {describe,expect,it} from "vitest";
import {nextOrderStep,orderStatusLabel} from "@/lib/order-ui";

describe("flujo sencillo de estados de pedidos",()=>{
 it("un pedido nuevo solo permite pasar a preparación",()=>{
  expect(nextOrderStep({status:"new",shipping_method:"shipping"})).toEqual({status:"preparing",label:"Preparar pedido"});
 });
 it("distingue retirar de enviar sin saltear pasos",()=>{
  expect(nextOrderStep({status:"preparing",shipping_method:"pickup"})).toEqual({status:"delivered",label:"Marcar entregado"});
  expect(nextOrderStep({status:"preparing",shipping_method:"shipping"})).toEqual({status:"shipped",label:"Marcar en camino"});
  expect(nextOrderStep({status:"shipped",shipping_method:"shipping"})).toEqual({status:"delivered",label:"Marcar entregado"});
 });
 it("los pedidos cerrados no muestran acciones de avance",()=>{
  for(const status of ["delivered","cancelled","expired"]){
   expect(nextOrderStep({status,shipping_method:"shipping"})).toBeNull();
  }
 });
 it("muestra estados entendibles",()=>{
  expect(orderStatusLabel("shipped")).toBe("En camino");
  expect(orderStatusLabel("cancelled")).toBe("Cancelado");
 });
});
