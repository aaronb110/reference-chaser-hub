"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { supabase } from "@/lib/supabaseClient";
import { saveAs } from "file-saver";
import TenantsTab from "@/components/admin/TenantsTab";
import PlansTab from "@/components/admin/PlansTab";
import PlanCatalogTab from "@/components/admin/PlanCatalogTab";





type ActivityRow = {
  created_at: string;
  actor_name?: string | null;
  actor_company?: string | null;
  action?: string | null;
  field_changed?: string | null;
  old_value?: string | null;
  new_value?: string | null;
  candidate_name?: string | null;
  event_type?: string | null;
};

export default function AdminDashboardPage() {
  const { loading } = useRoleGuard(["global_admin"]);
  // ─── Tab Config ───────────────────────────────────────────────
  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "tenants", label: "Tenants" },
    { key: "plans", label: "Plans" },            // Company-level plan assignment
    { key: "plan_catalog", label: "Plan Catalog" },  // Global plan pricing & features
    { key: "audit", label: "Audit Log" },
  ] as const;


  type TabKey = (typeof tabs)[number]["key"];
  const [activeTab, setActiveTab] = useState<TabKey>("overview");




  if (loading) return <div className="p-8 text-slate-600">Checking your access…</div>;

  return (
    <div className="px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Global Admin</h1>
        <p className="text-slate-600">Manage Refevo at a system level</p>
      </header>

      {/* Tabs */}
      <div className="mb-8 flex gap-2 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-md ${activeTab === tab.key
                ? "bg-white border border-b-white border-slate-200 text-teal-700"
                : "text-slate-600 hover:text-teal-700"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>



  {activeTab === "overview" ? (
  <OverviewTab onViewFullLog={() => setActiveTab("audit")} />
) : activeTab === "tenants" ? (
  <TenantsTab />
) : activeTab === "plans" ? (
  <PlansTab />
) : activeTab === "plan_catalog" ? (
  <PlanCatalogTab />
) : (
  <AuditTab />
)}



    </div>
  );
}



