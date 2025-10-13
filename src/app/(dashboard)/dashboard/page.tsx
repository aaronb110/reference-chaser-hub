"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabaseClient";
import CandidateDetails from "./components/CandidateDetails";
import type { Candidate, Referee, Request } from "@/types/models";
import React from "react";
import { customAlphabet } from "nanoid";



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
  const [newCandidate, setNewCandidate] = useState({
    full_name: "",
    email: "",
    mobile: "",
    template_id: "",
  });
  const [sending, setSending] = useState(false);
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
              "id, full_name, email, mobile, created_at, created_by, is_archived, archived_by, archived_at"
            )
            .order("created_at", { ascending: false }),
          supabase.from("referees").select("*"),
          supabase.from("reference_requests").select("*"),
          supabase
            .from("reference_templates")
            .select("id, name, description")
            .order("name", { ascending: true }),
        ]);

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

  const consentToken = nano();
console.log("Submitting candidate:", newCandidate);

  const { error } = await supabase.from("candidates").insert([
    {
      full_name: newCandidate.full_name,
      email: newCandidate.email,
      mobile: ukToE164(newCandidate.mobile),
      created_by: userId,
      consent_token: consentToken,
      status: "awaiting_consent",
      consent_status: "pending",
      template_id: newCandidate.template_id?.length ? newCandidate.template_id : null,

    },
  ]);

  // ── Resend Invite ─────────────────────────────────────────────────────────────
const handleResendInvite = async (candidate: Candidate) => {
  if (!candidate.email || !candidate.full_name) {
    toast.error("Missing candidate info");
    return;
  }

  try {
    // use existing token or create a new one if it's missing
    const token = candidate.consent_token || nano();

    const { data, error } = await supabase.functions.invoke("send-consent-email", {
      body: {
        name: candidate.full_name,
        email: candidate.email,
        consent_token: token,          // ✅ match the DB key name
        companyName: "Appetite4Work",  // optional
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



;
  if (error) {
    toast.error("Error adding candidate");
    console.error(error);
    return;
  }

  // ✅ Send combined consent + referee email
  try {
    await supabase.functions.invoke("send-consent-email", {
      body: {
        name: newCandidate.full_name,
        email: newCandidate.email,
        consentToken,
      },
    });
    console.log("📧 Consent + referee invite email sent");
  } catch (err) {
    console.error("Failed to send consent email:", err);
    toast.error("Candidate added, but email not sent");
  }

  toast.success("Candidate added!");
  setShowModal(false);
  setNewCandidate({ full_name: "", email: "", mobile: "", template_id: "" });

  // (B) refresh the list
  const { data: refreshed } = await supabase
    .from("candidates")
    .select("*")
    .order("created_at", { ascending: false });
  if (refreshed) setCandidates(refreshed);
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
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="py-3 px-4 font-medium">Candidate</th>
                <th className="py-3 px-4 font-medium">Email</th>
                <th className="py-3 px-4 font-medium">Mobile</th>
                <th className="py-3 px-4 font-medium">Progress</th>
                <th className="py-3 px-4 font-medium">Added</th>
                <th className="py-3 px-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredCandidates.map((c) => (
                <React.Fragment key={c.id}>
                  <tr className="border-b hover:bg-gray-50">
                    <td className="p-3">{c.full_name}</td>
                    <td className="p-3">{c.email}</td>
                    <td className="p-3 text-gray-500">{c.mobile}</td>
                    <td className="p-3 text-gray-600">
                      {
                        requests.filter(
                          (r) => r.candidate_id === c.id && r.status === "completed"
                        ).length
                      }
                      /{requests.filter((r) => r.candidate_id === c.id).length} complete
                    </td>
                    <td className="p-3 text-xs text-gray-500">
                      {c.created_at
                        ? new Date(c.created_at as string).toLocaleDateString("en-GB")
                        : "-"}
                    </td>
<td className="p-3 text-right">
  <div className="flex items-center justify-end gap-3">
    {/* View / Hide */}
    <button
      onClick={() => setExpanded((prev) => (prev === c.id ? null : c.id))}
      className="text-blue-600 hover:underline"
    >
      {expanded === c.id ? "Hide" : "View"}
    </button>

    {/* Resend Invite */}
    <button
      onClick={() => handleResendInvite(c)}
      className="text-teal-600 hover:underline"
    >
      Resend Invite
    </button>

    {/* Archive / Unarchive (manager/admin only) */}
    {canManage && (
      !c.is_archived ? (
        <button
          onClick={() => handleArchiveCandidate(c.id, c.full_name)}
          className="text-red-600 hover:underline"
        >
          Archive
        </button>
      ) : (
        <button
          onClick={() => handleUnarchiveCandidate(c.id, c.full_name)}
          className="text-teal-700 hover:underline"
        >
          Unarchive
        </button>
      )
    )}
  </div>
</td>

                  </tr>

                  {/* Expanded candidate details */}
                  {expanded === c.id && (
                    <tr className="bg-gray-50 border-b">
                      <td colSpan={6} className="p-4">
                        <CandidateDetails
                          candidate={c}
                          role={role}
                          companyId={companyId}
                          referees={referees.filter((r) => r.candidate_id === c.id)}
                          requests={requests.filter((r) => r.candidate_id === c.id)}
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
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow transition"
                >
                  Save
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
