"use client";

import RefereeForm from "./RefereeForm";

export default function RefereeFormWrapper() {
  return (
    <RefereeForm
      templateFields={[
        { key: "capacity", label: "How do you know the candidate?", type: "text", required: true },
        { key: "reliability", label: "How reliable were they?", type: "rating", scale: 5, required: true },
        { key: "comments", label: "Any additional comments?", type: "textarea" },
      ]}
      onSubmit={(values) => console.log("Submitted values:", values)}
    />
  );
}
