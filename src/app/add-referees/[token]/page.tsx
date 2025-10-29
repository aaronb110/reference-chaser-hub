"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";

type CandidateRow = {
  id: string;
  full_name: string;
  consent_token: string;
  reference_type?: string;
  reference_years_required?: number;
  template_id?: string | null;
  company_id?: string | null;
  created_by?: string | null;
  config?: any;
};

type Referee = {
  name: string;
  email: string;
  type?: string;       // might come as "employment", "character", etc.
  label?: string;      // optional alternative label
  ref_type?: string;   // optional legacy key for safety
};

type RefereeWithCandidate = {
  id: string;
  name: string;
  email: string;
  status?: string;
  candidate_id: string;
  token: string;
  candidate: {
    id: string;
    full_name: string;
    consent_token?: string | null;
    reference_type?: string | null;
    reference_years_required?: number | null;
    template_id?: string | null;
    company_id?: string | null;
    created_by?: string | null;
  };
};



export default function AddRefereesPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [candidate, setCandidate] = useState<CandidateRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
const [referees, setReferees] = useState<Referee[]>([]);

  const [shake, setShake] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirming, setConfirming] = useState(false);

  

  // ── Verify token ───────────────────────────────────────
useEffect(() => {
  async function verifyToken() {
    const cleanToken = token?.toString().trim();

    // 1️⃣ Get the referee by their unique link token
    const { data: referee, error: refErr } = (await supabase
  .from("referees")
  .select(`
    id,
    name,
    email,
    status,
    candidate_id,
    token,
    candidate:candidate_id (
      id,
      full_name,
      consent_token,
      reference_type,
      reference_years_required,
      template_id,
      company_id,
      created_by
    )
  `)
  .eq("token", cleanToken)
  .maybeSingle()) as unknown as { data: RefereeWithCandidate | null; error: any };


    if (refErr) {
      console.error("❌ Supabase referee query error:", refErr);
    }

    if (!referee) {
      setError("Invalid or expired link.");
      setLoading(false);
      return;
    }

    console.log("✅ Verified referee link for:", referee.name, "→ Candidate:", referee.candidate.full_name);


    // 2️⃣ Put candidate into state, matching CandidateRow exactly
    setCandidate({
      id: referee.candidate.id,
      full_name: referee.candidate.full_name,
      consent_token: referee.candidate.consent_token ?? "",
      reference_type: referee.candidate.reference_type ?? undefined,
      reference_years_required:
        referee.candidate.reference_years_required ?? undefined,
      template_id: referee.candidate.template_id ?? null,
      company_id: referee.candidate.company_id ?? null,
      created_by: referee.candidate.created_by ?? null,
      config: undefined,
    });

    // 3️⃣ Load template data for this candidate
console.log("🎯 Referee:", referee);
console.log("📎 Candidate inside referee:", referee?.candidate);
console.log("📄 Template ID:", referee?.candidate?.template_id);


    const candidateData = (referee as any).candidate || (referee as any).candidates || null;

console.log("📎 Candidate data object:", candidateData);

const templateId = candidateData?.template_id;
if (!templateId) {
  console.error("❌ No template ID found for referee candidate");
  setError("Template not found or inactive");
  setLoading(false);
  return;
}

    if (!templateId) {
      setError("Template not found or inactive");
      setLoading(false);
      return;
    }

    const { data: template, error: tmplErr } = await supabase
      .from("reference_templates")
      .select("*")
      .eq("id", templateId)
      .maybeSingle();

    if (tmplErr) {
      console.error("❌ Template fetch error:", tmplErr);
    }

    if (!template || template.is_active === false) {
      setError("Template not found or inactive");
      setLoading(false);
      return;
    }

    // 4️⃣ Load all referees for this candidate (for UI display)
    const { data: refs, error: refsErr } = await supabase
      .from("referees")
      .select("*")
      .eq("candidate_id", referee.candidate.id)
      .eq("is_archived", false);

    if (refsErr) {
      console.error("❌ Error loading referees list:", refsErr);
    } else {
      setReferees(refs || []);
    }

    setLoading(false);
  }

  verifyToken();
}, [token]);



      

  // ── Handle Submit ───────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!candidate) return;

    const valid = referees.every(
      (r) => r.name.trim() !== "" && r.email.trim() !== ""
    );
    if (!valid) {
      toast.error("Please complete all required fields");
      return;
    }
    setShowConfirmModal(true);
  }

 // ── Confirm & Save ───────────────────────────────────────
