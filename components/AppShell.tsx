"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/actions/auth";
import { ROLE_LABELS, type Profile, type Role } from "@/lib/types";

const ROLE_ICONS: Record<Role, string> = {
  admin: "👑",
  jefe: "👔",
  administracion: "📊",
  vendedor: "🛒",
};

export default function AppShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems: { href: string; label: string; icon: string; roles: Role[] }[] = [
    { href: "/pos", label: "Vender", icon: "🛒", roles: ["admin", "jefe", "vendedor"] },
    { href: "/dashboard", label: "Resumen", icon: "📋", roles: ["admin", "jefe", "administracion"] },
    {
      href: "/products",
      label: "Productos",
      icon: "🥩",
      roles: ["admin", "jefe", "administracion"],
    },
    { href: "/users", label: "Usuarios", icon: "👥", roles: ["admin"] },
    { href: "/reports", label: "Reportes", icon: "📈", roles: ["admin", "jefe", "administracion"] },
  ];

  const allowed = navItems.filter((i) => i.roles.includes(profile.role));

  const signOutAction = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Sidebar escritorio */}
      <aside className="hidden lg:flex w-60 flex-col bg-brand text-white shrink-0 min-h-screen sticky top-0">
        <div className="px-5 py-6 border-b border-white/10">
          <div className="text-2xl font-bold">🥩 Inv & POS</div>
          <div className="text-xs text-white/70 mt-1">Carnicería</div>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1">
          {allowed.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  active ? "bg-white/20" : "hover:bg-white/10"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 justify-between">
            <div>
              <div className="text-sm font-semibold truncate max-w-[140px]">
                {ROLE_ICONS[profile.role]} {profile.full_name || profile.username || "Usuario"}
              </div>
              <div className="text-xs text-white/60">
                {ROLE_LABELS[profile.role]}
              </div>
            </div>
          </div>
          <button
            onClick={signOutAction}
            className="mt-3 w-full py-2 rounded-lg text-sm bg-white/10 hover:bg-white/20 transition"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar móvil */}
        <header className="lg:hidden sticky top-0 z-20 bg-brand text-white px-4 py-3 flex items-center justify-between shadow-md">
          <div className="font-bold">🥩 Inventario & POS</div>
          <button
            onClick={signOutAction}
            className="text-xs bg-white/15 px-3 py-1.5 rounded-lg"
          >
            Salir
          </button>
        </header>

        <main className="flex-1 p-4 pb-28 lg:pb-8 max-w-6xl w-full mx-auto">
          {/* Barra de rol (móvil) */}
          <div className="lg:hidden mb-3 flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-sm">
            <span className="text-lg">{ROLE_ICONS[profile.role]}</span>
            <div>
              <div className="text-sm font-semibold leading-tight">
                {profile.full_name || profile.username || "Usuario"}
              </div>
              <div className="text-xs text-slate-500">{ROLE_LABELS[profile.role]}</div>
            </div>
          </div>
          {children}
        </main>
      </div>

      {/* Bottom nav móvil */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 flex shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
        {allowed.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center py-2.5 text-[11px] font-medium ${
                active ? "text-brand" : "text-slate-500"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
