import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://cqxpjesovcavarrlljpn.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxeHBqZXNvdmNhdmFycmxsanBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NjI4MjYsImV4cCI6MjA4ODAzODgyNn0._paXbtV1uecR0AA08KUkKLfRkmkQw2k4W3hT5L2y2ho'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    storageKey: 'lebe-live-auth',
    storage: window.localStorage,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

// Auth presence flag in cookie (iOS Safari Fix) — actual session lives in localStorage via Supabase
supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    document.cookie = `sb-auth=1; max-age=604800; path=/; SameSite=Lax`
  } else {
    document.cookie = `sb-auth=; max-age=0; path=/`
  }
})

export async function getUser() {
  // getSession liest lokal (refresht bei Ablauf), getUser wäre jedes Mal ein Auth-Server-Roundtrip;
  // Datenzugriff schützt serverseitig RLS.
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user ?? null
}

export async function signInWithEmail(email) {
  localStorage.setItem('lebe-live-email', email)
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true }
  })
  return !error
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function verifyOtp(email, token) {
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email'
  })
  return !error
}

export async function loadManualEvents() {
  const { data, error } = await supabase.from('manual_events').select('*').order('date')
  if (error) return []
  return data.map(r => ({
    id: r.id, title: r.title, type: r.type, date: r.date, time: r.time,
    locationId: r.location_id, locationName: r.location_name, locationCity: r.location_city,
    description: r.description, ticketUrl: r.ticket_url, spotifyUrl: r.spotify_url, source: 'manual'
  }))
}

// Lokales Datum als YYYY-MM-DD (toISOString wäre UTC: in Berlin zwischen 0 und 2 Uhr "gestern")
export function localToday() {
  return new Date().toLocaleDateString('sv-SE')
}

export async function loadBookmarks() {
  const user = await getUser()
  if (!user) return { bookmarked: [], going: [] }
  const { data, error } = await supabase.from('bookmarks').select('*').eq('user_id', user.id)
  if (error) return { bookmarked: [], going: [] }
  return {
    bookmarked: data.filter(r => r.status === 'bookmarked').map(r => r.event_id),
    going: data.filter(r => r.status === 'going').map(r => r.event_id)
  }
}

export async function loadRadar() {
  const user = await getUser()
  if (!user) return []
  const { data, error } = await supabase.from('radar').select('*').eq('user_id', user.id).order('created_at')
  if (error) return []
  return data.map(r => ({ id: r.id, artist: r.artist }))
}

export async function addRadarArtist(artist) {
  const user = await getUser()
  if (!user) return null
  const { data, error } = await supabase.from('radar').insert({ user_id: user.id, artist }).select().single()
  return error || !data ? null : { id: data.id, artist: data.artist }
}

// Wie addRadarArtist, legt den Artist aber nur an, wenn er in der DB noch nicht steht (Groß-/
// Kleinschreibung egal) - null bei Dublette oder Fehler. `\`, `%` und `_` werden maskiert, sonst
// wirkten sie im ilike-Muster als Platzhalter.
export async function addRadarArtistIfNew(artist) {
  const user = await getUser()
  if (!user) return null
  const pattern = artist.replace(/[\\%_]/g, '\\$&')
  const { data, error } = await supabase.from('radar').select('id').eq('user_id', user.id).ilike('artist', pattern).limit(1)
  if (error || (data && data.length > 0)) return null
  return addRadarArtist(artist)
}

export async function removeRadarArtist(id) {
  const user = await getUser()
  if (!user) return false
  const { error } = await supabase.from('radar').delete().eq('id', id).eq('user_id', user.id)
  return !error
}

// ── Community (Tabellen/Funktionen: supabase/community.sql) ──────────────────────────────────

// Eigenes Profil: Lord-Titel und die beiden Freigabe-Schalter. Ohne Zeile gelten die Standardwerte
// (alles aus). null nur bei Fehler oder ohne Anmeldung.
export async function loadProfile() {
  const user = await getUser()
  if (!user) return null
  const { data, error } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle()
  if (error) return null
  return {
    lordTitle: data?.lord_title ?? null,
    shareHistory: data?.share_history ?? false,
    shareBookmarks: data?.share_bookmarks ?? false
  }
}

// Speichert nur die übergebenen Felder ({ lordTitle?, shareHistory?, shareBookmarks? }); legt das Profil an,
// falls es noch fehlt. Ein leerer Lord-Titel wird als null gespeichert.
export async function saveProfile(fields) {
  const user = await getUser()
  if (!user) return false
  const row = { user_id: user.id }
  if ('lordTitle' in fields) row.lord_title = fields.lordTitle?.trim() || null
  if ('shareHistory' in fields) row.share_history = !!fields.shareHistory
  if ('shareBookmarks' in fields) row.share_bookmarks = !!fields.shareBookmarks
  const { error } = await supabase.from('profiles').upsert(row, { onConflict: 'user_id' })
  return !error
}

