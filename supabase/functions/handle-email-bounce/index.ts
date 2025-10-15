import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Webhook } from "https://esm.sh/svix@1.17.0";

const SB_URL = Deno.env.get("SB_URL")!;
const SB_SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY")!;
const RESEND_WEBHOOK_SECRET = Deno.env.get("RESEND_WEBHOOK_SECRET")!;

const supabase = createClient(SB_URL, SB_SERVICE_ROLE_KEY);

serve(async (req) => {
  try {
    const payload = await req.text(); // exact raw body
    const headers = Object.fromEntries(req.headers.entries());

    // Verify with Svix (Resend)
    const wh = new Webhook(RESEND_WEBHOOK_SECRET);
    const event = wh.verify(payload, headers);

    const { type } = event;
    const email = event.data?.to?.[0] || event.data?.to;
    const subject =
      event.data?.subject ||
      event.data?.headers?.subject ||
      `[${type}] ${email}`;

    console.log("✅ Verified:", type, "for", email);

    // Log ALL email events
    const { error: insertError } = await supabase
      .from("email_logs")
      .insert({
        recipient_email: email,
        subject,
        status: type.includes("bounced")
          ? "bounced"
          : type.includes("failed")
          ? "failed"
          : type.includes("delivered")
          ? "delivered"
          : type.includes("sent")
          ? "sent"
          : type.includes("opened")
          ? "opened"
          : "other",
        event_type: type,
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("❌ email_logs insert failed:", insertError);
    } else {
      console.log("🪵 email_logs insert succeeded for", email);
    }

// Update candidate status for bounce/fail
if (type === "email.bounced" || type === "email.delivery_failed") {
  const { error: updateError } = await supabase
    .from("candidates")
    .update({ email_status: "bounced" })
    .eq("email", email);

  if (updateError) {
    console.error("❌ candidate update failed:", updateError);
  } else {
    console.log("✅ Bounce handled for", email);
  }
}

// Mark candidate as delivered if applicable
if (type === "email.delivered") {
  const { error: deliveredError } = await supabase
    .from("candidates")
    .update({ email_status: "delivered" })
    .eq("email", email);

  if (deliveredError) {
    console.error("❌ candidate delivered update failed:", deliveredError);
  } else {
    console.log("✅ Candidate marked as delivered:", email);
  }
}


    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("❌ Webhook error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});
