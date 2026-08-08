-- Схема базы данных для приложения «Мой сомелье».
-- Выполните этот файл целиком в Supabase Dashboard → SQL Editor → New query.

create extension if not exists "pgcrypto";

-- Профили пользователей (1:1 с auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  display_name text,
  avatar_emoji text default '🍸',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Примечание: имена политик ниже соответствуют реально работающим в базе
-- (проверено запросом к pg_policies) — раньше здесь были другие,
-- кириллические названия, которые разошлись с реальностью после ручных
-- правок через Dashboard. Если создаёте базу с нуля — эти create policy
-- отработают и создадут политики с этими именами.
create policy "profiles_select_all"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- Дружеские связи (заявки и подтверждённая дружба)
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

alter table public.friendships enable row level security;

create policy "friendships_select"
  on public.friendships for select
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "friendships_insert"
  on public.friendships for insert
  to authenticated
  with check (auth.uid() = requester_id);

create policy "friendships_update"
  on public.friendships for update
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "friendships_delete"
  on public.friendships for delete
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Вечеринки
create table if not exists public.parties (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  location text,
  starts_at timestamptz not null,
  currency text not null default '₽',
  created_at timestamptz not null default now()
);

alter table public.parties enable row level security;

create policy "parties_select"
  on public.parties for select
  to authenticated
  using (
    auth.uid() = host_id
    or exists (
      select 1 from public.party_guests pg
      where pg.party_id = parties.id and pg.guest_id = auth.uid()
    )
  );

create policy "parties_insert"
  on public.parties for insert
  to authenticated
  with check (auth.uid() = host_id);

create policy "parties_update"
  on public.parties for update
  to authenticated
  using (auth.uid() = host_id);

create policy "parties_delete"
  on public.parties for delete
  to authenticated
  using (auth.uid() = host_id);

-- Приглашения и RSVP на вечеринки
create table if not exists public.party_guests (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties (id) on delete cascade,
  guest_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'invited' check (status in ('invited', 'going', 'maybe', 'declined')),
  created_at timestamptz not null default now(),
  unique (party_id, guest_id)
);

alter table public.party_guests enable row level security;

create policy "party_guests_select"
  on public.party_guests for select
  to authenticated
  using (
    auth.uid() = guest_id
    or exists (
      select 1 from public.parties p
      where p.id = party_guests.party_id and p.host_id = auth.uid()
    )
  );

create policy "party_guests_insert"
  on public.party_guests for insert
  to authenticated
  with check (
    exists (
      select 1 from public.parties p
      where p.id = party_guests.party_id and p.host_id = auth.uid()
    )
  );

create policy "party_guests_update"
  on public.party_guests for update
  to authenticated
  using (
    auth.uid() = guest_id
    or exists (
      select 1 from public.parties p
      where p.id = party_guests.party_id and p.host_id = auth.uid()
    )
  );

-- Хост может удалить приглашение (используется и для «выгнать гостя»
-- с уже подтверждённым статусом going/maybe).
create policy "party_guests_delete"
  on public.party_guests for delete
  to authenticated
  using (
    exists (
      select 1 from public.parties p
      where p.id = party_guests.party_id and p.host_id = auth.uid()
    )
  );

-- Голоса за напитки из каталога рецептов для конкретной вечеринки.
-- recipe_id — это строковый id из локального каталога src/data/recipes.ts
-- (mojito, margarita, ...), а не отдельная таблица в базе — каталог
-- статический и хранится прямо в коде приложения.
create table if not exists public.party_menu_votes (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties (id) on delete cascade,
  voter_id uuid not null references public.profiles (id) on delete cascade,
  recipe_id text not null,
  created_at timestamptz not null default now(),
  unique (party_id, voter_id, recipe_id)
);

alter table public.party_menu_votes enable row level security;

create policy "votes_select"
  on public.party_menu_votes for select
  to authenticated
  using (
    exists (
      select 1 from public.parties p
      where p.id = party_menu_votes.party_id
        and (
          p.host_id = auth.uid()
          or exists (
            select 1 from public.party_guests pg
            where pg.party_id = p.id and pg.guest_id = auth.uid()
          )
        )
    )
  );

create policy "votes_insert"
  on public.party_menu_votes for insert
  to authenticated
  with check (
    auth.uid() = voter_id
    and exists (
      select 1 from public.parties p
      where p.id = party_menu_votes.party_id
        and (
          p.host_id = auth.uid()
          or exists (
            select 1 from public.party_guests pg
            where pg.party_id = p.id and pg.guest_id = auth.uid()
          )
        )
    )
  );

create policy "votes_delete"
  on public.party_menu_votes for delete
  to authenticated
  using (auth.uid() = voter_id);

-- Собственные рецепты пользователей (не входят в статический каталог
-- src/data/recipes.ts). По умолчанию видны только владельцу (личная
-- кулинарная книга), но при is_public = true — видны и всем остальным
-- авторизованным пользователям (раздел «Рецепты сообщества»).
create table if not exists public.custom_recipes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  emoji text default '🍹',
  category text not null,
  glass text,
  abv text not null,
  time text,
  ingredients jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  garnish text,
  tip text,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.custom_recipes enable row level security;

create policy "custom_recipes_select_own_or_public"
  on public.custom_recipes for select
  to authenticated
  using (auth.uid() = owner_id or is_public = true);

create policy "custom_recipes_insert_own"
  on public.custom_recipes for insert
  to authenticated
  with check (auth.uid() = owner_id);

create policy "custom_recipes_update_own"
  on public.custom_recipes for update
  to authenticated
  using (auth.uid() = owner_id);

create policy "custom_recipes_delete_own"
  on public.custom_recipes for delete
  to authenticated
  using (auth.uid() = owner_id);

-- Общий счёт вечеринки: позиции трат (что купили, почём, кто заплатил)
-- и отметки участников «я тоже это брал(а)». Итоговые балансы и минимальный
-- список переводов считаются на клиенте (src/lib/billSplit.ts) — в базе
-- хранятся только сырые позиции и отметки участия.
create table if not exists public.party_bill_items (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties (id) on delete cascade,
  title text not null,
  price numeric(10,2) not null check (price >= 0),
  paid_by uuid not null references public.profiles (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.party_bill_items enable row level security;

create policy "bill_items_select"
  on public.party_bill_items for select
  to authenticated
  using (
    exists (
      select 1 from public.parties p
      where p.id = party_bill_items.party_id
        and (
          p.host_id = auth.uid()
          or exists (select 1 from public.party_guests pg where pg.party_id = p.id and pg.guest_id = auth.uid())
        )
    )
  );

create policy "bill_items_insert"
  on public.party_bill_items for insert
  to authenticated
  with check (
    auth.uid() = created_by
    and exists (
      select 1 from public.parties p
      where p.id = party_bill_items.party_id
        and (
          p.host_id = auth.uid()
          or exists (select 1 from public.party_guests pg where pg.party_id = p.id and pg.guest_id = auth.uid())
        )
    )
  );

create policy "bill_items_update"
  on public.party_bill_items for update
  to authenticated
  using (
    auth.uid() = created_by
    or exists (select 1 from public.parties p where p.id = party_bill_items.party_id and p.host_id = auth.uid())
  );

create policy "bill_items_delete"
  on public.party_bill_items for delete
  to authenticated
  using (
    auth.uid() = created_by
    or exists (select 1 from public.parties p where p.id = party_bill_items.party_id and p.host_id = auth.uid())
  );

create table if not exists public.party_bill_shares (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.party_bill_items (id) on delete cascade,
  party_id uuid not null references public.parties (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (item_id, user_id)
);

alter table public.party_bill_shares enable row level security;

create policy "bill_shares_select"
  on public.party_bill_shares for select
  to authenticated
  using (
    exists (
      select 1 from public.parties p
      where p.id = party_bill_shares.party_id
        and (
          p.host_id = auth.uid()
          or exists (select 1 from public.party_guests pg where pg.party_id = p.id and pg.guest_id = auth.uid())
        )
    )
  );

create policy "bill_shares_insert"
  on public.party_bill_shares for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.parties p
      where p.id = party_bill_shares.party_id
        and (
          p.host_id = auth.uid()
          or exists (select 1 from public.party_guests pg where pg.party_id = p.id and pg.guest_id = auth.uid())
        )
    )
  );

create policy "bill_shares_delete"
  on public.party_bill_shares for delete
  to authenticated
  using (auth.uid() = user_id);

-- Жалобы на рецепты сообщества. При накоплении 3+ уникальных жалоб
-- на рецепт триггер автоматически прячет его (is_public = false).
create table if not exists public.custom_recipe_reports (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.custom_recipes (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  unique (recipe_id, reporter_id)
);

alter table public.custom_recipe_reports enable row level security;

create policy "recipe_reports_select_own"
  on public.custom_recipe_reports for select
  to authenticated
  using (auth.uid() = reporter_id);

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

-- SECURITY DEFINER: должна суметь снять is_public даже если у жалующегося
-- пользователя нет права update на чужой рецепт (его и не должно быть).
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

-- Сообщения группового чата вечеринки.
create table if not exists public.party_messages (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

alter table public.party_messages enable row level security;

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

create policy "messages_delete_own"
  on public.party_messages for delete
  to authenticated
  using (auth.uid() = sender_id);

-- Включаем Realtime для чата, если ещё не включён.
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

-- Индексы для быстрого поиска
create index if not exists idx_friendships_requester on public.friendships (requester_id);
create index if not exists idx_friendships_addressee on public.friendships (addressee_id);
create index if not exists idx_party_guests_party on public.party_guests (party_id);
create index if not exists idx_party_guests_guest on public.party_guests (guest_id);
create index if not exists idx_parties_host on public.parties (host_id);
create index if not exists idx_party_menu_votes_party on public.party_menu_votes (party_id);
create index if not exists idx_party_menu_votes_voter on public.party_menu_votes (voter_id);
create index if not exists idx_custom_recipes_owner on public.custom_recipes (owner_id);
create index if not exists idx_custom_recipes_public on public.custom_recipes (is_public) where is_public = true;
create index if not exists idx_party_bill_items_party on public.party_bill_items (party_id);
create index if not exists idx_party_bill_shares_item on public.party_bill_shares (item_id);
create index if not exists idx_party_bill_shares_party on public.party_bill_shares (party_id);
create index if not exists idx_recipe_reports_recipe on public.custom_recipe_reports (recipe_id);
create index if not exists idx_party_messages_party on public.party_messages (party_id, created_at);
