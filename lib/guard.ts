import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/session";
import type { Role } from "@/lib/types";

// Devuelve el perfil si el usuario tiene uno de los roles permitidos.
// Si no tiene el rol, redirige a la ruta apropiada según su rol.
export async function requireRole(roles: Role[]) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  if (!roles.includes(profile.role)) {
    // Vendedor solo puede ver POS
    redirect(profile.role === "vendedor" ? "/pos" : "/dashboard");
  }

  return profile;
}
