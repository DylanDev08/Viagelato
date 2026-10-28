import {render,screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe,expect,it} from "vitest";
import {ProvisionalCatalog} from "@/components/provisional-catalog";
import type {ProvisionalAsset} from "@/lib/provisional-catalog";

const assets:ProvisionalAsset[]=[
 {id:1,name:"Chocolate",category:"Helados",image:"/catalogo/chocolate.webp",role:"producto_candidato",status:"requiere_revision_comercial",note:"Pendiente"},
 {id:2,name:"Logo Viagelato",category:"Marca",image:"/catalogo/logo.webp",role:"material_de_marca",status:"requiere_revision_comercial",note:"Pendiente"},
];

describe("catálogo provisional",()=>{
 it("no ofrece compra ni publica datos comerciales",()=>{render(<ProvisionalCatalog assets={assets}/>);expect(screen.getAllByText("Información comercial pendiente")).toHaveLength(2);expect(screen.queryByRole("button",{name:/comprar|agregar/i})).not.toBeInTheDocument();});
 it("filtra y recupera el estado vacío",async()=>{const user=userEvent.setup();render(<ProvisionalCatalog assets={assets}/>);await user.type(screen.getByPlaceholderText("Buscar productos"),"inexistente");expect(screen.getByText("No hay coincidencias.")).toBeInTheDocument();await user.click(screen.getByRole("button",{name:"Limpiar filtros"}));expect(screen.getByText("Chocolate")).toBeInTheDocument();});
});