// Freigegebene Histories anderer Nutzer. null bei Fehler (leere Liste = niemand hat etwas freigegeben).
export async function loadCommunityHistories() {
  const user = await getUser()
  if (!user) return null
  const { data, error } = await supabase.rpc('get_community_histories')
  if (error || !Array.isArray(data)) return null
  return data.map(r => ({
    publicId: r.public_id,
    lordTitle: r.lord_title,
    createdAt: r.created_at,
    entries: (r.entries || []).map(e => ({
      title: e.title, locationName: e.location_name, locationCity: e.location_city, date: e.date, rating: e.rating
    }))
  }))
}

// Eigene Betrachter-Einstellungen je anderem Nutzer: { [publicId]: { alias, isFavorite } }
export async function loadPeerPrefs() {
  const user = await getUser()
  if (!user) return {}
  const { data, error } = await supabase.from('peer_prefs').select('*').eq('viewer_id', user.id)
  if (error) return {}
  return Object.fromEntries(data.map(r => [r.peer_public_id, { alias: r.alias, isFavorite: r.is_favorite }]))
}

// Speichert nur die übergebenen Felder ({ alias?, isFavorite? }) für einen anderen Nutzer.
export async function savePeerPref(publicId, fields) {
  const user = await getUser()
  if (!user) return false
  const row = { viewer_id: user.id, peer_public_id: publicId }
  if ('alias' in fields) row.alias = fields.alias?.trim() || null
  if ('isFavorite' in fields) row.is_favorite = !!fields.isFavorite
  const { error } = await supabase.from('peer_prefs').upsert(row, { onConflict: 'viewer_id,peer_public_id' })
  return !error
}

// Zähler anderer Nutzer mit freigegebener Merkliste: { [eventId]: { going, bookmarked } }, nur Events mit
// mindestens einer Markierung. Nur Zahlen. null bei Fehler (damit der Aufrufer nichts als "0" zwischenspeichert).
export async function loadEventMarks(eventIds) {
  const user = await getUser()
  if (!user || !eventIds.length) return {}
  const { data, error } = await supabase.rpc('get_event_marks', { event_ids: eventIds.slice(0, 500).map(String) })
  if (error || !Array.isArray(data)) return null
  return Object.fromEntries(data.map(r => [r.event_id, { going: r.going, bookmarked: r.bookmarked }]))
}

export async function loadHistory() {
  const user = await getUser()
  if (!user) return []
  const { data, error } = await supabase.from('history').select('*').eq('user_id', user.id).order('date', { ascending: false })
  if (error) return []
  return data.map(r => ({ id: r.id, eventId: r.event_id, title: r.title, locationName: r.location_name, locationCity: r.location_city, date: r.date, rating: r.rating }))
}

export async function addHistoryEntry({ eventId, title, locationName, locationCity, date }) {
  const user = await getUser()
  if (!user) return null
  const { data, error } = await supabase.from('history').insert({
    user_id: user.id, event_id: eventId ?? null, title, location_name: locationName || null, location_city: locationCity || null, date
  }).select().single()
  if (error || !data) return null
  return { id: data.id, eventId: data.event_id, title: data.title, locationName: data.location_name, locationCity: data.location_city, date: data.date, rating: data.rating }
}

// rating: 1-5, oder null zum Entfernen der Bewertung (Toggle-to-clear in der UI).
export async function updateHistoryRating(id, rating) {
  const user = await getUser()
  if (!user) return false
  const { error } = await supabase.from('history').update({ rating }).eq('id', id).eq('user_id', user.id)
  return !error
}

export async function removeHistoryEntry(id) {
  const user = await getUser()
  if (!user) return false
  const { error } = await supabase.from('history').delete().eq('id', id).eq('user_id', user.id)
  return !error
}

// Für den Fall, dass ein noch nicht stattgefundenes "dabei"-Event wieder entmarkiert wird -
// der per event_id verknüpfte History-Snapshot soll dann nicht stehen bleiben.
export async function removeHistoryEntryByEventId(eventId) {
  const user = await getUser()
  if (!user) return false
  const { error } = await supabase.from('history').delete().eq('event_id', String(eventId)).eq('user_id', user.id)
  return !error
}

// `on` setzt den Zielzustand explizit (true = anlegen, false = löschen). Ohne `on` wird anhand
// des Serverzustands umgeschaltet - die UI kennt aber ihren Zielzustand und soll nicht
// invertieren, wenn lokaler und Serverstand nach einem Fehler/Zweitgerät auseinanderliegen.
export async function toggleBookmark(eventId, status, on) {
  const user = await getUser()
  if (!user) return false
  let exists
  if (on === undefined) {
    const { data } = await supabase.from('bookmarks').select('*').eq('user_id', user.id).eq('event_id', String(eventId)).eq('status', status)
    exists = data && data.length > 0
  } else {
    exists = !on
  }
  if (exists) {
    await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('event_id', String(eventId)).eq('status', status)
    return false
  } else {
    await supabase.from('bookmarks').upsert(
      { user_id: user.id, event_id: String(eventId), status },
      { onConflict: 'user_id,event_id,status', ignoreDuplicates: true }
    )
    return true
  }
}