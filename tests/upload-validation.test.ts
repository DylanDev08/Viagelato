import {describe,expect,it} from "vitest";
import {MAX_UPLOAD_SIZE,validateUploadedImage} from "@/lib/upload-validation";

const ascii=(s:string)=>new TextEncoder().encode(s);
const jpg=new Uint8Array([0xff,0xd8,0xff,0xe0,0xff,0xd9]);
const png=new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,13,73,72,68,82,...Array(17).fill(0)]);
const webp=ascii("RIFF0000WEBPVP8 0000");
describe("validación segura de imágenes de productos",()=>{
 it("reconoce firmas JPG, PNG y WEBP",()=>{
  expect(validateUploadedImage("image/jpeg",jpg.length,jpg)).toEqual({ok:true,extension:"jpg"});
  expect(validateUploadedImage("image/png",png.length,png)).toEqual({ok:true,extension:"png"});
  expect(validateUploadedImage("image/webp",webp.length,webp)).toEqual({ok:true,extension:"webp"});
 });
 it("no acepta cambiar la extensión o el MIME de un archivo ajeno",()=>{
  expect(validateUploadedImage("image/png",jpg.length,jpg).ok).toBe(false);
  expect(validateUploadedImage("image/svg+xml",ascii("<svg/>").length,ascii("<svg/>")).ok).toBe(false);
  expect(validateUploadedImage("image/webp",jpg.length,jpg).ok).toBe(false);
 });
 it("rechaza archivos vacíos, truncados o demasiado grandes",()=>{
  expect(validateUploadedImage("image/jpeg",0,new Uint8Array()).ok).toBe(false);
  expect(validateUploadedImage("image/jpeg",MAX_UPLOAD_SIZE+1,jpg).ok).toBe(false);
  expect(validateUploadedImage("image/jpeg",jpg.length+5,jpg).ok).toBe(false);
 });
});
