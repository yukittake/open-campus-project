drop index if exists public.ranking_entries_score_created_at_idx;

create index ranking_entries_score_created_at_idx
  on public.ranking_entries (score desc, created_at desc);
