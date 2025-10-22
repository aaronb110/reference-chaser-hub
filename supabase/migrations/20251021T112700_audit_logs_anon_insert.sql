-- Ensure RLS is on
alter table public.audit_logs enable row level security;

-- Tighten the table so anon cannot spoof user/company IDs
-- (Optional but recommended) make these default/null on anonymous inserts
-- and let a trigger populate company_id from candidate_id if possible.
-- If these already exist, skip.
do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'audit_logs_set_company_from_candidate'
  ) then
    create or replace function public.fn_audit_logs_set_company_from_candidate()
    returns trigger
    language plpgsql
    as $f$
    begin
      -- If candidate_id is present and company_id not provided, derive it
      if new.candidate_id is not null and (new.company_id is null) then
        select c.company_id into new.company_id
        from public.candidates c
        where c.id = new.candidate_id;
      end if;

      -- Never allow anon to set user_id
      if current_user = 'anon' then
        new.user_id := null;
      end if;

      return new;
    end
    $f$;

    create trigger audit_logs_set_company_from_candidate
    before insert on public.audit_logs
    for each row
    execute function public.fn_audit_logs_set_company_from_candidate();
  end if;
end$$;

-- Allow ONLY specific candidate-side actions from anon
drop policy if exists "anon can insert candidate actions into audit_logs" on public.audit_logs;

create policy "anon can insert candidate actions into audit_logs"
on public.audit_logs
for insert
to anon
with check (
  action in ('candidate_consent', 'confirm_referees', 'referee_added')
  -- Optional hardening: only allow rows that do NOT set user_id directly
  and user_id is null
);

-- Keep your existing authenticated policies as-is
