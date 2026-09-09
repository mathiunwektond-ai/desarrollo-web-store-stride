import { requireRole } from "@/lib/guard";
import ReportsView from "@/components/ReportsView";

export const metadata = { title: "Reportes" };

export default async function ReportsPage() {
  const profile = await requireRole(["admin", "jefe", "administracion"]);
  return <ReportsView role={profile.role} />;
}
