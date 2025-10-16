"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";

type CandidateRow = {
  id: string;
  full_name: string;
  consent_token: string;
  reference_type?: string;
  reference_years_required?: number;
  reference_config_id?: string | null;
  config?: any;
};

export default function AddRefereesPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [candidate, setCandidate] = useState<CandidateRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [referees, setReferees] = useState<
    { name: string; email: string; type: string }[]
  >([]);
  const [submitting, setSubmitting] = useState(false);
  const [shake, setShake] = useState(false);

  // ── Verify token ───────────────────────────────────────
  useEffect(() => {
    async function verifyToken() {
      const cleanToken = token?.toString().trim();
      console.log("🧠 Checking consent_token:", `"${cleanToken}"`);

      // 1) Get the candidate basics
      const { data: cand, error: candErr } = await supabase
        .from("candidates")
        .select(
          "id, full_name, consent_token, reference_type, reference_years_required, reference_config_id"
        )
        .eq("consent_token", cleanToken)
        .maybeSingle();

      if (candErr) {
        console.error("❌ Supabase query error:", candErr);
      }

      console.log("✅ Candidate lookup result:", cand);

      if (!cand) {
        setError("Invalid or expired link.");
        setLoading(false);
        return;
      }

      setError(null);

      // 2) Config lookup — only if the field exists and looks valid
      let config: any = null;
      if (cand.reference_config_id && typeof cand.reference_config_id === "string") {
        const { data: cfg, error: cfgErr } = await supabase
          .from("reference_templates")
          .select("id, required_refs, ref_types, description")
          .eq("id", cand.reference_config_id.trim())
          .maybeSingle();

        if (cfgErr) {
          console.error("⚠️ Template lookup error:", cfgErr);
        } else if (!cfg) {
          console.warn("⚠️ No template found for id:", cand.reference_config_id);
        } else {
          console.log("✅ Template loaded:", cfg);
          config = cfg;
        }
      }

      // Store both in state
      const fullCandidate = { ...(cand as CandidateRow), config };
      setCandidate(fullCandidate as CandidateRow & { config?: any });

      // Initialise referees once config is known
      if (config?.ref_types?.length) {
        setReferees(config.ref_types.map((t: string) => ({ name: "", email: "", type: t })));
      }

      setLoading(false);
    }

    if (token) verifyToken();
  }, [token]);

  // ── Handle Submit ───────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!candidate) {
      toast.error("Candidate not loaded yet");
      return;
    }

    const valid = referees.every((r) => r.name.trim() !== "" && r.email.trim() !== "");
    if (!valid) {
      toast.error("Please complete all required fields");
      return;
    }

    setSubmitting(true);
    console.log("🚀 Inserting referees for candidate:", candidate.id, referees);

    try {
      // 1️⃣ Insert referees
      const { data: inserted, error: insertError } = await supabase
        .from("referees")
        .insert(
          referees.map((r) => ({
            candidate_id: candidate.id,
            type: r.type,
            name: r.name,
            email: r.email,
            status: "invited",
            email_sent: false,
          }))
        )
        .select("id");

      if (insertError) {
        console.error("❌ Supabase insert error:", insertError);
        toast.error(insertError.message);
        setSubmitting(false);
        return;
      }

      const refereeCount = inserted?.length ?? referees.length;

      // 2️⃣ Update candidate record
      const { error: updateError } = await supabase
        .from("candidates")
        .update({
          referee_count: refereeCount,
          status: "referees_submitted",
          updated_at: new Date().toISOString(),
        })
        .eq("id", candidate.id);

      if (updateError) {
        console.error("❌ Candidate update error:", updateError);
        toast.error("Saved referees, but couldn’t update candidate.");
        setSubmitting(false);
        return;
      }

      // 3️⃣ Success feedback + redirect
      toast.success("Referees submitted successfully!");
      router.push("/thank-you");
    } catch (err) {
      console.error("Insert error (outer catch):", err);
      toast.error("Something went wrong while saving referees");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading ─────────────────────────────────────────────
  if (loading) return <div className="p-8 text-center">Loading…</div>;

  // ── Invalid / Expired ──────────────────────────────────
  if (error && !candidate) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50">
        <div className="bg-white shadow-lg rounded-2xl p-8 max-w-md w-full text-center border border-red-200">
          <h1 className="text-2xl font-semibold text-red-600 mb-3">
            Link Invalid or Expired
          </h1>
          <p className="text-gray-700">
            This reference request link is no longer valid. It may have expired or been used already.
          </p>
          <p className="mt-4 text-sm text-gray-500">
            Please contact your recruiter or hiring manager to request a new reference link.
          </p>
        </div>
      </main>
    );
  }

  // ── Candidate not ready (rare) ──────────────────────────
  if (!candidate) {
    return <div className="p-8 text-center">Loading…</div>;
  }

  // ── Valid Candidate ─────────────────────────────────────
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-8">
      <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-md text-center">
        <h1 className="text-2xl font-semibold mb-2">
          Add referees for {candidate.full_name}
        </h1>

        {candidate?.config ? (
          <p className="text-sm text-slate-600 mb-4">
            Requires{" "}
            <span className="font-medium">{candidate.config.required_refs}</span> referee(s) — types:{" "}
            <span className="font-medium">
              {Array.isArray(candidate.config.ref_types)
                ? candidate.config.ref_types.join(", ")
                : ""}
            </span>
          </p>
        ) : (
          <p className="text-sm text-slate-600 mb-4">
            Mode: <span className="font-medium">{candidate?.reference_type || "standard"}</span>
            {candidate?.reference_type === "time_based" && candidate?.reference_years_required
              ? ` — cover last ${candidate.reference_years_required} year(s)`
              : null}
          </p>
        )}

        <p className="text-gray-500 mt-6">
          ✅ Token verified successfully — please complete your referee details below.
        </p>
      </div>

      {/* ── Dynamic Referee Form ───────────────────────────── */}
      {candidate?.config ? (
        <>
          <p className="text-sm font-semibold text-red-600 mb-4 text-center mt-6">
            All fields are mandatory. Please provide complete details for each referee.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6 mt-4 text-left w-full max-w-md">
            {candidate.config.ref_types.map((type: string, index: number) => (
              <div
                key={index}
                className="border border-slate-200 rounded-xl p-4 bg-slate-50"
              >
                <h2 className="font-medium mb-3 text-slate-700">
                  Referee {index + 1} – {type.charAt(0).toUpperCase() + type.slice(1)} Reference
                </h2>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={referees[index]?.name}
                      onChange={(e) => {
                        const updated = [...referees];
                        updated[index].name = e.target.value;
                        setReferees(updated);
                      }}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      placeholder="Enter referee's full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={referees[index]?.email}
                      onChange={(e) => {
                        const updated = [...referees];
                        updated[index].email = e.target.value;
                        setReferees(updated);
                      }}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      placeholder="Enter referee's email"
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              type="submit"
              disabled={
                submitting ||
                referees.some((r) => r.name.trim() === "" || r.email.trim() === "")
              }
              onClick={(e) => {
                if (
                  referees.some((r) => r.name.trim() === "" || r.email.trim() === "") &&
                  !submitting
                ) {
                  e.preventDefault();
                  setShake(true);
                  setTimeout(() => setShake(false), 400);
                }
              }}
              className={`w-full mt-4 py-2 rounded-lg font-semibold transition text-white ${
                submitting
                  ? "bg-gray-400 cursor-wait"
                  : referees.some((r) => r.name.trim() === "" || r.email.trim() === "")
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                  : "bg-teal-600 hover:bg-teal-700"
              }`}
            >
              {submitting
                ? "Submitting…"
                : referees.some((r) => r.name.trim() === "" || r.email.trim() === "")
                ? "Complete all fields to continue"
                : "Submit Referees"}
            </button>

            {referees.some((r) => r.name.trim() === "" || r.email.trim() === "") && (
              <p
                key="warning"
                className={`text-sm text-red-500 text-center mt-2 ${
                  shake ? "animate-[wiggle_0.3s_ease-in-out]" : ""
                }`}
                style={{
                  animationName: shake ? "wiggle" : "none",
                  animationDuration: "0.3s",
                  animationTimingFunction: "ease-in-out",
                }}
              >
                Please complete all required fields before submitting.
              </p>
            )}
          </form>
        </>
      ) : (
        <p className="text-slate-500 mt-6">
          This candidate has no configured reference template.
        </p>
      )}
    </main>
  );
}
