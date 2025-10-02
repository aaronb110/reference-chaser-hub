"use client";

import React from "react";

type Request = {
  id: string;
  status: string;
  created_at: string;
};

export default function AIInsights({ requests }: { requests: Request[] }) {
  // Rule: pending > 7 days = overdue
  const overdue = requests.filter(
    (r) =>
      r.status === "pending" &&
      new Date(r.created_at) <
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ).length;

  const pending = requests.filter((r) => r.status === "pending").length;
  const completed = requests.filter((r) => r.status === "completed").length;

  return (
    <div className="bg-white shadow rounded-xl p-6 space-y-4">
      <h2 className="text-xl font-bold text-gray-900">AI Insights</h2>

      {/* Key Insights */}
      <div className="border-l-4 border-blue-500 pl-4">
        <h3 className="font-semibold text-blue-700">Key Insights</h3>
        <ul className="list-disc ml-6 text-gray-700">
          <li>{pending} requests are currently pending.</li>
          <li>{overdue} overdue requests require immediate attention.</li>
          <li>{completed} requests have been completed successfully.</li>
        </ul>
      </div>

      {/* Recommendations */}
      <div className="border-l-4 border-green-500 pl-4">
        <h3 className="font-semibold text-green-700">Recommendations</h3>
        <ul className="list-disc ml-6 text-gray-700">
          {overdue > 0 ? (
            <li>
              🚨 Prioritise contacting referees for the{" "}
              <strong>{overdue}</strong> overdue requests.
            </li>
          ) : (
            <li>✅ No overdue requests — great job keeping on top of things!</li>
          )}
          {pending > 0 && (
            <li>
              Review your <strong>{pending}</strong> pending requests to make
              sure they’re progressing.
            </li>
          )}
          {completed > 0 && (
            <li>
              Consider archiving completed requests to reduce dashboard clutter.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
