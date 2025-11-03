"use client";

import SupabaseProvider from "@/components/SupabaseProvider";
import { RoleProvider } from "@/context/RoleContext";

export default function ClientRoot({ children }: { children: React.ReactNode }) {
  return (
    <SupabaseProvider>
      <RoleProvider>{children}</RoleProvider>
    </SupabaseProvider>
  );
}
