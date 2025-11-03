-- Migration: Fix and lock down audit_logs RLS + policies
-- Date: 2025-11-03

-- 1️⃣ Ensure RLS is always on and enforced
alter table if exists public.audit_logs enable row level security;
alter table if exists public.audit_logs force row level security;

-- 2️⃣ Make sure the essential policies exist (idempotent)
do $$
begin
  -- allow_admin_insert_audit_logs
  if not exists (
    select 1 from pg_policies where tablename = 'audit_logs' and policyname = 'allow_admin_insert_audit_logs'
  ) then
    create policy "allow_admin_insert_audit_logs"
    on public.audit_logs for insert
    to authenticated
    with check (true);
  end if;

  -- allow_public_insert_audit_logs
  if not exists (
    select 1 from pg_policies where tablename = 'audit_logs' and policyname = 'allow_public_insert_audit_logs'
  ) then
    create policy "allow_public_insert_audit_logs"
    on public.audit_logs for insert
    to anon
    with check (true);
  end if;

  -- allow_service_role_insert_audit_logs
  if not exists (
    select 1 from pg_policies where tablename = 'audit_logs' and policyname = 'allow_service_role_insert_audit_logs'
  ) then
    create policy "allow_service_role_insert_audit_logs"
    on public.audit_logs for insert
    to service_role
    with check (true);
  end if;

  -- allow_global_admin_read_audit_logs
  if not exists (
    select 1 from pg_policies where tablename = 'audit_logs' and policyname = 'allow_global_admin_read_audit_logs'
  ) then
    create policy "allow_global_admin_read_audit_logs"
    on public.audit_logs for select
    to authenticated
    using (true);
  end if;

  -- allow_read_own_company_audit_logs
  if not exists (
    select 1 from pg_policies where tablename = 'audit_logs' and policyname = 'allow_read_own_company_audit_logs'
  ) then
    create policy "allow_read_own_company_audit_logs"
    on public.audit_logs for select
    to authenticated
    using (
      company_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'company_id')::uuid
    );
  end if;
end$$;
