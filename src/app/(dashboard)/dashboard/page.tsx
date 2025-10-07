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
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [expandedCandidates, setExpandedCandidates] = useState<Set<string>>(new Set());

  // temp role override (until auth ready)
  const [role] = useState<string>("admin");

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
      const { data: candidatesData } = await supabase.from("candidates").select("*");
      const { data: refereesData } = await supabase.from("referees").select("*");
      const { data: requestsData } = await supabase.from("reference_requests").select("*");

      if (candidatesData) setCandidates(candidatesData);
      if (refereesData) setReferees(refereesData);
      if (requestsData) setRequests(requestsData);
    };
    fetchData();
  }, []);

  const getCandidate = (id: string) => candidates.find((c) => c.id === id);
  const getReferee = (id: string) => referees.find((r) => r.id === id);

  // Filtering
  let filteredRequests = requests.filter((r) => {
    const candidate = getCandidate(r.candidate_id);
    const matchSearch =
      search === "" ||
      candidate?.full_name.toLowerCase().includes(search.toLowerCase()) ||
      candidate?.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "any" || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Sorting
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

  // 🔹 Actions
  const toggleCompleted = async (req: Request) => {
    const newStatus = req.status === "completed" ? "pending" : "completed";
    const { data, error } = await supabase
      .from("reference_requests")
      .update({ status: newStatus })
      .eq("id", req.id)
      .select();

    if (!error && data) {
      setRequests((prev) =>
        prev.map((r) => (r.id === req.id ? { ...r, status: newStatus } : r))
      );
      toast.success(newStatus === "completed" ? "Marked Completed ✅" : "Set back to Pending 🔄");
    } else {
      toast.error("Error updating request");
    }
  };

  const toggleArchived = async (req: Request) => {
    const newStatus = req.status === "archived" ? "pending" : "archived";
    const { data, error } = await supabase
      .from("reference_requests")
      .update({ status: newStatus })
      .eq("id", req.id)
      .select();

    if (!error && data) {
      setRequests((prev) =>
        prev.map((r) => (r.id === req.id ? { ...r, status: newStatus } : r))
      );
      toast.success(newStatus === "archived" ? "Archived 🗂️" : "Unarchived 🔄");
    } else {
      toast.error("Error updating request");
    }
  };

  const resendRequest = async (req: Request) => {
    const { data, error } = await supabase
      .from("reference_requests")
      .update({ resend_count: (req.resend_count || 0) + 1 })
      .eq("id", req.id)
      .select();

    if (!error && data) {
      setRequests((prev) =>
        prev.map((r) =>
          r.id === req.id ? { ...r, resend_count: (r.resend_count || 0) + 1 } : r
        )
      );
      toast.success("Request resent ✉️");
    } else {
      toast.error("Error resending request");
    }
  };

  // Status Badge
  const renderStatusBadge = (status: string) => {
    const baseClasses =
      "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case "completed":
        return <span className={`${baseClasses} bg-green-100 text-green-800`}>✅ Completed</span>;
      case "pending":
        return <span className={`${baseClasses} bg-blue-100 text-blue-800`}>⏳ Pending</span>;
      case "archived":
        return <span className={`${baseClasses} bg-gray-200 text-gray-700`}>📂 Archived</span>;
      case "declined":
        return <span className={`${baseClasses} bg-red-100 text-red-800`}>❌ Declined</span>;
      default:
        return <span className={`${baseClasses} bg-gray-100 text-gray-600`}>{status}</span>;
    }
  };

  // ✅ Wrapped in DashboardLayout below
  return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Reference Dashboard</h1>
            <button
              onClick={() => (window.location.href = "/new-request")}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium shadow hover:bg-blue-700 transition"
            >
              + New Request
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

          {/* Accordion Table */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-3 px-4">Candidate</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((candidate) => {
                  const candidateRequests = filteredRequests.filter(
                    (r) => r.candidate_id === candidate.id
                  );
                  if (candidateRequests.length === 0) return null;
                  const expanded = expandedCandidates.has(candidate.id);

                  return (
                    <tr key={candidate.id}>
                      <td
                        colSpan={3}
                        className="border-b bg-gray-50 cursor-pointer hover:bg-gray-100"
                        onClick={() => {
                          const newSet = new Set(expandedCandidates);
                          expanded ? newSet.delete(candidate.id) : newSet.add(candidate.id);
                          setExpandedCandidates(newSet);
                        }}
                      >
                        <div className="flex items-center gap-2 p-4 font-medium">
                          <span>{expanded ? "▼" : "▸"}</span>
                          <span>{candidate.full_name}</span>
                          <span className="text-sm text-gray-500 ml-auto">
                            {candidateRequests.length} referees
                          </span>
                        </div>

                        {expanded && (
                          <div className="bg-white border-t">
                            <table className="w-full text-xs">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="py-2 px-4 w-1/6">Referee</th>
                                  <th className="py-2 px-4 w-1/6">Status</th>
                                  <th className="py-2 px-4 w-1/6">Created</th>
                                  <th className="py-2 px-4 w-1/6">Resends</th>
                                  <th className="py-2 px-4">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {candidateRequests.map((req) => {
                                  const referee = getReferee(req.referee_id);
                                  return (
                                    <tr key={req.id} className="border-b hover:bg-gray-50">
                                      <td className="p-3 w-1/6">{referee?.full_name || "—"}</td>
                                      <td className="p-3 w-1/6">{renderStatusBadge(req.status)}</td>
                                      <td className="p-3 w-1/6">
                                        {new Date(req.created_at).toLocaleString()}
                                      </td>
                                      <td className="p-3 w-1/6 text-gray-600 text-xs">
                                        Sent {req.resend_count || 0} times
                                      </td>
                                      <td className="p-3 flex flex-wrap gap-2">
                                        <button
                                          onClick={() => resendRequest(req)}
                                          className="px-2 py-1 bg-yellow-50 text-yellow-700 rounded hover:bg-yellow-100"
                                        >
                                          Resend
                                        </button>
                                        <button
                                          onClick={() => toggleCompleted(req)}
                                          className="px-2 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100"
                                        >
                                          {req.status === "completed" ? "Undo" : "Complete"}
                                        </button>
                                        <button
                                          onClick={() => toggleArchived(req)}
                                          className="px-2 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100"
                                        >
                                          {req.status === "archived" ? "Unarchive" : "Archive"}
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
  );
}
