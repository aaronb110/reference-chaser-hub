import { NextResponse } from "next/server";
import { Resend } from "resend";
import InviteEmail from "@/emails/inviteEmail";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(req: Request) {
  try {
    const { name, email, inviteLink } = await req.json();

    const optOutLink = `https://refevo.com/optout?email=${encodeURIComponent(email)}`;

    const data = await resend.emails.send({
      from: "Refevo <hello@refevo.com>",
      to: email,
      subject: "🎉 Welcome to the Refevo Beta — Activate your access",
      react: InviteEmail({ name, inviteLink, optOutLink }),
    });

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err) {
    console.error("Invite email error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
