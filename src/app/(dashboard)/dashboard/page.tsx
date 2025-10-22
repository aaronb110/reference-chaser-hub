"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabaseClient";
import CandidateDetails from "./components/CandidateDetails";
import type { Candidate, Referee, Request } from "@/types/models";
import React from "react";
import { customAlphabet } from "nanoid";
import StatusBadge from "@/components/StatusBadge";
import { trimAll, toTitleCaseName, normaliseEmail } from "@/utils/normalise";




// ── Helpers ───────────────────────────────────────────────────────────────────
const ukToE164 = (mobile: string) =>
  /^07\d{9}$/.test(mobile) ? "+44" + mobile.slice(1) : mobile;

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB");
};


type Role = "user" | "manager" | "admin";

export default function DashboardPage() {
  const router = useRouter();
  console.log("✅ DashboardPage component rendered");

  // ── State ───────────────────────────────────────────────────────────────────
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [role, setRole] = useState<Role>("user");
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [referees, setReferees] = useState<Referee[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [settings, setSettings] = useState<{ overdue_days: number; company_name?: string } | null>(null);


  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [newCandidate, setNewCandidate] = useState({
    full_name: "",
    email: "",
    mobile: "",
    template_id: "",
  });
  
const [sortBy, setSortBy] = useState<
  "created_desc" | "created_asc" | "name_asc" | "name_desc"
>("created_desc");
const [viewMode, setViewMode] = useState<"mine" | "others" | "all">("mine");
const canManage = role === "manager" || role === "admin"; 
const [showArchived, setShowArchived] = useState(false); // managers only
const nano = customAlphabet("123456789ABCDEFGHJKLMNPQRSTUVWXYZ", 20);

// Reference templates for the modal dropdown
const [templates, setTemplates] = useState<
  { id: string; name: string; description?: string | null }[]
>([]);
const [adding, setAdding] = useState(false);

// Pagination
const [currentPage, setCurrentPage] = useState(1);
const pageSize = 15; // 👈 change to 20 if preferred


// Track recently changed or new candidates for highlight animation
const [highlightedRows, setHighlightedRows] = useState<Record<string, "update" | "new">>({});








useEffect(() => {
  let cancelled = false;

  async function loadProfile() {
    console.log("🚀 Starting profile load...");
    try {
      // ── Session ──────────────────────────────────────────────────────────────
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user ?? null;

      if (!user) {
        console.warn("⚠️ No session found — redirecting to /login");
        if (!cancelled) {
          setLoadingProfile(false);
          router.push("/login");
        }
        return;
      }

      if (!cancelled) {
        setUserId(user.id);
        setUserEmail(user.email ?? null);
      }

      // ── Profile ─────────────────────────────────────────────────────────────
      
      
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("role, company_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profileErr) console.error("Profile load error:", profileErr.message);

      const companyIdLocal = profile?.company_id ?? null;

      if (!cancelled) {
        setRole((profile?.role as Role) ?? "user");
        setCompanyId(companyIdLocal);
      }

      // ── Account settings ────────────────────────────────────────────────────
      if (companyIdLocal) {
        const { data: settingsData } = await supabase
          .from("account_settings")
          .select("overdue_days, company_name")
          .eq("company_id", companyIdLocal)
          .maybeSingle();

        if (!cancelled) setSettings(settingsData ?? { overdue_days: 7 });
      }

      // ── Bulk data fetch (candidates, referees, requests, templates) ─────────
      if (!cancelled) {
        const [cands, refs, reqs, tmpls] = await Promise.all([
          
supabase
  .from("candidates")
  .select(
    "id, full_name, email, mobile, created_at, created_by, is_archived, archived_by, archived_at, email_status, status, referee_count, updated_at, consent_status, consent_at"
  )
  .order("created_at", { ascending: false }),


          supabase.from("referees").select("*"),
          supabase.from("reference_requests").select("*"),
          supabase
            .from("reference_templates")
            .select("id, name, description")
            .order("name", { ascending: true }),
        ]);

console.log("🧩 Candidates fetched:", cands.data, cands.error);


        if (cands.data) setCandidates(cands.data as Candidate[]);
        if (refs.data) setReferees(refs.data as Referee[]);
        if (reqs.data) setRequests(reqs.data as Request[]);

        if (tmpls.error) {
          console.error("Template load error:", tmpls.error.message);
        } else if (tmpls.data) {
          console.log("📄 Loaded templates:", tmpls.data);
          setTemplates(
            tmpls.data as {
              id: string;
              name: string;
              description?: string | null;
            }[]
          );
        }
      }
    } catch (err) {
      console.error("❌ Error loading profile:", err);
    } finally {
      if (!cancelled) setLoadingProfile(false);
    }
  }

  loadProfile();
  return () => {
    cancelled = true;
  };
}, [router]);

// ── Live Realtime Updates for Candidate Status ─────────────────────────────
useEffect(() => {
  if (!userId) return;

  console.log("⚡️ Subscribing to live candidate updates...");

  const channel = supabase
    .channel("realtime:candidates")
    // When a record is updated (e.g. email_status changed)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "candidates" },
      (payload) => {
        const updated = payload.new as Candidate;
        console.log("📡 Candidate updated:", updated);

        setCandidates((prev) =>
          prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
        );

        // Flash green highlight for updated row
        setHighlightedRows((prev) => ({ ...prev, [updated.id]: "update" }));
        setTimeout(() => {
          setHighlightedRows((prev) => {
            const { [updated.id]: _, ...rest } = prev;
            return rest;
          });
        }, 2000);
      }
    )
    // When a new record is inserted
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "candidates" },
      (payload) => {
        const newCandidate = payload.new as Candidate;
        console.log("🆕 New candidate added:", newCandidate);

        setCandidates((prev) => [newCandidate, ...prev]);

        // Flash yellow highlight for new row
        setHighlightedRows((prev) => ({ ...prev, [newCandidate.id]: "new" }));
        setTimeout(() => {
          setHighlightedRows((prev) => {
            const { [newCandidate.id]: _, ...rest } = prev;
            return rest;
          });
        }, 2000);
      }
    )
    .subscribe();

  return () => {
    console.log("🧹 Unsubscribing from candidate updates");
    supabase.removeChannel(channel);
  };
}, [userId]);

  

    // ── Derived counts ──────────────────────────────────────────────────────────
  const pendingCount = useMemo(
    () => requests.filter((r) => r.status === "pending").length,
    [requests]
  );
  const overdueCount = useMemo(
    () => requests.filter((r) => r.status === "overdue").length,
    [requests]
  );
  const completedCount = useMemo(
    () => requests.filter((r) => r.status === "completed").length,
    [requests]
  );

