import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req) => {
  // CORS preflight
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
    // ── Env Vars ──────────────────────────────────────────────
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SITE = Deno.env.get("NEXT_PUBLIC_SITE_URL");
    if (!RESEND_API_KEY || !SITE) {
      console.error("❌ Missing environment variables");
      return new Response(JSON.stringify({ error: "Missing environment variables" }), {
        headers: { "Access-Control-Allow-Origin": "*" },
        status: 500,
      });
    }

    // ── Parse Body Safely ─────────────────────────────────────
    let body: any;
    try {
      body = await req.json();
    } catch {
      console.error("❌ Invalid or empty JSON body");
      return new Response(JSON.stringify({ error: "Invalid or empty JSON body" }), {
        headers: { "Access-Control-Allow-Origin": "*" },
        status: 400,
      });
    }

const { name, email, consent_token, companyName } = body;
if (!email || !consent_token) {
  console.error("❌ Missing required fields:", body);
  return new Response(JSON.stringify({ error: "Missing required fields" }), {
    headers: { "Access-Control-Allow-Origin": "*" },
    status: 400,
  });
}


// ── Build Email ───────────────────────────────────────────
// Dynamically choose the base URL depending on environment
const baseUrl = Deno.env.get("NEXT_PUBLIC_SITE_URL") || "http://localhost:3000";

// Construct the full link to the candidate consent flow
const link = `${baseUrl}/add-referees/${consent_token}`;


const subject = "Confirm consent & add your referees";
const html = `
  <div style="font-family: 'Inter', Arial, sans-serif; background-color: #F8FAFC; padding: 32px;">
    <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
      <div style="background-color: #0A1A2F; padding: 24px 32px;">
        <h1 style="color: #FFFFFF; font-size: 20px; margin: 0;">Refevo Reference Request</h1>
      </div>
      <div style="padding: 32px;">
        <p style="font-size: 16px; color: #1E293B; margin-top: 0;">Hi <strong>${name}</strong>,</p>
        <p style="font-size: 15px; color: #334155; line-height: 1.6;">
          ${companyName ? companyName : "Your recruiter"} is using Refevo to collect your employment references.<br/>
          Please confirm your consent and add your referee details — it only takes a minute.
        </p>
        <p style="text-align: center; margin: 32px 0;">
        <a href="${link}" 
   style="background-color:#00B3B0; color:#ffffff;
          text-decoration:none; padding:14px 28px;
          border-radius:8px; font-weight:600;
          font-size:15px; display:inline-block;">
  Give consent & add referees
</a>

<p style="font-size:13px; color:#64748B; text-align:center; margin-top:16px;">
  If the button above doesn’t work, copy and paste this link into your browser:<br/>
  <a href="${link}" style="color:#00B3B0; word-break:break-all;">${link}</a>
</p>


        <p style="font-size: 14px; color: #64748B; line-height: 1.5;">
          Once you’ve given consent, you’ll be able to securely provide your referee details in one step.
          We’ll notify your recruiter automatically when your information is received.
        </p>
        <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;">
        <p style="font-size: 13px; color: #94A3B8;">This link is unique to you and will expire after 14 days for security.</p>
      </div>
      <div style="background-color: #F8FAFC; text-align: center; padding: 20px; font-size: 12px; color: #94A3B8;">
        Powered by <strong style="color: #00B3B0;">Refevo</strong><br/>
        <span style="font-size: 11px;">Automated reference checks made simple</span>
      </div>
    </div>
  </div>
`;


    // ── Send via Resend ───────────────────────────────────────
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "no-reply@refevo.com",
        to: [email],
        subject,
        html,
      }),
    });

    const text = await res.text();
    if (!res.ok) {
      console.error("❌ Resend API error:", text);
      return new Response(JSON.stringify({ error: text }), {
        headers: { "Access-Control-Allow-Origin": "*" },
        status: res.status,
      });
    }

    console.log("✅ Email sent successfully to", email);
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Access-Control-Allow-Origin": "*" },
      status: 200,
    });
  } catch (e) {
    console.error("💥 Uncaught error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      headers: { "Access-Control-Allow-Origin": "*" },
      status: 500,
    });
  }
});
