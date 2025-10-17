import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ✅ Use createBrowserClient instead of createClient
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

console.log("🧩 Supabase URL:", supabaseUrl);
console.log("🧩 Using anon key prefix:", supabaseAnonKey.slice(0, 10));
