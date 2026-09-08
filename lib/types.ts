export type Role = "admin" | "jefe" | "administracion" | "vendedor";

export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  role: Role;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  barcode: string;
  name: string;
  price_per_kg: number;
  stock_kg: number;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  user_id: string | null;
  total_amount: number;
  payment_method: string;
  created_at: string;
  profile?: Pick<Profile, "full_name"> | null;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  weight_sold_kg: number;
  price_per_kg_at_sale: number;
  subtotal: number;
  product?: Pick<Product, "name"> | null;
}

export interface CartLine {
  product: Product;
  weight_kg: number;
  subtotal: number;
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  jefe: "Jefe",
  administracion: "Administración",
  vendedor: "Vendedor",
};
