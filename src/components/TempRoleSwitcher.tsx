"use client";
import { useRole } from "@/context/RoleContext";

export default function TempRoleSwitcher() {
  const { role, setRole } = useRole();

  const roles = [
    "user",
    "manager",
    "company_admin",
    "billing",
    "admin",
    "global_admin",
  ];

  return (
    <select
      value={role || "user"}
      onChange={(e) => setRole(e.target.value as any)}
      className="border rounded px-2 py-1 text-sm"
    >
      {roles.map((r) => (
        <option key={r} value={r}>
          {r}
        </option>
      ))}
    </select>
  );
}
