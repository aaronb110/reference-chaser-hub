"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import TenantFeaturesTab from "@/components/admin/TenantFeaturesTab";
import { useUserRole } from "@/hooks/useUserRole";



type TenantRow = {
  id: string;
  name: string;
  slug?: string | null;
  status?: "active" | "inactive";
  created_at?: string | null;
  updated_at?: string | null;
  enable_credits?: boolean;
  enable_custom_templates?: boolean;
  custom_template_limit?: number | null;
  enable_user_management?: boolean;
};

function ConfirmModal({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-fadeIn">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          Disable Credits?
        </h3>
        <p className="text-sm text-slate-600 mb-5">
          Turning off credits will disable all billable features for this tenant.
          Are you sure you want to continue?
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-md bg-rose-600 text-white hover:bg-rose-700 text-sm"
          >
            Disable Credits
          </button>
        </div>
      </div>
    </div>
  );
}


export default function TenantsTab() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", status: "active" });
  const { role } = useUserRole();


  const [filters, setFilters] = useState({
    search: "",
    status: "all",
  });

  const [selectedTenant, setSelectedTenant] = useState<TenantRow | null>(null);


  // Controls the slide animation while the drawer is mounted
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTenantTab, setActiveTenantTab] = useState<"details" | "templates" | "billing" | "users" | "features">("details");
  const [drawerFull, setDrawerFull] = useState(false);


  // Open when a tenant is selected
  // Open drawer when a tenant is selected + load templates
  useEffect(() => {
    if (selectedTenant) {
      // small next-tick to ensure mount before transition
      const t = setTimeout(() => setDrawerOpen(true), 0);
      // load templates for that tenant
      loadTemplatesForTenant(selectedTenant.id);
      return () => clearTimeout(t);
    }
  }, [selectedTenant]);


  // Smoothly close, then unmount after animation
  function closeDrawer() {
    setDrawerOpen(false);
    // match duration below (ms) + a tiny buffer
    setTimeout(() => setSelectedTenant(null), 380);
  }




  // ─── Load Tenants ─────────────────────────────
  async function loadTenants() {
    setLoading(true);
let query = supabase
  .from("companies")
  .select(
    "id, name, status, created_at, enable_credits, enable_custom_templates, custom_template_limit, enable_user_management"
  )
  .order("created_at", { ascending: false });


    if (filters.status !== "all") query = query.eq("status", filters.status);
    if (filters.search.trim()) query = query.ilike("name", `%${filters.search.trim()}%`);

    const { data, error } = await query;

    if (error) {
      toast.error("Failed to load tenants");
      console.error(error);
    } else {
      setTenants(data || []);
    }
    setLoading(false);
  }

  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  useEffect(() => {
    loadTenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  async function loadTemplatesForTenant(tenantId: string) {
    setLoadingTemplates(true);

    const { data, error } = await supabase
      .from("tenant_templates_view")
      .select("*")
      .or(`company_id.eq.${tenantId},company_id.is.null`)
      .order("visibility", { ascending: true });

    if (error) {
      console.error(error);
      toast.error("Failed to load templates");
    } else {
      setTemplates(data || []);
    }

    setLoadingTemplates(false);
  }



  // ─── Add Tenant ─────────────────────────────
  async function handleAddTenant(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name is required");

    const { error } = await supabase.from("companies").insert({
      name: form.name.trim(),
      status: form.status,
    });

    if (error) {
      toast.error("Failed to add tenant");
      console.error(error);
    } else {
      toast.success("Tenant added");
      setShowModal(false);
      setForm({ name: "", status: "active" });
      loadTenants();
    }
  }

  const [editingTenant, setEditingTenant] = useState<TenantRow | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);



  // ─── UI ─────────────────────────────
  async function handleStatusChange(id: string, newStatus: "active" | "inactive") {
    // 1. Update local UI immediately
    setTenants((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
    );

    // 2. Push update to Supabase (no reload after)
    const { error } = await supabase
      .from("companies")
      .update({ status: newStatus })
      .eq("id", id);

    // 3. Handle result
    if (error) {
      console.error(error);
      toast.error("Failed to update status");
      // Revert if it failed
      setTenants((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, status: newStatus === "active" ? "inactive" : "active" }
            : t
        )
      );
    } else {
      toast.success(
        `Tenant ${newStatus === "active" ? "reactivated" : "deactivated"}`
      );
    }
  }


  function handleEditTenant(t: TenantRow) {
    setEditingTenant(t);
    setShowEditModal(true);
  }


  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Tenants</h2>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          + Add Tenant
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end justify-between mb-4 gap-3">
        {/* Search */}
        <div className="flex flex-col">
          <label className="text-xs text-slate-500 mb-1">Search</label>
          <input
            type="text"
            placeholder="Company name"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="w-[220px] h-[38px] rounded-md border border-slate-300 px-3 text-sm focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Status */}
        <div className="flex flex-col">
          <label className="text-xs text-slate-500 mb-1">Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="w-[160px] h-[38px] rounded-md border border-slate-300 px-3 text-sm focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Refresh */}
        <button
          onClick={loadTenants}
          disabled={loading}
          className="ml-auto h-[38px] rounded-md bg-slate-100 border border-slate-300 px-4 text-sm hover:bg-slate-200 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>


      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-[720px] w-full text-sm text-left border-collapse">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 w-[40%]">Name</th>
              <th className="px-4 py-3 w-[15%]">Status</th>
              <th className="px-4 py-3 w-[25%]">Created</th>
              <th className="px-4 py-3 text-right w-[20%]">Actions</th>
            </tr>
          </thead>

          <tbody>
            {tenants.map((t) => (
              <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                <td className="px-4 py-3 font-medium text-slate-900">{t.name}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${t.status === "inactive"
                      ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                      : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                      }`}
                  >
                    {t.status === "inactive" ? "Inactive" : "Active"}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                  {t.created_at
                    ? new Date(t.created_at).toLocaleDateString()
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      className="px-2 py-1 text-sm rounded-md border border-slate-200 hover:bg-slate-50"
                      onClick={() => setSelectedTenant(t)}

                    >
                      View
                    </button>
                    <button
                      className="px-2 py-1 text-sm rounded-md border border-slate-200 hover:bg-slate-50"
                      onClick={() => handleEditTenant(t)}

                    >
                      Edit
                    </button>
                    {t.status === "inactive" ? (
                      <button
                        className="px-2 py-1 text-sm rounded-md border border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                        onClick={() => handleStatusChange(t.id, "active")}
                      >
                        Reactivate
                      </button>
                    ) : (
                      <button
                        className="px-2 py-1 text-sm rounded-md border border-rose-300 text-rose-700 hover:bg-rose-50"
                        onClick={() => handleStatusChange(t.id, "inactive")}
                      >
                        Deactivate
                      </button>
                    )}

                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>


      {/* ─── Add Tenant Modal ─────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Add New Tenant</h3>
            <form onSubmit={handleAddTenant} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tenant Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500"
                  placeholder="Company name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-teal-600 text-white hover:bg-teal-700 text-sm"
                >
                  Add Tenant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Edit Tenant Modal ─────────────────── */}
      {showEditModal && editingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">
              Edit Tenant – {editingTenant.name}
            </h3>

            <form
              onSubmit={async (e) => {
                e.preventDefault();

                const { error } = await supabase
                  .from("companies")
                  .update({
                    name: editingTenant.name.trim(),
                    status: editingTenant.status,
                  })
                  .eq("id", editingTenant.id);

                if (error) {
                  console.error(error);
                  toast.error("Failed to update tenant");
                } else {
                  toast.success("Tenant updated");
                  setShowEditModal(false);
                  setEditingTenant(null);
                  loadTenants();
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tenant Name
                </label>
                <input
                  type="text"
                  value={editingTenant.name}
                  onChange={(e) =>
                    setEditingTenant({ ...editingTenant, name: e.target.value })
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={editingTenant.status}
                  onChange={(e) =>
                    setEditingTenant({
                      ...editingTenant,
                      status: e.target.value as "active" | "inactive",
                    })
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingTenant(null);
                  }}
                  className="px-4 py-2 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-teal-600 text-white hover:bg-teal-700 text-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── View Tenant Drawer (smooth + right arrow) ─────────────────── */}
      {selectedTenant && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            onClick={closeDrawer}
            className={`absolute inset-0 bg-black/40 transition-opacity duration-350 ease-[cubic-bezier(0.22,1,0.36,1)] ${drawerOpen ? "opacity-100" : "opacity-0"}`}
          />

          {/* Slide-in panel */}
          <div
            className={`
        absolute right-0 top-0 h-full bg-white shadow-xl overflow-y-auto p-6
        transform transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]
        ${drawerFull ? "w-screen max-w-none" : "w-[480px] max-w-full"}
        ${drawerOpen ? "translate-x-0" : "translate-x-full"}
      `}
          >
            {/* Header row */}
            <div className="flex items-center justify-between mb-4">
              {/* Left — Expand toggle */}
              <button
                onClick={() => setDrawerFull((prev) => !prev)}
                className="flex items-center gap-1 rounded-md px-3 py-2 hover:bg-slate-100 transition-colors text-slate-700"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-5 w-5 transform transition-transform duration-300 ${drawerFull ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  {/* Left arrow */}
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm font-medium">
                  {drawerFull ? "Collapse" : "Expand"}
                </span>
              </button>

              {/* Center — Tenant Name */}
              <h3 className="text-lg font-semibold text-slate-900 truncate text-center flex-1">
                {selectedTenant.name}
              </h3>

              {/* Right — Close Drawer */}
              <button
                onClick={closeDrawer}
                className="flex items-center gap-1 rounded-md px-3 py-2 hover:bg-slate-100 transition-colors text-slate-700"
              >
                <span className="text-sm font-medium">Close</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  {/* Right arrow */}
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Tabs bar */}
         <div className="flex border-b border-slate-200 mb-4 text-sm font-medium">
  {[
    { key: "details", label: "Details" },
    { key: "templates", label: "Templates" },
    { key: "billing", label: "Billing" },
    { key: "users", label: "Users" },
    // Only show "Features" tab if role === global_admin
    ...(role === "global_admin" ? [{ key: "features", label: "Features" }] : []),
  ].map((tab) => (
    <button
      key={tab.key}
      onClick={() => setActiveTenantTab(tab.key as typeof activeTenantTab)}
      className={`px-4 py-2 -mb-px border-b-2 transition-colors ${
        activeTenantTab === tab.key
          ? "border-teal-500 text-teal-600"
          : "border-transparent text-slate-500 hover:text-slate-700"
      }`}
    >
      {tab.label}
    </button>
  ))}
</div>



            {/* Tab content area */}
            <div className="space-y-4 text-sm">
              {activeTenantTab === "details" && (
                <div>
                  <p className="text-slate-600">
                    Status:
                    <span
                      className={`ml-2 inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${selectedTenant.status === "inactive"
                        ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                        : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                        }`}
                    >
                      {selectedTenant.status === "inactive" ? "Inactive" : "Active"}
                    </span>
                  </p>
                  <p>
                    Created:{" "}
                    {selectedTenant.created_at
                      ? new Date(selectedTenant.created_at).toLocaleDateString()
                      : "—"}
                  </p>
                  <p>
                    Updated:{" "}
                    {selectedTenant.updated_at
                      ? new Date(selectedTenant.updated_at).toLocaleDateString()
                      : "—"}
                  </p>
                </div>
              )}

              {activeTenantTab === "templates" && (
                <div>
                  {loadingTemplates ? (
                    <p className="text-slate-500 italic">Loading templates…</p>
                  ) : templates.length > 0 ? (
                    <ul className="space-y-2">
                      {templates.map((tpl) => (
                        <li
                          key={tpl.template_id}
                          className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50 transition"
                        >
                          <div>
                            <p className="font-medium text-slate-900">{tpl.name}</p>
                            <p className="text-xs text-slate-500">
                              {tpl.description || "No description"}
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <span
                              className={`text-xs font-semibold px-2 py-1 rounded-full ${tpl.visibility === "global"
                                ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
                                : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                }`}
                            >
                              {tpl.visibility === "global" ? "Global" : "Custom"}
                            </span>

                            {/* Only custom templates can be assigned/unassigned */}
                            {tpl.visibility === "custom" && (
                              tpl.company_id ? (
                                <button
                                  onClick={async () => {
                                    await supabase.rpc("unassign_template_from_tenant", {
                                      p_company_id: selectedTenant.id,
                                      p_template_id: tpl.template_id,
                                    });
                                    toast.success("Template unassigned");
                                    loadTemplatesForTenant(selectedTenant.id);
                                  }}
                                  className="text-xs text-rose-600 hover:underline"
                                >
                                  Remove
                                </button>
                              ) : (
                                <button
                                  onClick={async () => {
                                    await supabase.rpc("assign_template_to_tenant", {
                                      p_company_id: selectedTenant.id,
                                      p_template_id: tpl.template_id,
                                    });
                                    toast.success("Template assigned");
                                    loadTemplatesForTenant(selectedTenant.id);
                                  }}
                                  className="text-xs text-teal-600 hover:underline"
                                >
                                  Add
                                </button>
                              )
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-500 italic">No templates assigned yet.</p>
                  )}
                </div>
              )}

              {activeTenantTab === "billing" && (
                <div>
                  <p className="text-slate-600 italic">
                    Billing plan and credit info for this tenant will appear here (synced with global billing).
                  </p>
                </div>
              )}

              {activeTenantTab === "users" && (
                <div>
                  <p className="text-slate-600 italic">
                    Users associated with this tenant will appear here.
                  </p>
                </div>
              )}

          {role === "global_admin" && activeTenantTab === "features" && (
  <div>
    <TenantFeaturesTab tenantId={selectedTenant.id} />
  </div>
)}

            </div> 
          </div> 
        </div> 
      )}
    </div> 
  );
} // closes component

