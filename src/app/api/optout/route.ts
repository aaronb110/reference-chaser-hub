import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const email = url.searchParams.get("email");
    const token = url.searchParams.get("token");

    // Check required params
    if (!email || !token) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // Verify token (simple example)
    const expected = process.env.OPT_OUT_SECRET;
    if (token !== expected) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Connect to Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1️⃣ Mark as opted out
    await supabase
      .from("early_access_emails")
      .update({ opted_out: true, opted_out_at: new Date().toISOString() })
      .eq("email", email);

    // 2️⃣ Log it
    await supabase.from("opt_out_log").insert([
      {
        email,
        reason: "User clicked unsubscribe link",
      },
    ]);

    // 3️⃣ Redirect to confirmation page
    const siteUrl = process.env.SITE_URL || "http://localhost:3000";
    return NextResponse.redirect(`${siteUrl}/optout/confirmed`);

  } catch (err) {
    console.error("Opt-out error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
