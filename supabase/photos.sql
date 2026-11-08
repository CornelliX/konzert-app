-- Erinnerungsfotos: bis zu 3 Fotos je History-Eintrag, privater Storage-Bucket, optional für andere Lords sichtbar.
-- Einmalig im Supabase SQL-Editor ausführen (nach community_v4.sql), vor dem Deploy der App-Version mit dieser Funktion.
-- Siehe src/photos.js (verkleinern, Cache) und src/supabase.js (upload/remove/sign).
--
-- Eine Datei je Foto: "<user_id>/<uuid>.jpg" (lange Kante 1200 px). In history.photo_paths steht der volle Objektname.
-- Der Name ändert sich nie, die Datei ist unveränderlich (deshalb darf der Client sie dauerhaft zwischenspeichern).

alter table public.history add column if not exists photo_paths text[] not null default '{}';
alter table public.history drop constraint if exists history_photo_paths_check;
alter table public.history add constraint history_photo_paths_check check (
  cardinality(photo_paths) <= 3
  and array_to_string(photo_paths, ',') ~ '^([0-9a-f-]{36}/[0-9a-f-]{36}\.jpg(,|$))*$'
);

alter table public.profiles add column if not exists share_photos boolean not null default false;
grant insert (user_id, lord_title, share_history, share_bookmarks, share_photos) on public.profiles to authenticated;
grant update (user_id, lord_title, share_history, share_bookmarks, share_photos) on public.profiles to authenticated;

-- Privater Bucket, nur JPEG, höchstens 2 MB je Datei
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('history-photos', 'history-photos', false, 2097152, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg'];

-- Hat der Besitzer des Ordners Fotos freigegeben (History UND Fotos)? security definer, weil profiles per RLS nur
-- dem Eigentümer lesbar ist; liefert nur ein Ja/Nein, keine Profildaten.
create or replace function public.photos_shared(owner text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id::text = owner and p.share_history and p.share_photos
  )
$$;
revoke all on function public.photos_shared(text) from public, anon;
grant execute on function public.photos_shared(text) to authenticated;

drop policy if exists history_photos_select on storage.objects;
drop policy if exists history_photos_insert on storage.objects;
drop policy if exists history_photos_delete on storage.objects;

create policy history_photos_select on storage.objects for select to authenticated
  using (bucket_id = 'history-photos'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.photos_shared((storage.foldername(name))[1])));
create policy history_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'history-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy history_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'history-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Wie in community_v4.sql, zusätzlich photo_paths je Eintrag - nur wenn der Lord Fotos freigegeben hat
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
                      'is_support', h.is_support,
                      'photo_paths', case when p.share_photos then to_jsonb(h.photo_paths) else '[]'::jsonb end
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

revoke all on function public.get_community_histories() from public, anon;
grant execute on function public.get_community_histories() to authenticated;
