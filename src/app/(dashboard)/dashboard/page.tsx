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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newCandidate, setNewCandidate] = useState({
    full_name: "",
    email: "",
    mobile: "",
  });
  const [sending, setSending] = useState(false);

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
        if (profile?.company_id && !cancelled) {
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
              supabase.from("candidates").select("*").order("created_at", { ascending: false }),
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

  const filteredCandidates = useMemo(() => {
    const query = search.toLowerCase();
    return candidates.filter(
      (c) =>
        c.full_name.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query)
    );
  }, [candidates, search]);

const toggleExpand = (id: string) => {
  setExpandedId(prev => (prev === id ? null : id));
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

    // ── Render ─────────────────────────────────────────────────────────────────
  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-600">
        Loading your profile...
      </div>
    );
  }

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
          {candidateRequests(c.id).filter((r) => r.status === "completed").length}/
          {candidateRequests(c.id).length} complete
        </td>
        <td className="p-3 text-xs text-gray-500">
          {c.created_at
            ? new Date(c.created_at).toLocaleDateString("en-GB")
            : "-"}
        </td>
        <td className="p-3 text-right">
          <button
            onClick={() => toggleExpand(c.id)}
            className="text-blue-600 hover:underline"
          >
            {expandedId === c.id ? "Hide" : "View"}
          </button>
        </td>
      </tr>

      {/* Inline expanded row */}
      {expandedId === c.id && (
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
            <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
              <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
                <h2 className="text-lg font-semibold mb-4">Add Candidate</h2>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newCandidate.full_name || !newCandidate.email) {
                      toast.error("Please enter a name and email before saving.");
                      return;
                    }

                    setSending(true);
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
                    setSending(false);
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium">Full Name</label>
                    <input
                      type="text"
                      value={newCandidate.full_name}
                      onChange={(e) =>
                        setNewCandidate({
                          ...newCandidate,
                          full_name: e.target.value,
                        })
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
                        setNewCandidate({
                          ...newCandidate,
                          email: e.target.value,
                        })
                      }
                      className="w-full border rounded-lg px-3 py-2 mt-1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Mobile</label>
                    <input
                      type="text"
                      value={newCandidate.mobile}
                      onChange={(e) =>
                        setNewCandidate({
                          ...newCandidate,
                          mobile: e.target.value,
                        })
                      }
                      placeholder="07xxxxxxxxx"
                      className="w-full border rounded-lg px-3 py-2 mt-1"
                    />
                  </div>

                  <div className="flex justify-end gap-3 mt-4">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      disabled={sending}
                      className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={sending}
                      className={`px-4 py-2 rounded-lg text-white font-medium shadow transition ${
                        sending
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      {sending ? "Saving..." : "Save"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div> {/* ← closes main content container */}
    </div>
  );
}

