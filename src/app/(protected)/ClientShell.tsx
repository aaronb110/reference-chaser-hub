"use client";

import { useRole } from "@/context/RoleContext";
import AppShell from "@/components/AppShell";

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const { role, loading } = useRole();

  if (loading || !role) {
    return <div className="p-8 text-slate-600">Checking your access…</div>;
  }

  return <AppShell role={role}>{children}</AppShell>;
}
