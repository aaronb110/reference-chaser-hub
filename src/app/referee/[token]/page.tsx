import { createServerSupabase } from "@/lib/supabaseServerClient";
import { notFound } from "next/navigation";
import RefereeFormDynamic from "@/components/RefereeFormDynamic";

type Candidate = {
  id: string;
  full_name: string;
};

type RefereeRow = {
  id: string;
  name: string;
  email: string;
  status: string;
  type: string;
  template_id: string | null;
  candidate: Candidate[] | null;
};

export default async function RefereePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params; // ✅ new syntax
  const supabase = await createServerSupabase();

  // 1️⃣ Get referee data
  const { data: referee, error } = await supabase
    .from("referees")
    .select(`
      id,
      name,
      email,
      status,
      type,
      template_id,
      candidate:candidate_id (id, full_name)
    `)
    .eq("token", token)
    .single<RefereeRow>();

  console.log("🎯 Referee record:", referee);
  console.log("📄 Template ID:", referee?.template_id);

  if (error || !referee) return notFound();

  // 2️⃣ Get template data
  const { data: template, error: tmplError } = await supabase
    .from("reference_templates")
    .select("id, name, questions, is_active")
    .eq("id", referee.template_id)
    .single();

  console.log("🧩 Template lookup result:", template);
  console.log("⚙️ Template fetch error:", tmplError);

  if (tmplError || !template || template.is_active === false) {
    return (
      <div className="p-8 text-center text-slate-600">
        <p>Template not found or inactive.</p>
      </div>
    );
  }

  // 3️⃣ Parse template questions
  const templateFields = Array.isArray(template.questions)
    ? template.questions
    : [];

  // 4️⃣ Resolve candidate safely
  const candidateId = (() => {
    const c = referee.candidate;
    if (!c) return null;
    if (Array.isArray(c)) return c[0]?.id || null;
    // @ts-expect-error Supabase can return object or array
    return c.id || null;
  })();

  // 5️⃣ Render the page
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white p-8 rounded-xl shadow text-center">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">
          Hello {referee.name}
        </h1>
        <p className="text-slate-600 mb-6">
          You’ve been asked to provide a{" "}
          <span className="font-medium">{referee.type}</span> reference for{" "}
          <span className="font-medium">
            {referee.candidate?.[0]?.full_name || "this candidate"}
          </span>
          .
        </p>

        <RefereeFormDynamic
          templateFields={templateFields}
          refereeId={referee.id}
          candidateId={candidateId}
          templateId={template.id}
        />
      </div>
    </div>
  );
}
