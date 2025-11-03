"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
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
  setRole: (r: Role) => void;
  loading: boolean;
};

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ Load role once when session changes
  useEffect(() => {
    let ignore = false;

    async function fetchRole() {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session) {
        setRole("user");
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!ignore) {
        const stored = localStorage.getItem("tempRole");
        setRole((stored as Role) || (profile?.role as Role) || "user");
        setLoading(false);
      }
    }

    // 🔄 Subscribe once to auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      fetchRole();
    });

    // Run immediately
    fetchRole();

    return () => {
      ignore = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  // ✅ Store role changes safely
  useEffect(() => {
    if (role) localStorage.setItem("tempRole", role);
  }, [role]);

  return (
    <RoleContext.Provider value={{ role, setRole, loading }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) throw new Error("useRole must be used inside RoleProvider");
  return context;
}
