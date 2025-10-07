import { NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/utils/sendEmail";

export async function GET() {
  try {
    console.log("🟢 API route reached – calling sendWelcomeEmail...");
    const result = await sendWelcomeEmail("barnett.aaron@gmail.com", "Aaron");
    console.log("📩 sendWelcomeEmail finished:", result);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error in /api/test-welcome route:", error);
    return NextResponse.json({ success: false, error });
  }
}
