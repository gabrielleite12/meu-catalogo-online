export const brl = (n: number | null | undefined) =>
  n == null ? "" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const slugify = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

export const imgUrl = (fileId: string) => `/api/img/${fileId}`;

export type Store = {
  id: string; owner_id: string; slug: string; name: string; description: string | null;
  category: string | null; whatsapp: string | null; city: string | null;
  payment_methods: string[]; delivery_methods: string[]; drive_folder_id: string | null; published: boolean;
};
export type Product = {
  id: string; store_id: string; name: string; description: string | null; price: number | null;
  track_stock: boolean; stock: number | null; active: boolean; position: number;
  product_images: { id: string; drive_file_id: string; position: number }[];
};