const toggleExpand = (id: string) => {
  setExpanded(prev => (prev === id ? null : id));
};


  const candidateRequests = (id: string) =>
    requests.filter((r) => r.candidate_id === id);

const handleAddCandidate = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!newCandidate.full_name || !newCandidate.email) return;

  setAdding(true); // start loading
  const consentToken = nano();

  try {
// ── 1. Prepare and normalise candidate ───────────────────────────────
const cleaned = trimAll({
  full_name: newCandidate.full_name,
  email: newCandidate.email,
  mobile: newCandidate.mobile,
});

const candidatePayload = {
  full_name: toTitleCaseName(cleaned.full_name),
  email: normaliseEmail(cleaned.email),
  mobile: cleaned.mobile ? ukToE164(cleaned.mobile) : null,
  company_id: companyId,           // ✅ NEW — link candidate to recruiter’s company
  created_by: userId,              // already existed, keep it
  consent_token: consentToken,
  status: "awaiting_consent",
  consent_status: "pending",
  template_id: newCandidate.template_id || null,
};


console.log("🧩 Normalised candidate payload:", candidatePayload);

const { data: inserted, error } = await supabase
  .from("candidates")
  .insert([candidatePayload])
  .select()
  .single();


    if (error) {
      console.error("❌ DB insert error:", error);
      toast.error("Error adding candidate");
      return;
    }

    console.log("✅ Inserted candidate:", inserted);

    // ── 2. Send consent email ─────────────────────────────
    const { data: emailResponse, error: emailError } =
      await supabase.functions.invoke("send-consent-email", {
        body: {
          name: inserted.full_name,
          email: inserted.email,
          consent_token: inserted.consent_token,
          companyName: settings?.company_name || "Refevo",
        },
      });

    if (emailError) {
      console.error("Failed to send consent email:", emailError);
      toast.error("Candidate added, but email not sent");
    } else {
      console.log("📧 Consent email sent successfully:", emailResponse);
      toast.success("Candidate added successfully");

      // 🟩 Update candidate email status to 'sent'
const { error: updateError } = await supabase
  .from("candidates")
  .update({ email_status: "sent" })
  .eq("id", inserted.id);

if (updateError) {
  console.error("❌ Failed to set email_status to sent:", updateError);
} else {
  console.log("📬 Email status set to 'sent' for:", inserted.id);
}

      await supabase
        .from("candidates")
        .update({ email_status: "sent" })
        .eq("id", inserted.id);
    }

    // ── 3. Refresh list ───────────────────────────────
    const { data: refreshed, error: refreshError } = await supabase
      .from("candidates")
      .select("*")
      .order("created_at", { ascending: false });

    if (refreshError) {
      console.error("❌ Error refreshing candidates:", refreshError);
    } else if (refreshed) {
      setCandidates(refreshed);
    }

    // ── 4. Reset modal form ───────────────────────────────
    setNewCandidate({
      full_name: "",
      email: "",
      mobile: "",
      template_id: "",
    });
    setShowModal(false);
  } catch (err) {
    console.error("Unexpected error in handleAddCandidate:", err);
    toast.error("Something went wrong while adding candidate");
  } finally {
    // ✅ Always reset loading state even if something fails
    setAdding(false);
  }
};

  // ── Archive Candidate ───────────────────────────────────────────────
