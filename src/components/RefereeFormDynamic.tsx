"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import RefereeForm from "./RefereeForm";

export default function RefereeFormDynamic({
  templateFields,
  refereeId,
  candidateId,
  templateId,
}: {
  templateFields: any[];
  refereeId: string;
  candidateId: string;
  templateId: string;
}) {
  const [submitted, setSubmitted] = useState(false);
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

const handleSubmit = async (values: Record<string, string>) => {
  try {
    // 1️⃣ Save the responses
    const { error: insertError } = await supabase
      .from("reference_responses")
      .insert({
        referee_id: refereeId,
        candidate_id: candidateId,
        template_id: templateId,
        responses: values,
        submitted_at: new Date().toISOString(),
      });

    if (insertError) throw insertError;

    // 2️⃣ Update referee record
    const { error: updateRefereeError } = await supabase
      .from("referees")
      .update({
        status: "completed",
        response_received_at: new Date().toISOString(),
      })
      .eq("id", refereeId);

    if (updateRefereeError) throw updateRefereeError;

    // 3️⃣ Update reference_requests record
    const { error: updateRequestError } = await supabase
      .from("reference_requests")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("referee_id", refereeId)
      .eq("candidate_id", candidateId);

    if (updateRequestError) throw updateRequestError;

    // 4️⃣ Optional: Insert into audit log
    //const { error: auditError } = await supabase.from("audit_logs").insert({
     // action: "reference_completed",
     // target_table: "referees",
     // target_id: refereeId,
     // candidate_id: candidateId,
     // changes: { status: "completed" },
     // created_at: new Date().toISOString(),
    // });

    // if (auditError) console.warn("Audit log insert failed:", auditError);

    // 5️⃣ Show confirmation
    setSubmitted(true);

    console.log("✅ Reference submitted successfully for referee:", refereeId);
  } catch (err) {
    console.error("❌ Error submitting reference:", err);
    alert("There was a problem saving your reference. Please try again.");
  }
};


  if (submitted) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold text-slate-800 mb-2">
          Thank you for submitting your reference!
        </h2>
        <p className="text-slate-600">
          Your responses have been recorded successfully.
        </p>
      </div>
    );
  }

  return <RefereeForm templateFields={templateFields} onSubmit={handleSubmit} />;
}