async function confirmReferees() {
  if (!candidate) return;
  setConfirming(true);

  try {
    // 0️⃣ Re-fetch the candidate from Supabase to make sure we have the correct template_id
    const { data: freshCandidate, error: freshErr } = await supabase
      .from("candidates")
      .select("id, template_id, company_id, created_by")
      .eq("id", candidate.id)
      .maybeSingle();

    if (freshErr) {
      console.error("❌ Could not refresh candidate before insert:", freshErr);
      toast.error("Something went wrong. Please try again.");
      setConfirming(false);
      return;
    }

    if (!freshCandidate) {
      console.error("❌ No candidate found when confirming referees");
      toast.error("Something went wrong. Please try again.");
      setConfirming(false);
      return;
    }

    console.log("🧩 Fresh candidate from DB:", freshCandidate);

    const templateIdForInsert = freshCandidate.template_id || null;

    // 1️⃣ Insert referees (now uses guaranteed template_id from DB)
    const { data: insertedReferees, error: refErr } = await supabase
      .from("referees")
      .insert(
        referees.map((r) => ({
          candidate_id: candidate.id,
          name: r.name.trim(),
          email: r.email.trim().toLowerCase(),
          type: r.type,
          status: "invited",
          email_sent: false,
          company_id: freshCandidate.company_id || null,
          created_by: freshCandidate.created_by || null,
          token: uuidv4(),
          template_id: templateIdForInsert, // ✅ always filled now
        }))
      )
      .select("id, type");

    if (refErr) throw refErr;
    if (!insertedReferees || insertedReferees.length === 0) {
      console.error("❌ No referees returned from Supabase insert.");
      toast.error("Could not confirm referees — please try again.");
      setConfirming(false);
      return;
    }

    // 2️⃣ Create reference_requests rows
    const requests = insertedReferees.map((r, i) => ({
      candidate_id: candidate.id,
      referee_id: r.id,
      template_type: referees[i].type,
      status: "pending",
    }));

    const { error: reqErr } = await supabase
      .from("reference_requests")
      .insert(requests);

    if (reqErr) throw reqErr;

    // 3️⃣ Audit log (safe, doesn't block user even if it fails)
    console.log("🧠 Attempting audit log insert:", {
      action: "confirm_referees",
      target_table: "candidates",
      target_id: candidate.id,
      candidate_id: candidate.id,
      company_id: freshCandidate.company_id,
    });

    const { data: auditData, error: auditErr } = await supabase
      .from("audit_logs")
      .insert({
        action: "confirm_referees",
        target_table: "candidates",
        target_id: candidate.id,
        candidate_id: candidate.id,
        changes: {
          referees_count: insertedReferees.length,
          source: "add_referees_modal",
        },
      })
      .select();

    if (auditErr) {
      console.error("❌ Audit insert failed:", auditErr);
    } else {
      console.log("✅ Audit insert succeeded:", auditData);
    }

    toast.success("Referees confirmed! Emails will be sent shortly.");
    router.replace("/thank-you");
  } catch (err: any) {
    console.error("❌ Error confirming referees:", err);
    toast.error("Something went wrong. Please try again.");
  } finally {
    setConfirming(false);
    setShowConfirmModal(false);
  }
}


  // ── Loading / Errors ─────────────────────────────────────
  if (loading) return <div className="p-8 text-center">Loading…</div>;
  if (error && !candidate)
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50">
        <div className="bg-white shadow-lg rounded-2xl p-8 max-w-md w-full text-center border border-red-200">
          <h1 className="text-2xl font-semibold text-red-600 mb-3">
            Link Invalid or Expired
          </h1>
          <p className="text-gray-700">
            This reference request link is no longer valid or has already been used.
          </p>
          <p className="mt-4 text-sm text-gray-500">
            Please contact your recruiter to request a new link.
          </p>
        </div>
      </main>
    );

  if (!candidate) return <div className="p-8 text-center">Loading…</div>;

  // ── Main Form ─────────────────────────────────────
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-8">
      <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-md text-center">
        <h1 className="text-2xl font-semibold mb-2">
          Add referees for {candidate.full_name}
        </h1>

        {candidate.config ? (
          <>
            <p className="text-sm text-slate-600 mb-4">
              Requires{" "}
              <span className="font-medium">{candidate.config.required_refs}</span>{" "}
              referee(s) — types:{" "}
             <span className="font-medium">
  {candidate.config.ref_types
    .map((t: any) => (typeof t === "string" ? t : t.label || t.value))
    .join(", ")}
</span>

            </p>
            {candidate.reference_type === "time_based" &&
              candidate.reference_years_required && (
                <p className="text-sm text-slate-600 mb-2">
                  Must cover the last {candidate.reference_years_required} year(s)
                </p>
              )}
          </>
        ) : (
          <p className="text-sm text-slate-600 mb-4">
            Mode: <span className="font-medium">{candidate.reference_type}</span>
          </p>
        )}
      </div>

      {/* Referee Form */}
      <form onSubmit={handleSubmit} className="space-y-6 mt-6 w-full max-w-md">
        {referees.map((r, i) => (
          <div key={i} className="border border-slate-200 rounded-xl p-4 bg-slate-50">
            <h2 className="font-medium mb-3 text-slate-700">
              Referee {i + 1} –{" "}
{typeof r.type === "string"
  ? r.type.charAt(0).toUpperCase() + r.type.slice(1)
  : r.label || r.ref_type || "Reference"}


            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={r.name}
                  onChange={(e) => {
                    const updated = [...referees];
                    updated[i].name = e.target.value;
                    setReferees(updated);
                  }}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={r.email}
                  onChange={(e) => {
                    const updated = [...referees];
                    updated[i].email = e.target.value;
                    setReferees(updated);
                  }}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        ))}

        <button
          type="submit"
          className={`w-full mt-4 py-2 rounded-lg font-semibold transition text-white ${
            referees.some((r) => !r.name.trim() || !r.email.trim())
              ? "bg-gray-300 text-gray-600 cursor-not-allowed"
              : "bg-teal-600 hover:bg-teal-700"
          }`}
          disabled={referees.some((r) => !r.name.trim() || !r.email.trim())}
        >
          Review & Confirm
        </button>
      </form>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold mb-4 text-center">
              Please review your referee details
            </h2>
            <ul className="space-y-3 mb-6">
              {referees.map((r, i) => (
                <li
                  key={i}
                  className="border border-slate-200 rounded-lg p-3 bg-slate-50"
                >
                  <div className="font-medium">{r.name}</div>
                  <div className="text-sm text-slate-600">
                    {typeof r.email === "string" ? r.email.toLowerCase() : "Unknown email"} —{" "}
{typeof r.type === "string" ? r.type : r.label || r.ref_type || "Reference"}

                  </div>
                </li>
              ))}
            </ul>

            <p className="text-sm text-slate-600 mb-4 text-center">
              Confirm these details are correct. Your referees will receive an email request next.
            </p>

            <div className="flex justify-between gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="w-1/2 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-100"
              >
                Go Back
              </button>
              <button
                disabled={confirming}
                onClick={confirmReferees}
                className={`w-1/2 py-2 rounded-lg text-white font-medium ${
                  confirming
                    ? "bg-gray-400 cursor-wait"
                    : "bg-teal-600 hover:bg-teal-700"
                }`}
              >
                {confirming ? "Submitting…" : "Confirm & Continue"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
