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

  useEffect(() => {
    async function loadRole() {
      const { data: { session } } = await supabase.auth.getSession();
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

      const fakeRole = window.localStorage.getItem("tempRole");
      setRole((fakeRole as Role) || (profile?.role as Role) || "user");
      setLoading(false);
    }

    loadRole();
  }, []);

  // When role changes (via switcher), persist to localStorage for page reloads
  useEffect(() => {
    if (role) {
      window.localStorage.setItem("tempRole", role);
    }
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
