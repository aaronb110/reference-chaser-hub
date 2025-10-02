"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const navLinks = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Candidates", href: "/candidates" },
    { name: "Referees", href: "/referees" },
    { name: "Reference Requests", href: "/reference-requests" },
    { name: "Reporting", href: "/reporting" },
    { name: "Settings", href: "/settings" },
    { name: "Archived", href: "/archived" },

  ];

  return (
    <nav className="bg-white shadow-md px-6 py-3 flex justify-between items-center relative">
      {/* Logo / Brand */}
      <div className="text-xl font-bold text-blue-600">Reference Chaser Hub</div>

      {/* Nav Links */}
      <div className="flex space-x-6">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {link.name}
            </Link>
          );
        })}
      </div>

      {/* Avatar */}
      <div className="relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-9 h-9 rounded-full bg-orange-500 text-white font-bold flex items-center justify-center hover:opacity-90"
        >
          AB
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-md overflow-hidden border">
            <Link
              href="/settings"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setDropdownOpen(false)}
            >
              Account Settings
            </Link>
            <button
              onClick={() => alert("Logout clicked")} // 🔹 Replace with actual logout logic later
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
