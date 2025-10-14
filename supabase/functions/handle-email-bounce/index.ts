// supabase/functions/handle-email-bounce/index.ts
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─────────────────────────────────────────────────────────────
// 📦 Setup Supabase client using service role key
// ─────────────────────────────────────────────────────────────
const SB_URL = Deno.env.get("SB_URL");
const SB_SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY");
const supabase = createClient(SB_URL!, SB_SERVICE_ROLE_KEY!);

// ─────────────────────────────────────────────────────────────
// 🚀 Main Function
// ─────────────────────────────────────────────────────────────
serve(async (req) => {
  console.log("🔄 Refevo: Email bounce handler invoked");

  try {
    const body = await req.json();
    console.log("📨 Incoming webhook payload:", body);

    // ✅ Safely extract fields
    const type = body?.type ?? "unknown";
    const email = body?.data?.to?.toLowerCase?.() ?? "unknown";

    // ──────────────────────────────────────────────
    // 🧠 Determine email status for candidate update
    // ──────────────────────────────────────────────
    let emailStatus = "unknown";
    switch (type) {
      case "email.delivered":
        emailStatus = "sent";
        console.log(`✅ Email delivered to ${email}`);
        break;
      case "email.bounced":
        emailStatus = "bounced";
        console.warn(`⚠️ Email bounced for ${email}`);
        break;
      case "email.complained":
        emailStatus = "complained";
        console.warn(`🚫 Complaint received from ${email}`);
        break;
      default:
        console.log(`ℹ️ Unhandled event type: ${type}`);
    }

    // ──────────────────────────────────────────────
    // 🗃️ Try to find candidate by email
    // ──────────────────────────────────────────────
    let candidateId: string | null = null;
    let candidateName: string | null = null;

    if (email !== "unknown") {
      const { data: candidateMatch, error: findError } = await supabase
        .from("candidates")
        .select("id, full_name")
        .eq("email", email)
        .maybeSingle();

      if (findError) {
        console.error("❌ Error fetching candidate:", findError);
      } else if (candidateMatch) {
        candidateId = candidateMatch.id;
        candidateName = candidateMatch.full_name;
        console.log(`🧩 Matched candidate: ${candidateName} (${email})`);
      } else {
        console.warn(`⚠️ No candidate match for ${email}`);
      }
    }

    // ──────────────────────────────────────────────
    // 🧾 Log the webhook event (linked if possible)
    // ──────────────────────────────────────────────
    const { error: logError } = await supabase.from("email_logs").insert({
      candidate_id: candidateId,
      sent_by: null,
      sent_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      recipient_email: email,
      subject: "Webhook Event: " + type,
      template: null,
      status: type.replace("email.", ""),
      error_message: null,
      metadata: body,
    });

    if (logError) {
      console.error("❌ Error inserting into email_logs:", logError);
    } else {
      console.log(`🧾 Email log stored for ${email}`);
    }

    // ──────────────────────────────────────────────
    // 🧩 Update candidate record status if matched
    // ──────────────────────────────────────────────
    if (candidateId && emailStatus !== "unknown") {
      const { error: updateError } = await supabase
        .from("candidates")
        .update({
          email_status: emailStatus,
          last_invite_sent_at: new Date().toISOString(),
        })
        .eq("id", candidateId);

      if (updateError) {
        console.error("❌ Error updating candidate:", updateError);
      } else {
        console.log(`📝 Updated ${candidateName} (${email}) → ${emailStatus}`);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Webhook processing error (full):", error);
    return new Response(JSON.stringify({
      ok: false,
      error: {
        message: error?.message || String(error),
        stack: error?.stack || null,
      },
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
