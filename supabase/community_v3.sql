-- Lord-Titel und selbst vergebene Namen: höchstens 15 Zeichen (vorher 30). Für die bestehende Datenbank,
-- einmalig im Supabase SQL-Editor ausführen. (supabase/community.sql enthält für Neuinstallationen schon die 15.)
-- Vorher geprüft: kein vorhandener Titel und kein Name ist länger als 15 Zeichen.
alter table public.profiles drop constraint profiles_lord_title_check;
alter table public.profiles add constraint profiles_lord_title_check
  check (lord_title is null or (lord_title = btrim(lord_title) and char_length(lord_title) between 2 and 15));

alter table public.peer_prefs drop constraint peer_prefs_alias_check;
alter table public.peer_prefs add constraint peer_prefs_alias_check
  check (alias is null or (alias = btrim(alias) and char_length(alias) between 1 and 15));
