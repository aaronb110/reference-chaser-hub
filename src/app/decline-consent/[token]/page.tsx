"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function DeclineConsentPage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<"checking" | "done" | "error">("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function declineConsent() {
      if (!token) return;

      // Validate candidate
      const { data: cand, error: fetchErr } = await supabase
        .from("candidates")
        .select("id, full_name, consent_status")
        .eq("consent_token", token)
        .maybeSingle();

      if (fetchErr || !cand) {
        setStatus("error");
        setMessage("This link is invalid or has expired.");
        return;
      }

      // If already granted, don't overwrite
      if (cand.consent_status === "granted") {
        setStatus("done");
        setMessage("You have already granted consent — no changes made.");
        return;
      }

      // Update consent to declined
      const { error: declineErr } = await supabase
        .from("candidates")
        .update({
          consent_status: "declined",
          consent_at: new Date().toISOString(),
        })
        .eq("consent_token", token);

      if (declineErr) {
        console.error("❌ Failed to decline consent:", declineErr);
        setStatus("error");
        setMessage("Something went wrong declining your consent.");
        return;
      }

      setStatus("done");
      setMessage("Your consent has been declined successfully.");
    }

    declineConsent();
  }, [token]);

  // ── UI Rendering ──────────────────────────────
  if (status === "checking")
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600 text-lg">Processing your request…</p>
      </main>
    );

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
      <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">
        {status === "done" ? (
          <>
            <h1 className="text-2xl font-semibold text-slate-900 mb-3">
              Consent Declined
            </h1>
            <p className="text-slate-600">{message}</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-red-600 mb-3">
              Error
            </h1>
            <p className="text-slate-600">{message}</p>
          </>
        )}
        <p className="text-xs text-slate-400 mt-6">Powered by Refevo</p>
      </div>
    </main>
  );
}
