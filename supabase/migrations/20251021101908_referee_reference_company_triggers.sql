-- Ensure referees inherit company_id from candidate
create or replace function public.set_referee_company_id()
returns trigger as $$
begin
  if new.company_id is null and new.candidate_id is not null then
    select company_id into new.company_id
    from public.candidates
    where id = new.candidate_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_referees_set_company_id on public.referees;

create trigger trg_referees_set_company_id
before insert on public.referees
for each row execute function public.set_referee_company_id();

-- Ensure reference_requests inherit company_id from candidate
create or replace function public.set_reference_request_company_id()
returns trigger as $$
begin
  if new.company_id is null and new.candidate_id is not null then
    select company_id into new.company_id
    from public.candidates
    where id = new.candidate_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_reference_requests_set_company_id on public.reference_requests;

create trigger trg_reference_requests_set_company_id
before insert on public.reference_requests
for each row execute function public.set_reference_request_company_id();

-- Backfill existing data
update public.referees r
set company_id = c.company_id
from public.candidates c
where r.candidate_id = c.id
  and r.company_id is null;

update public.reference_requests rr
set company_id = c.company_id
from public.candidates c
where rr.candidate_id = c.id
  and rr.company_id is null;
