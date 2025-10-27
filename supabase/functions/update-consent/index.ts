import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.44.3";


serve(async (req) => {
  try {
    const { token } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({ error: "Missing token" }), { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SB_URL")!,
      Deno.env.get("SB_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase
      .from("candidates")
      .update({
        consent_status: "granted",
        consent_at: new Date().toISOString(),
      })
      .eq("consent_token", token)
      .select("id, consent_status");

    if (error) throw error;
    if (!data || data.length === 0)
      return new Response(JSON.stringify({ success: false, message: "No matching candidate" }), { status: 404 });

    return new Response(JSON.stringify({ success: true, data }), { status: 200 });
  } catch (e) {
    console.error("❌ Error:", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
