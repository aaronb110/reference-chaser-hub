import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (key) => cookieStore.get(key)?.value,
        set: (key, value, options) => {
          try {
            cookieStore.set({ name: key, value, ...options });
          } catch {}
        },
        remove: (key, options) => {
          try {
            cookieStore.set({ name: key, value: "", ...options });
          } catch {}
        },
      },
    }
  );
}
