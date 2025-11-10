"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type TenantOption = { id: string; name: string };
type UserRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  status: string | null;
  company_name?: string | null;
  last_login?: string | null;
};

export default function UsersTab() {
  // ─── State ───────────────────────────────
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [selectedTenant, setSelectedTenant] = useState("all");
  const [filters, setFilters] = useState({ search: "", status: "all" });
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // ─── Load tenants ─────────────────────────
  useEffect(() => {
    async function loadTenants() {
      setLoadingTenants(true);
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, status")
        .in("status", ["active", "trial"])
        .order("name", { ascending: true });

      if (!error && data) setTenants(data);
      setLoadingTenants(false);
    }
    loadTenants();
  }, []);

  // ─── Load users automatically ─────────────
  useEffect(() => {
    async function loadUsers() {
      setLoadingUsers(true);

      // 🧩 Base query for profiles
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select(`
          user_id,
          full_name,
          email,
          role,
          status,
          company_id,
          companies(name)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (profileError) {
        console.error("Error loading profiles:", profileError);
        setUsers([]);
        setLoadingUsers(false);
        return;
      }

      // 🧩 Optional: try auth_users_view if it exists
      let authUsers: { user_id: string; email: string; last_sign_in_at: string }[] = [];
      try {
        const { data, error } = await supabase
          .from("auth_users_view")
          .select("user_id, email, last_sign_in_at");
        if (!error && data) authUsers = data;
      } catch {
        // silently skip if the view doesn’t exist yet
      }

      // 🧩 Merge data client-side
      const merged = profiles.map((p: any) => {
        const match = authUsers.find((a) => a.email === p.email);
        return {
          ...p,
          company_name: Array.isArray(p.companies)
            ? p.companies[0]?.name ?? "—"
            : (p.companies as any)?.name ?? "—",
          last_login: match?.last_sign_in_at ?? null,
        };
      });

      // 🧩 Apply tenant filter locally
      let filtered = merged;
      if (selectedTenant && selectedTenant !== "all") {
        filtered = filtered.filter((u) => u.company_id === selectedTenant);
      }

      // 🧩 Apply status filter
      if (filters.status !== "all") {
        filtered = filtered.filter((u) => u.status === filters.status);
      }

      // 🧩 Apply search filter
      if (filters.search.trim()) {
        const s = filters.search.toLowerCase();
        filtered = filtered.filter(
          (u) =>
            u.full_name?.toLowerCase().includes(s) ||
            u.email?.toLowerCase().includes(s)
        );
      }

      setUsers(filtered);
      setLoadingUsers(false);
    }

    loadUsers();
  }, [selectedTenant, filters]);

  // ─── Update user status ───────────────────
  async function handleStatusChange(userId: string, newStatus: "active" | "disabled") {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: newStatus })
        .eq("user_id", userId);

      if (error) throw error;

      // Optimistic UI update
      setUsers((prev) =>
        prev.map((u) => (u.user_id === userId ? { ...u, status: newStatus } : u))
      );
      console.log(`✅ User ${userId} set to ${newStatus}`);
    } catch (err) {
      console.error("Error updating user status:", err);
      alert("Failed to update user status. Check console for details.");
    }
  }

  // ─── UI ───────────────────────────────────
  return (
    <div className="p-4 text-slate-700">
      <h2 className="text-lg font-semibold mb-4">Users</h2>

      {/* ─── Filters ─────────────────────── */}
      <div className="flex flex-wrap items-end gap-4 mb-6 border-b border-slate-200 pb-4">
        {/* Customer Select */}
        <div className="flex flex-col">
          <label className="text-xs text-slate-500 mb-1">Customer</label>
          <select
            value={selectedTenant}
            onChange={(e) => setSelectedTenant(e.target.value)}
            className="w-[240px] h-[38px] rounded-md border border-slate-300 px-3 text-sm focus:ring-2 focus:ring-teal-500"
            disabled={loadingTenants}
          >
            <optgroup label="Global">
              <option value="all">All users</option>
            </optgroup>

            <optgroup label="Customers">
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex flex-col">
          <label className="text-xs text-slate-500 mb-1">Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="w-[160px] h-[38px] rounded-md border border-slate-300 px-3 text-sm focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="invited">Invited</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>

        {/* Search */}
        <div className="flex flex-col">
          <label className="text-xs text-slate-500 mb-1">Search</label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Name or email"
            className="w-[220px] h-[38px] rounded-md border border-slate-300 px-3 text-sm focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* ─── Results Section ───────────────── */}
      {loadingUsers ? (
        <p className="text-slate-500 italic">Loading users…</p>
      ) : users.length === 0 ? (
        <p className="text-slate-500 italic">No users found for this tenant.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-[720px] w-full text-sm text-left border-collapse">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Last Login</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-medium text-slate-900">{u.full_name || "—"}</td>
                  <td className="px-4 py-3 text-slate-700">{u.email || "—"}</td>
                  <td className="px-4 py-3">{u.role || "—"}</td>
                  <td className="px-4 py-3 capitalize">{u.status || "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{u.company_name || "—"}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {u.last_login ? new Date(u.last_login).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.status === "disabled" ? (
                      <button
                        onClick={() => handleStatusChange(u.user_id, "active")}
                        className="text-emerald-700 border border-emerald-300 text-xs px-2 py-1 rounded-md hover:bg-emerald-50"
                      >
                        Activate
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStatusChange(u.user_id, "disabled")}
                        className="text-rose-700 border border-rose-300 text-xs px-2 py-1 rounded-md hover:bg-rose-50"
                      >
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
