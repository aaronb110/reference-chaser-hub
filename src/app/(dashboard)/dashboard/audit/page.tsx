"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type AuditLog = {
  id: string;
  user_name: string | null;
  action: string;
  target_table: string;
  diff_summary: Record<string, { old: string; new: string }>;
  created_at: string;
};

export default function AuditLogPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Filters
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [page, setPage] = useState(1);
const [meta, setMeta] = useState<{ total: number; page: number; limit: number; totalPages: number } | null>(null);

  // ────────────────────────────── Auth + Company Fetch ──────────────────────────────
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (error || !profile) {
        setError("Unable to load profile information.");
        return;
      }

      setCompanyId(profile.company_id);
    };

    fetchProfile();
  }, [router]);

// ────────────────────────────── Load Logs ──────────────────────────────
useEffect(() => {
  if (!companyId) return;

  const loadLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("company_id", companyId);
      params.set("page", page.toString());
      if (selectedUser !== "all") params.set("user_name", selectedUser);
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      const result = await res.json();

      if (res.ok) {
        setLogs(result.data || []);
        setMeta(result.meta || null);
      } else {
        setError(result.error || "Failed to load logs.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  loadLogs();
}, [companyId, selectedUser, startDate, endDate, page]);

  // Unique users for dropdown
  const users = Array.from(
    new Set(logs.map((log) => log.user_name).filter(Boolean))
  );

  // ────────────────────────────── Render ──────────────────────────────
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Audit Log</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            User
          </label>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Users</option>
            {users.map((u) => (
              <option key={u} value={u || ""}>
                {u}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            From
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            To
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <button
          onClick={() => {
            setSelectedUser("all");
            setStartDate("");
            setEndDate("");
          }}
          className="px-3 py-2 text-sm bg-gray-100 border rounded-lg hover:bg-gray-200"
        >
          Reset Filters
        </button>
      </div>

      {loading ? (
        // ✅ Loading shimmer
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-10 bg-gray-100 animate-pulse rounded-md border border-gray-200"
            />
          ))}
        </div>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : logs.length === 0 ? (
        <p className="text-gray-500">No matching audit entries.</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-xl shadow border border-gray-100">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">User</th>
                <th className="px-4 py-2 text-left">Action</th>
                <th className="px-4 py-2 text-left">Table</th>
                <th className="px-4 py-2 text-left">Changes</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b hover:bg-gray-50 transition">
                  <td className="px-4 py-2 text-gray-600 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-gray-700">
                    {log.user_name || "Unknown User"}
                  </td>
                  <td className="px-4 py-2 text-indigo-700 font-medium">
                    {log.action}
                  </td>
                  <td className="px-4 py-2 text-gray-700">{log.target_table}</td>
                  <td className="px-4 py-2">
                    {Object.entries(log.diff_summary || {}).length === 0 ? (
                      <span className="text-gray-400 text-xs">No field changes</span>
                    ) : (
                      <ul className="text-xs text-gray-700 space-y-1">
                        {Object.entries(log.diff_summary).map(([field, { old, new: n }]) => (
                          <li key={field}>
                            <span className="font-medium">{field}</span>:{" "}
                            <span className="text-gray-500 line-through">{old || "—"}</span>{" "}
                            → <span className="text-green-700">{n || "—"}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Pagination controls */}
{meta && meta.totalPages > 1 && (
  <div className="flex justify-between items-center p-3 text-sm text-gray-600">
    <span>
      Page {meta.page} of {meta.totalPages} ({meta.total} entries)
    </span>
    <div className="flex gap-2">
      <button
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        disabled={page <= 1}
        className={`px-3 py-1 border rounded-lg ${
          page <= 1
            ? "text-gray-400 border-gray-200 bg-gray-50"
            : "hover:bg-gray-100"
        }`}
      >
        ← Prev
      </button>
      <button
        onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
        disabled={page >= meta.totalPages}
        className={`px-3 py-1 border rounded-lg ${
          page >= meta.totalPages
            ? "text-gray-400 border-gray-200 bg-gray-50"
            : "hover:bg-gray-100"
        }`}
      >
        Next →
      </button>
    </div>
  </div>
)}

        </div>
      )}
    </div>
  );
}
