-- History-Feature: dauerhafte Liste besuchter Konzerte unterhalb der Gemerkt-Liste.
-- Referenziert KEINE events.json-IDs - der Scraper entfernt vergangene Events aus
-- events.json, daher wird Titel/Location/Datum als Snapshot gespeichert statt per
-- event_id nachzuschlagen. event_id wird optional mitgespeichert, nur um beim
-- automatischen Sync (going -> history) Duplikate zu vermeiden bzw. beim Entmarkieren
-- eines noch nicht stattgefundenen "dabei"-Events den Snapshot wieder zu löschen.
-- Siehe src/supabase.js (loadHistory/addHistoryEntry/removeHistoryEntry).
-- Einmalig im Supabase SQL-Editor ausführen.

create table public.history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id text,
  title text not null,
  location_name text,
  location_city text,
  date date not null,
  created_at timestamptz not null default now()
);

alter table public.history enable row level security;

create policy history_select_own on public.history for select using (auth.uid() = user_id);
create policy history_insert_own on public.history for insert with check (auth.uid() = user_id);
create policy history_delete_own on public.history for delete using (auth.uid() = user_id);
