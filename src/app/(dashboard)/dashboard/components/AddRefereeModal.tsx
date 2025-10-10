"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabaseClient";
import type { Candidate } from "@/types/models";

const ukToE164 = (mobile: string) =>
  /^07\d{9}$/.test(mobile) ? "+44" + mobile.slice(1) : mobile;

export default function AddRefereeModal({
  candidate,
  companyId,
  onClose,
  onSaved,
}: {
  candidate: Candidate;
  companyId: string | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [full_name, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState(""); // optional for now
  const [relationship, setRelationship] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!full_name.trim() || !email.trim() || !relationship.trim()) {
      toast.error("Full name, email and relationship are required.");
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

    const { error } = await supabase.from("referees").insert({
      candidate_id: candidate.id,
      full_name: full_name.trim(),
      email: email.trim().toLowerCase(),
      mobile: mobile ? ukToE164(mobile) : null,
      relationship: relationship.trim(),
      created_by: user.id,
      company_id: companyId,
    });

    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }

    // Optional: trigger consent email via RPC/Function later
    await supabase.rpc('send_candidate_consent_email', { candidate_id: candidate.id });

    await onSaved();
    setSaving(false);
  };

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
            <label className="block text-sm font-medium">Mobile (UK) — optional (for SMS later)</label>
            <input
              className="w-full border rounded-lg px-3 py-2 mt-1"
              placeholder="07xxxxxxxxx"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />
          </div>

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
