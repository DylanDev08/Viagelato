import "@testing-library/jest-dom/vitest";
import {afterEach,vi} from "vitest";
import {cleanup} from "@testing-library/react";
import React from "react";

afterEach(cleanup);
vi.mock("next/image",()=>({default:(props:React.ImgHTMLAttributes<HTMLImageElement>)=>{
 const {fill,priority,unoptimized,...imageProps}=props as React.ImgHTMLAttributes<HTMLImageElement>&{fill?:boolean;priority?:boolean;unoptimized?:boolean};
 void fill;void priority;void unoptimized;
 return React.createElement("img",imageProps);
}}));
