"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabaseClient";
import CandidateDetails from "./components/CandidateDetails";
import type { Candidate, Referee, Request } from "@/types/models";

// ── Helpers ───────────────────────────────────────────────────────────────────
const ukToE164 = (mobile: string) =>
  /^07\d{9}$/.test(mobile) ? "+44" + mobile.slice(1) : mobile;

type Role = "user" | "manager" | "admin";

export default function DashboardPage() {
  const router = useRouter();

  // Auth / profile
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [role, setRole] = useState<Role>("user");
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Data
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [referees, setReferees] = useState<Referee[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [settings, setSettings] = useState<{ overdue_days: number } | null>(null);

  // UI
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<
    "created_desc" | "created_asc" | "name_asc" | "name_desc"
  >("created_desc");
  const [viewMode, setViewMode] = useState<"mine" | "others" | "all">("mine");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [newCandidate, setNewCandidate] = useState({
    full_name: "",
    email: "",
    mobile: "",
  });
  const [isSending, setIsSending] = useState(false);


  // ── Load auth + profile ─────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      setUserId(uid);
      setUserEmail(data.user?.email ?? null);

      if (!uid) return;

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role, company_id")
        .eq("id", uid)
        .maybeSingle();

      if (error) console.error("Profile load error:", error.message);

      if (profile) {
        setRole((profile.role as Role) || "user");
        setCompanyId(profile.company_id ?? null);
      } else {
        console.warn("⚠️ No profile found for user:", uid);
      }
    })();
  }, []);

  // ── Load account settings (per company) ─────────────────────────────────────
  useEffect(() => {
    if (!companyId) return;
    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from("account_settings")
        .select("overdue_days")
        .eq("company_id", companyId)
        .maybeSingle();

      if (error) console.error("Settings load error:", error.message);
      setSettings(data ?? { overdue_days: 7 });
    };
    fetchSettings();
  }, [companyId]);

  // ── Load data (scoped by viewMode/role) ─────────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      let cand = supabase
        .from("candidates")
        .select("*")
        .order("created_at", { ascending: false });

      if (viewMode === "mine") cand = cand.eq("created_by", userId);
      if (viewMode === "others" && role !== "user") cand = cand.neq("created_by", userId);
      if (viewMode === "all" && role === "user") cand = cand.eq("created_by", userId);

      const [{ data: cData }, { data: rData }, { data: reqData }] = await Promise.all([
        cand,
        supabase.from("referees").select("*"),
        supabase.from("reference_requests").select("*"),
      ]);

      if (cData) setCandidates(cData);
      if (rData) setReferees(rData);
      if (reqData) setRequests(reqData);
    };
    load();
  }, [userId, viewMode, role]);

  // ── Insights ────────────────────────────────────────────────────────────────
  const getCandidate = (id: string) => candidates.find((c) => c.id === id);
  const candidateRequests = (cid: string) =>
    requests.filter((r) => r.candidate_id === cid);

  const { pendingCount, completedCount, overdueCount } = useMemo(() => {
    const all = requests;
    const pending = all.filter((r) => r.status === "pending");
    const completed = all.filter((r) => r.status === "completed");
    const overdueWindowDays = settings?.overdue_days ?? 7;
    const msWindow = overdueWindowDays * 24 * 60 * 60 * 1000;
    const overdue = pending.filter(
      (r) => new Date(r.created_at).getTime() < Date.now() - msWindow
    );
    return {
      pendingCount: pending.length,
      completedCount: completed.length,
      overdueCount: overdue.length,
    };
  }, [requests, settings]);

  // ── Filtering / Sorting (client) ────────────────────────────────────────────
  const filteredCandidates = useMemo(() => {
    const lower = search.trim().toLowerCase();
    let list = candidates.filter(
      (c) =>
        !lower ||
        c.full_name.toLowerCase().includes(lower) ||
        c.email.toLowerCase().includes(lower)
    );

    list = [...list].sort((a, b) => {
      if (sortBy === "created_desc")
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      if (sortBy === "created_asc")
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      if (sortBy === "name_asc") return a.full_name.localeCompare(b.full_name);
      if (sortBy === "name_desc") return b.full_name.localeCompare(a.full_name);
      return 0;
    });

    return list;
  }, [candidates, search, sortBy]);

  // ── Add Candidate ──────────────────────────────────────────────────────────
  const handleAddCandidate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!userId || !companyId) {
      toast.error("Missing user or company. Please sign in again.");
      console.log("❌ userId or companyId missing:", { userId, companyId });
      return;
    }

    const { full_name, email, mobile } = newCandidate;
    if (!full_name.trim() || !email.trim() || !mobile.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid email.");
      return;
    }
    if (!/^07\d{9}$/.test(mobile)) {
      toast.error("Enter a valid UK mobile (07xxxxxxxxx).");
      return;
    }

    const formattedMobile = ukToE164(mobile);

    const { error } = await supabase.from("candidates").insert({
      full_name: full_name.trim(),
      email: email.trim().toLowerCase(),
      mobile: formattedMobile,
      created_by: userId,
      company_id: companyId,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Candidate added!");
    setTimeout(() => setShowModal(false), 3000);
    setNewCandidate({ full_name: "", email: "", mobile: "" });

    const { data } = await supabase
      .from("candidates")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setCandidates(data);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out!");
    router.push("/login");
  };

  const toggleExpand = (id: string) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  };

