"use client";

import { RoleProvider } from "@/context/RoleContext";
import AppShell from "@/components/AppShell";
import { useRole } from "@/context/RoleContext";

function ShellWithRole({ children }: { children: React.ReactNode }) {
  const { role, loading } = useRole();

  if (loading || !role) {
    return <div className="p-8 text-slate-600">Checking your access…</div>;
  }

  return <AppShell role={role}>{children}</AppShell>;
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleProvider>
      <ShellWithRole>{children}</ShellWithRole>
    </RoleProvider>
  );
}
