"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import AddRefereeModal from "./AddRefereeModal";
import EditRefereeModal from "./EditRefereeModal"; // ✅ new import
import { supabase } from "@/lib/supabaseClient";
import type { Candidate, Referee, Request, RefereeWithRequest } from "@/types/models";

type Role = "user" | "manager" | "admin";
const FOURTEEN_D_MS = 14 * 24 * 60 * 60 * 1000;

export default function CandidateDetails({
  candidate,
  role,
  companyId,
  onRefresh,
}: {
  candidate: Candidate;
  role: Role;
  companyId: string | null;
  onRefresh: () => Promise<void>;
}) {
  const [referees, setReferees] = useState<RefereeWithRequest[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddRef, setShowAddRef] = useState(false);
  const [editingReferee, setEditingReferee] = useState<RefereeWithRequest | null>(null); // ✅ new
  const [cooldown, setCooldown] = useState<number>(0);

  // ────────────────────────────── Load candidate data ──────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      console.log("🎯 Candidate ID passed to CandidateDetails:", candidate.id);

      const { data: refs, error: refError } = await supabase
        .from("referees")
        .select(`
          id,
          candidate_id,
          name,
          email,
          mobile,
          relationship,
          reference_requests(status)
        `)
        .eq("candidate_id", candidate.id);

      const { data: reqs, error: reqError } = await supabase
        .from("reference_requests")
        .select("*")
        .eq("candidate_id", candidate.id);

      if (refError || reqError) throw refError || reqError;

      console.log("📋 Referees fetched:", refs);
      if (refs && refs.length > 0) {
        refs.forEach((r) =>
          console.log(`Referee: ${r.name} (${r.email}) → Status:`, r.reference_requests)
        );
      }

      setReferees(refs || []);
      setRequests(reqs || []);
    } catch (err) {
      console.error("Failed to load candidate details:", err);
      toast.error("Could not load referees for this candidate.");
    } finally {
      setLoading(false);
    }
  }, [candidate.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ────────────────────────────── Realtime sync ──────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`realtime:candidate:${candidate.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "referees" },
        (payload) => {
          const newRef = payload.new as Referee;
          if (!newRef?.candidate_id || newRef.candidate_id !== candidate.id) return;
          console.log("📡 Referee change:", payload.eventType, newRef.name);

          setReferees((prev) => {
            if (payload.eventType === "INSERT") return [newRef, ...prev];
            if (payload.eventType === "UPDATE")
              return prev.map((r) => (r.id === newRef.id ? newRef : r));
            if (payload.eventType === "DELETE")
              return prev.filter((r) => r.id !== newRef.id);
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [candidate.id]);

  // ────────────────────────────── Countdown for resend ──────────────────────────────
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  // ────────────────────────────── Derived logic ──────────────────────────────
  const pending = requests.filter((r) => r.status === "pending");
  const anyOverdue = pending.some(
    (r) => new Date(r.created_at).getTime() < Date.now() - 7 * 24 * 60 * 60 * 1000
  );

  const canResendNow = useMemo(() => {
    if (role !== "user") return true;
    const windowStart = requests
      .map((r) => r.resend_window_start as any as string | null)
      .filter(Boolean)
      .sort()
      .at(0);
    const resendSum = requests.reduce(
      (sum, r) => sum + (r.resend_count_14d || 0),
      0
    );
    if (!windowStart) return true;
    const withinWindow =
      Date.now() - new Date(windowStart).getTime() < FOURTEEN_D_MS;
    if (!withinWindow) return true;
    return resendSum < 3;
  }, [requests, role]);

  // ────────────────────────────── Resend all ──────────────────────────────
  const handleResendAll = async () => {
    if (cooldown > 0) return;
    if (pending.length === 0) {
      toast("No pending to resend.");
      return;
    }
    if (!canResendNow) {
      toast.error("Resend limit reached (3 within 14 days).");
      return;
    }

    setCooldown(10);
    const nowIso = new Date().toISOString();
    const updates = pending.map((r) => {
      const withinWindow =
        r.resend_window_start &&
        Date.now() - new Date(r.resend_window_start).getTime() < FOURTEEN_D_MS;
      return {
        id: r.id,
        resend_count_14d: withinWindow ? (r.resend_count_14d || 0) + 1 : 1,
        resend_window_start: withinWindow ? r.resend_window_start : nowIso,
      };
    });

    const { error } = await supabase
      .from("reference_requests")
      .upsert(updates)
      .select("id");
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Resend queued to all pending.");
    await onRefresh();
  };

  // ────────────────────────────── Helper: Status badge ──────────────────────────────
  const getRefStatus = (r: RefereeWithRequest) => {
    const joined = r.reference_requests?.[0]?.status;
    const status = joined || r.status || "waiting";
    return status.toLowerCase();
  };

  // ────────────────────────────── Render ──────────────────────────────
  return (
    <div className="bg-white rounded-xl shadow border border-gray-100 p-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-500">Candidate:</span>
          <span className="font-medium">{candidate.full_name}</span>

          {/* ✅ Consent Status Badge */}
          {candidate.consent_status === "granted" && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
              ✅ Consent Granted
            </span>
          )}

          {/* 🕓 Overdue Badge */}
          {anyOverdue && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">
              🕓 Overdue
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddRef(true)}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700"
          >
            + Add Referee
          </button>

          <button
            onClick={handleResendAll}
            disabled={cooldown > 0 || (!canResendNow && role === "user")}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              cooldown > 0 || (!canResendNow && role === "user")
                ? "bg-gray-200 text-gray-600 cursor-not-allowed"
                : "bg-yellow-500 text-white hover:bg-yellow-600"
            }`}
            title={
              role === "user"
                ? "Max 3 resends within 14 days"
                : "No limit (manager/admin)"
            }
          >
            {cooldown > 0 ? `Retry in ${cooldown}s` : "Resend All Pending"}
          </button>
        </div>
      </div>

      {/* Referees table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm table-auto">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="py-2 px-3 text-left font-medium">Referee</th>
              <th className="py-2 px-3 text-left font-medium">Email</th>
              <th className="py-2 px-3 text-left font-medium">Mobile</th>
              <th className="py-2 px-3 text-left font-medium">Relationship</th>
              <th className="py-2 px-3 text-left font-medium">Status</th>
              <th className="py-2 px-3 text-left font-medium">Resends</th>
              <th className="py-2 px-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-500 italic">
                  Loading referees…
                </td>
              </tr>
            ) : referees.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-500">
                  No referees yet.
                </td>
              </tr>
            ) : (
              referees.map((r) => {
                const req = requests.find((q) => q.referee_id === r.id);
                return (
                  <tr key={r.id} className="border-b">
                    <td className="p-3">{r.name}</td>
                    <td className="p-3">{r.email}</td>
                    <td className="p-3 text-gray-600">{r.mobile || "—"}</td>
                    <td className="p-3 text-gray-600">{r.relationship || "—"}</td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs
                          ${
                            {
                              waiting: "bg-yellow-100 text-yellow-800",
                              sent: "bg-green-100 text-green-800",
                              completed: "bg-blue-100 text-blue-800",
                              declined: "bg-red-100 text-red-800",
                            }[getRefStatus(r)] ?? "bg-slate-100 text-slate-700"
                          }`}
                      >
                        {getRefStatus(r).charAt(0).toUpperCase() +
                          getRefStatus(r).slice(1)}
                      </span>
                    </td>
                    <td className="p-3 text-gray-600">
                      {req?.resend_count_14d ?? 0}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setEditingReferee(r)}
                        className="text-indigo-600 hover:underline text-sm"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Referee Modal */}
      {showAddRef && (
        <AddRefereeModal
          candidate={candidate}
          companyId={companyId}
          onClose={() => setShowAddRef(false)}
          onSaved={async () => {
            toast.success("Referee added.");
            setShowAddRef(false);
            await loadData();
          }}
        />
      )}

      {/* ✅ Edit Referee Modal */}
      {editingReferee && (
        <EditRefereeModal
          referee={editingReferee}
          onClose={() => setEditingReferee(null)}
          onSaved={async () => {
            toast.success("Referee updated.");
            setEditingReferee(null);
            await loadData();
          }}
        />
      )}
    </div>
  );
}
