-- Run once in the Supabase SQL Editor (Dashboard > SQL Editor > New query > Run).

create table if not exists public.requests (
  id bigint generated always as identity primary key,
  bdr_email text not null,
  industry text not null,
  request text not null,
  source_link text,  -- data the BDR attached to the request
  link text,         -- enriched data the Lead Gen team sends back
  requested_at timestamptz not null default now(),
  fulfilled_at timestamptz
);

-- For projects created before source_link existed.
alter table public.requests add column if not exists source_link text;

alter table public.requests enable row level security;

-- The pages talk to Supabase with the public anon key, so the anon role needs
-- permission to file a request, list the pipeline, and attach a link to a row.
create policy "anon can insert requests"
  on public.requests for insert to anon with check (true);

create policy "anon can read requests"
  on public.requests for select to anon using (true);

create policy "anon can update requests"
  on public.requests for update to anon using (true) with check (true);
