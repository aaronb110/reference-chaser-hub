"use client";

import { RoleProvider, useRole } from "@/context/RoleContext";
import AppShell from "@/components/AppShell";

function ShellWithRole({ children }: { children: React.ReactNode }) {
  const { role, loading } = useRole();


  console.log("🔍 ProtectedLayout render:", { role, loading });

  
  if (loading) {
    return <div className="p-8 text-slate-600">Checking your access…</div>;
  }

  // Optional: restrict pages to certain roles
  if (role !== "global_admin") {
    return (
      <div className="p-8 text-slate-600">
        You do not have permission to access this area.
      </div>
    );
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
