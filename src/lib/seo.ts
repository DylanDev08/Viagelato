import type {Metadata} from "next";

export const privatePageMetadata=(title:string):Metadata=>({
 title,robots:{index:false,follow:false,nocache:true},
});
