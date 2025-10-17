import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Webhook } from "https://esm.sh/svix@1.17.0";

const SB_URL = Deno.env.get("SB_URL")!;
const SB_SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY")!;
const RESEND_WEBHOOK_SECRET = Deno.env.get("RESEND_WEBHOOK_SECRET")!;

const supabase = createClient(SB_URL, SB_SERVICE_ROLE_KEY);

// ── Referee Email Updates helper ───────────────────────────────
async function updateRefereeEmailStatusByEmail(
  email: string,
  status: "delivered" | "bounced" | "failed"
) {
  console.log("🔍 Looking for referee email:", email, "to set", status);

  const { data: refs, error: findErr } = await supabase
    .from("referees")
    .select("id, email, email_status, created_at")
    .ilike("email", email)
    .in("email_status", ["pending", "sent"])
    .order("created_at", { ascending: false })
    .limit(1);

  console.log("📦 Query result:", refs, "error:", findErr);

  if (findErr) {
    console.error("❌ find referee failed:", findErr);
    return;
  }

  if (!refs || refs.length === 0) {
    console.log("ℹ️ no active referee found for", email);
    return;
  }

  const refId = refs[0].id;

  const { error: updErr } = await supabase
    .from("referees")
    .update({ email_status: status })
    .eq("id", refId);

  if (updErr) {
    console.error("❌ referee update failed:", updErr);
  } else {
    console.log(`✅ Referee marked ${status}:`, email);
  }
}


// ── Main webhook ───────────────────────────────
serve(async (req) => {
  try {
    const payload = await req.text();
    const headers = Object.fromEntries(req.headers.entries());

   let event;
try {
  const wh = new Webhook(RESEND_WEBHOOK_SECRET);
  event = wh.verify(payload, headers);
} catch {
  //console.warn("⚠️ Skipping Svix signature verification (local test mode)");
  // event = JSON.parse(payload); // ← allows manual testing
}


    const { type } = event;
    const toField = event.data?.to;
const email = Array.isArray(toField) ? toField[0] : toField;

    const subject =
      event.data?.subject ||
      event.data?.headers?.subject ||
      `[${type}] ${email}`;

    console.log("✅ Verified:", type, "for", email);

    // ── Log all events ───────────────────────────────
    const { error: insertError } = await supabase.from("email_logs").insert({
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

    if (insertError) console.error("❌ email_logs insert failed:", insertError);
    else console.log("🪵 email_logs insert succeeded for", email);

    // ── Candidate updates ───────────────────────────────
    if (type === "email.bounced" || type === "email.delivery_failed") {
      const { error: updateError } = await supabase
        .from("candidates")
        .update({ email_status: "bounced" })
        .eq("email", email);

      if (updateError)
        console.error("❌ candidate update failed:", updateError);
      else console.log("✅ Candidate bounce handled:", email);
    }

    if (type === "email.delivered") {
      const { error: deliveredError } = await supabase
        .from("candidates")
        .update({ email_status: "delivered" })
        .eq("email", email);

      if (deliveredError)
        console.error("❌ candidate delivered update failed:", deliveredError);
      else console.log("✅ Candidate marked as delivered:", email);
    }

    // ── Referee updates ───────────────────────────────
    if (type === "email.delivered") {
      await updateRefereeEmailStatusByEmail(email, "delivered");
    }
    if (type === "email.bounced") {
      await updateRefereeEmailStatusByEmail(email, "bounced");
    }
    if (type === "email.delivery_failed") {
      await updateRefereeEmailStatusByEmail(email, "failed");
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
