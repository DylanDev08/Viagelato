import {describe,expect,it} from "vitest";
import {readJsonBody} from "@/lib/request-body";

const request=(body:string,headers:Record<string,string>={})=>new Request("https://example.com",{
 method:"POST",headers:{"Content-Type":"application/json",...headers},body,
});
describe("lectura limitada de JSON",()=>{
 it("admite JSON UTF-8 con parámetros de MIME",async()=>{
  expect(await readJsonBody(request('{"nombre":"José"}',{"Content-Type":"application/json; charset=utf-8"}))).toEqual({nombre:"José"});
 });
 it("rechaza MIME parecido, JSON inválido y longitud declarada excesiva",async()=>{
  await expect(readJsonBody(request("{}",{"Content-Type":"application/jsonp"}))).rejects.toMatchObject({status:415});
  await expect(readJsonBody(request("{"))).rejects.toMatchObject({status:400});
  await expect(readJsonBody(request("{}",{"Content-Length":"20000"}))).rejects.toMatchObject({status:413});
 });
 it("limita bytes multibyte sin depender de Content-Length",async()=>{
  await expect(readJsonBody(request(JSON.stringify("ñ".repeat(8000))))).rejects.toMatchObject({status:413});
 });
});
