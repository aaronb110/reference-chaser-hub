import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SB_URL = Deno.env.get("SB_URL");
const SB_SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY");

const supabase = createClient(SB_URL!, SB_SERVICE_ROLE_KEY!);

serve(async (req) => {
  try {
    const { type, data } = await req.json(); // ✅ properly scoped destructuring

    if (!data?.to) {
      return new Response(
        JSON.stringify({ error: "Missing recipient email" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("📩 Received event:", type, "for", data.to);

    if (type === "email.bounced" || type === "email.delivery_failed") {
      const { error } = await supabase
        .from("candidates")
        .update({ email_status: "bounced" })
        .eq("email", data.to);

      if (error) {
        console.error("Supabase update error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ success: true, updated: 1 }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ message: "Event ignored" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("❌ Webhook processing error (catch):", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
