import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { to, companyName, planName, startDate, endDate } = await req.json();

    await resend.emails.send({
      from: "Refevo <noreply@refevo.com>",
      to,
      subject: "Your Refevo Enterprise Plan Has Been Activated",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
          <h2 style="color:#00B3B0;">Your Refevo Enterprise Plan is now active 🎉</h2>
          <p>Hi ${companyName},</p>
          <p>We’re excited to let you know that your Enterprise plan, <strong>${planName}</strong>, has now been activated.</p>
          <ul>
            <li><strong>Start Date:</strong> ${startDate || "—"}</li>
            <li><strong>End Date:</strong> ${endDate || "—"}</li>
          </ul>
          <p>You now have full access to your Refevo dashboard and all plan benefits.</p>
          <p>If you have any questions, simply reply to this email or contact us via your dashboard.</p>
          <p>— The Refevo Team</p>
          <p style="font-size:12px;color:#777;margin-top:20px;">Powered by Refevo</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Email send error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
