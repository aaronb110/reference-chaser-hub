"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import type { Candidate, Referee, Request } from "@/types/models";

export default function ArchivePage() {
  const [archivedRequests, setArchivedRequests] = useState<Request[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [referees, setReferees] = useState<Referee[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedCandidates, setExpandedCandidates] = useState<Set<string>>(new Set());

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("archived");
  const [sortBy, setSortBy] = useState("created_desc");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: requestsData } = await supabase.from("reference_requests").select("*").eq("status", "archived");
    const { data: candidatesData } = await supabase.from("candidates").select("*");
    const { data: refereesData } = await supabase.from("referees").select("*");
    if (requestsData) setArchivedRequests(requestsData);
    if (candidatesData) setCandidates(candidatesData);
    if (refereesData) setReferees(refereesData);
  };

  const getCandidate = (id: string) => candidates.find((c) => c.id === id);
  const getReferee = (id: string) => referees.find((r) => r.id === id);

  const renderStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case "completed": return <span className={`${baseClasses} bg-green-100 text-green-800`}>✅ Completed</span>;
      case "pending": return <span className={`${baseClasses} bg-blue-100 text-blue-800`}>⏳ Pending</span>;
      case "archived": return <span className={`${baseClasses} bg-gray-200 text-gray-700`}>📂 Archived</span>;
      case "declined": return <span className={`${baseClasses} bg-red-100 text-red-800`}>❌ Declined</span>;
      default: return <span className={`${baseClasses} bg-gray-100 text-gray-600`}>{status}</span>;
    }
  };

  const deleteRequest = async (id: string) => {
    if (!confirm("⚠️ Delete permanently?")) return;
    const { error } = await supabase.from("reference_requests").delete().eq("id", id);
    if (error) toast.error("Error deleting request");
    else {
      toast.success("Deleted ✅");
      setArchivedRequests((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return toast.error("No requests selected");
    if (!confirm(`Delete ${selected.size} permanently?`)) return;
    const { error } = await supabase.from("reference_requests").delete().in("id", Array.from(selected));
    if (error) toast.error("Error deleting");
    else {
      toast.success(`${selected.size} deleted ✅`);
      setArchivedRequests((prev) => prev.filter((r) => !selected.has(r.id)));
      setSelected(new Set());
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const copy = new Set(prev);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      return copy;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Archived Requests</h1>
          {selected.size > 0 && (
            <button onClick={bulkDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg shadow hover:bg-red-700 transition">
              Delete {selected.size} permanently
            </button>
          )}
        </div>

        {/* Accordion Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-3 px-4">Candidate</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Archived Records</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate) => {
                const candidateRequests = archivedRequests.filter((r) => r.candidate_id === candidate.id);
                if (candidateRequests.length === 0) return null;
                const expanded = expandedCandidates.has(candidate.id);

                return (
                  <>
                    <tr
                      key={candidate.id}
                      className="bg-gray-50 border-b cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        const newSet = new Set(expandedCandidates);
                        expanded ? newSet.delete(candidate.id) : newSet.add(candidate.id);
                        setExpandedCandidates(newSet);
                      }}
                    >
                      <td className="p-4 font-medium flex items-center space-x-2">
                        <span>{expanded ? "▼" : "▸"}</span>
                        <span>{candidate.full_name}</span>
                      </td>
                      <td className="p-4">{candidate.email}</td>
                      <td className="p-4 text-sm text-gray-600">{candidateRequests.length} archived</td>
                    </tr>

                    {expanded && (
                      <tr>
                        <td colSpan={3} className="bg-white p-0">
                          <table className="w-full text-xs border-t">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="py-2 px-4 w-1/6">Referee</th>
                                <th className="py-2 px-4 w-1/6">Status</th>
                                <th className="py-2 px-4 w-1/6">Created</th>
                                <th className="py-2 px-4 w-1/6">Select</th>
                                <th className="py-2 px-4">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {candidateRequests.map((req) => {
                                const referee = getReferee(req.referee_id);
                                return (
                                  <tr key={req.id} className="border-b hover:bg-gray-50 transition">
                                    <td className="p-3 w-1/6">{referee?.full_name || "—"}</td>
                                    <td className="p-3 w-1/6">{renderStatusBadge(req.status)}</td>
                                    <td className="p-3 w-1/6">{new Date(req.created_at).toLocaleString()}</td>
                                    <td className="p-3 w-1/6 text-center">
                                      <input
                                        type="checkbox"
                                        checked={selected.has(req.id)}
                                        onChange={() => toggleSelect(req.id)}
                                      />
                                    </td>
                                    <td className="p-3 flex flex-wrap gap-2">
                                      <button
                                        onClick={() => deleteRequest(req.id)}
                                        className="px-3 py-1 bg-red-50 text-red-700 rounded-md hover:bg-red-100 text-xs"
                                      >
                                        Delete Permanently
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
