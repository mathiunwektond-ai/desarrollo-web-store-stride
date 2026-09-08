import { requireRole } from "@/lib/guard";
import PosClient from "@/components/PosClient";

export const metadata = { title: "Punto de Venta" };

export default async function PosPage() {
  await requireRole(["admin", "jefe", "vendedor"]);
  return <PosClient />;
}
