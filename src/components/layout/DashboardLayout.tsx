"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, FileText, FolderArchive, FilePlus } from "lucide-react";
import Image from "next/image";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Candidates", href: "/candidates", icon: Users },
  { name: "Referees", href: "/referees", icon: FileText },
  { name: "Reference Requests", href: "/reference-requests", icon: FilePlus },
  { name: "Archived", href: "/archived", icon: FolderArchive },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0A2540] text-white shadow-xl">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
          <Image src="/logo.png" alt="Refevo logo" width={36} height={36} />
          <span className="font-semibold text-lg tracking-tight">Refevo</span>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                  active
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-blue-700 hover:text-white"
                }`}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-6 py-4 text-xs text-gray-400 border-t border-white/10">
          © {new Date().getFullYear()} Refevo
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 flex flex-col">
        {/* Topbar */}
        <header className="flex items-center justify-between px-6 py-3 bg-white shadow-sm border-b border-gray-200">
          <h1 className="font-semibold text-gray-800 text-lg">
            {navItems.find((item) => pathname.startsWith(item.href))?.name ?? "Dashboard"}
          </h1>
          <div className="text-sm text-gray-500">Beta • {new Date().toLocaleDateString()}</div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </main>
    </div>
  );
}
