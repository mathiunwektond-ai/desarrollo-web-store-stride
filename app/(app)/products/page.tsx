import { requireRole } from "@/lib/guard";
import ProductsManager from "@/components/ProductsManager";

export const metadata = { title: "Productos" };

export default async function ProductsPage() {
  const profile = await requireRole(["admin", "jefe", "administracion"]);
  return <ProductsManager role={profile.role} />;
}
