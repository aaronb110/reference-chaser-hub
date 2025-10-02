"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function NewRequestPage() {
  const [step, setStep] = useState(1);
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [candidatePhone, setCandidatePhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("+44");
  const [refereeName, setRefereeName] = useState("");
  const [refereeEmail, setRefereeEmail] = useState("");
  const [refereePhone, setRefereePhone] = useState("");
  const [refereeRelationship, setRefereeRelationship] = useState("");

  const router = useRouter();

  const handleCancel = () => {
    router.push("/dashboard"); // adjust if your dashboard path differs
  };

  const handleSave = async () => {
    // Save candidate
    const { data: candidate, error: candidateError } = await supabase
      .from("candidates")
      .insert([
        {
          full_name: candidateName,
          email: candidateEmail,
          phone: `${phoneCode}${candidatePhone.replace(/^0+/, "")}`,
        },
      ])
      .select()
      .single();

    if (candidateError || !candidate) {
      toast.error("Error saving candidate");
      return;
    }

    // Save referee
    const { data: referee, error: refError } = await supabase
      .from("referees")
      .insert([
        {
          full_name: refereeName,
          email: refereeEmail,
          phone: refereePhone,
          relationship: refereeRelationship,
        },
      ])
      .select()
      .single();

    if (refError || !referee) {
      toast.error("Error saving referee");
      return;
    }

    // Create request
    const { error: reqError } = await supabase.from("reference_requests").insert([
      {
        candidate_id: candidate.id,
        referee_id: referee.id,
        status: "pending",
      },
    ]);

    if (reqError) {
      toast.error("Error creating request");
    } else {
      toast.success("New request created ✅");
      router.push("/dashboard");
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white shadow rounded-xl p-8 space-y-6">
      <h1 className="text-2xl font-bold">New Reference Request</h1>

      {/* Step 1 - Candidate */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Full Name *</label>
            <input
              type="text"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Email *</label>
            <input
              type="email"
              value={candidateEmail}
              onChange={(e) => setCandidateEmail(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Phone</label>
            <div className="flex">
              <select
                value={phoneCode}
                onChange={(e) => setPhoneCode(e.target.value)}
                className="border rounded-l-lg px-3 py-2"
              >
                <option value="+44">+44</option>
                <option value="+1">+1</option>
                <option value="+61">+61</option>
                <option value="+91">+91</option>
              </select>
              <input
                type="tel"
                value={candidatePhone}
                onChange={(e) => setCandidatePhone(e.target.value)}
                className="w-full border rounded-r-lg px-3 py-2"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 2 - Method */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-gray-600">
            How would you like to collect referee details?
          </p>
          <button
            disabled
            className="w-full px-4 py-3 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
          >
            Candidate Link (Coming Soon)
          </button>
          <button
            onClick={() => setStep(3)}
            className="w-full px-4 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Enter Manually
          </button>
        </div>
      )}

      {/* Step 3 - Referee */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Referee Name *</label>
            <input
              type="text"
              value={refereeName}
              onChange={(e) => setRefereeName(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Referee Email *</label>
            <input
              type="email"
              value={refereeEmail}
              onChange={(e) => setRefereeEmail(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Referee Phone</label>
            <input
              type="tel"
              value={refereePhone}
              onChange={(e) => setRefereePhone(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Relationship *</label>
            <input
              type="text"
              value={refereeRelationship}
              onChange={(e) => setRefereeRelationship(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-6">
        <button
          onClick={handleCancel}
          className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
        >
          Cancel
        </button>

        <div className="flex gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
            >
              Back
            </button>
          )}

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
            >
              Save Request
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
