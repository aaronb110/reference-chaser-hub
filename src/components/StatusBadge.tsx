import React from "react";

type Status = "pending" | "sent" | "delivered" | "bounced" | "unknown";

export default function StatusBadge({ status }: { status?: string | null }) {
  const normalised =
    (["pending", "sent", "delivered", "bounced"].includes(status || "")
      ? (status as Status)
      : "unknown");

  const styles: Record<Status, string> = {
    pending: "bg-gray-100 text-gray-700 border-gray-200",
    sent: "bg-yellow-100 text-yellow-800 border-yellow-200",
    delivered: "bg-green-100 text-green-800 border-green-200",
    bounced: "bg-red-100 text-red-800 border-red-200",
    unknown: "bg-slate-100 text-slate-600 border-slate-200",
  };

  const emoji: Record<Status, string> = {
    pending: "⚪",
    sent: "🟡",
    delivered: "🟢",
    bounced: "🔴",
    unknown: "⚫",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-[2px] rounded-full border text-xs font-medium ${styles[normalised]}`}

    >
      <span>{emoji[normalised]}</span>
      <span className="capitalize">{normalised}</span>
    </span>
  );
}
