import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";




// ── Env Vars ──────────────────────────────────────────────
const SUPABASE_URL = Deno.env.get("SB_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SITE = Deno.env.get("NEXT_PUBLIC_SITE_URL") || "https://www.refevo.com";
const FROM_EMAIL = "no-reply@refevo.com";

// ── Inline Limited Reference Templates ─────────────────────
const limitedReferenceRecruiterHTML = (record: any) => `
  <div style="font-family:'Inter',Arial,sans-serif;background-color:#F8FAFC;padding:40px;">
    <div style="max-width:600px;margin:0 auto;background:#FFFFFF;border-radius:14px;
                overflow:hidden;box-shadow:0 3px 10px rgba(0,0,0,0.07);">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="background-color:#0A1A2F;padding:22px 32px;">
            <div style="font-weight:700;font-size:20px;color:#FFFFFF;">Refevo</div>
            <p style="color:#CBD5E1;font-size:14px;margin:6px 0 0;">Reference Update</p>
          </td>
        </tr>
        <tr><td style="background-color:#00B3B0;height:4px;"></td></tr>
      </table>

      <div style="padding:36px 32px;">
        <p style="font-size:16px;color:#1E293B;margin-top:0;">Hi ${record.recruiter_name || "there"},</p>

        <p style="font-size:15px;color:#475569;line-height:1.8;">
          ${record.referee_name || "A referee"} from ${record.referee_company || "their organisation"} 
          has completed a reference for <strong>${record.candidate_name || "your candidate"}</strong>.
        </p>

        <p style="font-size:15px;color:#475569;line-height:1.8;">
          The referee has chosen to provide a <strong>basic employment confirmation</strong> — verifying the candidate’s job title and dates of employment, but without additional comments or feedback.
        </p>

        <p style="font-size:15px;color:#475569;line-height:1.8;">
          You can view the full reference record in your dashboard if you need to follow up or request an alternative referee.
        </p>

        <div style="text-align:center;margin:36px 0;">
          <a href="${SITE}/dashboard/references/${record.id}"
             style="background-color:#00B3B0;color:#FFFFFF;text-decoration:none;
                    padding:14px 36px;border-radius:8px;font-weight:600;font-size:15px;">
            View Reference
          </a>
        </div>

        <p style="font-size:14px;color:#334155;text-align:left;">Warm regards,</p>
        <p style="font-size:14px;color:#334155;text-align:left;">
          <strong>The Refevo Team</strong>
        </p>
      </div>

      <div style="background-color:#F8FAFC;text-align:center;padding:20px;
                  font-size:12px;color:#94A3B8;border-top:1px solid #E2E8F0;">
        Powered by <strong style="color:#00B3B0;">Refevo</strong>
      </div>
    </div>
  </div>
`;

const limitedReferenceCandidateHTML = (record: any) => `
  <div style="font-family:'Inter',Arial,sans-serif;background-color:#F8FAFC;padding:40px;">
    <div style="max-width:600px;margin:0 auto;background:#FFFFFF;border-radius:14px;
                overflow:hidden;box-shadow:0 3px 10px rgba(0,0,0,0.07);">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="background-color:#0A1A2F;padding:22px 32px;">
            <div style="font-weight:700;font-size:20px;color:#FFFFFF;">Refevo</div>
            <p style="color:#CBD5E1;font-size:14px;margin:6px 0 0;">Reference Update</p>
          </td>
        </tr>
        <tr><td style="background-color:#00B3B0;height:4px;"></td></tr>
      </table>

      <div style="padding:36px 32px;">
        <p style="font-size:16px;color:#1E293B;margin-top:0;">Hi ${record.candidate_name?.split(" ")[0] || "there"},</p>

        <p style="font-size:15px;color:#475569;line-height:1.8;">
          Your referee <strong>${record.referee_name || "one of your referees"}</strong> from 
          ${record.referee_company || "their organisation"} has provided a reference confirming that you were employed there.
        </p>

        <p style="font-size:15px;color:#475569;line-height:1.8;">
          This is what’s known as a <strong>“basic employment reference”</strong> — it confirms only your job title, dates of employment, and that you worked with them, but doesn’t include personal feedback or comments.
        </p>

        <p style="font-size:15px;color:#475569;line-height:1.8;">
          If your recruiter needs a more detailed reference covering your performance, reliability, or conduct, they may contact you to add another referee.
        </p>

        <div style="text-align:center;margin:36px 0;">
          <a href="${SITE}/candidate/${record.token}"
             style="background-color:#00B3B0;color:#FFFFFF;text-decoration:none;
                    padding:14px 36px;border-radius:8px;font-weight:600;font-size:15px;">
            View Status
          </a>
        </div>

        <p style="font-size:14px;color:#334155;text-align:left;">Warm regards,</p>
        <p style="font-size:14px;color:#334155;text-align:left;">
          <strong>${record.company_name || "Your recruiter"}</strong>
        </p>
      </div>

      <div style="background-color:#F8FAFC;text-align:center;padding:20px;
                  font-size:12px;color:#94A3B8;border-top:1px solid #E2E8F0;">
        Powered by <strong style="color:#00B3B0;">Refevo</strong>
      </div>
    </div>
  </div>
`;

// ── Supabase Client ────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ── Main Function ──────────────────────────────────────────
serve(async (req) => {
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

    const referenceType =
      record.reference_type ||
      record.form_type ||
      record.template_type ||
      record.type ||
      "employment";

    console.log("🧠 Reference type received:", referenceType);

    const id = record.id;
    const email =
      record.referee_email ||
      record.candidate_email ||
      record.recruiter_email ||
      record.email;

    if (!email || !id) {
      console.error("❌ Missing email or ID:", record);
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        headers: { "Access-Control-Allow-Origin": "*" },
        status: 400,
      });
    }

    // ── Limited Reference Handling ─────────────────────────────
    if (referenceType === "limited") {
      console.log("📩 Limited reference detected — sending notifications...");

      const recruiterHtml = limitedReferenceRecruiterHTML(record);
      const candidateHtml = limitedReferenceCandidateHTML(record);

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "Refevo <notifications@refevo.com>",
          to: [record.recruiter_email],
          subject: `Limited reference received for ${record.candidate_name}`,
          html: recruiterHtml,
        }),
      });

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: `${record.company_name || "Your recruiter"} via Refevo <notifications@refevo.com>`,
          to: [record.candidate_email],
          reply_to: record.recruiter_email,
          subject: "Update: your referee has confirmed your details",
          html: candidateHtml,
        }),
      });

      console.log("✅ Limited reference emails sent successfully");
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Access-Control-Allow-Origin": "*" },
        status: 200,
      });
    }

    // ── Default Reference Invite (regular referee) ────────────────
    const refereeLink = `${SITE}/referee/${record.token}`;
    const refereeName = record.full_name || record.referee_name || "there";
    const companyName = record.company_name || "your recruiter";
    const candidateName = record.candidate_name || "your candidate";
    const senderName = record.sender_name || companyName;

    const html = `
      <div style="font-family:'Inter',Arial,sans-serif;background-color:#F8FAFC;padding:40px;">
        <div style="max-width:600px;margin:0 auto;background:#FFFFFF;border-radius:14px;
                    overflow:hidden;box-shadow:0 3px 10px rgba(0,0,0,0.07);">
          <table width="100%">
            <tr>
              <td style="background-color:#0A1A2F;padding:22px 32px;text-align:left;color:#fff;">
                <div style="font-weight:700;font-size:20px;">Refevo</div>
                <p style="color:#CBD5E1;font-size:14px;">Reference Request</p>
              </td>
            </tr>
            <tr><td style="background-color:#00B3B0;height:4px;"></td></tr>
          </table>

          <div style="padding:36px 32px;">
            <p>Hi <strong>${refereeName}</strong>,</p>
            <p>
              You’ve been asked by <strong>${companyName}</strong> to provide a reference for 
              <strong>${candidateName}</strong>, who listed you as one of their referees.
            </p>
            <div style="text-align:center;margin:36px 0;">
              <a href="${refereeLink}" style="background-color:#00B3B0;color:#FFFFFF;text-decoration:none;
                        padding:14px 36px;border-radius:8px;font-weight:600;font-size:15px;">
                Provide reference
              </a>
            </div>
            <p style="font-size:13px;color:#64748B;text-align:center;">
              If the button doesn’t work, copy and paste this link:<br/>
              <a href="${refereeLink}" style="color:#00B3B0;">${refereeLink}</a>
            </p>
            <p style="font-size:14px;">Warm regards,<br/><strong>${senderName}</strong></p>
          </div>

          <div style="background-color:#F8FAFC;text-align:center;padding:20px;
                      font-size:12px;color:#94A3B8;border-top:1px solid #E2E8F0;">
            Powered by <strong style="color:#00B3B0;">Refevo</strong>
          </div>
        </div>
      </div>
    `;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [email],
        subject: `Reference request for ${candidateName}`,
        html,
      }),
    });

    console.log(`✅ Reference invite sent to ${email}`);
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
