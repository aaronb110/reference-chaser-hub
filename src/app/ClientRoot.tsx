'use client';

import SupabaseProvider from "@/components/SupabaseProvider";

export default function ClientRoot({ children }: { children: React.ReactNode }) {
  return <SupabaseProvider>{children}</SupabaseProvider>;
}