const handleArchiveCandidate = async (candidateId: string, name: string) => {
  if (!canManage) return; // UI guard

  const confirmArchive = window.confirm(
    `Archive ${name}? They’ll be hidden from standard users.`
  );
  if (!confirmArchive) return;

  try {
    const { error } = await supabase
      .from("candidates")
      .update({
        is_archived: true,                 
        archived_at: new Date().toISOString(),
        archived_by: userId ?? null,
      })
      .eq("id", candidateId);

    if (error) throw error;

    toast.success(`${name} archived`);
    setCandidates((prev) =>
      prev.map((c) => (c.id === candidateId ? { ...c, is_archived: true, archived_at: new Date().toISOString(), archived_by: userId ?? null } : c))
    );
  } catch (err) {
    console.error("Archive error:", err);
    toast.error("Failed to archive candidate");
  }
};



  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleTestEmail = async () => {
    try {
      setSending(true);
      const { error } = await supabase.functions.invoke("send-test-email", {
        body: { to: userEmail },
      });
      if (error) throw error;
      toast.success("Test email sent!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to send test email");
    } finally {
      setSending(false);
    }
  };

const handleUnarchiveCandidate = async (candidateId: string, name: string) => {
  if (!canManage) return;

  const confirmUnarchive = window.confirm(`Restore ${name}?`);
  if (!confirmUnarchive) return;

  try {
    const { error } = await supabase
      .from("candidates")
      .update({
        is_archived: false,
        archived_at: null,
        archived_by: null,
      })
      .eq("id", candidateId);

    if (error) throw error;

    toast.success(`${name} restored`);
    setCandidates((prev) =>
      prev.map((c) => (c.id === candidateId ? { ...c, is_archived: false, archived_at: null, archived_by: null } : c))
    );
  } catch (err) {
    console.error("Unarchive error:", err);
    toast.error("Failed to restore candidate");
  }
};