/* ───────────────────────────────────────────────
   Overview Tab
────────────────────────────────────────────── */
function OverviewTab({ onViewFullLog }: { onViewFullLog: () => void }) {

  const [stats, setStats] = useState({
    tenants: null as number | null,
    users: null as number | null,
    candidates: null as number | null,
    references: null as number | null,
    credits: null as number | null,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);

  // ─── Load Stats ───────────────────────────────
  useEffect(() => {
    async function loadCounts() {
      try {
        setLoadingStats(true);
        const [
          { count: tenants },
          { count: users },
          { count: candidates },
          { count: references },
          { count: credits },
        ] = await Promise.all([
          supabase.from("companies").select("*", { count: "exact", head: true }),
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("candidates").select("*", { count: "exact", head: true }),
          supabase.from("references").select("*", { count: "exact", head: true }),
          supabase.from("credits").select("*", { count: "exact", head: true }),
        ]);

        setStats({
          tenants: tenants ?? 0,
          users: users ?? 0,
          candidates: candidates ?? 0,
          references: references ?? 0,
          credits: credits ?? 0,
        });
      } catch (e) {
        console.error("Error loading stats", e);
      } finally {
        setLoadingStats(false);
      }
    }
    loadCounts();
  }, []);

  // ─── Load Recent Activity ─────────────────────
  useEffect(() => {
    async function loadActivity() {
      try {
        setLoadingActivity(true);
        const { data, error } = await supabase
          .from("audit_logs_pretty")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) throw error;
        setActivity(data || []);
      } catch (err) {
        console.error("Error loading activity:", err);
        setActivity([]);
      } finally {
        setLoadingActivity(false);
      }
    }
    loadActivity();
  }, []);

  // ─── UI ───────────────────────────────────────
  return (
    <div>
      {/* Stat Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
        {[
          { label: "Tenants", value: stats.tenants },
          { label: "Users", value: stats.users },
          { label: "Candidates", value: stats.candidates },
          { label: "References", value: stats.references },
          { label: "Credits", value: stats.credits },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-center"
          >
            <div className="text-sm text-slate-500">{s.label}</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">
              {loadingStats ? "…" : s.value ?? "—"}
            </div>
            <div className="mt-2 h-1 w-10 mx-auto rounded-full bg-teal-500/70" />
          </div>
        ))}
      </section>

      {/* Recent Activity */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
          <button
  onClick={onViewFullLog}
  className="text-sm text-teal-700 cursor-pointer hover:underline"
>
  View full log →
</button>


        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">


            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Who</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Field</th>
                <th className="px-4 py-3">Old</th>
                <th className="px-4 py-3">New</th>
                <th className="px-4 py-3">Candidate</th>
                <th className="px-4 py-3">Type</th>
              </tr>
            </thead>



            <tbody className="divide-y divide-slate-100">
              {loadingActivity &&
                [...Array(3)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="px-4 py-3 text-slate-400">
                      Loading …
                    </td>
                  </tr>
                ))}

              {!loadingActivity && activity.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                    No recent activity found
                  </td>
                </tr>
              )}

              {activity.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
{/* Who */}
<td className="px-4 py-3 text-slate-700">
  <span className="font-medium">{row.actor_name ?? "System / Anon"}</span>
</td>

{/* Company */}
<td className="px-4 py-3 text-slate-500">
  {row.actor_company ?? "—"}
</td>

{/* Action */}
<td className="px-4 py-3">{row.action ?? "—"}</td>

{/* Field */}
<td className="px-4 py-3 text-slate-700">
  {row.field_changed ?? "—"}
</td>

{/* Old */}
<td
  className="px-4 py-3 text-rose-600 text-xs max-w-[160px] truncate"
  title={row.old_value ?? ""}
>
  {row.old_value ?? "—"}
</td>

{/* New */}
<td
  className="px-4 py-3 text-emerald-600 text-xs max-w-[160px] truncate"
  title={row.new_value ?? ""}
>
  {row.new_value ?? "—"}
</td>

{/* Candidate */}
<td className="px-4 py-3">{row.candidate_name ?? "—"}</td>

{/* Type */}
<td className="px-4 py-3">
  <span
    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
      row.event_type === "Manual Action"
        ? "bg-blue-100 text-blue-800"
        : row.event_type === "Candidate/Referee Action"
        ? "bg-green-100 text-green-800"
        : "bg-slate-100 text-slate-600 italic"
    }`}
  >
    {row.event_type ?? "—"}
  </span>
</td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* ───────────────────────────────────────────────
   Audit Log Tab — Full + Sticky Header + Filters
────────────────────────────────────────────── */
function AuditTab() {
  const [logs, setLogs] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);

  const [filters, setFilters] = useState({
    search: "",
    type: "all",
    from: "",
    to: "",
  });

  // ─── Load Logs ─────────────────────────────────────────────────────
  useEffect(() => {
    async function loadLogs() {
      try {
        setLoading(true);
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
          .from("audit_logs_pretty")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(from, to);

        // ─── Filters ─────────────────────────────
        if (filters.type !== "all") {
          if (filters.type === "Feature / Billing Change") {
            query = query.in("action", [
              "feature_toggle_update",
              "billing_update",
              "plan_assignment_change",
            ]);
          } else {
            query = query.eq("event_type", filters.type);
          }
        }

        if (filters.search.trim()) query = query.ilike("actor_name", `%${filters.search}%`);
        if (filters.from) query = query.gte("created_at", filters.from);
        if (filters.to) query = query.lte("created_at", filters.to);


        const { data, count, error } = await query;
        if (error) throw error;
        setLogs(data || []);
        setTotal(count ?? 0);
      } catch (err) {
        console.error("Error loading logs:", err);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, [filters, page, pageSize]);

  const totalPages = Math.ceil(total / pageSize);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  // ─── CSV Export ─────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (logs.length === 0) return;
    const headers = [
      "Time",
      "Who",
      "Company",
      "Action",
      "Field",
      "Old",
      "New",
      "Candidate",
      "Type",
    ];
    const rows = logs.map((row) => [
      new Date(row.created_at).toLocaleString(),
      row.actor_name ?? "",
      row.actor_company ?? "",
      row.action ?? "",
      row.field_changed ?? "",
      row.old_value ?? "",
      row.new_value ?? "",
      row.candidate_name ?? "",
      row.event_type ?? "",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    saveAs(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
      `audit_log_${new Date().toISOString().split("T")[0]}.csv`
    );
  };

  // ─── UI ─────────────────────────────────────────────────────────────
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4 text-slate-900">Full Audit Log</h2>

      {/* Filters + Top Pagination */}
      <div className="bg-white border-b border-slate-200 pb-3 mb-4">
        <div className="flex flex-wrap items-end gap-4 px-1 pt-3">
          {/* Search */}
          <div className="flex flex-col">
            <label className="text-xs text-slate-500 mb-1">Search user</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Name or email"
              className="w-[170px] h-[38px] rounded-md border border-slate-300 px-3 text-sm focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Type */}
          <div className="flex flex-col">
            <label className="text-xs text-slate-500 mb-1">Event type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="w-[170px] h-[38px] rounded-md border border-slate-300 px-3 text-sm focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All</option>
              <option value="Manual Action">Manual</option>
              <option value="Candidate/Referee Action">Candidate/Referee</option>
              <option value="System Event">System</option>
              <option value="Feature Toggle">Feature / Billing Change</option>


            </select>
          </div>
          {/* Dates */}
          <div className="flex flex-col">
            <label className="text-xs text-slate-500 mb-1">From</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              className="w-[170px] h-[38px] rounded-md border border-slate-300 px-3 text-sm focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-slate-500 mb-1">To</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              className="w-[170px] h-[38px] rounded-md border border-slate-300 px-3 text-sm focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Rows per page */}
          <div className="flex flex-col">
            <label className="text-xs text-slate-500 mb-1">Rows per page</label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPage(1);
                setPageSize(Number(e.target.value));
              }}
              className="w-[170px] h-[38px] rounded-md border border-slate-300 px-3 text-sm focus:ring-2 focus:ring-teal-500"
            >
              {[50, 100, 200, 500].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          {/* Export */}
          <button
            onClick={handleExportCSV}
            disabled={logs.length === 0}
            className="ml-auto h-[38px] rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-40"
          >
            Export CSV
          </button>
        </div>

        {/* Top Pagination */}
        {!loading && total > 0 && (
          <div className="mt-3 flex items-center justify-between text-sm text-slate-600 px-1">
            <div>
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={!canPrev}
                className="rounded-md border border-slate-300 px-3 py-1 disabled:opacity-40 hover:bg-slate-50"
              >
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!canNext}
                className="rounded-md border border-slate-300 px-3 py-1 disabled:opacity-40 hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table (non-sticky header) */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Who</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Field</th>
              <th className="px-4 py-3">Old</th>
              <th className="px-4 py-3">New</th>
              <th className="px-4 py-3">Candidate</th>
              <th className="px-4 py-3">Type</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={9} className="px-4 py-4 text-center text-slate-500">
                  Loading logs…
                </td>
              </tr>
            )}

            {!loading && logs.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-slate-500">
                  No logs match your filters.
                </td>
              </tr>
            )}

            {!loading &&
              logs.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(row.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">{row.actor_name ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{row.actor_company ?? "—"}</td>
                  <td className="px-4 py-3">{row.action ?? "—"}</td>
                  <td className="px-4 py-3">{row.field_changed ?? "—"}</td>
                  <td className="px-4 py-3 text-rose-600 text-xs max-w-[160px] truncate" title={row.old_value ?? ""}>
                    {row.old_value ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-emerald-600 text-xs max-w-[160px] truncate" title={row.new_value ?? ""}>
                    {row.new_value ?? "—"}
                  </td>

                  <td className="px-4 py-3">{row.candidate_name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${row.event_type === "Manual Action"
                        ? "bg-blue-100 text-blue-800"
                        : row.event_type === "Candidate/Referee Action"
                          ? "bg-green-100 text-green-800"
                          : "bg-slate-100 text-slate-600 italic"
                        }`}
                    >
                      {row.event_type ?? "—"}
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Bottom Pagination */}
      {!loading && total > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <div>
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={!canPrev}
              className="rounded-md border border-slate-300 px-3 py-1 disabled:opacity-40 hover:bg-slate-50"
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!canNext}
              className="rounded-md border border-slate-300 px-3 py-1 disabled:opacity-40 hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
