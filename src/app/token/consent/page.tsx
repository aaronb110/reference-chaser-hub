"use client";

export const dynamic = "force-dynamic";


import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import { useSearchParams } from "next/navigation";

export default function CandidateConsentPage() {
  const searchParams = useSearchParams();
const token = searchParams.get("token");
  const router = useRouter();

  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
async function loadCandidate() {
      console.log("🔌 Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log("🔑 Anon key present:", !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  console.log("🧠 Token from URL:", token);

  try {
    const { data, error } = await supabase
      .from("candidates")
      .select("*")
      .eq("consent_token", token)
      .maybeSingle();

    console.log("✅ Data:", data, "❌ Error:", error);

    if (error) {
      toast.error("Error loading candidate");
    } else if (!data) {
      toast.error("No candidate found for this token");
    } else {
      setCandidate(data);
    }
  } catch (err) {
    console.error("Unexpected error:", err);
    toast.error("Unexpected error loading candidate");
  } finally {
    setLoading(false);
  }
}


    if (token) loadCandidate();
  }, [token]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!candidate)
    return <div className="p-8 text-center text-red-600">Invalid or expired link</div>;

async function handleConsent(decision: "granted" | "declined"): Promise<void> {
  const { error } = await supabase
    .from("candidates")
    .update({
      consent_status: decision,
      status: decision === "granted" ? "active" : "archived",
      consent_at: decision === "granted" ? new Date().toISOString() : null,
    })
    .eq("id", candidate.id);

  if (error) {
    console.error("❌ Failed to update consent:", error);
    toast.error("Failed to update consent");
    return;
  }

  toast.success(
    decision === "granted"
      ? "Thank you! Consent granted."
      : "Consent declined."
  );

  if (decision === "granted") {
    router.push(`/add-referees/${candidate.consent_token}`);
  } else {
    router.push("/thank-you");
  }
}



  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white shadow-xl rounded-2xl p-8 max-w-md w-full text-center">
        <h1 className="text-xl font-semibold text-slate-900 mb-3">
          Consent Request
        </h1>
        <p className="text-slate-600 mb-6">
          Hi {candidate.full_name},<br />
          We’ve been asked to request your consent to collect references.
        </p>

        <div className="flex justify-center gap-4 mt-6">
          <button
            onClick={() => handleConsent("declined")}
            className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Decline
          </button>
          <button
            onClick={() => handleConsent("granted")}
            className="px-5 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700"
          >
            Grant Consent
          </button>
        </div>
      </div>
    </div>
  );
}
