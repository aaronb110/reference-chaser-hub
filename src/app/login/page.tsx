"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

 const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    toast.error(error.message);
    setLoading(false);
    return;
  }

  toast.success("Signed in!");

  // Fetch the user's role from profiles
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user?.id)
    .maybeSingle();

  if (profileError || !profile?.role) {
    router.push("/dashboard");
    setLoading(false);
    return;
  }

  const role = profile.role;

  // Redirect based on role
  if (role === "global_admin" || role === "admin") router.push("/admin");
  else if (role === "company_admin") router.push("/company-admin");
  else if (role === "manager") router.push("/manager");
  else router.push("/dashboard");

  setLoading(false);
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleLogin}
        className="bg-white shadow-md rounded-xl p-6 w-full max-w-sm space-y-4"
      >
        <h1 className="text-xl font-semibold text-center">Refevo Login</h1>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full border rounded-lg px-3 py-2"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full border rounded-lg px-3 py-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}
