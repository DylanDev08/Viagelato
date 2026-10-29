export type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  image_url: string | null;
  category_id: string | null;
  active: boolean;
  sku?: string | null;
  presentation?: string | null;
  featured?: boolean;
  commercially_verified?: boolean;
  created_at?: string;
};

export type ShippingZone = {
  id: string;
  name: string;
  postal_codes: string[];
  cost: number | null;
  active: boolean;
  ready?: boolean;
  free_shipping_eligible?: boolean;
};

export type Settings = {
  id: boolean;
  name: string;
  description: string;
  logo_url: string | null;
  whatsapp: string;
  phone: string;
  instagram: string;
  address: string;
  maps_url: string;
  contact_email: string;
  hero_title: string;
  hero_subtitle: string;
  hero_image_url: string | null;
  returns_policy: string;
  privacy_policy: string;
  bank_alias: string;
  bank_holder: string;
  bank_cbu: string;
  free_shipping_threshold: number;
  pickup_enabled: boolean;
  transfer_enabled: boolean;
  on_delivery_enabled: boolean;
  reservation_minutes: number;
};

export type Banner = {
  id: string;
  title: string;
  subtitle: string;
  image_url: string | null;
  href: string;
  active: boolean;
  sort_order: number;
};

export type Order = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  address: string;
  shipping_method: string;
  shipping_cost: number;
  total: number;
  status: string;
  payment_status: "pending" | "paid";
  payment_method: "transfer" | "on_delivery";
  reservation_expires_at?: string | null;
  stock_released_at?: string | null;
  created_at: string;
  order_items?: { product_name: string; unit_price: number; quantity: number }[];
};

export type WhatsAppRequest={
 id:string;
 customer_name:string;
 locality:string;
 address:string;
 notes:string;
 shipping_method:"shipping"|"pickup";
 items:{id:string;name:string;sku?:string|null;presentation?:string|null;price:number;quantity:number}[];
 subtotal:number;
 status:"draft"|"contacted"|"confirmed"|"preparing"|"shipped"|"delivered"|"cancelled";
 payment_status:"pending"|"partial"|"paid";
 stock_confirmed:boolean;
 shipping_cost:number|null;
 total:number|null;
 amount_paid:number;
 whatsapp_request_payments?:{id:string;amount:number;transfer_reference:string;created_at:string}[];
 created_at:string;
 updated_at:string;
};

export type CartLine = { id: string; quantity: number };

const DEMO_CATEGORY_IDS = {
  helados: "20000000-0000-4000-8000-000000000001",
  postres: "20000000-0000-4000-8000-000000000002",
  congelados: "20000000-0000-4000-8000-000000000003",
} as const;

export const DEMO_CATEGORIES: Category[] = [
  {
    id: DEMO_CATEGORY_IDS.helados,
    name: "Helados",
    slug: "helados",
    description: "Potes, palitos y formatos para distintos momentos de consumo.",
  },
  {
    id: DEMO_CATEGORY_IDS.postres,
    name: "Postres helados",
    slug: "postres-helados",
    description: "Alternativas listas para compartir y completar una mesa dulce.",
  },
  {
    id: DEMO_CATEGORY_IDS.congelados,
    name: "Otros congelados",
    slug: "otros-congelados",
    description: "Productos alimenticios congelados sujetos a disponibilidad.",
  },
];

export const DEMO_PRODUCTS: Product[] = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    name: "Producto de ejemplo",
    slug: "producto-ejemplo",
    description: "Contenido demostrativo para visualizar la tienda antes de cargar el catálogo real.",
    price: 6500,
    stock: 12,
    image_url: null,
    category_id: DEMO_CATEGORY_IDS.helados,
    active: true,
    sku: "DEMO-001",
    presentation: "Presentación a definir",
    featured: true,
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    name: "Segundo producto",
    slug: "segundo-producto",
    description: "Ficha demostrativa con precio, stock, categoría y presentación editables.",
    price: 9800,
    stock: 8,
    image_url: null,
    category_id: DEMO_CATEGORY_IDS.postres,
    active: true,
    sku: "DEMO-002",
    presentation: "Presentación a definir",
    featured: true,
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    name: "Producto destacado",
    slug: "producto-destacado",
    description: "Ejemplo visual que será reemplazado por una referencia real desde administración.",
    price: 14900,
    stock: 20,
    image_url: null,
    category_id: DEMO_CATEGORY_IDS.congelados,
    active: true,
    sku: "DEMO-003",
    presentation: "Presentación a definir",
    featured: true,
  },
];

export const DEFAULT_SETTINGS: Settings = {
  id: true,
  name: "Viagelato S.A.",
  description:
    "Logística y distribución de productos alimenticios congelados, con atención comercial y entregas coordinadas por zona.",
  logo_url: null,
  whatsapp: "+5491140962202",
  phone: "11 4096-2202",
  instagram: "https://www.instagram.com/distribuidorviagelato/",
  address: "Ubicación a confirmar",
  maps_url: "",
  contact_email: "",
  hero_title: "Helados y congelados, directo a tu negocio.",
  hero_subtitle:
    "Distribución en Zona Sur de Buenos Aires, con entregas coordinadas y atención personalizada.",
  hero_image_url: null,
  returns_policy: "Política de cambios y devoluciones sujeta a validación comercial y jurídica.",
  privacy_policy: "Política de privacidad sujeta a validación comercial y jurídica.",
  bank_alias: "",
  bank_holder: "",
  bank_cbu: "",
  free_shipping_threshold: 60000,
  pickup_enabled: false,
  transfer_enabled: false,
  on_delivery_enabled: false,
  reservation_minutes: 30,
};

export const DELIVERY_AREAS = [
  "Lomas de Zamora",
  "Lanús",
  "Banfield",
  "Avellaneda",
  "Valentín Alsina",
  "Don Bosco",
  "Wilde",
] as const;

export const ars = (value: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
