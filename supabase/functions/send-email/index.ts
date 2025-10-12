// supabase/functions/send-email/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req) => {
  try {
    const { to, subject, html } = await req.json();

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response("Missing RESEND_API_KEY in Supabase secrets", { status: 500 });
    }

    const payload = {
      from: "Refevo <noreply@refevo.com>",
      to,
      subject: subject || "Test email from Refevo",
      html: html || "<p>This is a test email sent from your Supabase Edge Function ✅</p>",
    };

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await resp.text();
    const status = resp.status;

    return new Response(
      JSON.stringify({ ok: resp.ok, status, data }),
      { status: resp.ok ? 200 : 500, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
