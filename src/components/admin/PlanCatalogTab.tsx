"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";

type Plan = {
  id: string;
  name: string;
  display_name: string;
  price_monthly: number | null;
  price_annual: number | null;
  credits_per_month: number | null;
  data_retention_days: number | null;
  is_active: boolean;
  support_level: string | null;
  plan_type: "global" | "custom";
  company_id?: string | null;
  contract_start_date?: string | null;
  contract_term_months?: number | null;
  contract_end_date?: string | null;
  is_auto_renew?: boolean;
};

type Company = { id: string; name: string };

export default function PlanCatalogTab() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState<any>({
    display_name: "",
    price_monthly: "",
    price_annual: "",
    credits_per_month: "",
    data_retention_days: "",
    support_level: "Standard",
    is_active: true,
    plan_type: "global",
    company_id: "",
    contract_start_date: "",
    contract_term_months: "",
    is_auto_renew: true,
  });


  // ─── Load Plans + Companies ───────────────────────────────
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [{ data: plansData, error: plansErr }, { data: compData, error: compErr }] =
          await Promise.all([
            supabase
              .from("plans")
              .select("*")
              .order("display_name", { ascending: true }),
            supabase.from("companies").select("id, name").order("name"),
          ]);

        if (plansErr) throw plansErr;
        if (compErr) throw compErr;
        setPlans(plansData || []);
        setCompanies(compData || []);
      } catch (err) {
        console.error("Error loading data:", err);
        toast.error("Failed to load plans or companies");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // ─── Open Edit / Add Modals ───────────────────────────────
  const openAddModal = () => {
    setEditingPlan(null);
    setForm({
      display_name: "",
      price_monthly: "",
      price_annual: "",
      credits_per_month: "",
      data_retention_days: "",
      is_active: true,
      plan_type: "global",
      company_id: "",
      contract_start_date: "",
      contract_term_months: "",
      is_auto_renew: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (plan: Plan) => {
    setEditingPlan(plan);
    setForm({
      display_name: plan.display_name,
      price_monthly: plan.price_monthly?.toString() ?? "",
      price_annual: plan.price_annual?.toString() ?? "",
      credits_per_month: plan.credits_per_month?.toString() ?? "",
      data_retention_days: plan.data_retention_days?.toString() ?? "",
      is_active: plan.is_active,
      plan_type: plan.plan_type,
      company_id: plan.company_id ?? "",
      contract_start_date: plan.contract_start_date ?? "",
      contract_term_months: plan.contract_term_months?.toString() ?? "",
      is_auto_renew: plan.is_auto_renew ?? true,
    });
    setModalOpen(true);
  };

  // ─── Save / Update ───────────────────────────────
  const handleSave = async () => {
    try {
      if (!form.display_name.trim()) {
        toast.error("Display name is required");
        return;
      }

      const baseData: any = {
        display_name: form.display_name.trim(),
        price_monthly: Number(form.price_monthly) || null,
        price_annual: Number(form.price_annual) || null,
        credits_per_month: Number(form.credits_per_month) || null,
        data_retention_days: Number(form.data_retention_days) || null,
        support_level: form.support_level,
        is_active: form.plan_type === "custom" ? false : form.is_active,
        plan_type: form.plan_type,
        company_id: form.plan_type === "custom" ? form.company_id || null : null,
        contract_start_date: form.plan_type === "custom" ? form.contract_start_date || null : null,
        contract_term_months: form.plan_type === "custom" ? Number(form.contract_term_months) || null : null,
        contract_end_date: null,
        is_auto_renew: form.plan_type === "custom" ? form.is_auto_renew : null,
      };


      // Auto-calc contract_end_date if both start and term exist
      if (baseData.contract_start_date && baseData.contract_term_months) {
        const start = new Date(baseData.contract_start_date);
        const end = new Date(start);
        end.setMonth(end.getMonth() + baseData.contract_term_months);
        baseData["contract_end_date"] = end.toISOString().split("T")[0];
      }

      if (editingPlan) {
        // Update existing
        const { error } = await supabase
          .from("plans")
          .update(baseData)
          .eq("id", editingPlan.id);

        if (error) throw error;
        toast.success("Plan updated");
        setPlans((prev) => prev.map((p) => (p.id === editingPlan.id ? { ...p, ...baseData } : p)));
      } else {
        // Insert new
        const { data, error } = await supabase.from("plans").insert(baseData).select().single();
        if (error) throw error;
        setPlans((prev) => [...prev, data]);
        toast.success("Plan added");

        // Auto-assign if enterprise
        if (baseData.plan_type === "custom" && baseData.company_id) {
          await supabase
            .from("companies")
            .update({ plan_id: data.id })
            .eq("id", baseData.company_id);
          toast.success("Company assigned to new enterprise plan");
        }
      }

      setModalOpen(false);
      setEditingPlan(null);
    } catch (err) {
      console.error(err);
      toast.error("Error saving plan");
    }
  };

  // ─── UI ───────────────────────────────
  const renderTable = (type: "global" | "custom") => (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
          <tr>
            {type === "custom" && <th className="px-4 py-3">Company</th>}
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Monthly (£)</th>
            <th className="px-4 py-3">Annual (£)</th>
            <th className="px-4 py-3">Credits</th>
            <th className="px-4 py-3">Retention</th>
            {type === "custom" && (
              <>
                <th className="px-4 py-3">Start</th>
                <th className="px-4 py-3">End</th>
                <th className="px-4 py-3">Term (m)</th>
              </>
            )}
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {plans
            .filter((p) => p.plan_type === type)
            .map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/60">
                {type === "custom" && (
                  <td className="px-4 py-3 text-slate-700">
                    {companies.find((c) => c.id === p.company_id)?.name || "—"}
                  </td>
                )}
                <td className="px-4 py-3 font-medium text-slate-800">{p.display_name}</td>
                <td className="px-4 py-3">£{p.price_monthly ?? "—"}</td>
                <td className="px-4 py-3">£{p.price_annual ?? "—"}</td>
                <td className="px-4 py-3">{p.credits_per_month ?? "—"}</td>
                <td className="px-4 py-3">{p.data_retention_days ?? "—"}</td>
                {type === "custom" && (
                  <>
                    <td className="px-4 py-3">{p.contract_start_date ?? "—"}</td>
                    <td className="px-4 py-3">{p.contract_end_date ?? "—"}</td>
                    <td className="px-4 py-3">{p.contract_term_months ?? "—"}</td>
                  </>
                )}
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${p.is_active
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                      }`}
                  >
                    {p.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  {!p.is_active && p.plan_type === "custom" ? (
<button
  onClick={async () => {
    try {
      // 1️⃣ Approve in Supabase
      const { error } = await supabase
        .from("plans")
        .update({ is_active: true })
        .eq("id", p.id);

      if (error) throw error;

      setPlans((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, is_active: true } : x))
      );

      toast.success(`Approved ${p.display_name}`);

      // 2️⃣ Get the company email to notify
      if (p.company_id) {
        const { data: companyData, error: compErr } = await supabase
          .from("companies")
          .select("id, name, billing_email")
          .eq("id", p.company_id)
          .single();

        if (compErr) throw compErr;

        if (companyData?.billing_email) {
          // 3️⃣ Call your Edge Function (or Make.com webhook)
          await fetch("/api/send-approval-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: companyData.billing_email,
              companyName: companyData.name,
              planName: p.display_name,
              startDate: p.contract_start_date,
              endDate: p.contract_end_date,
            }),
          });

          toast.success(`Notification sent to ${companyData.billing_email}`);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to approve plan or send email");
    }
  }}
  className="text-xs font-medium px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
>
  Approve
</button>

                  ) : (
                    <button
                      onClick={() => openEditModal(p)}
                      className="text-teal-600 hover:text-teal-800 text-sm font-medium"
                    >
                      Edit
                    </button>
                  )}
                </td>

              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Plan Catalog</h2>
        <button onClick={openAddModal} className="refevo-btn text-sm">
          + Add Plan
        </button>
      </div>

      <div className="mb-4 flex gap-2 border-b border-slate-200">
        {["global", "custom"].map((t) => (
          <button
            key={t}
            onClick={() => {
              setPlans([...plans]);
              setForm((f: any) => ({ ...f, plan_type: t }));
            }}

            className={`px-4 py-2 text-sm font-medium rounded-t-md ${form.plan_type === t
              ? "bg-white border border-b-white border-slate-200 text-teal-700"
              : "text-slate-600 hover:text-teal-700"
              }`}
          >
            {t === "global" ? "Global Plans" : "Enterprise Plans"}
          </button>
        ))}
      </div>

      {form.plan_type === "global" ? renderTable("global") : renderTable("custom")}

      {/* ─── Add/Edit Modal ─────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-[480px] shadow-lg">
            <h3 className="text-lg font-semibold mb-4">
              {editingPlan ? "Edit Plan" : "Add New Plan"}
            </h3>

            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              {/* Plan Type */}
              <div>
                <label className="text-sm text-slate-600">Plan Type</label>
                <select
                  value={form.plan_type}
                  onChange={(e) => setForm({ ...form, plan_type: e.target.value })}
                  className="refevo-input w-full mt-1"
                >
                  <option value="global">Global</option>
                  <option value="custom">Enterprise (Custom)</option>
                </select>
              </div>

              {/* Company (if custom) */}
              {/* Global plan fields */}
              {form.plan_type === "global" && (
                <>
                  <div>
                    <label className="text-sm text-slate-600">Monthly Price (£)</label>
                    <input
                      type="number"
                      value={form.price_monthly}
                      onChange={(e) =>
                        setForm({ ...form, price_monthly: e.target.value })
                      }
                      className="refevo-input w-full mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-slate-600">Annual Price (£)</label>
                    <input
                      type="number"
                      value={form.price_annual}
                      onChange={(e) =>
                        setForm({ ...form, price_annual: e.target.value })
                      }
                      className="refevo-input w-full mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-slate-600">Credits per Month</label>
                    <input
                      type="number"
                      value={form.credits_per_month}
                      onChange={(e) =>
                        setForm({ ...form, credits_per_month: e.target.value })
                      }
                      className="refevo-input w-full mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-slate-600">Data Retention (days)</label>
                    <input
                      type="number"
                      value={form.data_retention_days}
                      onChange={(e) =>
                        setForm({ ...form, data_retention_days: e.target.value })
                      }
                      className="refevo-input w-full mt-1"
                    />
                  </div>
                </>
              )}

              {form.plan_type === "custom" && (
                <>

                  {/* Enterprise pricing and plan details */}
                  <div>
                    <label className="text-sm text-slate-600">Monthly Price (£)</label>
                    <input
                      type="number"
                      value={form.price_monthly}
                      onChange={(e) => setForm({ ...form, price_monthly: e.target.value })}
                      className="refevo-input w-full mt-1"
                      placeholder="e.g. 499"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-slate-600">Annual Price (£)</label>
                    <input
                      type="number"
                      value={form.price_annual}
                      onChange={(e) => setForm({ ...form, price_annual: e.target.value })}
                      className="refevo-input w-full mt-1"
                      placeholder="e.g. 4990"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-slate-600">Credits per Month</label>
                    <input
                      type="number"
                      value={form.credits_per_month}
                      onChange={(e) => setForm({ ...form, credits_per_month: e.target.value })}
                      className="refevo-input w-full mt-1"
                      placeholder="e.g. 500"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-slate-600">Data Retention (days)</label>
                    <input
                      type="number"
                      value={form.data_retention_days}
                      onChange={(e) => setForm({ ...form, data_retention_days: e.target.value })}
                      className="refevo-input w-full mt-1"
                      placeholder="e.g. 365"
                    />
                  </div>

                  {/* Assign Company */}
                  <div>
                    <label className="text-sm text-slate-600">Assign to Company</label>
                    <select
                      value={form.company_id}
                      onChange={(e) => setForm({ ...form, company_id: e.target.value })}
                      className="refevo-input w-full mt-1"
                    >
                      <option value="">Select company...</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Contract details */}
                  <div className="grid grid-cols-3 gap-2 items-end">
                    <div>
                      <label className="text-sm text-slate-600">Start Date</label>
                      <input
                        type="date"
                        value={form.contract_start_date}
                        onChange={(e) =>
                          setForm({ ...form, contract_start_date: e.target.value })
                        }
                        className="refevo-input w-full mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-sm text-slate-600">Term (months)</label>
                      <input
                        type="number"
                        value={form.contract_term_months}
                        onChange={(e) =>
                          setForm({ ...form, contract_term_months: e.target.value })
                        }
                        className="refevo-input w-full mt-1"
                        placeholder="e.g. 12"
                      />
                    </div>

                    <div>
                      <label className="text-sm text-slate-600">End Date (auto)</label>
                      <input
                        type="text"
                        value={
                          form.contract_start_date && form.contract_term_months
                            ? new Date(
                              (() => {
                                const start = new Date(form.contract_start_date);
                                start.setMonth(start.getMonth() + Number(form.contract_term_months));
                                return start;
                              })()
                            )
                              .toISOString()
                              .split("T")[0]
                            : ""
                        }
                        disabled
                        className="refevo-input w-full mt-1 bg-slate-50 text-slate-500"
                        placeholder="Auto-calculated"
                      />
                    </div>
                  </div>

                  {/* Live Contract Summary */}
                  {form.contract_start_date && form.contract_term_months && (
                    <p className="mt-1 text-xs text-slate-500 italic">
                      This contract runs from{" "}
                      <span className="font-medium text-slate-700">
                        {new Date(form.contract_start_date).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>{" "}
                      to{" "}
                      <span className="font-medium text-slate-700">
                        {new Date(
                          (() => {
                            const start = new Date(form.contract_start_date);
                            start.setMonth(start.getMonth() + Number(form.contract_term_months));
                            return start;
                          })()
                        ).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>{" "}
                      ({form.contract_term_months}-month term)
                    </p>
                  )}

                  <div className="flex items-center space-x-2 mt-3">
                    <input
                      id="autoRenew"
                      type="checkbox"
                      checked={form.is_auto_renew}
                      onChange={(e) =>
                        setForm({ ...form, is_auto_renew: e.target.checked })
                      }
                    />
                    <label htmlFor="autoRenew" className="text-sm text-slate-600">
                      Auto Renew
                    </label>
                  </div>
                </>
              )}

              <div>
                <label className="text-sm text-slate-600">Support Level</label>
                <select
                  value={form.support_level}
                  onChange={(e) => setForm({ ...form, support_level: e.target.value })}
                  className="refevo-input w-full mt-1"
                >
                  <option value="Standard">Standard</option>
                  <option value="Priority">Priority</option>
                  <option value="Dedicated">Dedicated</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  id="is_active"
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm({ ...form, is_active: e.target.checked })
                  }
                />
                <label htmlFor="is_active" className="text-sm text-slate-600">
                  Active
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setModalOpen(false);
                  setEditingPlan(null);
                }}
                className="px-4 py-2 text-sm rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm rounded-md bg-teal-600 text-white hover:bg-teal-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
