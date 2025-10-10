"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import type { Candidate, Referee, Request } from "@/types/models";

export default function DashboardPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [referees, setReferees] = useState<Referee[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("any");
  const [sortBy, setSortBy] = useState("created_desc");
  const [expandedCandidates, setExpandedCandidates] = useState<Set<string>>(new Set());

  const [showModal, setShowModal] = useState(false);
  const [newCandidate, setNewCandidate] = useState({
    full_name: "",
    email: "",
    mobile: "",
  });

  // 📊 Counts for Insights
  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const completedCount = requests.filter((r) => r.status === "completed").length;
  const overdueCount = requests.filter(
    (r) =>
      r.status === "pending" &&
      new Date(r.created_at) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ).length;

  // Load data
  useEffect(() => {
    const fetchData = async () => {
      const { data: candidatesData, error: candErr } = await supabase
        .from("candidates")
        .select("*");
      if (!candErr && candidatesData) setCandidates(candidatesData);

      const { data: refereesData, error: refErr } = await supabase
        .from("referees")
        .select("*");
      if (!refErr && refereesData) setReferees(refereesData);

      const { data: requestsData, error: reqErr } = await supabase
        .from("reference_requests")
        .select("*");
      if (!reqErr && requestsData) setRequests(requestsData);
    };
    fetchData();
  }, []);

  const getCandidate = (id: string) => candidates.find((c) => c.id === id);
  const getReferee = (id: string) => referees.find((r) => r.id === id);

  // Filter + Sort
  let filteredRequests = requests.filter((r) => {
    const candidate = getCandidate(r.candidate_id);
    const matchSearch =
      search === "" ||
      candidate?.full_name.toLowerCase().includes(search.toLowerCase()) ||
      candidate?.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "any" || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  filteredRequests = [...filteredRequests].sort((a, b) => {
    if (sortBy === "created_desc")
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortBy === "created_asc")
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortBy === "name_asc")
      return (getCandidate(a.candidate_id)?.full_name || "").localeCompare(
        getCandidate(b.candidate_id)?.full_name || ""
      );
    if (sortBy === "name_desc")
      return (getCandidate(b.candidate_id)?.full_name || "").localeCompare(
        getCandidate(a.candidate_id)?.full_name || ""
      );
    return 0;
  });

  // 🔹 Add Candidate
  const handleAddCandidate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const { full_name, email, mobile } = newCandidate;

    // Validation
    if (!full_name.trim() || !email.trim() || !mobile.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid email address.");
      return;
    }

    if (!/^07\d{9}$/.test(mobile)) {
      toast.error("Enter a valid UK mobile number starting with 07.");
      return;
    }

    const formattedMobile = "+44" + mobile.substring(1);

    try {
      console.log("🧠 Starting candidate insert...");

      const { data: userData, error: userErr } = await supabase.auth.getUser();
      console.log("🔍 Supabase user:", userData, userErr);

      if (userErr) {
        toast.error("Auth error: " + userErr.message);
        return;
      }

      const user = userData?.user;
      if (!user) {
        toast.error("No authenticated user found.");
        return;
      }

      console.log("📨 Inserting candidate:", {
        full_name,
        email,
        mobile: formattedMobile,
        created_by: user.id,
      });

      const { data: insertData, error: insertErr } = await supabase
        .from("candidates")
        .insert({
          full_name: full_name.trim(),
          email: email.trim().toLowerCase(),
          mobile: formattedMobile,
          created_by: user.id,
        })
        .select(); // show what was inserted

      console.log("✅ Insert response:", insertData, insertErr);

      if (insertErr) throw insertErr;

      toast.success("Candidate added successfully!");
      setTimeout(() => setShowModal(false), 3000);

      // refresh candidates
      const { data: candidatesData } = await supabase.from("candidates").select("*");
      if (candidatesData) setCandidates(candidatesData);

      setNewCandidate({ full_name: "", email: "", mobile: "" });
    } catch (err: any) {
      console.error("❌ Add candidate error:", err);
      toast.error(err.message || "Error adding candidate");
    }
  };

  // 🔹 Status Badge
  const renderStatusBadge = (status: string) => {
    const base =
      "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case "completed":
        return <span className={`${base} bg-green-100 text-green-800`}>✅ Completed</span>;
      case "pending":
        return <span className={`${base} bg-blue-100 text-blue-800`}>⏳ Pending</span>;
      case "archived":
        return <span className={`${base} bg-gray-200 text-gray-700`}>📂 Archived</span>;
      case "declined":
        return <span className={`${base} bg-red-100 text-red-800`}>❌ Declined</span>;
      default:
        return <span className={`${base} bg-gray-100 text-gray-600`}>{status}</span>;
    }
  };

  // ✅ Page
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Reference Dashboard</h1>

          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium shadow hover:bg-blue-700 transition"
          >
            + Add Candidate
          </button>
        </div>

        {/* Insights */}
        <div className="bg-white shadow rounded-xl p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold text-blue-700 flex items-center gap-2">
              💡 Key Insights
            </h2>
            <ul className="list-disc list-inside text-gray-700 mt-2 space-y-1">
              <li>{pendingCount} requests pending</li>
              <li>{overdueCount > 0 ? `${overdueCount} overdue 🚨` : "No overdue 🎉"}</li>
              <li>{completedCount} requests completed</li>
            </ul>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-green-700 flex items-center gap-2">
              ✅ Recommendations
            </h2>
            <ul className="list-disc list-inside text-gray-700 mt-2 space-y-1">
              {overdueCount > 0 && <li>Chase {overdueCount} overdue requests</li>}
              {pendingCount > 0 && <li>Review {pendingCount} pending requests</li>}
              {completedCount > 0 && <li>Archive completed requests to reduce clutter</li>}
              {overdueCount === 0 && pendingCount === 0 && completedCount === 0 && (
                <li>Everything looks in control 🎉</li>
              )}
            </ul>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow p-6 flex items-center space-x-4">
          <input
            type="text"
            placeholder="Search by candidate"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-lg px-3 py-2 w-1/3"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="any">All</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="declined">Declined</option>
            <option value="archived">Archived</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="created_desc">Newest</option>
            <option value="created_asc">Oldest</option>
            <option value="name_asc">Name A–Z</option>
            <option value="name_desc">Name Z–A</option>
          </select>
        </div>

{/* Candidate List */}
<div className="bg-white rounded-xl shadow overflow-hidden">
  <table className="w-full text-sm table-auto">
    <thead className="bg-gray-100 text-gray-700 text-left">
      <tr>
        <th className="py-3 px-4 font-medium">Candidate</th>
        <th className="py-3 px-4 font-medium">Email</th>
        <th className="py-3 px-4 font-medium">Mobile</th>
        <th className="py-3 px-4 font-medium">Date Added</th>
      </tr>
    </thead>
    <tbody>
      {candidates.map((candidate) => (
        <tr key={candidate.id} className="border-b hover:bg-gray-50">
          <td className="p-3 align-middle">{candidate.full_name}</td>
          <td className="p-3 align-middle">{candidate.email}</td>
          <td className="p-3 align-middle text-gray-600">{candidate.mobile}</td>
          <td className="p-3 align-middle text-gray-500 text-xs">
            {candidate.created_at
              ? new Date(candidate.created_at).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "—"}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

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
