export const brl = (n: number | null | undefined) =>
  n == null ? "" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const slugify = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

export const imgUrl = (fileId: string) => `/api/img/${fileId}`;

export type Store = {
  id: string; owner_id: string; slug: string; name: string; description: string | null;
  category: string | null; whatsapp: string | null; city: string | null;
  payment_methods: string[]; delivery_methods: string[]; published: boolean; logo_url: string | null;
};
export type Variant = { id: string; product_id: string; name: string; sku: string | null; price: number | null; stock: number | null; active: boolean; position: number; barcode: string | null; image_file_id: string | null };
export type Template = { id: string; store_id: string | null; name: string; options: string[] };
export type Product = {
  id: string; store_id: string; name: string; description: string | null; price: number | null;
  track_stock: boolean; stock: number | null; active: boolean; position: number;
  product_images: { id: string; drive_file_id: string; position: number }[];
  sku: string | null; product_variants: Variant[];
  category: string | null; tags: string[]; barcode: string | null; low_stock_alert: number | null;
  hide_when_out: boolean; auto_hidden: boolean;
};

export const csvList = (t: string) => [...new Set(t.split(",").map((x) => x.trim()).filter(Boolean))];

/** Só aceita caminhos internos para evitar redirecionamento aberto. */
export const safeNext = (n: string | null | undefined, fallback = "/") =>
  n && n.startsWith("/") && !n.startsWith("//") ? n : fallback;

export type Rating = { avg_rating: number; total: number };
export type Review = { id: string; reviewer_name: string; rating: number; comment: string | null; created_at: string };
