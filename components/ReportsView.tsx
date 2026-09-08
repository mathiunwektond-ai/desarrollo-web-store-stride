"use client";

import { useCallback, useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatKg, formatMoney, startOfToday } from "@/lib/utils";
import type { Role } from "@/lib/types";

interface DailyRow {
  sale_id: string;
  sale_at: string;
  vendedor: string;
  payment_method: string;
  product_name: string;
  weight_kg: number;
  price: number;
  subtotal: number;
}

export default function ReportsView({ role }: { role: Role }) {
  const supabase = createClient();
  const [rows, setRows] = useState<DailyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(startOfToday().slice(0, 10));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (day?: string) => {
      setLoading(true);
      setError(null);
      const d = new Date(day || date);
      d.setHours(0, 0, 0, 0);
      const from = d.toISOString();
      const to = new Date(d.getTime() + 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from("sale_items")
        .select(
          "sale_id, weight_sold_kg, price_per_kg_at_sale, subtotal, " +
            "product:products(name), " +
            "sale:sales(created_at, payment_method, user_id, profile:profiles(full_name))"
        )
        .gte("sale.created_at", from)
        .lt("sale.created_at", to);

      if (error) {
        setError(error.message);
        setRows([]);
      } else {
        const mapped: DailyRow[] = (data ?? []).map((it: any) => ({
          sale_id: it.sale_id,
          sale_at: it.sale.created_at,
          vendedor: it.sale.profile?.full_name || "—",
          payment_method: it.sale.payment_method,
          product_name: it.product?.name || "—",
          weight_kg: Number(it.weight_sold_kg),
          price: Number(it.price_per_kg_at_sale),
          subtotal: Number(it.subtotal),
        }));
        setRows(mapped);
      }
      setLoading(false);
    },
    [date, supabase]
  );

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const totalKgs = rows.reduce((s, r) => s + r.weight_kg, 0);
  const totalBox = rows.reduce((s, r) => s + r.subtotal, 0);

  const byMethod = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.payment_method] = (acc[r.payment_method] || 0) + r.subtotal;
    return acc;
  }, {});

  // Excel
  const exportExcel = () => {
    const header = ["Fecha", "Venta", "Vendedor", "Método", "Producto", "Kilos", "Precio/kg", "Subtotal"];
    const body = rows.map((r) => [
      formatDate(r.sale_at),
      r.sale_id,
      r.vendedor,
      r.payment_method,
      r.product_name,
      r.weight_kg,
      r.price,
      r.subtotal,
    ]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
    ws["!cols"] = [{ wch: 18 }, { wch: 40 }, { wch: 18 }, { wch: 14 }, { wch: 22 }, { wch: 8 }, { wch: 10 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ventas");
    XLSX.writeFile(wb, `reporte_ventas_${date}.xlsx`);
  };

  // PDF
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Cierre de Caja Diario", 14, 18);
    doc.setFontSize(10);
    doc.text("Tienda de Carnes · Inventario & POS", 14, 25);
    doc.text(`Fecha: ${date}`, 14, 31);
    doc.text(`Kilos vendidos: ${formatKg(totalKgs)} kg`, 14, 36);
    doc.text(`Total caja: ${formatMoney(totalBox)}`, 14, 41);

    // Resumen por método de pago
    let y = 50;
    doc.setFontSize(12);
    doc.text("Resumen por método de pago", 14, y);
    doc.setFontSize(10);
    Object.entries(byMethod).forEach(([m, t], i) => {
      y += 6;
      doc.text(`${m}: ${formatMoney(t)}`, 14, y);
    });

    autoTable(doc, {
      startY: y + 8,
      head: [["Fecha", "Vendedor", "Método", "Producto", "Kilos", "Subtotal"]],
      body: rows.map((r) => [
        formatDate(r.sale_at),
        r.vendedor,
        r.payment_method,
        r.product_name,
        formatKg(r.weight_kg),
        formatMoney(r.subtotal),
      ]),
      foot: [[`TOTAL`, "", "", "", formatKg(totalKgs), formatMoney(totalBox)]],
      footStyles: { fillColor: [15, 76, 58], textColor: 255 },
    });

    doc.save(`cierre_caja_${date}.pdf`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold">📈 Reportes</h1>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <button
            onClick={exportExcel}
            disabled={rows.length === 0}
            className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
          >
            📥 Excel (.xlsx)
          </button>
          <button
            onClick={exportPDF}
            disabled={rows.length === 0}
            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
          >
            📄 PDF
          </button>
        </div>
      </div>

      {role === "jefe" && (
        <div className="text-xs text-slate-500">
          Reporte diario de la jornada seleccionada.
        </div>
      )}

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="text-xs text-slate-500">Caja total</div>
          <div className="text-xl font-bold text-brand">{formatMoney(totalBox)}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="text-xs text-slate-500">Kilos vendidos</div>
          <div className="text-xl font-bold text-slate-800">{formatKg(totalKgs)} kg</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="text-xs text-slate-500">Por método</div>
          <div className="text-sm font-semibold mt-1 space-y-0.5">
            {Object.entries(byMethod).map(([m, t]) => (
              <div key={m} className="flex justify-between">
                <span className="text-slate-600">{m}</span>
                <span>{formatMoney(t)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-center text-slate-400 py-8">Cargando…</p>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center text-slate-400 shadow-sm border border-slate-100">
          No hay ventas registradas en esta fecha.
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-100 bg-slate-50">
                <th className="py-2 px-3">Fecha</th>
                <th className="py-2 px-3">Vendedor</th>
                <th className="py-2 px-3">Método</th>
                <th className="py-2 px-3">Producto</th>
                <th className="py-2 px-3 text-right">Kilos</th>
                <th className="py-2 px-3 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-slate-50">
                  <td className="py-2 px-3 whitespace-nowrap">{formatDate(r.sale_at)}</td>
                  <td className="py-2 px-3">{r.vendedor}</td>
                  <td className="py-2 px-3">{r.payment_method}</td>
                  <td className="py-2 px-3">{r.product_name}</td>
                  <td className="py-2 px-3 text-right">{formatKg(r.weight_kg)}</td>
                  <td className="py-2 px-3 text-right font-semibold">{formatMoney(r.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
