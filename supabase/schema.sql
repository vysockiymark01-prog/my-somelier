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

create policy "Профили видны всем авторизованным"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Можно создать только свой профиль"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Можно редактировать только свой профиль"
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

create policy "Видны только свои заявки в друзья"
  on public.friendships for select
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "Можно отправить заявку от своего имени"
  on public.friendships for insert
  to authenticated
  with check (auth.uid() = requester_id);

create policy "Можно ответить на заявку или отменить свою"
  on public.friendships for update
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "Можно удалить свою заявку/дружбу"
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
  created_at timestamptz not null default now()
);

alter table public.parties enable row level security;

create policy "Вечеринка видна хосту и приглашённым"
  on public.parties for select
  to authenticated
  using (
    auth.uid() = host_id
    or exists (
      select 1 from public.party_guests pg
      where pg.party_id = parties.id and pg.guest_id = auth.uid()
    )
  );

create policy "Создать вечеринку может любой авторизованный"
  on public.parties for insert
  to authenticated
  with check (auth.uid() = host_id);

create policy "Редактировать/удалять может только хост"
  on public.parties for update
  to authenticated
  using (auth.uid() = host_id);

create policy "Удалить может только хост"
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

create policy "Видят хост вечеринки и сам гость"
  on public.party_guests for select
  to authenticated
  using (
    auth.uid() = guest_id
    or exists (
      select 1 from public.parties p
      where p.id = party_guests.party_id and p.host_id = auth.uid()
    )
  );

create policy "Приглашать может только хост вечеринки"
  on public.party_guests for insert
  to authenticated
  with check (
    exists (
      select 1 from public.parties p
      where p.id = party_guests.party_id and p.host_id = auth.uid()
    )
  );

create policy "Гость может изменить свой RSVP, хост — статус приглашения"
  on public.party_guests for update
  to authenticated
  using (
    auth.uid() = guest_id
    or exists (
      select 1 from public.parties p
      where p.id = party_guests.party_id and p.host_id = auth.uid()
    )
  );

create policy "Хост может удалить приглашение"
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

create policy "Голоса видят хост и приглашённые"
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

create policy "Голосовать может хост или приглашённый гость"
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

create policy "Можно убрать только свой голос"
  on public.party_menu_votes for delete
  to authenticated
  using (auth.uid() = voter_id);

-- Индексы для быстрого поиска
create index if not exists idx_friendships_requester on public.friendships (requester_id);
create index if not exists idx_friendships_addressee on public.friendships (addressee_id);
create index if not exists idx_party_guests_party on public.party_guests (party_id);
create index if not exists idx_party_guests_guest on public.party_guests (guest_id);
create index if not exists idx_parties_host on public.parties (host_id);
create index if not exists idx_party_menu_votes_party on public.party_menu_votes (party_id);
create index if not exists idx_party_menu_votes_voter on public.party_menu_votes (voter_id);