// test email (manager/admin)
const sendTestEmail = async () => {
  setIsSending(true);
  try {
    // If the logged-in user has an email, send to them
    if (userEmail) {
      const { error } = await supabase.rpc("send_candidate_consent_email", {
        email_override: userEmail,
      });
      if (error) throw error;

      toast.success(`📧 Test email sent to ${userEmail}`);
      return;
    }

    // Otherwise, fallback to latest candidate
    const { data: latest } = await supabase
      .from("candidates")
      .select("id, email")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latest) {
      toast.error("No candidate found to test.");
      return;
    }

    const { error: fallbackErr } = await supabase.rpc(
      "send_candidate_consent_email",
      { candidate_id: latest.id }
    );
    if (fallbackErr) throw fallbackErr;

    toast.success(`📧 Test email sent to ${latest.email}`);
  } catch (err: any) {
    console.error("❌ sendTestEmail error:", err);
    toast.error(err.message || "Failed to send test email");
  } finally {
    setIsSending(false);
  }
};



  // ── Render ─────────────────────────────────────────────────────────────────
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

            {/* KPI strip */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-600">Pending</p>
                <p className="text-lg font-semibold text-blue-700">{pendingCount}</p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-600">
                  Overdue ({settings?.overdue_days ?? 7}d)
                </p>
                <p className="text-lg font-semibold text-yellow-700">{overdueCount}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-600">Completed</p>
                <p className="text-lg font-semibold text-green-700">{completedCount}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
{role !== "user" && (
  <button
    onClick={sendTestEmail}
    disabled={isSending}
    className={`px-4 py-2 rounded-lg font-medium shadow transition ${
      isSending
        ? "bg-gray-400 text-white cursor-not-allowed"
        : "bg-green-600 text-white hover:bg-green-700"
    }`}
  >
    {isSending ? "📤 Sending..." : "📧 Test Email"}
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

        {/* Filters */}
        <div className="bg-white rounded-xl shadow p-6 flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search by candidate"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-lg px-3 py-2 w-full md:w-1/3"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="created_desc">Newest</option>
            <option value="created_asc">Oldest</option>
            <option value="name_asc">Name A–Z</option>
            <option value="name_desc">Name Z–A</option>
          </select>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as any)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="mine">My Candidates</option>
            {role !== "user" && (
              <>
                <option value="others">Other Users’ Candidates</option>
                <option value="all">All (Business)</option>
              </>
            )}
          </select>
        </div>

        {/* Candidate List */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {filteredCandidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-5xl mb-4">🧾</div>
              <h3 className="text-lg font-semibold text-gray-800">No candidates</h3>
              <p className="text-gray-500 mt-1 mb-6">
                Add your first candidate to get started.
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium shadow hover:bg-blue-700 transition"
              >
                + Add Candidate
              </button>
            </div>
          ) : (
            <table className="w-full text-sm table-auto">
              <thead className="bg-gray-100 text-gray-700 text-left">
                <tr>
                  <th className="py-3 px-4 font-medium">Candidate</th>
                  <th className="py-3 px-4 font-medium">Email</th>
                  <th className="py-3 px-4 font-medium">Mobile</th>
                  <th className="py-3 px-4 font-medium">Progress</th>
                  <th className="py-3 px-4 font-medium">Overdue</th>
                  <th className="py-3 px-4 font-medium">Date Added</th>
                  <th className="py-3 px-4 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.map((c) => {
                  const reqs = candidateRequests(c.id);
                  const total = reqs.length;
                  const completed = reqs.filter((r) => r.status === "completed").length;
                  const anyOverdue = reqs.some(
                    (r) =>
                      r.status === "pending" &&
                      new Date(r.created_at).getTime() <
                        Date.now() - (settings?.overdue_days ?? 7) * 24 * 60 * 60 * 1000
                  );

                  return (
                    <tr key={c.id} className="border-b">
                      <td className="p-3 align-middle">{c.full_name}</td>
                      <td className="p-3 align-middle">{c.email}</td>
                      <td className="p-3 align-middle text-gray-600">{c.mobile}</td>
                      <td className="p-3 align-middle">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className={
                              "inline-block w-2.5 h-2.5 rounded-full " +
                              (total > 0 && completed === total
                                ? "bg-green-500"
                                : anyOverdue
                                ? "bg-red-500"
                                : completed > 0
                                ? "bg-yellow-400"
                                : "bg-gray-300")
                            }
                          />
                          {completed}/{total || 0} complete
                        </span>
                      </td>
                      <td className="p-3 align-middle">
                        {anyOverdue ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-red-100 text-red-700">
                            🕓 Overdue
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="p-3 align-middle text-gray-500 text-xs">
                        {c.created_at
                          ? new Date(c.created_at).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="p-3 align-middle text-right">
                        <button
                          className="text-blue-600 hover:underline"
                          onClick={() => toggleExpand(c.id)}
                        >
                          {expanded.has(c.id) ? "Hide" : "View"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Expanded rows */}
        {filteredCandidates.map(
          (c) =>
            expanded.has(c.id) && (
              <CandidateDetails
                key={c.id}
                candidate={c}
                role={role}
                companyId={companyId}
                referees={referees.filter((r) => r.candidate_id === c.id)}
                requests={requests.filter((r) => r.candidate_id === c.id)}
                onRefresh={async () => {
                  const { data } = await supabase.from("reference_requests").select("*");
                  if (data) setRequests(data);
                  const { data: refs } = await supabase.from("referees").select("*");
                  if (refs) setReferees(refs);
                }}
              />
            )
        )}
      </div>

      {/* Add Candidate Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Add Candidate</h2>

            <form onSubmit={handleAddCandidate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Full Name</label>
                <input
                  type="text"
                  value={newCandidate.full_name}
                  onChange={(e) =>
                    setNewCandidate({ ...newCandidate, full_name: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Email</label>
                <input
                  type="email"
                  value={newCandidate.email}
                  onChange={(e) =>
                    setNewCandidate({ ...newCandidate, email: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Mobile (UK)</label>
                <input
                  type="text"
                  value={newCandidate.mobile}
                  onChange={(e) =>
                    setNewCandidate({ ...newCandidate, mobile: e.target.value })
                  }
                  placeholder="07xxxxxxxxx"
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                />
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
