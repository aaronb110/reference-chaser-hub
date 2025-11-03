"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useUserRole, Role } from "./useUserRole";

/**
 * useRoleGuard
 * Ensures only allowed roles can access a page.
 * Example: useRoleGuard(["admin", "global_admin"]);
 */
export function useRoleGuard(allowed: Role[]) {
  const router = useRouter();
  const pathname = usePathname();
  const { role, loading, isAuthenticated } = useUserRole();

  useEffect(() => {
    if (loading || role === null) return;

    // Not logged in → login
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    // Logged in but not authorised
    if (role && !allowed.includes(role)) {
      // Prevent redirect loops (only redirect if NOT already on /admin)
      if (pathname !== "/admin") {
        router.replace("/admin");
      }
    }
  }, [loading, role, isAuthenticated, allowed, router, pathname]);

  return { role, loading };
}
