"use client";

import { useState } from "react";
import { login } from "@/app/actions/auth";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await login(form);
    if (res && res.error) {
      setError(res.error);
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-brand to-brand-dark">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 animate-slide-up">
        <div className="text-center mb-8">
          <div className="text-5xl mb-2">🥩</div>
          <h1 className="text-2xl font-bold text-foreground">Inventario & POS</h1>
          <p className="text-sm text-slate-500 mt-1">Carnicería · Inicia sesión</p>
        </div>

        {error && (
          <div className="mb-4 text-sm bg-red-50 text-red-700 border border-red-200 rounded-lg p-3">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700">
              Correo electrónico
            </label>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder="usuario@tienda.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700">
              Contraseña
            </label>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-brand hover:bg-brand-dark text-white font-semibold transition disabled:opacity-60"
          >
            {loading ? "Ingresando…" : "Iniciar sesión"}
          </button>
        </form>
      </div>
    </main>
  );
}
