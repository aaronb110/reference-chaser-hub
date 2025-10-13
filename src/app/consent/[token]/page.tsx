"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";

export default function CandidateConsentPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCandidate() {
      const { data, error } = await supabase
        .from("candidates")
        .select("*")
        .eq("consent_token", token)
        .maybeSingle();

      if (error) {
        console.error(error);
        toast.error("Error loading candidate");
      } else {
        setCandidate(data);
      }
      setLoading(false);
    }

    if (token) loadCandidate();
  }, [token]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!candidate)
    return <div className="p-8 text-center text-red-600">Invalid or expired link</div>;

async function handleConsent(decision: "granted" | "declined") {
  const { error } = await supabase
    .from("candidates")
    .update({
      consent_status: decision,
      status: decision === "granted" ? "active" : "archived",
    })
    .eq("id", candidate.id);

  if (error) {
    console.error(error);
    toast.error("Failed to update consent");
  } else {
    if (decision === "granted") {
      try {
        await supabase.functions.invoke("send-referee-invite", {
          body: {
            candidateId: candidate.id,
            email: candidate.email,
            name: candidate.full_name,
          },
        });
        console.log("✅ Referee invite triggered for", candidate.email);
      } catch (err) {
        console.error("Failed to trigger referee invite", err);
      }
    }

    toast.success(
      decision === "granted"
        ? "Thank you! Consent granted."
        : "Consent declined."
    );
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
