-- Dynamic Referee Templates Migration
alter table public.reference_templates
  add column if not exists questions jsonb null,
  add column if not exists email_subject text null,
  add column if not exists email_body text null,
  add column if not exists category text null,
  add column if not exists is_active boolean not null default true;

create index if not exists idx_reference_templates_is_active
  on public.reference_templates (is_active);

alter table public.candidates
  add column if not exists reference_template_id uuid null
    references public.reference_templates (id) on delete set null;

alter table public.referees
  add column if not exists template_id uuid null
    references public.reference_templates (id) on delete set null;

alter table public.reference_templates enable row level security;

drop policy if exists "reference_templates_select_active" on public.reference_templates;
drop policy if exists "reference_templates_write_service_role_only" on public.reference_templates;

create policy "reference_templates_select_active"
on public.reference_templates
for select
to anon, authenticated
using (is_active = true);

create policy "reference_templates_write_service_role_only"
on public.reference_templates
as restrictive
for all
to service_role
using (true)
with check (true);
