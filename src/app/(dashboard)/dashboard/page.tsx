"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabaseClient";
import CandidateDetails from "./components/CandidateDetails";
import type { Candidate, Referee, Request } from "@/types/models";
import React from "react";


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
  const [settings, setSettings] = useState<{ overdue_days: number } | null>(null);

  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [newCandidate, setNewCandidate] = useState({
    full_name: "",
    email: "",
    mobile: "",
  });
  const [sending, setSending] = useState(false);
const [sortBy, setSortBy] = useState<
  "created_desc" | "created_asc" | "name_asc" | "name_desc"
>("created_desc");
const [viewMode, setViewMode] = useState<"mine" | "others" | "all">("mine");
const canManage = role === "manager" || role === "admin"; 
const [showArchived, setShowArchived] = useState(false); // managers only




    // ── Load auth + profile ─────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      console.log("🚀 Starting profile load...");
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;
        const user = session?.user ?? null;

        if (!user) {
          console.warn("⚠️ No session found — redirecting to /login");
          if (!cancelled) {
            setLoadingProfile(false);
            router.push("/login");
          }
          return;
        }

        console.log("👤 User:", user.email);
        if (!cancelled) {
          setUserId(user.id);
          setUserEmail(user.email ?? null);
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role, company_id")
          .eq("id", user.id)
          .maybeSingle();

        if (error) console.error("Profile load error:", error.message);
        else if (!profile) console.warn("⚠️ No profile found for user");
        else if (!cancelled) {
          console.log("🏢 Profile loaded:", profile);
          setRole((profile.role as Role) || "user");
          setCompanyId(profile.company_id ?? null);
        }

        // Load account settings + data
if (profile?.company_id) {
  const { data: settingsData } = await supabase
    .from("account_settings")
    .select("overdue_days")
    .eq("company_id", profile.company_id)
    .maybeSingle();
  setSettings(settingsData ?? { overdue_days: 7 });
}


        if (!cancelled) {
const [{ data: cData }, { data: rData }, { data: reqData }] =
  await Promise.all([
    supabase
      .from("candidates")
      .select("id, full_name, email, mobile, created_at, created_by, is_archived, archived_by, archived_at")
      .order("created_at", { ascending: false }),
    supabase.from("referees").select("*"),
    supabase.from("reference_requests").select("*"),
  ]);

          if (cData) setCandidates(cData);
          if (rData) setReferees(rData);
          if (reqData) setRequests(reqData);
        }
      } catch (err) {
        console.error("❌ Error loading profile:", err);
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    };

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

    const { error } = await supabase.from("candidates").insert([
      {
        full_name: newCandidate.full_name,
        email: newCandidate.email,
        mobile: ukToE164(newCandidate.mobile),
        created_by: userId,
      },
    ]);
    if (error) {
      toast.error("Error adding candidate");
      console.error(error);
    } else {
      toast.success("Candidate added!");
      setShowModal(false);
      setNewCandidate({ full_name: "", email: "", mobile: "" });
      const { data: refreshed } = await supabase
        .from("candidates")
        .select("*")
        .order("created_at", { ascending: false });
      if (refreshed) setCandidates(refreshed);
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


<div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mt-6">
  <div className="flex items-center gap-2">
    <input
      type="text"
      placeholder="Search candidates..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      className="border border-gray-300 rounded-lg px-3 py-2 w-60 text-sm"
    />

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

    {/* ✅ Manager-only: Show archived toggle */}
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
<td className="p-3 text-right flex items-center justify-end gap-3">
  {/* View / Hide button stays for all users */}
  <button
    onClick={() => setExpanded((prev) => (prev === c.id ? null : c.id))}
    className="text-blue-600 hover:underline"
  >
    {expanded === c.id ? "Hide" : "View"}
  </button>

  {/* ✅ Archive / Unarchive buttons — managers & admins only */}
  {canManage && (
    <>
      {!c.is_archived ? (
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
      )}
    </>
  )}
</td>



            </tr>

            {/* Expanded candidate details directly below each candidate */}
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

    </div>
  </div>
);
}
