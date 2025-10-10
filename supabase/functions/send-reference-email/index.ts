import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SB_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY")!;
const FROM_EMAIL = "no-reply@refevo.com";

serve(async (req) => {
  try {
    const { record } = await req.json();
    const { id, full_name, email, relationship, candidate_id } = record;

    const insertLog = async (status: string, error: string | null) => {
      await fetch(`${SUPABASE_URL}/rest/v1/reference_email_logs`, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          referee_id: id,
          referee_email: email,
          status,
          error_message: error,
        }),
      });
    };

    const html = `
      <p>Hi ${full_name || "there"},</p>
      <p>Please complete your reference for the candidate you're linked to (ID: ${candidate_id || "unknown"}).</p>
      <p><a href="https://www.refevo.com/ref/${id}">Complete Reference</a></p>
      <p>Relationship: ${relationship || "N/A"}</p>
      <p>Thank you,<br>The Refevo Team</p>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Refevo <${FROM_EMAIL}>`,
        to: email,
        subject: `Reference request`,
        html,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      await insertLog("failed", text);
      return new Response("Failed", { status: 500 });
    }

    await insertLog("sent", null);
    return new Response("Email sent", { status: 200 });
  } catch (err) {
    console.error("Function error:", err);
    return new Response("Error", { status: 500 });
  }
});
