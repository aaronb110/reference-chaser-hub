"use client";

import { useRoleGuard } from "@/hooks/useRoleGuard";

export default function CompanyAdminPage() {
  const { loading } = useRoleGuard(["company_admin", "admin", "global_admin"]);

  if (loading) {
    return <div className="p-6 text-slate-600">Checking access…</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-slate-800 mb-4">🏢 Company Admin Panel</h1>
      <p className="text-slate-600">
        Manage your company’s users, reference templates, and permissions from here.
      </p>
    </div>
  );
}
