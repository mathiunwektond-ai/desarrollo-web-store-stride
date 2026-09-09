"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { createClient } from "@/lib/supabase/client";
import { formatKg, formatMoney } from "@/lib/utils";
import type { CartLine, Product } from "@/lib/types";

const PAYMENT_METHODS = ["Efectivo", "Yape/Plin", "Tarjeta"];

export default function PosClient() {
  const supabase = createClient();

  const [cart, setCart] = useState<CartLine[]>([]);
  const [manualCode, setManualCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Modal de peso
  const [product, setProduct] = useState<Product | null>(null);
  const [weight, setWeight] = useState("");

  // Escáner
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop().catch(() => {});
        } catch {
          /* noop */
        }
        scannerRef.current.clear();
      }
    };
  }, []);

  const flash = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // Buscar producto por código
  const findProduct = useCallback(
    async (code: string) => {
      const c = code.trim();
      if (!c) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("barcode", c)
          .single();
        if (error || !data) {
          flash("err", "Producto no encontrado: " + c);
          return;
        }
        setProduct(data as Product);
        setWeight("");
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  // Iniciar/detener cámara
  const startCamera = async () => {
    if (scanning) return;
    setScanning(true);
    try {
      const scanner = new Html5Qrcode("reader");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 150 } },
        (decodedText) => {
          stopCamera();
          setManualCode(decodedText);
          findProduct(decodedText);
        },
        () => {}
      );
    } catch (e) {
      console.error(e);
      flash("err", "No se pudo abrir la cámara. Verifica los permisos.");
      setScanning(false);
    }
  };

  const stopCamera = () => {
    if (scannerRef.current) {
      scannerRef.current
        .stop()
        .then(() => scannerRef.current?.clear())
        .catch(() => {})
        .finally(() => {
          scannerRef.current = null;
          setScanning(false);
        });
    } else {
      setScanning(false);
    }
  };

  // Calcular subtotal del modal en tiempo real
  const modalSubtotal =
    product && Number(weight) > 0 ? Number(weight) * Number(product.price_per_kg) : 0;
  const weightExceeds = !!product && Number(weight) > Number(product.stock_kg);

  const addToCart = () => {
    if (!product) return;
    const w = Number(weight);
    if (!w || w <= 0) {
      flash("err", "Ingresa un peso válido en kg.");
      return;
    }
    if (w > Number(product.stock_kg)) {
      flash("err", "Stock insuficiente. Disponible: " + formatKg(product.stock_kg) + " kg");
      return;
    }
    const line: CartLine = {
      product,
      weight_kg: w,
      subtotal: w * Number(product.price_per_kg),
    };
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        return prev.map((l) =>
          l.product.id === product.id
            ? {
                ...l,
                weight_kg: l.weight_kg + w,
                subtotal: (l.weight_kg + w) * Number(l.product.price_per_kg),
              }
            : l
        );
      }
      return [...prev, line];
    });
    setProduct(null);
    setManualCode("");
    setWeight("");
  };

  const removeLine = (productId: string) => {
    setCart((prev) => prev.filter((l) => l.product.id !== productId));
  };

  const total = cart.reduce((s, l) => s + l.subtotal, 0);

  // Registrar venta
  const confirmSale = async (method: string) => {
    if (cart.length === 0) return;
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesión no válida");

      // 1. Crear venta
      const { data: sale, error: errSale } = await supabase
        .from("sales")
        .insert({
          user_id: user.id,
          total_amount: total,
          payment_method: method,
        })
        .select()
        .single();
      if (errSale) throw new Error(errSale.message);

      // 2. Items de venta
      const items = cart.map((l) => ({
        sale_id: sale.id,
        product_id: l.product.id,
        weight_sold_kg: l.weight_kg,
        price_per_kg_at_sale: l.product.price_per_kg,
        subtotal: l.subtotal,
      }));
      const { error: errItems } = await supabase.from("sale_items").insert(items);
      if (errItems) throw new Error(errItems.message);

      // 3. Descontar stock
      for (const l of cart) {
        const newStock = Number(l.product.stock_kg) - l.weight_kg;
        const { error: errStock } = await supabase
          .from("products")
          .update({ stock_kg: newStock })
          .eq("id", l.product.id);
        if (errStock) throw new Error(errStock.message);
      }

      flash("ok", "Venta registrada por " + formatMoney(total));
      setCart([]);
    } catch (e: any) {
      flash("err", "Error al registrar: " + (e?.message || "desconocido"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">🧾 Punto de Venta</h1>

      {/* Mensaje */}
      {message && (
        <div
          className={`px-4 py-3 rounded-lg text-sm font-medium animate-fade-in ${
            message.type === "ok"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Área de escáner */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        {!scanning ? (
          <div className="text-center py-4">
            <button
              onClick={startCamera}
              className="w-full py-6 rounded-2xl bg-brand hover:bg-brand-dark text-white flex flex-col items-center gap-3 transition shadow-lg"
            >
              <span className="text-6xl">📷</span>
              <span className="text-xl font-bold">Escanear Producto</span>
              <span className="text-sm text-white/80">
                Activa la cámara para leer el código de barras
              </span>
            </button>
          </div>
        ) : (
          <div>
            <div id="reader" className="w-full" />
            <button
              onClick={stopCamera}
              className="mt-3 w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
            >
              ⏹ Detener cámara
            </button>
          </div>
        )}

        {/* Ingreso manual */}
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  findProduct(manualCode);
                }
              }}
              inputMode="numeric"
              placeholder="Código de barras manual o lector USB…"
              className="flex-1 px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand text-base"
            />
            <button
              onClick={() => findProduct(manualCode)}
              disabled={loading}
              className="px-5 py-3 rounded-lg bg-slate-800 text-white font-semibold disabled:opacity-60"
            >
              🔍 {loading ? "…" : "Buscar"}
            </button>
          </div>
        </div>
      </div>

      {/* Carrito */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold">Venta en curso</h2>
          <span className="text-sm text-slate-500">
            {cart.length} {cart.length === 1 ? "producto" : "productos"}
          </span>
        </div>

        {cart.length === 0 ? (
          <p className="text-center text-slate-400 py-6 text-sm">
            Escanea productos para comenzar la venta.
          </p>
        ) : (
          <>
            <div className="divide-y divide-slate-100">
              {cart.map((line) => (
                <div key={line.product.id} className="py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{line.product.name}</div>
                    <div className="text-xs text-slate-500">
                      {formatKg(line.weight_kg)} kg × {formatMoney(line.product.price_per_kg)}
                    </div>
                  </div>
                  <div className="font-bold">{formatMoney(line.subtotal)}</div>
                  <button
                    onClick={() => removeLine(line.product.id)}
                    className="text-red-500 text-lg px-2"
                    aria-label="Quitar"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <span className="font-semibold text-lg">TOTAL</span>
              <span className="font-bold text-2xl text-brand">{formatMoney(total)}</span>
            </div>

            <div className="mt-4 space-y-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method}
                  onClick={() => confirmSale(method)}
                  disabled={busy}
                  className="w-full py-3.5 rounded-xl bg-accent hover:bg-green-700 text-white font-bold transition disabled:opacity-60"
                >
                  {busy ? "Procesando…" : "Cobrar · " + method + ` (${formatMoney(total)})`}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal de peso */}
      {product && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setProduct(null);
          }}
        >
          <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-slide-up">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold">{product.name}</h3>
                <p className="text-xs text-slate-500">Código: {product.barcode}</p>
              </div>
              <button
                onClick={() => setProduct(null)}
                className="text-slate-400 hover:text-slate-700 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-brand-light rounded-xl p-3 text-center">
                <div className="text-xs text-slate-600">Precio / kg</div>
                <div className="font-bold text-brand text-lg">
                  {formatMoney(product.price_per_kg)}
                </div>
              </div>
              <div className="bg-slate-100 rounded-xl p-3 text-center">
                <div className="text-xs text-slate-600">Stock</div>
                <div
                  className={`font-bold text-lg ${
                    Number(product.stock_kg) <= 0 ? "text-red-600" : "text-slate-800"
                  }`}
                >
                  {formatKg(product.stock_kg)} kg
                </div>
              </div>
            </div>

            <label className="block text-sm font-medium mb-1 text-slate-700">
              Peso vendido (kg)
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              autoFocus
              placeholder="Ej: 1.500"
              className="w-full px-4 py-3 text-center text-2xl font-bold rounded-xl border-2 border-slate-300 focus:border-brand focus:outline-none"
            />

            {weightExceeds && (
              <p className="mt-2 text-sm text-red-600">
                ⚠️ El peso supera el stock disponible ({formatKg(product.stock_kg)} kg).
              </p>
            )}

            <div className="flex items-center justify-between bg-brand-dark text-white rounded-xl px-4 py-4 mt-4">
              <span className="text-sm opacity-90">Subtotal</span>
              <span className="font-bold text-2xl">{formatMoney(modalSubtotal)}</span>
            </div>

            <button
              onClick={addToCart}
              disabled={!weight || Number(weight) <= 0 || weightExceeds}
              className={`w-full mt-4 py-3.5 rounded-xl font-bold transition disabled:opacity-50 ${
                weightExceeds
                  ? "bg-red-600 text-white"
                  : "bg-brand hover:bg-brand-dark text-white"
              }`}
            >
              ➕ Agregar a la venta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
