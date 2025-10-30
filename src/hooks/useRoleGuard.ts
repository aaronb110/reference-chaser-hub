"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserRole, Role } from "./useUserRole";

/**
 * useRoleGuard
 * Redirects users who are not authorised for the given roles.
 * Usage: const { role, loading } = useRoleGuard(["admin", "global_admin"]);
 */
export function useRoleGuard(allowed: Role[]) {
  const router = useRouter();
  const { role, loading, isAuthenticated } = useUserRole();

  useEffect(() => {
    // Wait until role has definitely loaded
    if (loading || role === null) return;

    // Not logged in → login
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    // Logged in but no permission
   if (!allowed.includes(role)) {
  // Default to admin home so global admins aren't kicked out too early
  router.replace("/admin");
}

  }, [loading, role, isAuthenticated, allowed, router]);

  return { role, loading };
}
