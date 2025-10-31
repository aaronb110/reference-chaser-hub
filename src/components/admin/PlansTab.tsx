"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function PlansTab() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>("");

  // ─── Load Companies ───────────────────────────────
  useEffect(() => {
    async function loadCompanies() {
      setLoading(true);
      const { data, error } = await supabase
        .from("companies")
        .select(`
    id,
    name,
    status,
    created_at,
    plan_id,
    companies_plan_id_fkey(display_name)
  `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        toast.error("Error loading companies");
      }
      setCompanies(data || []);
      setLoading(false);
    }
    loadCompanies();
  }, []);

  // ─── Load Plans ───────────────────────────────
  useEffect(() => {
    async function loadPlans() {
      const { data, error } = await supabase
        .from("plans")
        .select("id, display_name, name, price_monthly, price_annual")
        .eq("is_active", true)
        .order("price_monthly");
      if (error) console.error(error);
      setPlans(data || []);
    }
    loadPlans();
  }, []);

  // ─── Handle Plan Change ──────────────────────────
  async function handleChangePlan() {
    if (!selectedCompany || !selectedPlan) return;
    const { error } = await supabase
      .from("companies")
      .update({ plan_id: selectedPlan })
      .eq("id", selectedCompany.id);
    if (error) {
      console.error(error);
      toast.error("Plan update failed");
    } else {
      toast.success("Plan updated");
      setModalOpen(false);
      // refresh
      const refreshed = await supabase
        .from("companies")
        .select("id, name, status, created_at, plan_id, plans(display_name)")
        .order("created_at", { ascending: false });
      setCompanies(refreshed.data || []);
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900 mb-6">Plan Management</h2>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
            <tr>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Current Plan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-center text-slate-500">
                  Loading plans…
                </td>
              </tr>
            )}
            {!loading &&
              companies.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {c.companies_plan_id_fkey?.display_name ?? "—"}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${c.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-slate-100 text-slate-600"
                        }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        setSelectedCompany(c);
                        setSelectedPlan(c.plan_id || "");
                        setModalOpen(true);
                      }}
                      className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Change Plan
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* ─── Change Plan Modal ───────────────────── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Plan for {selectedCompany?.name}</DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Select new plan
            </label>
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Choose plan…</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name} ({p.price_monthly ? `£${p.price_monthly}/mo` : "Free"})
                </option>
              ))}
            </select>
          </div>

          <DialogFooter className="mt-6 flex justify-end gap-2">
            <button
              onClick={() => setModalOpen(false)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleChangePlan}
              disabled={!selectedPlan}
              className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              Confirm
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
