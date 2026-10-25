-- Radar-Feature: Nutzer tragen Künstler ohne anstehendes Konzert ein, Treffer beim Scrapen
-- werden automatisch vorgemerkt. Siehe src/supabase.js (loadRadar/addRadarArtist/removeRadarArtist).
-- Einmalig im Supabase SQL-Editor ausführen.

create table public.radar (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  artist text not null,
  created_at timestamptz not null default now()
);

alter table public.radar enable row level security;

-- user_id wird vom Client mitgeschickt (gleiches Muster wie bookmarks/manual_events) -
-- ohne diese Policies könnte jeder mit dem öffentlichen anon-Key beliebige user_id-Werte
-- einschleusen und fremde Radar-Listen lesen/verändern.
create policy radar_select_own on public.radar for select using (auth.uid() = user_id);
create policy radar_insert_own on public.radar for insert with check (auth.uid() = user_id);
create policy radar_delete_own on public.radar for delete using (auth.uid() = user_id);
