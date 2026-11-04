-- Community-Feature: Lord-Titel, Freigaben (History/Merkliste), Favoriten und Aliase der Betrachter.
-- Siehe src/supabase.js (loadProfile/saveProfile/loadCommunityHistories/loadPeerPrefs/savePeerPref/loadEventMarks).
-- Einmalig im Supabase SQL-Editor ausführen.
--
-- Datenschutz: Nach außen sichtbar ist nur public_id (nie die Auth-ID oder E-Mail). Fremde Daten laufen
-- ausschließlich über die beiden security-definer-Funktionen unten, die nur freigegebene Profile und nur
-- die genannten Spalten liefern - die Tabellen selbst bleiben per RLS auf den Eigentümer beschränkt.

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  public_id uuid not null unique default gen_random_uuid(),
  lord_title text check (lord_title is null or (lord_title = btrim(lord_title) and char_length(lord_title) between 2 and 30)),
  share_history boolean not null default false,
  share_bookmarks boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy profiles_select_own on public.profiles for select using (auth.uid() = user_id);
create policy profiles_insert_own on public.profiles for insert with check (auth.uid() = user_id);
create policy profiles_update_own on public.profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- public_id und created_at setzt nur die Datenbank: sonst könnte jemand created_at zurückdatieren (und so
-- bei gleichen Lord-Titeln die Nummerierung "Anna"/"Anna 2" zu seinen Gunsten drehen) oder seine public_id
-- wechseln. user_id steht im Update-Recht, weil der Upsert aus dem Client die Konfliktspalte mitschickt.
revoke insert, update on public.profiles from public, anon, authenticated;
grant insert (user_id, lord_title, share_history, share_bookmarks) on public.profiles to authenticated;
grant update (user_id, lord_title, share_history, share_bookmarks) on public.profiles to authenticated;

-- Einstellungen eines Betrachters je anderem Nutzer: eigener Name (falls der Nutzer keinen Lord-Titel hat)
-- und Favorit. Privat je Betrachter, daher nur eigene Zeilen les-/schreibbar.
create table public.peer_prefs (
  viewer_id uuid not null references auth.users(id) on delete cascade,
  peer_public_id uuid not null,
  alias text check (alias is null or (alias = btrim(alias) and char_length(alias) between 1 and 30)),
  is_favorite boolean not null default false,
  primary key (viewer_id, peer_public_id)
);

alter table public.peer_prefs enable row level security;

create policy peer_prefs_select_own on public.peer_prefs for select using (auth.uid() = viewer_id);
create policy peer_prefs_insert_own on public.peer_prefs for insert with check (auth.uid() = viewer_id);
create policy peer_prefs_update_own on public.peer_prefs for update using (auth.uid() = viewer_id) with check (auth.uid() = viewer_id);
create policy peer_prefs_delete_own on public.peer_prefs for delete using (auth.uid() = viewer_id);

-- Freigegebene Histories anderer Nutzer (ohne den Aufrufer). Nur besuchte Konzerte, gleiche Regel wie
-- isHistoryVisible()/isConcertOver() in src/app.js: Tag vorbei, am Konzerttag ab 20 Uhr, per Hand
-- nachgetragene Konzerte (ohne event_id) schon am selben Tag. Zeitzone Berlin.
-- Rückgabe bewusst ohne user_id, event_id und E-Mail.
create or replace function public.get_community_histories()
returns table (public_id uuid, lord_title text, created_at timestamptz, entries jsonb)
language sql
stable
security definer
set search_path = public
as $$
  with t as (
    select (timezone('Europe/Berlin', now()))::date as d,
           extract(hour from timezone('Europe/Berlin', now())) as hr
  )
  select p.public_id,
         p.lord_title,
         p.created_at,
         coalesce((
           select jsonb_agg(
                    jsonb_build_object(
                      'title', h.title,
                      'location_name', h.location_name,
                      'location_city', h.location_city,
                      'date', h.date,
                      'rating', h.rating
                    )
                    order by h.date desc
                  )
           from public.history h
           where h.user_id = p.user_id
             and (h.date < t.d or (h.date = t.d and (h.event_id is null or t.hr >= 20)))
         ), '[]'::jsonb) as entries
  from public.profiles p
  cross join t
  where auth.uid() is not null
    and p.share_history
    and p.user_id <> auth.uid()
$$;

-- Zähler: wie viele andere Nutzer mit freigegebener Merkliste haben ein Event vorgemerkt bzw. "dabei".
-- Nur Zahlen, keine Namen; höchstens 500 Event-IDs je Aufruf.
create or replace function public.get_event_marks(event_ids text[])
returns table (event_id text, going integer, bookmarked integer)
language sql
stable
security definer
set search_path = public
as $$
  select b.event_id,
         (count(*) filter (where b.status = 'going'))::integer,
         (count(*) filter (where b.status = 'bookmarked'))::integer
  from public.bookmarks b
  join public.profiles p on p.user_id = b.user_id and p.share_bookmarks
  where auth.uid() is not null
    and b.user_id <> auth.uid()
    and b.event_id = any (event_ids[1:500])
  group by b.event_id
$$;

-- Supabase vergibt Ausführungsrechte standardmäßig auch an anon - hier nur für angemeldete Nutzer.
revoke all on function public.get_community_histories() from public, anon;
revoke all on function public.get_event_marks(text[]) from public, anon;
grant execute on function public.get_community_histories() to authenticated;
grant execute on function public.get_event_marks(text[]) to authenticated;
