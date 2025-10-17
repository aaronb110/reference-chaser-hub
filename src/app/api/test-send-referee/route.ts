import { NextResponse } from "next/server";

export async function POST() {
  try {
    const functionUrl =
      "https://nimeatbatzdchlfwnrdx.functions.supabase.co/send-reference-email";

    const id = crypto.randomUUID();

    const body = {
      id,
      candidate_id: "5bc61b58-79a5-41fa-af1f-eabe212d334c",
      full_name: "Webhook Test Referee",
      email: "barnett.aaron@gmail.com",
      relationship: "Manager",
    };

    const res = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();

    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      response: text,
      id,
    });
  } catch (err: any) {
    console.error("💥 test-send-referee failed:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
