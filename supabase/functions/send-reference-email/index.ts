import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Env Vars ──────────────────────────────────────────────
const SUPABASE_URL = Deno.env.get("SB_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SITE = Deno.env.get("NEXT_PUBLIC_SITE_URL") || "https://www.refevo.com";
const FROM_EMAIL = "no-reply@refevo.com";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ──────────────────────────────────────────────────────────
serve(async (req) => {
  // ── CORS preflight ──────────────────────────────────────
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const payload = await req.json();
    const record = payload.record ?? payload;
    const { id, full_name, email, relationship, candidate_id } = record;

    if (!email || !id) {
      console.error("❌ Missing email or ID:", record);
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        headers: { "Access-Control-Allow-Origin": "*" },
        status: 400,
      });
    }

    // ── Build HTML ─────────────────────────────────────────
    const html = `
      <div style="font-family:Inter,Arial,sans-serif;background-color:#F8FAFC;padding:32px;">
        <div style="max-width:600px;margin:0 auto;background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
          <div style="background-color:#0A1A2F;padding:24px 32px;">
            <h1 style="color:#FFFFFF;font-size:20px;margin:0;">Reference Request</h1>
          </div>
          <div style="padding:32px;">
            <p style="font-size:16px;color:#1E293B;">Hi <strong>${full_name || "there"}</strong>,</p>
            <p style="font-size:15px;color:#334155;line-height:1.6;">
              You're being asked to provide a reference for a candidate as part of their employment checks.
            </p>
            <p style="font-size:15px;color:#334155;line-height:1.6;">
              Relationship: <strong>${relationship || "N/A"}</strong><br/>
              Candidate ID: <strong>${candidate_id || "unknown"}</strong>
            </p>
            <p style="text-align:center;margin:32px 0;">
              <a href="${SITE}/ref/${id}"
                 style="background-color:#00B3B0;color:#ffffff;text-decoration:none;
                        padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px;
                        display:inline-block;">
                Complete Reference
              </a>
            </p>
            <p style="font-size:13px;color:#64748B;text-align:center;margin-top:16px;">
              If the button above doesn’t work, copy and paste this link:<br/>
              <a href="${SITE}/ref/${id}" style="color:#00B3B0;word-break:break-all;">${SITE}/ref/${id}</a>
            </p>
            <hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0;">
            <p style="font-size:13px;color:#94A3B8;">
              Powered by <strong style="color:#00B3B0;">Refevo</strong> – Automated reference checks made simple.
            </p>
          </div>
        </div>
      </div>
    `;

    // ── Send via Resend ────────────────────────────────────
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [email],
        subject: "Reference Request",
        html,
      }),
    });

    const resendText = await emailRes.text();

    // ── Handle Resend error ────────────────────────────────
    if (!emailRes.ok) {
      console.error("❌ Resend API error:", resendText);
      const { error: insertErr } = await supabase.from("referee_email_logs").insert({
        referee_id: id,
        referee_email: email,
        status: "failed",
        error_message: resendText,
      });
      if (insertErr) console.error("❌ Failed to insert failed-email log:", insertErr);
      return new Response(JSON.stringify({ error: resendText }), {
        headers: { "Access-Control-Allow-Origin": "*" },
        status: emailRes.status,
      });
    }

    // ── Update referee record ──────────────────────────────
    const { error: updateError } = await supabase
      .from("referees")
      .update({ email_status: "sent" })
      .eq("id", id);

    if (updateError) {
      console.error("❌ Failed to update referee:", updateError.message);
      await supabase.from("referee_email_logs").insert({
        referee_id: id,
        referee_email: email,
        status: "sent_but_update_failed",
        error_message: updateError.message,
      });
    } else {
      console.log(`✅ Referee ${email} marked as sent`);
      const { error: logError } = await supabase.from("referee_email_logs").insert({
        referee_id: id,
        referee_email: email,
        status: "sent",
        error_message: null,
      });
      if (logError) console.error("❌ Failed to insert sent log:", logError);
    }

    // ── Respond OK ─────────────────────────────────────────
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Access-Control-Allow-Origin": "*" },
      status: 200,
    });

  } catch (err) {
    console.error("💥 Uncaught error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      headers: { "Access-Control-Allow-Origin": "*" },
      status: 500,
    });
  }
});
