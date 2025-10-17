import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabaseServerClient";

/**
 * Ensures the user is authenticated.
 * Returns { supabase, user, profile } if valid.
 * Redirects to /login if no session is found.
 */
export async function requireAuth() {
  const supabase = await createServerSupabase();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, company_id")
    .eq("id", user.id)
    .single();

  return { supabase, user, profile };
}
