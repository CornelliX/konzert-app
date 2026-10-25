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
  const { data: { user } } = await supabase.auth.getUser()
  return user
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

export async function deleteOldManualEvents() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const today = new Date().toISOString().split('T')[0]
  await supabase.from('manual_events').delete().lt('date', today).eq('user_id', user.id)
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
  if (!user) return false
  const { error } = await supabase.from('radar').insert({ user_id: user.id, artist })
  return !error
}

export async function removeRadarArtist(id) {
  const user = await getUser()
  if (!user) return false
  const { error } = await supabase.from('radar').delete().eq('id', id).eq('user_id', user.id)
  return !error
}

export async function toggleBookmark(eventId, status) {
  const user = await getUser()
  if (!user) return false
  const { data } = await supabase.from('bookmarks').select('*').eq('user_id', user.id).eq('event_id', String(eventId)).eq('status', status)
  if (data && data.length > 0) {
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