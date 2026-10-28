/** Búsqueda tolerante a mayúsculas y acentos para nombres comerciales. */
export function normalizeCatalogText(value:string):string {
 return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es-AR").trim();
}
