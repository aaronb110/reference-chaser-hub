"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import { trimAll, toTitleCaseName, normaliseEmail, ukToE164 } from "@/lib/utils";
import type { Candidate } from "@/types/models";

type RefTypeOption = { value: string; label: string };

export default function AddRefereeModal({
  candidate,
  companyId,
  onClose,
  onSaved,
}: {
  candidate: any;
  companyId: string | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  console.log("🧠 AddRefereeModal received candidate:", candidate);

  const [full_name, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [relationship, setRelationship] = useState("");
  const [saving, setSaving] = useState(false);

  const [refereeOptions, setRefereeOptions] = useState<RefTypeOption[]>([]);
  const [selectedRefType, setSelectedRefType] = useState("");

  // 🔹 Load ref types based on candidate’s template
  useEffect(() => {
    const fetchTemplateRefTypes = async () => {
      const templateId = candidate?.template_id || candidate?.reference_template_id;
      if (!templateId) return;

      const { data: template, error } = await supabase
        .from("reference_templates")
        .select("ref_types")
        .eq("id", templateId)
        .single();

      if (error) {
        console.error("❌ Failed to fetch ref_types:", error);
        return;
      }

      console.log("📋 Loaded ref_types:", template?.ref_types);
      setRefereeOptions(template?.ref_types || []);

      if (template?.ref_types?.length === 1) {
        setSelectedRefType(template.ref_types[0].label);
      }
    };

    fetchTemplateRefTypes();
  }, [candidate]);

  // 🧠 Main save handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("🚀 handleSubmit fired");

    // Validation
    if (!full_name.trim() || !email.trim()) {
      toast.error("Full name and email are required.");
      return;
    }

    if (!selectedRefType) {
      toast.error("Please select a referee type.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid email.");
      return;
    }

    if (mobile && !/^07\d{9}$/.test(mobile)) {
      toast.error("Mobile must be UK format (07xxxxxxxxx) if provided.");
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Not authenticated.");
      setSaving(false);
      return;
    }

    const cleaned = trimAll({
      full_name,
      email,
      mobile,
      relationship,
    });

    const payload = {
      candidate_id: candidate.id,
      name: toTitleCaseName(cleaned.full_name),
      email: normaliseEmail(cleaned.email),
      mobile: cleaned.mobile ? ukToE164(cleaned.mobile) : null,
      relationship: cleaned.relationship,
      ref_type: selectedRefType,
      template_id: candidate.template_id,
      created_by: user.id,
      company_id: companyId,
    };

    console.log("🟢 Inserting referee payload:", payload);

    const {
      data,
      error,
    }: { data: any | null; error: { message?: string } | null } = await supabase
      .from("referees")
      .insert(payload)
      .select()
      .single();

    console.log("✅ Insert complete, error:", error, "data:", data);

    if (error) {
      console.error("❌ Insert error:", error);
      toast.error(error.message ?? "Error adding referee");
      setSaving(false);
      return;
    }

    // 🔹 Trigger referee email Edge Function
    if (data?.id) {
      console.log("📨 Triggering referee email for", data.email);
      const { error: fnError } = await supabase.functions.invoke(
        "send-reference-email",
        { body: { referee_id: data.id } }
      );

      if (fnError) {
        console.error("❌ Email send failed:", fnError);
        toast.success("Referee added and email queued to send.");
      } else {
        toast.success("Referee added and email sent ✅");
      }
    }

    // 🔹 Refresh dashboard + close modal
    await onSaved();
    onClose();
    setSaving(false);
  };

  // 🖼️ Modal UI
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Add Referee (manual)</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Full Name</label>
            <input
              className="w-full border rounded-lg px-3 py-2 mt-1"
              value={full_name}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Email</label>
            <input
              type="email"
              className="w-full border rounded-lg px-3 py-2 mt-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Manual add — candidate will be emailed to gain consent.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium">
              Mobile (UK) — optional (for SMS later)
            </label>
            <input
              className="w-full border rounded-lg px-3 py-2 mt-1"
              placeholder="07xxxxxxxxx"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />
          </div>

          {refereeOptions.length > 0 && (
            <div>
              <label className="block text-sm font-medium">Referee Type</label>
              <select
                className="w-full border rounded-lg px-3 py-2 mt-1"
                value={selectedRefType}
                onChange={(e) => setSelectedRefType(e.target.value)}
              >
                <option value="">Select referee type...</option>
                {refereeOptions.map((r) => (
                  <option key={r.value} value={r.label}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium">Relationship</label>
            <input
              className="w-full border rounded-lg px-3 py-2 mt-1"
              placeholder="e.g. Line Manager, HR, Colleague"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