// ── Resend Consent + Referee Invite ───────────────────────────────────────────
const handleResendInvite = async (candidate: Candidate) => {
  if (!candidate.email || !candidate.full_name) {
    toast.error("Missing candidate info");
    return;
  }

  try {
    // ✅ Define token before use
    const token = candidate.consent_token || nano(); // nano() creates a new one if missing

    const { data, error } = await supabase.functions.invoke("send-consent-email", {
      body: {
        name: candidate.full_name,
        email: candidate.email,
        consent_token: token,  // ✅ matches backend key
        companyName: settings?.company_name || null,

      },
    });

    if (error) throw error;

    toast.success("Consent email re-sent");
    console.log("📧 Resent invite:", data);
  } catch (err) {
    console.error("Resend failed:", err);
    toast.error("Failed to resend invite");
  }
};


// ── Derived Data ─────────────────────────────────────────────────────────────
const filteredCandidates = useMemo(() => {
  let result = [...candidates];

  // search
  if (search.trim()) {
    const s = search.toLowerCase();
    result = result.filter(
      (c) =>
        c.full_name.toLowerCase().includes(s) ||
        c.email.toLowerCase().includes(s)
    );
  }

  // view filter
  if (viewMode === "mine") {
    result = result.filter((c) => c.created_by === userId);
  } else if (viewMode === "others") {
    result = result.filter((c) => c.created_by !== userId);
  }

  // hide archived by default
  if (!showArchived) {
    result = result.filter((c) => !c.is_archived);
  }

  // sort
  switch (sortBy) {
    case "name_asc":
      result.sort((a, b) => a.full_name.localeCompare(b.full_name));
      break;
    case "name_desc":
      result.sort((a, b) => b.full_name.localeCompare(a.full_name));
      break;
    case "created_asc":
      result.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateA - dateB;
      });
      break;
    default: // created_desc
      result.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });
  }

  // ✅ Return only data – no JSX here
  return result;
}, [candidates, search, sortBy, viewMode, userId, showArchived]);



    // ── Render ─────────────────────────────────────────────────────────────────
  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-600">
        Loading your profile...
      </div>
    );
  }

