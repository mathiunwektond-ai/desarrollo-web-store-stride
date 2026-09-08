import { requireRole } from "@/lib/guard";
import { createClient } from "@/lib/supabase/server";
import UsersManager from "@/components/UsersManager";

export const metadata = { title: "Usuarios" };

export default async function UsersPage() {
  await requireRole(["admin"]);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <UsersManager currentUserId={user?.id || ""} />;
}
