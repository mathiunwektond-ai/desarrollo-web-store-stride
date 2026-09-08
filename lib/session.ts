import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

// Devuelve el perfil del usuario actual o null si no hay sesión.
// cache() evita llamadas repetidas dentro de un mismo render.
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!data) return null;

  // Desactivar lógica: si el usuario está suspendido, no se le permite avanzar.
  if (!data.is_active) return null;

  return data as Profile;
});
