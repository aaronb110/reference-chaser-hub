import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SB_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = "no-reply@refevo.com";

serve(async (req) => {
  try {
    const payload = await req.json();
    // Support both trigger events and manual test calls
    const record = payload.record ?? payload;

    if (!record?.email) {
      console.error("No record or email in payload:", payload);
      return new Response("Missing data", { status: 400 });
    }

    const { id, full_name, email, relationship, candidate_id } = record;

    // Log helper
    const insertLog = async (status: string, error: string | null) => {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/reference_email_logs`, {
          method: "POST",
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            referee_id: id || null,
            referee_email: email,
            status,
            error_message: error,
          }),
        });
      } catch (e) {
        console.error("Log insert failed:", e);
      }
    };

    const html = `
      <p>Hi ${full_name || "there"},</p>
      <p>Please complete your reference for the candidate you're linked to (ID: ${candidate_id || "unknown"}).</p>
      <p><a href="https://www.refevo.com/ref/${id || "test"}">Complete Reference</a></p>
      <p>Relationship: ${relationship || "N/A"}</p>
      <p>Thank you,<br>The Refevo Team</p>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Refevo <${FROM_EMAIL}>`,
        to: [email],
        subject: "Reference request",
        html,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      await insertLog("failed", text);
      return new Response(`Failed to send: ${text}`, { status: 500 });
    }

    await insertLog("sent", null);
    return new Response("Email sent successfully", { status: 200 });
  } catch (err) {
    console.error("Function error:", err);
    return new Response("Error", { status: 500 });
  }
});
