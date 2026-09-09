import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/session";

export default async function HomePage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  // Vendedor va directo a la pantalla de venta POS.
  if (profile.role === "vendedor") {
    redirect("/pos");
  }

  redirect("/dashboard");
}
