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

export default async function RefereePage(props: { params: { token: string } }) {
  const params = await props.params;
  const supabase = await createServerSupabase();

  // 🔹 1. Get referee data
  const { data: referee, error } = await supabase
    .from("referees")
    .select(
      `
        id,
        name,
        email,
        status,
        type,
        template_id,
        candidate:candidates (id, full_name)
      `
    )
    .eq("token", params.token)
    .single<RefereeRow>();

  if (error || !referee) return notFound();

  // 🔹 2. Get template data
  const { data: template, error: tmplError } = await supabase
    .from("reference_templates")
    .select("id, name, questions")
    .eq("id", referee.template_id)
    .single();

  if (tmplError || !template) {
    return (
      <div className="p-8 text-center text-slate-600">
        <p>Template not found or inactive.</p>
      </div>
    );
  }

  // 🔹 3. Parse template questions
  const templateFields = Array.isArray(template.questions)
    ? template.questions
    : [];

  // 🔹 4. Resolve candidate_id safely
  const candidateId = (() => {
    const c = referee.candidate;
    if (!c) return null;
    if (Array.isArray(c)) return c[0]?.id || null;
    // fallback if Supabase ever returns a single object
    // @ts-expect-error – temporary type mismatch, safe to ignore

    return c.id || null;
  })();

  // 🔹 5. Render page + pass template fields into form
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

        {/* ✅ Use the helper here */}
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
