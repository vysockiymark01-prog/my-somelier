-- Миграция: currency для вечеринок, жалобы на рецепты, чат вечеринки.

alter table public.parties add column if not exists currency text not null default '₽';

create table if not exists public.custom_recipe_reports (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.custom_recipes (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  unique (recipe_id, reporter_id)
);

alter table public.custom_recipe_reports enable row level security;

drop policy if exists "recipe_reports_select_own" on public.custom_recipe_reports;
create policy "recipe_reports_select_own"
  on public.custom_recipe_reports for select
  to authenticated
  using (auth.uid() = reporter_id);

drop policy if exists "recipe_reports_insert" on public.custom_recipe_reports;
create policy "recipe_reports_insert"
  on public.custom_recipe_reports for insert
  to authenticated
  with check (
    auth.uid() = reporter_id
    and exists (
      select 1 from public.custom_recipes cr
      where cr.id = custom_recipe_reports.recipe_id and cr.owner_id <> auth.uid()
    )
  );

create or replace function public.handle_recipe_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.custom_recipe_reports where recipe_id = new.recipe_id) >= 3 then
    update public.custom_recipes set is_public = false where id = new.recipe_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_recipe_report_moderation on public.custom_recipe_reports;
create trigger trg_recipe_report_moderation
  after insert on public.custom_recipe_reports
  for each row
  execute function public.handle_recipe_report();

create table if not exists public.party_messages (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

alter table public.party_messages enable row level security;

drop policy if exists "messages_select" on public.party_messages;
create policy "messages_select"
  on public.party_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.parties p
      where p.id = party_messages.party_id
        and (
          p.host_id = auth.uid()
          or exists (select 1 from public.party_guests pg where pg.party_id = p.id and pg.guest_id = auth.uid())
        )
    )
  );

drop policy if exists "messages_insert" on public.party_messages;
create policy "messages_insert"
  on public.party_messages for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.parties p
      where p.id = party_messages.party_id
        and (
          p.host_id = auth.uid()
          or exists (select 1 from public.party_guests pg where pg.party_id = p.id and pg.guest_id = auth.uid())
        )
    )
  );

drop policy if exists "messages_delete_own" on public.party_messages;
create policy "messages_delete_own"
  on public.party_messages for delete
  to authenticated
  using (auth.uid() = sender_id);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'party_messages'
  ) then
    alter publication supabase_realtime add table public.party_messages;
  end if;
end $$;

create index if not exists idx_recipe_reports_recipe on public.custom_recipe_reports (recipe_id);
create index if not exists idx_party_messages_party on public.party_messages (party_id, created_at);
