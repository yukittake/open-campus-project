create table public.ranking_entries (
  id uuid primary key default gen_random_uuid(),
  player_name text,
  score integer not null,
  total_weight numeric(5, 1) not null,
  created_at timestamptz not null default now(),

  constraint ranking_entries_player_name_length_check
    check (player_name is null or (char_length(player_name) >= 1 and char_length(player_name) <= 24)),
  constraint ranking_entries_score_check
    check (score >= 0),
  constraint ranking_entries_total_weight_check
    check (total_weight >= 0 and total_weight <= 50.0)
);

create index ranking_entries_score_created_at_idx
  on public.ranking_entries (score desc, created_at asc);

create index ranking_entries_created_at_idx
  on public.ranking_entries (created_at desc);

alter table public.ranking_entries enable row level security;

create policy "Anyone can read ranking entries"
  on public.ranking_entries
  for select
  to anon, authenticated
  using (true);

create policy "Anyone can create ranking entries"
  on public.ranking_entries
  for insert
  to anon, authenticated
  with check (true);

grant usage on schema public to anon, authenticated;
grant select, insert on table public.ranking_entries to anon, authenticated;
