"use client";

import { useCallback, useEffect, useState } from "react";
import { ROLE_LABELS, type Role } from "@/lib/types";

const ROLES: Role[] = ["admin", "jefe", "administracion", "vendedor"];

interface ManagedUser {
  id: string;
  username: string | null;
  full_name: string | null;
  role: Role;
  is_active: boolean;
  email: string | null;
  created_at: string;
}

export default function UsersManager({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    username: "",
    role: "vendedor" as Role,
    is_active: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (data.users) setUsers(data.users);
      else setMessage({ type: "err", text: data.error || "Error al cargar" });
    } catch {
      setMessage({ type: "err", text: "Error de red" });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const flash = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  async function createUser() {
    const email = form.email.trim();
    const password = form.password;
    if (!email || password.length < 6) {
      flash("err", "Correo válido y contraseña de al menos 6 caracteres.");
      return;
    }
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        flash("err", data.error || "Error al crear usuario");
        return;
      }
      flash("ok", "Usuario creado correctamente");
      setShowModal(false);
      load();
    } catch {
      flash("err", "Error de red");
    }
  }

  async function toggleActive(u: ManagedUser) {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: u.id, is_active: !u.is_active }),
    });
    const data = await res.json();
    if (!res.ok) flash("err", data.error || "Error");
    else {
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_active: !u.is_active } : x)));
      flash("ok", !u.is_active ? "Usuario activado" : "Usuario suspendido");
    }
  }

  async function changeRole(u: ManagedUser, role: Role) {
    if (u.id === currentUserId) {
      flash("err", "No puedes cambiar tu propio rol.");
      return;
    }
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: u.id, role }),
    });
    const data = await res.json();
    if (!res.ok) flash("err", data.error || "Error");
    else {
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role } : x)));
      flash("ok", "Rol actualizado a " + ROLE_LABELS[role]);
    }
  }

  const roleBadge: Record<Role, string> = {
    admin: "bg-purple-100 text-purple-700",
    jefe: "bg-blue-100 text-blue-700",
    administracion: "bg-amber-100 text-amber-700",
    vendedor: "bg-green-100 text-green-700",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">👥 Gestión de Usuarios</h1>
        <button
          onClick={() => {
            setForm({ email: "", password: "", full_name: "", username: "", role: "vendedor", is_active: true });
            setShowModal(true);
          }}
          className="px-4 py-2 rounded-lg bg-brand text-white font-semibold hover:bg-brand-dark"
        >
          + Nuevo usuario
        </button>
      </div>

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

      {loading ? (
        <p className="text-center text-slate-400 py-8">Cargando…</p>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {users.map((u) => (
              <div key={u.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold truncate">{u.full_name || "Sin nombre"}</span>
                    {u.id === currentUserId && (
                      <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full">Tú</span>
                    )}
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${roleBadge[u.role]}`}>
                      {ROLE_LABELS[u.role]}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {u.email || "sin email"} {u.username ? "· @" + u.username : ""}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => toggleActive(u)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full transition ${
                      u.is_active
                        ? "bg-green-50 text-green-700 hover:bg-green-100"
                        : "bg-red-50 text-red-600 line-through hover:bg-red-100"
                    }`}
                  >
                    {u.is_active ? "● Activo" : "● Suspendido"}
                  </button>

                  <select
                    value={u.role}
                    disabled={u.id === currentUserId}
                    onChange={(e) => changeRole(u, e.target.value as Role)}
                    className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-50"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Nuevo usuario</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Nombre completo</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Correo electrónico</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Contraseña</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Rol</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
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
                onClick={createUser}
                className="flex-1 py-3 rounded-lg bg-brand text-white font-semibold hover:bg-brand-dark"
              >
                Crear usuario
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
