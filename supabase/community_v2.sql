-- Community v2: Namen und Merklisten anderer Lords. Ergänzt supabase/community.sql (Tabellen bleiben unverändert).
-- Einmalig im Supabase SQL-Editor ausführen. Siehe src/supabase.js (loadEventMarks, loadCommunityBookmarks).
--
-- Datenschutz: Wer "Merkliste für alle sichtbar" eingeschaltet hat, zeigt anderen angemeldeten Nutzern seine
-- vorgemerkten und "dabei"-Events samt Lord-Titel. Nach außen sichtbar bleibt nur public_id (nie die Auth-ID
-- oder E-Mail). Beides sind security-definer-Funktionen, die nur freigegebene Profile und nur die genannten
-- Spalten liefern.

-- Wer hat dieses Event vorgemerkt bzw. ist dabei? Je Zeile ein Lord (ohne den Aufrufer); höchstens 500 Event-IDs je Aufruf.
create or replace function public.get_event_lords(event_ids text[])
returns table (event_id text, status text, public_id uuid, lord_title text, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select b.event_id, b.status, p.public_id, p.lord_title, p.created_at
  from public.bookmarks b
  join public.profiles p on p.user_id = b.user_id and p.share_bookmarks
  where auth.uid() is not null
    and b.user_id <> auth.uid()
    and b.event_id = any (event_ids[1:500])
$$;

-- Freigegebene Merklisten anderer Nutzer (ohne den Aufrufer): je Profil die Event-IDs mit Status.
create or replace function public.get_community_bookmarks()
returns table (public_id uuid, lord_title text, created_at timestamptz, marks jsonb)
language sql
stable
security definer
set search_path = public
as $$
  select p.public_id,
         p.lord_title,
         p.created_at,
         coalesce((
           select jsonb_agg(jsonb_build_object('event_id', b.event_id, 'status', b.status))
           from public.bookmarks b
           where b.user_id = p.user_id
         ), '[]'::jsonb) as marks
  from public.profiles p
  where auth.uid() is not null
    and p.share_bookmarks
    and p.user_id <> auth.uid()
$$;

revoke all on function public.get_event_lords(text[]) from public, anon;
revoke all on function public.get_community_bookmarks() from public, anon;
grant execute on function public.get_event_lords(text[]) to authenticated;
grant execute on function public.get_community_bookmarks() to authenticated;

-- Die alte Zähler-Funktion (nur Zahlen) wird nicht mehr gebraucht.
drop function if exists public.get_event_marks(text[]);
