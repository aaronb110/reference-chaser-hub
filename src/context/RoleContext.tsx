"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";

export type Role =
  | "user"
  | "manager"
  | "company_admin"
  | "billing"
  | "admin"
  | "global_admin";

type RoleContextType = {
  role: Role | null;
  loading: boolean;
};

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchRole() {
      console.log("🧩 [RoleContext] Fetching role (reset version) …");
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("🔴 [RoleContext] Session error:", error);
        if (isMounted) setLoading(false);
        return;
      }

      const session = data.session;
      if (!session) {
        console.log("🟠 No session → default to user");
        if (isMounted) {
          setRole("user");
          setLoading(false);
        }
        return;
      }

      // Try to read profile; if fails, default to "user"
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (profileError) {
        console.warn("⚠️ Profile error, defaulting to user:", profileError.message);
      }

      const resolved = (profile?.role as Role) || "user";
      console.log("✅ Resolved role:", resolved);
      if (isMounted) {
        setRole(resolved);
        setLoading(false);
      }
    }

    fetchRole();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <RoleContext.Provider value={{ role, loading }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used inside RoleProvider");
  return ctx;
}
