import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/session";
import AppShell from "@/components/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  // Si no hay sesión o el usuario está inactivo, el middleware/auth lo envía a login.
  if (!profile) {
    redirect("/login");
  }

  // Vendedor: solo puede acceder al POS. Todo lo demás redirige.
  return (
    <AppShell profile={profile}>
      {profile.role === "vendedor" ? <VendedorGuard role={profile.role}>{children}</VendedorGuard> : children}
    </AppShell>
  );
}

async function VendedorGuard({
  role,
  children,
}: {
  role: string;
  children: React.ReactNode;
}) {
  // El vendedor siempre ve la pantalla POS.
  // Este componente es un placeholder: la redirección real se hace en cada página.
  void role;
  return <>{children}</>;
}
