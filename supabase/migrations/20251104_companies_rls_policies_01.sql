-- Migration: RLS + policies for companies (admins + global_admin)
-- Date: 2025-11-03

-- 1) Ensure RLS is on (and optionally enforced)
alter table if exists public.companies enable row level security;
-- If you want to prevent bypass by owner: uncomment next line
-- alter table if exists public.companies force row level security;

-- Helper expressions (inline) read from JWT:
-- role        := (current_setting('request.jwt.claims', true)::jsonb ->> 'role')
-- company_id  := (current_setting('request.jwt.claims', true)::jsonb ->> 'company_id')::uuid

do $$
begin
  -- SELECT for admins on their own company, and for global_admin on all
  if not exists (
    select 1 from pg_policies
    where tablename = 'companies' and policyname = 'companies_select_admins_and_global'
  ) then
    create policy "companies_select_admins_and_global"
    on public.companies
    for select
    to authenticated
    using (
      -- global_admin can see all companies
      (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'global_admin'
      OR
      -- admin can see only their own company
      (
        (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'admin'
        AND id = (current_setting('request.jwt.claims', true)::jsonb ->> 'company_id')::uuid
      )
    );
  end if;

  -- UPDATE for global_admin on all
  if not exists (
    select 1 from pg_policies
    where tablename = 'companies' and policyname = 'companies_update_global_admin'
  ) then
    create policy "companies_update_global_admin"
    on public.companies
    for update
    to authenticated
    using (
      (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'global_admin'
    )
    with check (
      (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'global_admin'
    );
  end if;

  -- UPDATE for admin on their own company
  if not exists (
    select 1 from pg_policies
    where tablename = 'companies' and policyname = 'companies_update_admin_own_company'
  ) then
    create policy "companies_update_admin_own_company"
    on public.companies
    for update
    to authenticated
    using (
      (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'admin'
      AND id = (current_setting('request.jwt.claims', true)::jsonb ->> 'company_id')::uuid
    )
    with check (
      (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'admin'
      AND id = (current_setting('request.jwt.claims', true)::jsonb ->> 'company_id')::uuid
    );
  end if;

  -- (Optional) INSERT/DELETE rules: typically restricted to service_role only.
  if not exists (
    select 1 from pg_policies
    where tablename = 'companies' and policyname = 'companies_insert_service_role'
  ) then
    create policy "companies_insert_service_role"
    on public.companies
    for insert
    to service_role
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'companies' and policyname = 'companies_delete_service_role'
  ) then
    create policy "companies_delete_service_role"
    on public.companies
    for delete
    to service_role
    using (true);
  end if;
end$$;
