-- 1) Ensure the trigger function runs with definer rights and a safe search_path
alter function public.fn_audit_logs_set_company_from_candidate()
  security definer;

-- (defense-in-depth) lock the search path so the function can’t be hijacked by temp schemas
alter function public.fn_audit_logs_set_company_from_candidate()
  set search_path = public, extensions;

-- 2) Clean up old test policies and leave one minimal insert policy
drop policy if exists anon_insert_candidate_audit_logs_test on public.audit_logs;
drop policy if exists anon_insert_candidate_audit_logs_v2   on public.audit_logs;
drop policy if exists anon_insert_candidate_audit_logs_v3   on public.audit_logs;

create policy anon_insert_candidate_audit_logs_final
on public.audit_logs
for insert
to anon, public
with check (
  action in ('candidate_consent','confirm_referees','referee_added')
  and target_id is not null
);

-- 3) Sanity check: keep RLS on (don’t change if already enabled)
-- alter table public.audit_logs enable row level security;

-- 4) Optional fallback (ONLY if needed after testing; otherwise omit!)
-- create policy anon_can_select_candidates_for_audit
-- on public.candidates
-- for select
-- to anon
-- using (true);
