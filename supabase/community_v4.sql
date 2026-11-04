-- Support-Acts in der History: Markierung "(Support)" hinter dem Artist-Namen (Checkbox im Bearbeiten-Dialog).
-- Einmalig im Supabase SQL-Editor ausführen, vor dem Deploy der App-Version mit dieser Funktion.
-- Siehe src/supabase.js (loadHistory/addHistoryEntry/updateHistoryEntry/loadCommunityHistories).

alter table public.history add column if not exists is_support boolean not null default false;

-- Wie in community.sql, nur mit zusätzlichem Feld is_support je Eintrag (damit auch fremde Listen "(Support)" zeigen)
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
                      'rating', h.rating,
                      'is_support', h.is_support
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

-- create or replace behält die Rechte; zur Sicherheit erneut setzen
revoke all on function public.get_community_histories() from public, anon;
grant execute on function public.get_community_histories() to authenticated;
