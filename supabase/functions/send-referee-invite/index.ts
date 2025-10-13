import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

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
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");

    const { candidateId, email, name } = await req.json();
    console.log("📧 send-referee-invite triggered:", { candidateId, email, name });

    const subject = "Next step: Add your referee details";
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;">
        <h2 style="color:#0A1A2F;">Hi ${name},</h2>
        <p>Thanks for granting consent. Please click below to add your referee details.</p>
        <p>
          <a href="${Deno.env.get("NEXT_PUBLIC_SITE_URL")}/referees/${candidateId}"
             style="background-color:#00B3B0;color:#fff;padding:10px 16px;
                    border-radius:6px;text-decoration:none;display:inline-block;">
            Add Referee Details
          </a>
        </p>
        <p style="font-size:13px;color:#64748B;">Powered by Refevo</p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
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
    console.log("📦 Resend response:", text);

    if (!res.ok) throw new Error(text);

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Access-Control-Allow-Origin": "*" },
      status: 200,
    });
  } catch (err) {
    console.error("❌ send-referee-invite error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { "Access-Control-Allow-Origin": "*" },
      status: 500,
    });
  }
});
