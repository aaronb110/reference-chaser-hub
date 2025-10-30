"use client";

import { useRoleGuard } from "@/hooks/useRoleGuard";

export default function ManagerPage() {
  const { loading } = useRoleGuard(["manager", "company_admin", "admin", "global_admin"]);

  if (loading) {
    return <div className="p-6 text-slate-600">Checking access…</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-slate-800 mb-4">📋 Manager Dashboard</h1>
      <p className="text-slate-600">
        Manage candidates, monitor reference progress, and oversee your team’s requests.
      </p>
    </div>
  );
}
