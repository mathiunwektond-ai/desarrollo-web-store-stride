"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatKg, formatMoney } from "@/lib/utils";
import type { Product, Role } from "@/lib/types";

export default function ProductsPage({ role }: { role: Role }) {
  const supabase = createClient();
  const canEdit = role === "admin" || role === "jefe";

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({
    barcode: "",
    name: "",
    price_per_kg: "",
    stock_kg: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("name");
    if (!error && data) setProducts(data as Product[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const flash = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ barcode: "", name: "", price_per_kg: "", stock_kg: "" });
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      barcode: p.barcode,
      name: p.name,
      price_per_kg: String(p.price_per_kg),
      stock_kg: String(p.stock_kg),
    });
    setShowModal(true);
  };

  // Edición rápida de precio/stock sin abrir el modal completo
  async function quickUpdate(p: Product, field: "price_per_kg" | "stock_kg", value: string) {
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) return;
    const { error } = await supabase
      .from("products")
      .update({ [field]: num })
      .eq("id", p.id);
    if (error) {
      flash("err", "No se pudo actualizar");
    } else {
      setProducts((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, [field]: num } : x))
      );
    }
  }

  async function save() {
    const barcode = form.barcode.trim();
    const name = form.name.trim();
    const price = Number(form.price_per_kg);
    const stock = Number(form.stock_kg);
    if (!barcode || !name || !Number.isFinite(price) || !Number.isFinite(stock)) {
      flash("err", "Completa todos los campos correctamente.");
      return;
    }
    if (editing) {
      const { error } = await supabase
        .from("products")
        .update({ barcode, name, price_per_kg: price, stock_kg: stock })
        .eq("id", editing.id);
      if (error) {
        flash("err", error.message);
        return;
      }
      flash("ok", "Producto actualizado");
    } else {
      const { error } = await supabase
        .from("products")
        .insert({ barcode, name, price_per_kg: price, stock_kg: stock });
      if (error) {
        flash("err", error.message);
        return;
      }
      flash("ok", "Producto creado");
    }
    setShowModal(false);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">🥩 Productos</h1>
        {canEdit && (
          <button
            onClick={openNew}
            className="px-4 py-2 rounded-lg bg-brand text-white font-semibold hover:bg-brand-dark"
          >
            + Nuevo producto
          </button>
        )}
      </div>

      {!canEdit && (
        <div className="bg-amber-50 text-amber-700 border border-amber-200 rounded-lg px-4 py-3 text-sm">
          📊 Modo lectura: solo puedes visualizar el inventario.
        </div>
      )}

      {message && (
        <div
          className={`px-4 py-3 rounded-lg text-sm font-medium ${
            message.type === "ok"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <input
        type="text"
        placeholder="Buscar por nombre o código…"
        onChange={(e) => {
          const q = e.target.value.toLowerCase();
          if (q === "") load();
          else
            setProducts((prev) =>
              prev.filter(
                (p) =>
                  p.name.toLowerCase().includes(q) ||
                  p.barcode.toLowerCase().includes(q)
              )
            );
        }}
        className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand"
      />

      {loading ? (
        <p className="text-center text-slate-400 py-8">Cargando…</p>
      ) : products.length === 0 ? (
        <p className="text-center text-slate-400 py-8">
          No hay productos. Agrega el primero.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{p.name}</div>
                  <div className="text-xs text-slate-400 font-mono">{p.barcode}</div>
                </div>
                {canEdit && (
                  <button
                    onClick={() => openEdit(p)}
                    className="text-slate-400 hover:text-brand text-lg px-1"
                    aria-label="Editar"
                  >
                    ✏️
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div>
                  <label className="text-[11px] text-slate-500">Precio/kg</label>
                  <input
                    type="number"
                    step="0.01"
                    defaultValue={p.price_per_kg}
                    disabled={!canEdit}
                    onBlur={(e) => {
                      if (Number(e.target.value) !== Number(p.price_per_kg))
                        quickUpdate(p, "price_per_kg", e.target.value);
                    }}
                    className="w-full mt-1 px-2 py-1.5 rounded-lg border border-slate-200 text-sm font-semibold focus:border-brand focus:outline-none disabled:bg-slate-50"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500">Stock (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    defaultValue={p.stock_kg}
                    disabled={!canEdit}
                    onBlur={(e) => {
                      if (Number(e.target.value) !== Number(p.stock_kg))
                        quickUpdate(p, "stock_kg", e.target.value);
                    }}
                    className="w-full mt-1 px-2 py-1.5 rounded-lg border border-slate-200 text-sm font-semibold focus:border-brand focus:outline-none disabled:bg-slate-50"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center mt-3 text-xs text-slate-500">
                <span>Valor inventario</span>
                <span className="font-semibold text-slate-700">
                  {formatMoney(Number(p.stock_kg) * Number(p.price_per_kg))}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal nuevo/editar */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-slide-up">
            <h3 className="text-lg font-bold mb-4">
              {editing ? "Editar producto" : "Nuevo producto"}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Código de barras</label>
                <input
                  type="text"
                  value={form.barcode}
                  onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Nombre</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Precio / kg</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.price_per_kg}
                    onChange={(e) => setForm({ ...form, price_per_kg: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Stock (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.stock_kg}
                    onChange={(e) => setForm({ ...form, stock_kg: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-lg bg-slate-100 text-slate-700 font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={save}
                className="flex-1 py-3 rounded-lg bg-brand text-white font-semibold hover:bg-brand-dark"
              >
                {editing ? "Guardar cambios" : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
