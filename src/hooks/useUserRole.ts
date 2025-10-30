"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export type Role =
  | "user"
  | "manager"
  | "company_admin"
  | "billing"
  | "admin"
  | "global_admin";

type State = {
  loading: boolean;
  isAuthenticated: boolean;
  role: Role | null;
  companyId: string | null;
  userId: string | null;
  email: string | null;
  error: string | null;
};

const initial: State = {
  loading: true,
  isAuthenticated: false,
  role: null,
  companyId: null,
  userId: null,
  email: null,
  error: null,
};

export function useUserRole() {
  const [state, setState] = useState<State>(initial);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const {
          data: { session },
          error: sErr,
        } = await supabase.auth.getSession();
        if (sErr) throw sErr;

        if (!session) {
          if (mounted) {
            setState((s) => ({
              ...s,
              loading: false,
              isAuthenticated: false,
              role: null,
              userId: null,
              email: null,
            }));
          }
          return;
        }

        const user = session.user;

        // Read DB profile
        const { data: profile, error: pErr } = await supabase
          .from("profiles")
          .select("role, company_id")
          .eq("id", user.id)
          .maybeSingle();

        if (pErr) throw pErr;

        // Dev override (TempRoleSwitcher)
        const fakeRole = (typeof window !== "undefined" &&
          window.localStorage.getItem("tempRole")) as Role | null;

        const finalRole =
          fakeRole ||
          (profile?.role as Role | null) ||
          ("user" as Role); // safest fallback

        if (mounted) {
          setState({
            loading: false,
            isAuthenticated: true,
            role: finalRole,
            companyId: profile?.company_id ?? null,
            userId: user.id,
            email: user.email ?? null,
            error: null,
          });
        }
      } catch (e: any) {
        if (mounted) {
          setState((s) => ({
            ...s,
            loading: false,
            error: e?.message ?? "Failed to load role",
          }));
        }
      }
    }

    load();

    // Keep in sync if auth changes on this tab
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
