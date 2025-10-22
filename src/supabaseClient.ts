import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ✅ Correct: Supabase handles the apikey header internally.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
