// supabase/functions/handle-email-bounce/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Webhook } from "https://esm.sh/svix@1.17.0";

const SB_URL = Deno.env.get("SB_URL")!;
const SB_SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY")!;
const RESEND_WEBHOOK_SECRET = Deno.env.get("RESEND_WEBHOOK_SECRET")!;

const supabase = createClient(SB_URL, SB_SERVICE_ROLE_KEY);

// ────────────────────────────── Helper: update referee by email ──────────────────────────────
async function updateRefereeEmailStatusByEmail(
  email: string,
  status: "pending" | "sent" | "delivered" | "bounced" | "failed"
) {
  console.log("🔍 Looking for referee:", email, "→", status);

  const { data: refs, error: findErr } = await supabase
    .from("referees")
    .select("id, email, email_status, created_at")
    .ilike("email", email)
    .order("created_at", { ascending: false })
    .limit(1);

  if (findErr) {
    console.error("❌ find referee failed:", findErr);
    return;
  }

  if (!refs || refs.length === 0) {
    console.log("ℹ️ No referee found for", email);
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
    console.log(`✅ Referee ${refId} marked ${status}`);
  }
}

// ────────────────────────────── Main webhook ──────────────────────────────
serve(async (req) => {
  try {
    const payloadText = await req.text();
    const headers = Object.fromEntries(req.headers.entries());

    // ── Verify signature (skip in local/dev) ──────────────────────────────
    let event: any;
    try {
      if (Deno.env.get("ENVIRONMENT") === "local" || Deno.env.get("SKIP_VERIFY")) {
        console.warn("⚠️ Skipping Svix verification (local mode)");
        event = JSON.parse(payloadText);
      } else {
        const wh = new Webhook(RESEND_WEBHOOK_SECRET);
        event = wh.verify(payloadText, headers);
      }
    } catch (verifyErr) {
      console.error("❌ Webhook signature verification failed:", verifyErr);
      return new Response("invalid signature", { status: 401 });
    }

    // ── Extract useful fields ──────────────────────────────
    const { type } = event;
    const toField = event.data?.to;
    const email = Array.isArray(toField) ? toField[0] : toField;
    if (!email) {
      console.warn("⚠️ No recipient found in payload:", event);
      return new Response("no recipient", { status: 200 });
    }

    const subject =
      event.data?.subject ||
      event.data?.headers?.subject ||
      `[${type}] ${email}`;

    console.log("✅ Verified event:", type, "→", email);

    // ── Log event to email_logs ──────────────────────────────
    const mappedStatus = type.includes("bounced")
      ? "bounced"
      : type.includes("failed")
      ? "failed"
      : type.includes("delivered")
      ? "delivered"
      : type.includes("sent")
      ? "sent"
      : type.includes("opened")
      ? "opened"
      : "other";

    const { error: insertError } = await supabase.from("email_logs").insert({
      recipient_email: email,
      subject,
      status: mappedStatus,
      event_type: type,
      created_at: new Date().toISOString(),
    });

    if (insertError)
      console.error("❌ email_logs insert failed:", insertError);
    else console.log("🪵 Logged email event for", email, "→", mappedStatus);

    // ── Candidate updates ──────────────────────────────
    if (type === "email.sent") {
      const { error } = await supabase
        .from("candidates")
        .update({ email_status: "sent" })
        .eq("email", email);
      if (error) console.error("❌ candidate sent update failed:", error);
      else console.log("✅ Candidate marked sent:", email);
    }

    if (type === "email.delivered") {
      const { error } = await supabase
        .from("candidates")
        .update({ email_status: "delivered" })
        .eq("email", email);
      if (error) console.error("❌ candidate delivered update failed:", error);
      else console.log("✅ Candidate marked delivered:", email);
    }

    if (type === "email.bounced" || type === "email.delivery_failed") {
      const { error } = await supabase
        .from("candidates")
        .update({ email_status: "bounced" })
        .eq("email", email);
      if (error) console.error("❌ candidate bounce update failed:", error);
      else console.log("✅ Candidate marked bounced:", email);
    }

    // ── Referee updates ──────────────────────────────
    if (type === "email.sent") {
      await updateRefereeEmailStatusByEmail(email, "sent");
    }
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
    console.error("❌ Webhook error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});
