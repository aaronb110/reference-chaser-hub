"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabaseClient";
import CandidateDetails from "./components/CandidateDetails";
import { customAlphabet } from "nanoid";
import { trimAll, toTitleCaseName, normaliseEmail } from "@/utils/normalise";
import type { Candidate, Referee, Request } from "@/types/models";

type Role = "user" | "manager" | "admin";

const ukToE164 = (mobile: string) =>
  /^07\d{9}$/.test(mobile) ? "+44" + mobile.slice(1) : mobile;

const nano = customAlphabet("123456789ABCDEFGHJKLMNPQRSTUVWXYZ", 20);

// ─────────────────────────────────────────
// Candidate Card
// ─────────────────────────────────────────
function CandidateCard({
  c,
  role,
  canManage,
  expanded,
  onToggleExpand,
  onArchive,
  onUnarchive,
  onRefreshRequests,
  companyId,
  setRequests,
  highlightedRows,
}: {
  c: Candidate;
  role: Role;
  canManage: boolean;
  expanded: string | null;
  onToggleExpand: (id: string) => void;
  onArchive: (id: string, name: string) => void; // ✅ key line
  onUnarchive: (id: string, name: string) => void; // ✅ key line
  onRefreshRequests: () => Promise<void>;
  companyId: string | null;
  setRequests: React.Dispatch<React.SetStateAction<Request[]>>;
  highlightedRows: Record<string, "update" | "new">;
}) {

  const highlightClass =
    highlightedRows[c.id] === "update"
      ? "ring-2 ring-green-300 bg-green-50/40"
      : highlightedRows[c.id] === "new"
      ? "ring-2 ring-yellow-300 bg-yellow-50/40"
      : "bg-white";

  return (
    <div
  className={`rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 ${highlightClass} ${
    c.is_archived ? "opacity-75 grayscale-[40%]" : ""
  }`}
>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-6 py-4">
        {/* Left: Candidate Info */}
        <div className="flex flex-col">
          {c.is_archived && (
  <span className="ml-2 inline-block text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
    Archived
  </span>
)}

          <div className="text-slate-900 font-semibold text-sm sm:text-base">
            {c.full_name}
          </div>
          <div className="text-slate-600 text-xs sm:text-sm">{c.email}</div>
          {c.mobile && <div className="text-slate-400 text-xs">{c.mobile}</div>}
        </div>

        {/* Middle: Pills */}
        <div className="flex flex-wrap gap-2 justify-start md:justify-center">
          {/* Consent */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
              c.consent_status === "granted"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                : c.consent_status === "declined"
                ? "bg-rose-50 text-rose-700 border border-rose-100"
                : "bg-amber-50 text-amber-700 border border-amber-100"
            }`}
          >
            Consent:{" "}
            {c.consent_status
              ? c.consent_status.charAt(0).toUpperCase() +
                c.consent_status.slice(1)
              : "Unknown"}
          </span>

          {/* Email */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
              c.email_status === "delivered"
                ? "bg-blue-50 text-blue-700 border border-blue-100"
                : c.email_status === "bounced"
                ? "bg-rose-50 text-rose-700 border border-rose-100"
                : c.email_status === "sent"
                ? "bg-teal-50 text-teal-700 border border-teal-100"
                : "bg-slate-50 text-slate-700 border border-slate-100"
            }`}
          >
            Email:{" "}
            {c.email_status
              ? c.email_status.charAt(0).toUpperCase() +
                c.email_status.slice(1)
              : "Unknown"}
          </span>

          {/* References */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200">
            {c.completed_referee_count ?? 0} / {c.referee_count ?? 0} refs
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 mt-2 md:mt-0">
          {/* View Details */}
<button
  onClick={() => onToggleExpand(c.id)}
  className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 min-w-[95px] ${
    expanded === c.id
      ? "bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200"
      : "bg-[#0A1A2F] text-white hover:bg-[#122B4C]"
  }`}
>
  {expanded === c.id ? "Hide Details" : "View Details"}
</button>

{/* Archive / Unarchive */}
{canManage &&
  (!c.is_archived ? (
    <button
      onClick={() => onArchive(c.id, c.full_name)}
      className="min-w-[95px] px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg bg-rose-500 text-white hover:bg-rose-600 active:scale-[0.98] transition-all shadow-sm"
    >
      Archive
    </button>
  ) : (
    <button
      onClick={() => onUnarchive(c.id, c.full_name)}
      className="min-w-[95px] px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 active:scale-[0.98] transition-all shadow-sm"
    >
      Unarchive
    </button>
  ))}


        </div>
      </div>

      {expanded === c.id && (
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 rounded-b-2xl">
          <CandidateDetails
            candidate={c}
            role={role}
            companyId={companyId}
            onRefresh={onRefreshRequests}
          />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// Dashboard Page
// ─────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [role, setRole] = useState<Role>("user");
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [templates, setTemplates] = useState<
    { id: string; name: string; description?: string | null }[]
  >([]);

  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [viewMode, setViewMode] = useState<"mine" | "others" | "all">("mine");
  const [highlightedRows, setHighlightedRows] = useState<
    Record<string, "update" | "new">
  >({});

  const [showModal, setShowModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newCandidate, setNewCandidate] = useState({
    full_name: "",
    email: "",
    mobile: "",
    template_id: "",
  });

  const canManage = role === "manager" || role === "admin";

  

  // Load user + profile
  useEffect(() => {
    async function loadProfile() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;

      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email ?? null);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, company_id")
        .eq("id", user.id)
        .maybeSingle();

      setRole((profile?.role as Role) ?? "user");
      setCompanyId(profile?.company_id ?? null);
      setLoadingProfile(false);
    }

    loadProfile();
  }, [router]);

  // Load data
  useEffect(() => {
    if (!companyId) return;
    async function loadData() {
      const { data: cands } = await supabase
        .from("candidate_dashboard_stats")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (cands) setCandidates(cands as Candidate[]);

      const { data: tmpls } = await supabase
      .from("reference_templates")
      .select("id, name, description, category, display_label")
      .order("category", { ascending: true })
      .order("display_label", { ascending: true });

if (tmpls) setTemplates(tmpls);
    }
    loadData();
  }, [companyId]);

  // Group templates by category for dropdown
const templatesByCategory = useMemo(() => {
  const groups: Record<string, typeof templates> = {};
  templates.forEach((t: any) => {
    if (!t.category) return;
    if (!groups[t.category]) groups[t.category] = [];
    groups[t.category].push(t);
  });
  return groups;
}, [templates]);

  // ─────────────────────────────────────────
// Realtime subscription for new candidates
// ─────────────────────────────────────────
useEffect(() => {
  if (!companyId) return;

  const channel = supabase
    .channel('candidates-realtime')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'candidates', filter: `company_id=eq.${companyId}` },
      (payload) => {
        // Prepend the new candidate so it appears instantly
        setCandidates((prev) => [payload.new as Candidate, ...prev]);
      }
    )
    .subscribe();

  // Cleanup on unmount
  return () => {
    supabase.removeChannel(channel);
  };
}, [companyId]);


  const toggleExpand = (id: string) => {
    setExpanded((prev) => (prev === id ? null : id));
  };

  const handleArchive = async (id: string, name: string) => {
    if (!window.confirm(`Archive ${name}?`)) return;
    await supabase
      .from("candidates")
      .update({ is_archived: true, archived_at: new Date().toISOString() })
      .eq("id", id);
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_archived: true } : c))
    );
    toast.success(`${name} archived`);
  };

  const handleUnarchive = async (id: string, name: string) => {
    if (!window.confirm(`Restore ${name}?`)) return;
    await supabase
      .from("candidates")
      .update({ is_archived: false, archived_at: null })
      .eq("id", id);
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_archived: false } : c))
    );
    toast.success(`${name} restored`);
  };

  const onRefreshRequests = async () => {
    const { data } = await supabase.from("reference_requests").select("*");
    if (data) setRequests(data as Request[]);
  };

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCandidate.full_name || !newCandidate.email) return;

    setAdding(true);
    const consentToken = nano();

    try {
      const cleaned = trimAll({
        full_name: newCandidate.full_name,
        email: newCandidate.email,
        mobile: newCandidate.mobile,
      });

      const candidatePayload = {
        full_name: toTitleCaseName(cleaned.full_name),
        email: normaliseEmail(cleaned.email),
        mobile: cleaned.mobile ? ukToE164(cleaned.mobile) : null,
        company_id: companyId,
        created_by: userId,
        consent_token: consentToken,
        status: "awaiting_consent",
        consent_status: "pending",
        template_id: newCandidate.template_id || null,
      };

      const { data: inserted } = await supabase
        .from("candidates")
        .insert([candidatePayload])
        .select()
        .single();

      if (inserted) toast.success("Candidate added successfully");
      setShowModal(false);
      setNewCandidate({ full_name: "", email: "", mobile: "", template_id: "" });
      // 🔄 Refresh candidate list after adding
const { data: updated } = await supabase
  .from("candidate_dashboard_stats")
  .select("*")
  .eq("company_id", companyId)
  .order("created_at", { ascending: false });
if (updated) setCandidates(updated as Candidate[]);

    } catch (err) {
      console.error(err);
      toast.error("Error adding candidate");
    } finally {
      setAdding(false);
    }
  };
const [sortBy, setSortBy] = useState<
  "created_desc" | "created_asc" | "name_asc" | "name_desc"
>("created_desc");

const [currentPage, setCurrentPage] = useState(1);
const pageSize = 10; // adjust per your preference

  const filteredCandidates = useMemo(() => {
  let list = [...candidates];

  // Search
  if (search.trim()) {
    const s = search.toLowerCase();
    list = list.filter(
      (c) =>
        c.full_name.toLowerCase().includes(s) ||
        c.email.toLowerCase().includes(s)
    );
  }

  // View filters
  if (viewMode === "mine") list = list.filter((c) => c.created_by === userId);
  if (viewMode === "others") list = list.filter((c) => c.created_by !== userId);
  if (!showArchived) list = list.filter((c) => !c.is_archived);

  // Sort
  switch (sortBy) {
    case "created_asc":
      list.sort(
        (a, b) =>
          new Date(a.created_at || "").getTime() -
          new Date(b.created_at || "").getTime()
      );
      break;
    case "name_asc":
      list.sort((a, b) => a.full_name.localeCompare(b.full_name));
      break;
    case "name_desc":
      list.sort((a, b) => b.full_name.localeCompare(a.full_name));
      break;
    default:
      // created_desc
      list.sort(
        (a, b) =>
          new Date(b.created_at || "").getTime() -
          new Date(a.created_at || "").getTime()
      );
  }

  return list;
}, [candidates, search, viewMode, userId, showArchived, sortBy]);


  if (loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Loading your profile...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F6F8] text-gray-900">
      <div className="h-1 bg-[#0A1A2F]" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center py-3 px-6">
          <div className="text-sm text-slate-600 flex items-center gap-2">
            <span className="font-medium text-slate-900">{userEmail}</span>
            <span className="text-slate-400">•</span>
            <span>{new Date().toLocaleDateString("en-GB")}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 rounded-lg bg-[#00B3B0] text-white font-medium hover:bg-[#009B99]"
            >
              + Add Candidate
            </button>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/login");
              }}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 space-y-8">
{/* Toolbar – search, filters, view mode, sorting */}
<div className="flex flex-col md:flex-row md:items-center justify-between gap-3 flex-wrap">
  {/* Left group */}
  <div className="flex items-center flex-wrap gap-3">
    <input
      type="text"
      placeholder="Search candidates..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      className="border border-gray-300 rounded-lg px-3 py-2 w-60 text-sm"
    />

    {/* View Mode (Mine / Others / All) */}
<div className="flex items-center bg-white rounded-full border border-slate-300 shadow-sm overflow-hidden">
  {(["mine", "others", "all"] as const).map((m, i) => {
    const active = viewMode === m;
    const label =
      m === "mine" ? "Mine" : m === "others" ? "Others" : "All";

    return (
      <button
        key={m}
        onClick={() => setViewMode(m)}
        className={`relative px-4 py-1.5 text-sm font-medium transition-all ${
          active
            ? "bg-[#00B3B0] text-white shadow-inner"
            : "text-slate-700 hover:bg-slate-100"
        } ${i === 0 ? "rounded-l-full" : i === 2 ? "rounded-r-full" : ""}`}
      >
        {label}
      </button>
    );
  })}
</div>


    {/* Sort dropdown */}
    <select
      value={sortBy}
      onChange={(e) =>
        setSortBy(e.target.value as "created_desc" | "created_asc" | "name_asc" | "name_desc")
      }
      className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white"
    >
      <option value="created_desc">Newest first</option>
      <option value="created_asc">Oldest first</option>
      <option value="name_asc">Name A–Z</option>
      <option value="name_desc">Name Z–A</option>
    </select>
  </div>

  {/* Right group */}
{canManage && (
  <div className="flex items-center gap-2">
    <span className="text-sm text-gray-700 select-none">Show archived</span>
    <button
      onClick={() => setShowArchived(!showArchived)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${
        showArchived ? "bg-[#00B3B0]" : "bg-gray-300"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 ${
          showArchived ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  </div>
)}

</div>


        {filteredCandidates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-5xl mb-4">🧾</div>
            <h3 className="text-lg font-semibold text-gray-800">No candidates</h3>
            <p className="text-gray-500 mt-1 mb-6">
              Add your first candidate to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCandidates
  .slice((currentPage - 1) * pageSize, currentPage * pageSize)
  .map((c) => (
<CandidateCard
  key={c.id}
  c={c}
  role={role}
  canManage={canManage}
  expanded={expanded}
  onToggleExpand={toggleExpand}
  onArchive={handleArchive}        // ✅ matches your defined function
  onUnarchive={handleUnarchive}    // ✅ matches your defined function
  onRefreshRequests={onRefreshRequests}
  companyId={companyId}
  setRequests={setRequests}
  highlightedRows={highlightedRows}
/>

  ))}

{/* Pagination Controls */}
{filteredCandidates.length > pageSize && (
  <div className="flex justify-center items-center gap-3 pt-6">
    <button
      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
      disabled={currentPage === 1}
      className={`px-4 py-1.5 rounded-full border text-sm font-medium transition-all ${
        currentPage === 1
          ? "opacity-40 cursor-not-allowed bg-gray-100 text-gray-500"
          : "bg-white text-slate-700 hover:bg-slate-100 border-slate-300"
      }`}
    >
      Prev
    </button>

    <span className="text-sm text-slate-600">
      Page {currentPage} of {Math.ceil(filteredCandidates.length / pageSize)}
    </span>

    <button
      onClick={() =>
        setCurrentPage((p) =>
          Math.min(
            p + 1,
            Math.ceil(filteredCandidates.length / pageSize)
          )
        )
      }
      disabled={
        currentPage === Math.ceil(filteredCandidates.length / pageSize)
      }
      className={`px-4 py-1.5 rounded-full border text-sm font-medium transition-all ${
        currentPage === Math.ceil(filteredCandidates.length / pageSize)
          ? "opacity-40 cursor-not-allowed bg-gray-100 text-gray-500"
          : "bg-[#00B3B0] text-white hover:bg-[#009B99] border-transparent"
      }`}
    >
      Next
    </button>
  </div>
)}

          </div>
        )}
      </main>

      {/* Add Candidate Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              Add New Candidate
            </h2>

<form onSubmit={handleAddCandidate} className="space-y-5">
    <p className="text-sm font-medium text-[#00B3B0] mb-4">
    All fields are required
    </p>


  <div>
    <label className="block text-sm font-medium text-slate-700">Full name</label>
    <input
      type="text"
      value={newCandidate.full_name}
      onChange={(e) =>
        setNewCandidate({ ...newCandidate, full_name: e.target.value })
      }
      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
      placeholder="e.g. Alex Johnson"
      required
    />
  </div>

  <div>
    <label className="block text-sm font-medium text-slate-700">Email</label>
    <input
      type="email"
      value={newCandidate.email}
      onChange={(e) =>
        setNewCandidate({ ...newCandidate, email: e.target.value })
      }
      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
      placeholder="alex@example.com"
      required
    />
  </div>

  <div>
    <label className="block text-sm font-medium text-slate-700">Mobile</label>
    <input
      type="tel"
      value={newCandidate.mobile}
      onChange={(e) =>
        setNewCandidate({ ...newCandidate, mobile: e.target.value })
      }
      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
      placeholder="07..."
      required
    />
  </div>



              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Reference Type
                </label>
                <select
  value={newCandidate.template_id || ""}
  onChange={(e) =>
    setNewCandidate({ ...newCandidate, template_id: e.target.value })
  }
  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B3B0]"
>
  <option value="">Select reference type</option>

  {Object.entries(templatesByCategory).map(([category, items]) => (
    <optgroup key={category} label={category}>
      {items.map((t: any) => (
        <option key={t.id} value={t.id}>
          {t.display_label || t.name}
        </option>
      ))}
    </optgroup>
  ))}
</select>

<p className="text-xs text-slate-500 mt-1 min-h-[1rem]">
  {(() => {
    const chosen = templates.find((t) => t.id === newCandidate.template_id);
    if (!chosen) return "Select the type of reference you want to request.";
    return chosen.description || "";
  })()}
</p>

              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-100 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className={`px-4 py-2 rounded-lg shadow font-medium text-sm ${
                    adding
                      ? "bg-gray-400 cursor-not-allowed text-white"
                      : "bg-[#00B3B0] hover:bg-[#009B99] text-white"
                  }`}
                >
                  {adding ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
