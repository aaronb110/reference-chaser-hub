"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";

type TenantFeatures = {
  enable_credits: boolean;
  enable_custom_templates: boolean;
  custom_template_limit: number;
  enable_user_management: boolean;
  custom_templates_billing_type: string;
};




// ─────────────────────────────────────────────
//  Local confirmation modal (disable credits)
// ─────────────────────────────────────────────
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
// Temporary line for debugging
// @ts-ignore
window.supabase = supabase;

// ─────────────────────────────────────────────
//  Main Component
// ─────────────────────────────────────────────
export default function TenantFeaturesTab({ tenantId }: { tenantId: string }) {
  const [features, setFeatures] = useState<TenantFeatures | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
  async function checkSession() {
    const { data } = await supabase.auth.getSession();
    console.log("🔍 Current session metadata:", data.session?.user?.user_metadata);
  }
  checkSession();
}, []);

  // ─── Load current feature states ─────────────────────────────
  async function loadFeatures() {
    setLoading(true);
    const { data, error } = await supabase
      .from("companies")
      .select(
        "enable_credits, enable_custom_templates, custom_template_limit, enable_user_management, custom_templates_billing_type"
      )
      .eq("id", tenantId)
      .single();

    if (error) {
      console.error(error);
      toast.error("Failed to load feature flags");
    } else {
      setFeatures(data);
    }
    setLoading(false);
  }

console.log("Tenant ID being loaded:", tenantId);


useEffect(() => {
  if (!tenantId) return;
  let mounted = true;

  (async () => {
    if (mounted) await loadFeatures();
  })();

  return () => {
    mounted = false;
  };
  // ⚠️ Empty dependency array prevents repeated calls
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);


  // ─── Central update helper ─────────────────────────────
  async function updateFeature(field: keyof TenantFeatures, value: boolean) {
    if (!features) return false;
    setSaving(true);

    const updatePayload: Partial<TenantFeatures> = { [field]: value };
    if (field === "enable_custom_templates" && value === false) {
      updatePayload.custom_template_limit = 0;
    }

    console.log("Updating:", field, value, updatePayload);

    const { data, error } = await supabase
      .from("companies")
      .update(updatePayload)
      .eq("id", tenantId)
      .select(
        "enable_credits, enable_custom_templates, custom_template_limit, enable_user_management, custom_templates_billing_type"
      )
      .single();

      console.log("🧩 Update payload:", updatePayload);
console.log("🧩 Tenant ID:", tenantId);
console.log("🧩 Update result:", { data, error });


    setSaving(false);

    if (error) {
      console.error(error);
      toast.error("Failed to update feature");
      return false;
    }

    toast.success("Feature updated");
    setFeatures(data);
    return true;
  }

  // ─── Toggle handler ─────────────────────────────
  async function handleToggle(field: keyof TenantFeatures, value: boolean) {
    if (!features) return;

    if (field === "enable_credits" && value === false) {
      setShowConfirm(true);
      return;
    }

    const previous = features;
    const newFeatures = { ...features, [field]: value };
    if (field === "enable_custom_templates" && value === false) {
      newFeatures.custom_template_limit = 0;
    }

    setFeatures(newFeatures);
    const success = await updateFeature(field, value);
    if (!success) setFeatures(previous);
  }

  // ─── Template limit handler ─────────────────────────────
  async function handleLimitChange(newValue: number) {
    if (!features) return;
    setFeatures({ ...features, custom_template_limit: newValue });

    const { error } = await supabase
      .from("companies")
      .update({ custom_template_limit: newValue })
      .eq("id", tenantId);

    if (error) {
      toast.error("Failed to update limit");
    } else {
      toast.success("Template limit updated");
    }
  }

  if (loading) return <p className="text-slate-500 italic">Loading features…</p>;
  if (!features) return <p className="text-slate-500 italic">No data found.</p>;

  const disableLimit = !features.enable_custom_templates;

  return (
    <div className="space-y-5">
      <h4 className="text-base font-semibold text-slate-900">Feature Toggles</h4>

      <ToggleRow
        label="Credits Module"
        value={features.enable_credits}
        onChange={(v) => handleToggle("enable_credits", v)}
      />

      <ToggleRow
        label="Custom Templates"
        value={features.enable_custom_templates}
        onChange={(v) => handleToggle("enable_custom_templates", v)}
      />

      <ToggleRow
        label="User Management"
        value={features.enable_user_management}
        onChange={(v) => handleToggle("enable_user_management", v)}
      />

      <div className="mt-6 border-t border-slate-200 pt-4">
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Custom Template Limit
        </label>
        <input
          type="number"
          min={0}
          disabled={disableLimit}
          value={features.custom_template_limit ?? 0}
          onChange={(e) => handleLimitChange(parseInt(e.target.value, 10))}
          className={`w-24 rounded-md border px-2 py-1 text-sm focus:ring-2 focus:ring-teal-500 ${
            disableLimit
              ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
              : "border-slate-300 text-slate-700"
          }`}
        />
        <p
          className={`text-xs mt-1 ${
            disableLimit ? "text-slate-400 italic" : "text-slate-500"
          }`}
        >
          {disableLimit
            ? "Disabled while Custom Templates are off."
            : `Current billing type: ${features.custom_templates_billing_type}`}
        </p>
      </div>

      {saving && (
        <p className="text-xs text-slate-400 italic">Saving changes…</p>
      )}

      <ConfirmModal
        open={showConfirm}
        onCancel={() => setShowConfirm(false)}
        onConfirm={async () => {
          setShowConfirm(false);
          await updateFeature("enable_credits", false);
        }}
      />
    </div>
  );
}

console.count("🌀 TenantFeaturesTab mounted");

// ─────────────────────────────────────────────
//  Simple Toggle Component
// ─────────────────────────────────────────────
function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between border border-slate-200 rounded-lg px-4 py-2 bg-slate-50">
      <span className="text-sm text-slate-700">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
          value ? "bg-teal-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
            value ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
