"use client";

import React from "react";

type StatusBadgeProps = {
  status?: string | null;
};

const STATUS_STYLES: Record<
  string,
  { label: string; bg: string; text: string; icon?: string }
> = {
  // Email-related
  sent: { label: "Sent", bg: "bg-[#E0F7F6]", text: "text-[#007E7C]", icon: "✉️" },
  delivered: { label: "Delivered", bg: "bg-[#E6FAF9]", text: "text-[#00B3B0]", icon: "📬" },
  bounced: { label: "Bounced", bg: "bg-[#FEE2E2]", text: "text-[#B91C1C]", icon: "❌" },

  // Consent-related
  pending: { label: "Awaiting Consent", bg: "bg-[#FFF7E6]", text: "text-[#B45309]", icon: "⏳" },
  awaiting_consent: { label: "Awaiting Consent", bg: "bg-[#FFF7E6]", text: "text-[#B45309]", icon: "⏳" },
  granted: { label: "Consent Granted", bg: "bg-[#E6FAF9]", text: "text-[#00B3B0]", icon: "✅" },
  consented: { label: "Consent Granted", bg: "bg-[#E6FAF9]", text: "text-[#00B3B0]", icon: "✅" },
  declined: { label: "Consent Declined", bg: "bg-[#FEE2E2]", text: "text-[#B91C1C]", icon: "🚫" },

  // Reference workflow
  completed: { label: "Completed", bg: "bg-[#E6FAF9]", text: "text-[#00B3B0]", icon: "🏁" },
  limited: { label: "Limited", bg: "bg-[#FFF4E6]", text: "text-[#B45309]", icon: "⚠️" },
  referees_submitted: { label: "Referees Submitted", bg: "bg-[#E0F2FE]", text: "text-[#1E3A8A]", icon: "🧾" },

  // Fallback
  unknown: { label: "Unknown", bg: "bg-gray-100", text: "text-gray-600", icon: "❔" },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  if (!status) status = "unknown";
  const normalized = status.toLowerCase().trim();
  const style = STATUS_STYLES[normalized] || STATUS_STYLES["unknown"];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
      style={{
        border: `1px solid ${style.text.replace("text-", "#") || "#CBD5E1"}`,
      }}
    >
      <span>{style.icon}</span>
      <span>{style.label}</span>
    </span>
  );
}