// ── Render ───────────────────────────────────────────────────────────────────
return (
  <div className="min-h-screen bg-gray-50 p-8">
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reference Dashboard</h1>
          {userEmail && (
            <p className="text-sm text-gray-500 mt-1">
              👋 Welcome, <span className="font-medium">{userEmail}</span>
            </p>
          )}
        </div>

        <div className="flex gap-2">
          {role !== "user" && (
            <button
              onClick={handleTestEmail}
              disabled={sending}
              className={`px-4 py-2 rounded-lg font-medium shadow transition ${
                sending
                  ? "bg-gray-400 text-white cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }`}
            >
              {sending ? "Sending..." : "📧 Test Email"}
            </button>
          )}
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium shadow hover:bg-blue-700 transition"
          >
            + Add Candidate
          </button>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mt-6">
        <div className="flex items-center gap-2">
          {/* Search */}
          <input
            type="text"
            placeholder="Search candidates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 w-60 text-sm"
          />

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(
                e.target.value as
                  | "created_desc"
                  | "created_asc"
                  | "name_asc"
                  | "name_desc"
              )
            }
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="created_desc">Newest first</option>
            <option value="created_asc">Oldest first</option>
            <option value="name_asc">Name A–Z</option>
            <option value="name_desc">Name Z–A</option>
          </select>

          {/* View filter */}
          <div className="flex items-center gap-1">
            {["mine", "others", "all"].map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode as "mine" | "others" | "all")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  viewMode === mode
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          {/* Show archived toggle (manager/admin only) */}
          {canManage && (
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`ml-3 flex items-center gap-2 text-sm select-none transition ${
                showArchived ? "text-teal-600" : "text-gray-600"
              }`}
            >
              <span>Show archived</span>
              <span
                className={`relative inline-flex h-5 w-10 rounded-full transition-colors duration-300 ${
                  showArchived ? "bg-teal-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform duration-300 ${
                    showArchived ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Candidate Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden mt-6">
        {filteredCandidates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-5xl mb-4">🧾</div>
            <h3 className="text-lg font-semibold text-gray-800">No candidates</h3>
            <p className="text-gray-500 mt-1 mb-6">
              Add your first candidate to get started.
            </p>
          </div>
        ) : (
         <table className="w-full text-sm table-auto border-collapse text-left">


<thead className="bg-gray-100 text-gray-700 border-b border-gray-200">
  <tr>
    <th className="px-4 py-3 font-semibold text-sm text-left w-[22%]">Candidate</th>
    <th className="px-4 py-3 font-semibold text-sm text-left w-[25%]">Email</th>
    <th className="px-4 py-3 font-semibold text-sm text-left w-[15%]">Mobile</th>
    <th className="px-4 py-3 font-semibold text-sm text-left w-[18%]">
  Status / Referees
</th>

    <th className="px-4 py-3 font-semibold text-sm text-center w-[14%]">Added</th>
    <th className="px-4 py-3 font-semibold text-sm text-right w-[10%]">Action</th>

  </tr>
</thead>


<tbody className="[&>tr:nth-child(even)]:bg-gray-50 divide-y divide-gray-100">


 {filteredCandidates
  .slice((currentPage - 1) * pageSize, currentPage * pageSize)
  .map((c) => (

    <React.Fragment key={c.id}>
<tr
  className={`transition-colors hover:bg-blue-50/40 ${
    highlightedRows[c.id] === "update"
      ? "bg-green-50"
      : highlightedRows[c.id] === "new"
      ? "bg-yellow-50"
      : ""
  }`}
>

        <td className="px-4 py-3 align-middle text-gray-800 font-medium truncate">
          {c.full_name || "-"}
        </td>

<td className="px-4 py-3 align-middle w-[25%]">
  <div className="flex items-center justify-between gap-2">
    <span className="truncate text-gray-700">{c.email}</span>
    <div className="flex-shrink-0">
      <StatusBadge status={c.email_status || "unknown"} />
    </div>
  </div>
</td>


        <td className="px-4 py-3 align-middle text-gray-600 truncate">
          {c.mobile || "-"}
        </td>

{/* Status / Referees */}
<td className="px-4 py-3 align-middle text-gray-700 w-[18%]">
  <div className="flex flex-col">
    <span className="font-medium capitalize">
      {c.status?.replaceAll("_", " ") || "—"}
    </span>
    <span className="text-xs text-gray-500">
      {c.referee_count ?? 0} referee{(c.referee_count ?? 0) === 1 ? "" : "s"}
    </span>
  </div>
</td>


{/* Added */}
<td className="px-4 py-3 align-middle text-xs text-gray-500 whitespace-nowrap text-center w-[14%]">
  {c.created_at
    ? new Date(c.created_at as string).toLocaleDateString("en-GB")
    : "-"}
</td>



        <td className="px-4 py-3 align-middle text-right">
          <div className="flex items-center justify-end gap-3 space-x-3">
            <button
              onClick={() => setExpanded((prev) => (prev === c.id ? null : c.id))}
              className="text-blue-600 hover:underline text-sm"
            >
              {expanded === c.id ? "Hide" : "View"}
            </button>

            <button
              onClick={() => handleResendInvite(c)}
              className="text-teal-600 hover:underline text-sm"
            >
              Resend
            </button>

            {canManage &&
              (!c.is_archived ? (
                <button
                  onClick={() => handleArchiveCandidate(c.id, c.full_name)}
                  className="text-red-600 hover:underline text-sm"
                >
                  Archive
                </button>
              ) : (
                <button
                  onClick={() => handleUnarchiveCandidate(c.id, c.full_name)}
                  className="text-teal-700 hover:underline text-sm"
                >
                  Unarchive
                </button>
              ))}
          </div>
        </td>
      </tr>

      {expanded === c.id && (
        <tr className="bg-gray-50">
          <td colSpan={6} className="p-4">
            <CandidateDetails
              candidate={c}
              role={role}
              companyId={companyId}

              onRefresh={async () => {
                const { data } = await supabase
                  .from("reference_requests")
                  .select("*");
                if (data) setRequests(data);
              }}
            />
          </td>
        </tr>
      )}
    </React.Fragment>
  ))}
</tbody>

          </table>
        )}

 {/* Pagination Controls */}
{filteredCandidates.length > pageSize && (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 text-sm gap-3">
    <p className="text-gray-600">
      Showing{" "}
      <span className="font-medium">
        {(currentPage - 1) * pageSize + 1}
      </span>{" "}
      –{" "}
      <span className="font-medium">
        {Math.min(currentPage * pageSize, filteredCandidates.length)}
      </span>{" "}
      of{" "}
      <span className="font-medium">{filteredCandidates.length}</span> candidates
    </p>

    {/* Page Numbers */}
    <div className="flex items-center justify-center gap-1">
      <button
        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
        disabled={currentPage === 1}
        className={`px-3 py-1 rounded-md border text-sm font-medium transition ${
          currentPage === 1
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-white hover:bg-gray-100 text-gray-700 border-gray-300"
        }`}
      >
        ← Prev
      </button>

      {/* Page buttons */}
      {Array.from(
        { length: Math.ceil(filteredCandidates.length / pageSize) },
        (_, i) => i + 1
      ).map((page) => {
        // Show only up to 5 visible buttons around current page
        if (
          page === 1 ||
          page === Math.ceil(filteredCandidates.length / pageSize) ||
          (page >= currentPage - 2 && page <= currentPage + 2)
        ) {
          return (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1 rounded-md border text-sm font-medium transition ${
                currentPage === page
                  ? "bg-[#00B3B0] text-white border-blue-600"
                  : "bg-white text-gray-700 hover:bg-gray-100 border-gray-300"
              }`}
            >
              {page}
            </button>
          );
        } else if (
          (page === currentPage - 3 && page > 1) ||
          (page === currentPage + 3 &&
            page < Math.ceil(filteredCandidates.length / pageSize))
        ) {
          return (
            <span
              key={`ellipsis-${page}`}
              className="px-2 text-gray-400 select-none"
            >
              ...
            </span>
          );
        }
        return null;
      })}

      <button
        onClick={() =>
          setCurrentPage((p) =>
            p * pageSize < filteredCandidates.length ? p + 1 : p
          )
        }
        disabled={currentPage * pageSize >= filteredCandidates.length}
        className={`px-3 py-1 rounded-md border text-sm font-medium transition ${
          currentPage * pageSize >= filteredCandidates.length
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-white hover:bg-gray-100 text-gray-700 border-gray-300"
        }`}
      >
        Next →
      </button>
    </div>
  </div>
)}



      </div>

      {/* Add Candidate Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-fadeIn">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              Add New Candidate
            </h2>

            <form onSubmit={handleAddCandidate} className="space-y-4">
              {/* Full name */}
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Full name
                </label>
                <input
                  type="text"
                  value={newCandidate.full_name}
                  onChange={(e) =>
                    setNewCandidate({ ...newCandidate, full_name: e.target.value })
                  }
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Alex Johnson"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  value={newCandidate.email}
                  onChange={(e) =>
                    setNewCandidate({ ...newCandidate, email: e.target.value })
                  }
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="alex@example.com"
                  required
                />
              </div>

              {/* Mobile */}
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Mobile (optional)
                </label>
                <input
                  type="tel"
                  value={newCandidate.mobile}
                  onChange={(e) =>
                    setNewCandidate({ ...newCandidate, mobile: e.target.value })
                  }
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="07..."
                />
              </div>

              {/* Reference Template */}
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Reference Type
                </label>
                <select
                  value={newCandidate.template_id || ""}
                  onChange={(e) =>
                    setNewCandidate({ ...newCandidate, template_id: e.target.value })
                  }
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select reference type</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>

                {newCandidate.template_id && (
                  <p className="mt-2 text-xs text-slate-500 leading-snug">
                    {templates.find((t) => t.id === newCandidate.template_id)?.description ||
                      "Select a template to view its details."}
                  </p>
                )}
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
<button
  type="submit"
  disabled={adding}
  className={`px-4 py-2 rounded-lg shadow transition font-medium ${
    adding
      ? "bg-blue-400 cursor-not-allowed text-white"
      : "bg-blue-600 hover:bg-blue-700 text-white"
  }`}
>
  {adding ? "Sending…" : "Save"}
</button>

              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  </div>
);
}
