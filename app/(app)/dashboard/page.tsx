import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/guard";
import { formatMoney, startOfToday } from "@/lib/utils";

export const metadata = { title: "Resumen" };

export default async function DashboardPage() {
  const profile = await requireRole(["admin", "jefe", "administracion"]);
  const supabase = await createClient();

  const from = startOfToday();

  const [{ count: productCount }, { data: todaySales }, { data: recentSales }] =
    await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase
        .from("sales")
        .select("total_amount")
        .gte("created_at", from),
      supabase
        .from("sales")
        .select("id, total_amount, payment_method, created_at, profile:profiles(full_name)")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  const todayTotal =
    todaySales?.reduce((s, r) => s + Number(r.total_amount), 0) ?? 0;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">
        ¡Hola, {profile.full_name || "usuario"}! 👋
      </h1>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="text-sm text-slate-500">Ventas de hoy</div>
          <div className="text-2xl font-bold text-brand mt-1">
            {formatMoney(todayTotal)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {todaySales?.length ?? 0} transacciones
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="text-sm text-slate-500">Productos en inventario</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">
            {productCount ?? 0}
          </div>
        </div>
      </div>

      {/* Últimas ventas */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <h2 className="font-bold mb-3">Últimas ventas</h2>
        {!recentSales || recentSales.length === 0 ? (
          <p className="text-center text-slate-400 py-6 text-sm">
            Aún no hay ventas registradas hoy.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                  <th className="py-2">Venta</th>
                  <th className="py-2">Vendedor</th>
                  <th className="py-2">Método</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map((s: any) => (
                  <tr key={s.id} className="border-b border-slate-50">
                    <td className="py-2 font-mono text-xs">
                      {String(s.id).slice(0, 8)}…{new Date(s.created_at).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="py-2">{s.profile?.full_name || "—"}</td>
                    <td className="py-2">{s.payment_method}</td>
                    <td className="py-2 text-right font-semibold">
                      {formatMoney(s.total_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
