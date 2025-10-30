"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import TempRoleSwitcher from "./TempRoleSwitcher";

type Role =
  | "user"
  | "manager"
  | "company_admin"
  | "billing"
  | "admin"
  | "global_admin";


export default function AppShell({
  children,
  role,
}: {
  children: React.ReactNode;
  role: Role;
}) {
  const pathname = usePathname();

  // Define sidebar links based on role
const nav = useMemo(() => {
  const base = [{ href: "/dashboard", label: "Dashboard" }];

  switch (role) {
    case "global_admin":
      // Everything
      base.push({ href: "/manager", label: "Manager" });
      base.push({ href: "/company-admin", label: "Company Admin" });
      base.push({ href: "/admin", label: "Global Admin" });
      // (Future) base.push({ href: "/billing", label: "Billing" });
      // (Future) base.push({ href: "/settings", label: "My Settings" });
      break;

    case "admin":
      // If you keep "admin", treat same as global_admin or close to it.
      // For now: same as global_admin so it’s not confusing.
      base.push({ href: "/manager", label: "Manager" });
      base.push({ href: "/company-admin", label: "Company Admin" });
      base.push({ href: "/admin", label: "Global Admin" });
      // (Future) base.push({ href: "/billing", label: "Billing" });
      // (Future) base.push({ href: "/settings", label: "My Settings" });
      break;

    case "company_admin":
      base.push({ href: "/manager", label: "Manager" });
      base.push({ href: "/company-admin", label: "Company Admin" });
      // (Future) base.push({ href: "/settings", label: "My Settings" });
      break;

    case "billing":
      // Just dashboard + billing when you add it
      // base.push({ href: "/billing", label: "Billing" });
      break;

    case "manager":
      // Manager only sees Manager (and Dashboard)
      base.push({ href: "/manager", label: "Manager" });
      // (Future) base.push({ href: "/settings", label: "My Settings" });
      break;

    case "user":
    default:
      // Just Dashboard (+ optional personal settings later)
      // base.push({ href: "/settings", label: "My Settings" });
      break;
  }

  return base;
}, [role]);


  return (
    <div className="min-h-screen grid grid-cols-[240px_1fr] grid-rows-[64px_1fr]">
      {/* Header */}
      <header className="col-span-2 h-16 border-b border-slate-200 px-4 flex items-center justify-between bg-white">
  <div className="font-semibold text-slate-800">Refevo</div>

  <div className="flex items-center gap-2 text-sm text-slate-600">
    <span>Role:</span>
<TempRoleSwitcher />


  </div>
</header>

      {/* Sidebar */}
      <aside className="border-r border-slate-200 bg-slate-50 p-3">
        <nav className="flex flex-col gap-1">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-md text-sm ${
                  active
                    ? "bg-white shadow-sm border border-slate-200 font-medium"
                    : "hover:bg-white hover:shadow-sm"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="p-4 bg-white">{children}</main>
    </div>
  );
}
