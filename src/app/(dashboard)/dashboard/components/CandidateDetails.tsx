"use client";

import { useMemo, useState, useEffect } from "react";
import toast from "react-hot-toast";
import AddRefereeModal from "./AddRefereeModal";
import { supabase } from "@/lib/supabaseClient";
import type { Candidate, Referee, Request } from "@/types/models";

type Role = "user" | "manager" | "admin";

const FOURTEEN_D_MS = 14 * 24 * 60 * 60 * 1000;

export default function CandidateDetails({
  candidate,
  role,
  companyId,
  referees,
  requests,
  onRefresh,
}: {
  candidate: Candidate;
  role: Role;
  companyId: string | null;
  referees: Referee[];
  requests: Request[];
  onRefresh: () => Promise<void>;
}) {
  const [showAddRef, setShowAddRef] = useState(false);
  const [cooldown, setCooldown] = useState<number>(0);

  // countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const pending = requests.filter((r) => r.status === "pending");
  const anyOverdue = pending.some(
    (r) => new Date(r.created_at).getTime() < Date.now() - 7 * 24 * 60 * 60 * 1000
  );

  // Enforce “max 3 resends in 14 days” (unless manager/admin)
  const canResendNow = useMemo(() => {
    if (role !== "user") return true;
    // We rely on these two columns (see SQL below):
    // - resend_count_14d (int)
    // - resend_window_start (timestamptz)
    const windowStart = requests
      .map((r) => r.resend_window_start as any as string | null)
      .filter(Boolean)
      .sort()
      .at(0);

    const resendSum = requests.reduce((sum, r) => sum + (r.resend_count_14d || 0), 0);

    if (!windowStart) return true; // not started yet
    const withinWindow = Date.now() - new Date(windowStart).getTime() < FOURTEEN_D_MS;

    if (!withinWindow) return true;
    return resendSum < 3;
  }, [requests, role]);

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

    // Start a 10s cooldown visual
    setCooldown(10);

    // Example resend implementation:
    // 1) update reference_requests: increment resend_count_14d & set/refresh window start
    // 2) (trigger your email sending mechanism elsewhere: DB trigger / Edge Function / webhook)
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

    const { error } = await supabase.from("reference_requests").upsert(updates).select("id");
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Resend queued to all pending.");
    await onRefresh();
  };

  return (
    <div className="bg-white rounded-xl shadow border border-gray-100 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Candidate:</span>
          <span className="font-medium">{candidate.full_name}</span>
          {anyOverdue && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-red-100 text-red-700 ml-2">
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
            title={role === "user" ? "Max 3 resends within 14 days" : "No limit (manager/admin)"}
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
            </tr>
          </thead>
          <tbody>
            {referees.map((r) => {
              const req = requests.find((q) => q.referee_id === r.id);
              return (
                <tr key={r.id} className="border-b">
                  <td className="p-3">{r.full_name}</td>
                  <td className="p-3">{r.email}</td>
                  <td className="p-3 text-gray-600">{r.mobile || "—"}</td>
                  <td className="p-3 text-gray-600">{r.relationship || "—"}</td>
                  <td className="p-3">
                    {req?.status ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                        {req.status}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="p-3 text-gray-600">{req?.resend_count_14d ?? 0}</td>
                </tr>
              );
            })}
            {referees.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-500">
                  No referees yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAddRef && (
        <AddRefereeModal
          candidate={candidate}
          companyId={companyId}
          onClose={() => setShowAddRef(false)}
          onSaved={async () => {
            toast.success("Referee added.");
            setShowAddRef(false);
            await onRefresh();
          }}
        />
      )}
    </div>
  );
}
