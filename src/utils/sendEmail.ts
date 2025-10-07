import { Resend } from "resend";
import { getWelcomeEmailHtml } from "../emails/welcomeEmail";

// ✅ Make sure your .env.local has RESEND_API_KEY set
const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendWelcomeEmail(email: string, name: string) {
  try {
    console.log("🔑 RESEND_API_KEY value length:", process.env.RESEND_API_KEY?.length || "MISSING");

    const result = await resend.emails.send({
      from: "Refevo <noreply@refevo.com>", // you can update this later
      to: email,
      subject: "Welcome to Refevo 🎉",
      html: getWelcomeEmailHtml(name),
    });

    console.log("📬 Resend API result:", result);
    return result;
  } catch (error) {
    console.error("❌ Error sending welcome email:", error);
    throw error;
  }
}
