"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";

type RefereeDraft = {
  full_name: string;
  email: string;
  relationship?: string;
  type: "professional" | "personal" | "education" | "time_based";
  company?: string;
  job_title?: string;
  years_known?: number | string;
  context_known?: string;
  period_from?: string; // yyyy-mm
  period_to?: string;   // yyyy-mm
  gap_reason?: string;
};

type CandidateLite = {
  id: string;
  full_name: string;
  consent_token: string;
  company_name?: string | null;
};

export default function ReviewRefereesPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  // Data passed from previous page via router.push({ state })
  const [referees, setReferees] = useState<RefereeDraft[]>([]);
  const [candidate, setCandidate] = useState<CandidateLite | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
  async function loadData() {
    const stored = sessionStorage.getItem("reviewData");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setCandidate(parsed.candidate);
        setReferees(parsed.referees);
        setLoading(false);
        return;
      } catch (err) {
        console.error("Error parsing reviewData:", err);
      }
    }

    // Fallback – fetch candidate directly if no session data found
    const { data: c, error } = await supabase
      .from("candidates")
      .select("id, full_name, consent_token, company_name")
      .eq("consent_token", token)
      .maybeSingle();

    if (error || !c) {
      console.warn("No candidate found:", error);
      setCandidate(null);
      setLoading(false);
      return;
    }

    setCandidate({
      id: c.id,
      full_name: c.full_name,
      consent_token: c.consent_token,
      company_name: c.company_name ?? null,
    });

    setReferees([]); // optional: could fetch draft refs later
    setLoading(false);
  }

  loadData();
}, [token]);


  const canSubmit = useMemo(() => confirmed && referees.length > 0 && candidate, [confirmed, referees, candidate]);

  async function handleSubmit() {
    if (!canSubmit || !candidate) return;
    setSubmitting(true);

    try {
      // 1) Insert finalised referees
      //    Assumes you already allow inserts for candidate-owned row via RLS
      const finalReferees = referees.map(r => ({
        candidate_id: candidate.id,
        full_name: r.full_name.trim(),
        email: r.email.trim().toLowerCase(),
        relationship: r.relationship?.trim() || null,
        type: r.type,
        company: r.company?.trim() || null,
        job_title: r.job_title?.trim() || null,
        years_known: r.years_known ? Number(r.years_known) : null,
        context_known: r.context_known?.trim() || null,
        period_from: r.period_from || null,
        period_to: r.period_to || null,
        gap_reason: r.gap_reason?.trim() || null,
      }));

      const { data: insertedReferees, error: refErr } = await supabase
        .from("referees")
        .insert(finalReferees)
        .select("id, type, email, full_name");

      if (refErr) throw refErr;

      // 2) Create reference_requests for each referee
      //    status = 'pending' at creation, Step 2 will mark 'sent' after email succeeds
      const requestsPayload = insertedReferees!.map(r => ({
        candidate_id: candidate.id,
        referee_id: r.id,
        template_type: r.type,        // aligns to reference_templates.ref_types
        status: "pending",
      }));

      const { data: insertedRequests, error: reqErr } = await supabase
        .from("reference_requests")
        .insert(requestsPayload)
        .select("id, referee_id, template_type, status");

      if (reqErr) throw reqErr;

      // 3) Audit log
      await supabase.from("audit_logs").insert({
        actor: "candidate",
        action: "confirm_referees",
        candidate_id: candidate.id,
        metadata: {
          referees_count: finalReferees.length,
          requests_count: insertedRequests?.length ?? 0,
          source: "review_step",
        },
      });

      toast.success("Referees confirmed. We will contact them now.");
      // Hand-off to Step 2 next (email sending). For now, route to a Thank You page.
      router.replace(`/thank-you?token=${encodeURIComponent(token)}`);
    } catch (e: any) {
      console.error(e);
      toast.error("Something went wrong confirming your referees.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <main className="max-w-2xl mx-auto p-6">Loading…</main>;
  if (!candidate) return <main className="max-w-2xl mx-auto p-6">No candidate found.</main>;

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-xl font-semibold mb-2">Review your referees</h1>
      <p className="text-slate-600">Please check everything is correct before you submit.</p>

      <ul className="mt-6 space-y-3">
        {referees.map((r, i) => (
          <li key={i} className="border border-slate-200 rounded-xl p-4 bg-slate-50">
            <div className="font-medium">{toNameCase(r.full_name)}</div>
            <div className="text-sm text-slate-600">{r.email.toLowerCase()}</div>
            <div className="text-sm text-slate-600">Type: {labelForType(r.type)}</div>
            {r.relationship && <div className="text-sm text-slate-600">Relationship: {r.relationship}</div>}
            {r.company && <div className="text-sm text-slate-600">Company: {r.company}</div>}
            {r.job_title && <div className="text-sm text-slate-600">Job title: {r.job_title}</div>}
            {r.years_known && <div className="text-sm text-slate-600">Years known: {r.years_known}</div>}
            {r.context_known && <div className="text-sm text-slate-600">Context: {r.context_known}</div>}
            {r.period_from && r.period_to && (
              <div className="text-sm text-slate-600">Period: {r.period_from} to {r.period_to}</div>
            )}
            {r.gap_reason && <div className="text-sm text-slate-600">Gap reason: {r.gap_reason}</div>}
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-start gap-2">
        <input
          id="confirm"
          type="checkbox"
          className="mt-1"
          checked={confirmed}
          onChange={e => setConfirmed(e.target.checked)}
        />
        <label htmlFor="confirm" className="text-sm text-slate-700">
          I confirm these details are correct and I consent to Refevo contacting my referees for this application.
        </label>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          className="px-4 py-2 rounded-lg border border-slate-300"
          onClick={() => router.back()}
        >
          Edit referees
        </button>
        <button
          type="button"
          className="px-4 py-2 rounded-lg bg-teal-500 text-white disabled:opacity-50"
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
        >
          {submitting ? "Submitting…" : "Confirm and submit"}
        </button>
      </div>

      <p className="mt-8 text-xs text-slate-500 text-center">Powered by Refevo</p>
    </main>
  );
}

/** Normalisation helpers (professionalism and consistency) */
function normaliseReferees(list: RefereeDraft[]): RefereeDraft[] {
  return list.map(r => ({
    ...r,
    full_name: toNameCase(r.full_name || ""),
    email: (r.email || "").trim().toLowerCase(),
    relationship: r.relationship ? toSentenceCase(r.relationship) : undefined,
    company: r.company ? toTitleCase(r.company) : undefined,
    job_title: r.job_title ? toTitleCase(r.job_title) : undefined,
    context_known: r.context_known ? toSentenceCase(r.context_known) : undefined,
    gap_reason: r.gap_reason ? toSentenceCase(r.gap_reason) : undefined,
  }));
}

function toNameCase(s: string) {
  return s
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
function toTitleCase(s: string) {
  return s
    .trim()
    .split(/\s+/)
    .map(w => w.length <= 3 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
function toSentenceCase(s: string) {
  const t = s.trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1);
}
function labelForType(t: RefereeDraft["type"]) {
  switch (t) {
    case "professional": return "Professional";
    case "personal": return "Character";
    case "education": return "Education";
    case "time_based": return "Time based";
    default: return t;
  }
}
