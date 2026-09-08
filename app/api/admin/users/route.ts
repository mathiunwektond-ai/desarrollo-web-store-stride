import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

// Cliente con rol de servicio (SOLO servidor). Nunca exponer esta clave.
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

export async function GET() {
  const admin = await assertAdmin();
  if (admin.error) return admin.error;

  const service = createServiceClient(supabaseUrl!, serviceRoleKey!);

  // Listar auth users (para obtener el email)
  const { data: authUsers, error: errUsers } = await service.auth.admin.listUsers();
  if (errUsers) {
    return NextResponse.json({ error: errUsers.message }, { status: 500 });
  }

  // Obtener perfiles
  const { data: profiles, error: errProfiles } = await service
    .from("profiles")
    .select("*");

  if (errProfiles) {
    return NextResponse.json({ error: errProfiles.message }, { status: 500 });
  }

  // Combinar
  const emailMap = new Map(
    (authUsers?.users ?? []).map((u: any) => [u.id, u.email])
  );

  const combined = (profiles ?? []).map((p: any) => ({
    ...p,
    email: emailMap.get(p.id) || null,
  }));

  return NextResponse.json({ users: combined });
}

export async function POST(request: Request) {
  const admin = await assertAdmin();
  if (admin.error) return admin.error;

  const body = await request.json();
  const { email, password, full_name, username, role, is_active } = body;

  if (!email || !password || password.length < 6) {
    return NextResponse.json(
      { error: "Correo y contraseña de al menos 6 caracteres requeridos." },
      { status: 400 }
    );
  }

  const service = createServiceClient(supabaseUrl!, serviceRoleKey!);

  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, username, role },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (data.user) {
    await service
      .from("profiles")
      .update({
        full_name: full_name || null,
        username: username || null,
        role: role || "vendedor",
        is_active: is_active ?? true,
      })
      .eq("id", data.user.id);
  }

  return NextResponse.json({ ok: true });
}

// PATCH para activar/suspender y cambiar rol
export async function PATCH(request: Request) {
  const admin = await assertAdmin();
  if (admin.error) return admin.error;

  const body = await request.json();
  const { id, role, is_active } = body;

  const service = createServiceClient(supabaseUrl!, serviceRoleKey!);

  const update: Record<string, unknown> = {};
  if (typeof is_active === "boolean") update.is_active = is_active;
  if (role) update.role = role;

  const { error } = await service.from("profiles").update(update).eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

async function assertAdmin(): Promise<{ error?: NextResponse }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "admin" || !profile.is_active) {
    return { error: NextResponse.json({ error: "No autorizado" }, { status: 403 }) };
  }
  return {};
}
