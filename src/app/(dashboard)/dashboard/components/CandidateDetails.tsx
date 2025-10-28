"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import AddRefereeModal from "./AddRefereeModal";
import EditRefereeModal from "./EditRefereeModal";
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
  const [editingReferee, setEditingReferee] = useState<RefereeWithRequest | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);
  const [templateName, setTemplateName] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedRefs, setSelectedRefs] = useState<string[]>([]);


  const stableCandidate = useMemo(() => candidate, [candidate.id]);
  const candidateId = useMemo(() => candidate.id, [candidate.id]);
  const [showArchivedRefs, setShowArchivedRefs] = useState(false);


  // ────────────────────────────── Load candidate data ──────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      console.log("🎯 Candidate ID passed to CandidateDetails:", candidate.id);
      console.log("🧩 Template ID on candidate:", candidate.template_id);

  

      // ✅ Load template name (optional)
      if (candidate.template_id) {
        const { data: templateData, error: templateError } = await supabase
          .from("reference_templates")
          .select("name")
          .eq("id", candidate.template_id)
          .maybeSingle();

        if (templateError) {
          console.error("Failed to load template name:", templateError.message);
        } else if (templateData && templateData.name !== templateName) {
          setTemplateName(templateData.name);
          console.log("📄 Template name fetched:", templateData.name);
        }
      }

      // ✅ Include is_archived for new feature
  const { data: refs, error: refError } = await supabase
  .from("referees")
  .select(`
    id,
    candidate_id,
    name,
    email,
    mobile,
    relationship,
    email_status,
    status,
    is_archived,
    archived_at
  `)
  .eq("candidate_id", candidate.id)
  .is("is_archived", false);


      const { data: reqs, error: reqError } = await supabase
        .from("reference_requests")
        .select("*")
        .eq("candidate_id", candidate.id)
        .eq("is_archived", false); // ✅ skip archived for reminder safety

      if (refError || reqError) throw refError || reqError;

      setReferees(refs || []);
      setRequests(reqs || []);
    } catch (err) {
      console.error("Failed to load candidate details:", err);
      toast.error("Could not load referees for this candidate.");
    } finally {
      setLoading(false);
    }
  }, [candidate.id, candidate.template_id, templateName]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ────────────────────────────── Realtime sync ──────────────────────────────
  useEffect(() => {
    if (!candidateId) return;

    const channel = supabase
      .channel(`realtime:candidate:${candidateId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "referees",
          filter: `candidate_id=eq.${candidateId}`,
        },
        (payload) => {
          const next = payload.new as Partial<Referee>;
          const prevOld = payload.old as Partial<Referee> | undefined;

          setReferees((prev) => {
            if (payload.eventType === "INSERT") {
              if (prev.some((r) => r.id === next.id)) return prev;
              return [{ ...(next as RefereeWithRequest) }, ...prev];
            }

            if (payload.eventType === "UPDATE") {
              return prev.map((r) => (r.id === next.id ? { ...r, ...next } : r));
            }

            if (payload.eventType === "DELETE") {
              const deletedId = prevOld?.id;
              return deletedId ? prev.filter((r) => r.id !== deletedId) : prev;
            }

            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [candidateId]);

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

    // ✅ Prevent resend to archived referees
    const activePending = pending.filter(
      (r) => !referees.find((ref) => ref.id === r.referee_id)?.is_archived
    );

    if (activePending.length === 0) {
      toast("No active referees to resend.");
      return;
    }

    setCooldown(10);
    const nowIso = new Date().toISOString();
    const updates = activePending.map((r) => {
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

    toast.success("Resend queued to all active pending referees.");
    await onRefresh();
  };

  // ────────────────────────────── NEW: Archive Referee ──────────────────────────────
  const handleArchive = async (refereeId: string) => {
    const confirmArchive = window.confirm(
      "Are you sure you want to archive this referee? This will stop their reference process and disable their link."
    );
    if (!confirmArchive) return;

    const { error } = await supabase
      .from("referees")
      .update({ is_archived: true, archived_at: new Date().toISOString() })
      .eq("id", refereeId);

    if (error) {
      toast.error("Failed to archive referee.");
      console.error(error.message);
      return;
    }

    toast.success("Referee archived successfully.");
    await loadData();
    await onRefresh();
  };

  // ────────────────────────────── Helper: Status badge ──────────────────────────────
  const getRefStatus = (r: RefereeWithRequest) => {
    const status = r.status || "waiting";
    return status.toLowerCase();
  };

  // 🎛 Filter referees depending on toggle
const visibleRefs = showArchivedRefs
  ? referees
  : referees.filter((r) => !r.is_archived);

// ────────────────────────────── Render ──────────────────────────────
const allArchived = visibleRefs.length > 0 && visibleRefs.every((r) => r.is_archived);
const candidateArchived = candidate.is_archived === true;
const viewingArchivedOnly = showArchivedRefs && allArchived;

// Combined rule: disable resends if candidate or all refs archived
const disableResends = candidateArchived || allArchived || viewingArchivedOnly;

console.log("Candidate archived flag:", candidate.is_archived);

   return (
   <div className="w-full bg-gray-50/60 border-t border-gray-200 rounded-b-md px-4 pt-3 pb-4">


      {/* Header row (candidate info on left, controls on right) */}
      <div className="flex flex-wrap items-start justify-between w-full gap-3 py-3 px-4">

        {/* LEFT: Reference type + consent pills */}
<div className="flex items-center gap-2 flex-wrap min-w-0 justify-start">
  {templateName && (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 whitespace-nowrap">
      📋 {templateName}
    </span>
  )}

  {candidate.consent_status === "granted" ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 whitespace-nowrap">
      ✅ Consent Granted
    </span>
  ) : candidate.consent_status === "declined" ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 whitespace-nowrap">
      ❌ Declined Consent
    </span>
  ) : candidate.consent_status === "pending" ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700 whitespace-nowrap">
      ⏳ Awaiting Consent
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700 whitespace-nowrap">
      ❔ Unknown
    </span>
  )}
</div>


        {/* RIGHT: Toggle + Buttons */}
        <div className="flex items-center gap-3 flex-wrap justify-end flex-grow">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Show archived referees</span>
            <button
              onClick={() => setShowArchivedRefs(!showArchivedRefs)}
              className={`relative inline-flex h-5 w-10 rounded-full transition-colors duration-300 ${
                showArchivedRefs ? "bg-teal-500" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform duration-300 ${
                  showArchivedRefs ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

<button
  onClick={() => {
    if (!disableResends) setShowAddRef(true);
  }}
  disabled={disableResends}
  className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${
    disableResends
      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
      : "bg-indigo-600 text-white hover:bg-indigo-700"
  }`}
  title={
    disableResends
      ? candidateArchived
        ? "Cannot add referees — candidate archived"
        : "Cannot add referees when all referees are archived"
      : "Add a new referee"
  }
>
  + Add Referee
</button>


{/* Resend Selected */}
<button
  onClick={() => {
    if (!disableResends) setSelectMode(!selectMode);
  }}
  disabled={disableResends}
  className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${
    disableResends
      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
      : selectMode
      ? "bg-gray-300 text-gray-800 hover:bg-gray-400"
      : "bg-blue-500 text-white hover:bg-blue-600"
  }`}
>
  {disableResends
    ? "Resend Disabled"
    : selectMode
    ? "Cancel Selection"
    : "Resend Selected"}
</button>



<button
  onClick={handleResendAll}
  disabled={
    cooldown > 0 ||
    (!canResendNow && role === "user") ||
    disableResends
  }
  className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${
    cooldown > 0 ||
    (!canResendNow && role === "user") ||
    disableResends
      ? "bg-gray-200 text-gray-600 cursor-not-allowed"
      : "bg-yellow-500 text-white hover:bg-yellow-600"
  }`}
  title={
    disableResends
      ? candidateArchived
        ? "Cannot resend — candidate archived"
        : "Cannot resend to archived referees"
      : role === "user"
      ? "Max 3 resends within 14 days"
      : "No limit (manager/admin)"
  }
>
  {disableResends
    ? "Resend Disabled"
    : cooldown > 0
    ? `Retry in ${cooldown}s`
    : "Resend All Pending"}
</button>

        </div>
      </div>

      {/* Referees table */}
      <div className="mt-2 overflow-x-auto">
  <table className="w-full text-sm border-t border-gray-200">

          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="py-2 px-3 text-left font-medium">Referee</th>
              <th className="py-2 px-3 text-left font-medium">Email</th>
              <th className="py-2 px-3 text-left font-medium">Mobile</th>
              <th className="py-2 px-3 text-left font-medium">Relationship</th>
              <th className="py-2 px-3 text-left font-medium">Status</th>
              <th className="py-2 px-3 text-left font-medium">Email Status</th>
              <th className="py-2 px-3 text-left font-medium">Resends</th>
              <th className="py-2 px-3 text-right font-medium">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-gray-500 italic">
                  Loading referees…
                </td>
              </tr>
            ) : visibleRefs.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-gray-500">
                  No referees yet.
                </td>
              </tr>
            ) : (
              visibleRefs.map((r) => {
                const req = requests.find((q) => q.referee_id === r.id);

                const emailStatusColors: Record<string, string> = {
                  pending: "bg-gray-100 text-gray-700",
                  sent: "bg-indigo-100 text-indigo-700",
                  delivered: "bg-green-100 text-green-700",
                  bounced: "bg-red-100 text-red-700",
                };

                const emailStatus = r.email_status || "pending";

                const statusColors: Record<string, string> = {
                  waiting: "bg-yellow-100 text-yellow-800",
                  invited: "bg-yellow-100 text-yellow-800",
                  sent: "bg-green-100 text-green-800",
                  completed: "bg-blue-100 text-blue-800",
                  declined: "bg-red-100 text-red-800",
                  limited: "bg-orange-100 text-orange-800",
                };

                return (
                  <tr
                    key={r.id}
                    className={`border-b ${
                      r.is_archived ? "opacity-50 italic" : ""
                    }`}
                  >
                    <td className="p-3">
  {selectMode && !r.is_archived && (
    <input
      type="checkbox"
      className="mr-2"
      checked={selectedRefs.includes(r.id)}
      onChange={(e) => {
        if (e.target.checked) {
          setSelectedRefs([...selectedRefs, r.id]);
        } else {
          setSelectedRefs(selectedRefs.filter((id) => id !== r.id));
        }
      }}
    />
  )}
  {r.name}
</td>

                    <td className="p-3">{r.email}</td>
                    <td className="p-3 text-gray-600">{r.mobile || "—"}</td>
                    <td className="p-3 text-gray-600">
                      {r.relationship || "—"}
                    </td>

                    <td className="p-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs ${
                          statusColors[getRefStatus(r)] ??
                          "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {getRefStatus(r).charAt(0).toUpperCase() +
                          getRefStatus(r).slice(1)}
                      </span>
                      {r.is_archived && (
                        <span className="ml-2 text-xs text-gray-500 italic">
                          (Archived)
                        </span>
                      )}
                    </td>

                    <td className="p-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs ${
                          emailStatusColors[emailStatus] ??
                          "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {emailStatus.charAt(0).toUpperCase() +
                          emailStatus.slice(1)}
                      </span>
                    </td>

                    <td className="p-3 text-gray-600">
                      {req?.resend_count_14d ?? 0}
                    </td>

                    <td className="p-3 text-right space-x-3">
                      {!r.is_archived && (
                        <button
                          onClick={() => handleArchive(r.id)}
                          className="text-red-600 hover:underline text-sm"
                        >
                          Archive
                        </button>
                      )}

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

        {selectMode && selectedRefs.length > 0 && (
  <div className="mt-3 text-right">
    <button
      onClick={async () => {
        for (const id of selectedRefs) {
          const { error } = await supabase.rpc("send_reference_email", {
            referee_id: id,
          });
          if (error) {
            console.error("Resend failed for", id, error);
            toast.error("One or more emails failed to send");
            return;
          }
        }

        toast.success(`Resent ${selectedRefs.length} referee request(s)`);
        setSelectMode(false);
        setSelectedRefs([]);
      }}
      className="px-3 py-1.5 rounded-lg bg-yellow-500 text-white text-sm hover:bg-yellow-600"
    >
      Send to {selectedRefs.length} Selected
    </button>
  </div>
)}

      </div>

      {/* Add Referee Modal */}
      {showAddRef && (
        <AddRefereeModal
          candidate={stableCandidate}
          companyId={companyId}
          onClose={() => setShowAddRef(false)}
          onSaved={async () => {
            toast.success("Referee added.");
            setShowAddRef(false);
            await loadData();
          }}
        />
      )}

      {/* Edit Referee Modal */}
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

