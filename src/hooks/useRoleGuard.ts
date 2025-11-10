"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export function useRoleGuard(allowedRoles: string[]) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function run() {
      console.log("🧩 Guard starting...");
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Supabase session error:", error);
        setLoading(false);
        return;
      }

      const session = data?.session;
      if (!session) {
        console.warn("🚫 No session, redirecting to /login");
        router.push("/login");
        return;
      }

      console.log("🧩 Session user:", session.user?.email);
      console.log("🧩 app_metadata:", session.user?.app_metadata);
      console.log("🧩 user_metadata:", session.user?.user_metadata);

      const role =
        session.user?.app_metadata?.role ||
        session.user?.user_metadata?.role ||
        null;

      console.log("🧩 Detected role:", role);

      if (!role) {
        console.warn("🚫 No role in token — likely missing JWT claims");
        setLoading(false);
        return;
      }

      if (allowedRoles.includes(role)) {
        console.log("✅ Access granted");
      } else {
        console.warn("🚫 Access denied (redirect)");
        router.push("/login");
      }

      setLoading(false);
    }

    run();
  }, [allowedRoles, router]);

  return { loading };
}
