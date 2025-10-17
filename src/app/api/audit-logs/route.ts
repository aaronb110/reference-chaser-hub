import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (key) => cookieStore.get(key)?.value,
          set: (key, value, options) => {
            try {
              cookieStore.set({ name: key, value, ...options });
            } catch {}
          },
          remove: (key, options) => {
            try {
              cookieStore.set({ name: key, value: "", ...options });
            } catch {}
          },
        },
      }
    );

    const { searchParams } = new URL(req.url);

    const companyId = searchParams.get("company_id");
    const userName = searchParams.get("user_name");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const pageParam = searchParams.get("page");

    const page = parseInt(pageParam || "1", 10);
    const limit = 20;
    const offset = (page - 1) * limit;

    if (!companyId) {
      return NextResponse.json({ error: "Missing company_id" }, { status: 400 });
    }

    // ✅ Auth check
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, company_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (!["manager", "admin"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ✅ Build query
    let query = supabase
      .from("audit_logs_pretty")
      .select("*", { count: "exact" })
      .eq("company_id", profile.company_id);

    if (userName && userName !== "all") {
      query = query.ilike("user_name", userName);
    }

    if (startDate) query = query.gte("created_at", `${startDate}T00:00:00Z`);
    if (endDate) query = query.lte("created_at", `${endDate}T23:59:59Z`);

    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      data,
      meta: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err: any) {
    console.error("❌ Error fetching audit logs:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
