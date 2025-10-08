import { NextResponse } from "next/server";
import { render } from "@react-email/render";
import InviteEmail from "@/emails/inviteEmail";

export async function GET() {
  try {
    // ✅ Generate preview HTML for browser
    const html = await render(
      InviteEmail({
        name: "Aaron Barnett",
        inviteLink: "https://app.refevo.com/beta/accept?token=demo123",
        optOutLink: "https://refevo.com/optout?email=aaron%40refevo.com",
        logoUrl: "https://refevo.com/logo-email.png", // 🔁 Replace with your real hosted logo
      })
    );

    // ✅ Return rendered HTML in browser
    return new NextResponse(html, {
      headers: { "Content-Type": "text/html" },
    });
  } catch (err) {
    console.error("Test invite render error:", err);
    return NextResponse.json(
      { error: "Failed to render invite preview" },
      { status: 500 }
    );
  }
}
