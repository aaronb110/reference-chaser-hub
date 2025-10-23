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
  <!-- Outer container -->
  <div style="font-family:'Inter',Arial,sans-serif;background-color:#F8FAFC;padding:40px;">
<div style="max-width:600px;margin:0 auto;background:#FFFFFF;border-radius:14px;
            overflow:hidden;box-shadow:0 3px 10px rgba(0,0,0,0.07);font-family:'Inter',Arial,sans-serif;">

<!-- Header -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
  <tr>
    <td style="background-color:#0A1A2F;padding:22px 32px 18px;text-align:left;">
      <!-- Wordmark -->
      <div style="font-weight:700;font-size:20px;line-height:24px;color:#FFFFFF;letter-spacing:0.3px;">
        Refevo
      </div>
      <p style="color:#CBD5E1;font-size:14px;line-height:18px;margin:6px 0 0;">
        Reference Request
      </p>
    </td>
  </tr>
  <!-- Full-width teal bar directly under the navy header -->
  <tr>
    <td style="background-color:#00B3B0;height:4px;line-height:4px;font-size:0;padding:0;margin:0;"></td>
  </tr>
</table>




  <!-- Body -->
  <div style="padding:36px 32px;">
    <p style="font-size:16px;color:#1E293B;margin-top:0;margin-bottom:16px;">
      Hi <strong>${name}</strong>,
    </p>

 <p style="font-size:15px;color:#475569;line-height:1.8;margin:0 0 24px;">
  You’ve been asked by <strong>${companyName ? companyName : "your recruiter"}</strong> 
  to complete your reference check through <strong>Refevo</strong>. 
  Please confirm your consent and add your referee details below.
</p>


<!-- CTA Button -->
<div style="text-align:center;margin:36px 0 24px;">
  <a href="${link}"
     style="background-color:#00B3B0;color:#FFFFFF;text-decoration:none;
            padding:14px 36px;border-radius:8px;font-weight:600;font-size:15px;
            display:inline-block;box-shadow:0 3px 6px rgba(0,179,176,0.3);">
    Give consent & add referees
  </a>
</div>

<!-- Fallback link (clearly tied to consent) -->
<p style="font-size:13px;color:#64748B;text-align:center;margin:0 0 32px;line-height:20px;">
  If the button above doesn’t work, copy and paste this link into your browser:<br/>
  <a href="${link}" style="color:#00B3B0;word-break:break-all;">${link}</a>
</p>

<!-- Divider -->
<hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0;"/>

<!-- Decline consent option -->
<p style="font-size:13px;color:#64748B;text-align:center;margin:0 0 32px;line-height:20px;">
  If you don’t wish to provide consent or referees, 
  <a href="${baseUrl}/decline-consent/${consent_token}" 
     style="color:#00B3B0;text-decoration:underline;">
    click here
  </a>.
</p>


<!-- Expiry -->
<p style="font-size:13px;color:#64748B;text-align:center;margin:0 0 32px;line-height:20px;">
  This link is unique to you and will expire <strong style="color:#1E293B;">after 14 days</strong> for security.
</p>


    <hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0;" />

    <!-- GDPR -->
    <p style="font-size:12px;color:#64748B;line-height:1.6;margin:0;">
      By confirming, you authorise your referees to share employment information for verification purposes.
    </p>
  </div>

  <!-- Footer -->
  <div style="background-color:#F8FAFC;text-align:center;padding:20px;
              font-size:12px;color:#94A3B8;border-top:1px solid #E2E8F0;">
    Powered by <strong style="color:#00B3B0;">Refevo</strong>
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
