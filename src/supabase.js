const SUPABASE_URL = 'https://cqxpjesovcavarrlljpn.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxeHBqZXNvdmNhdmFycmxsanBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NjI4MjYsImV4cCI6MjA4ODAzODgyNn0._paXbtV1uecR0AA08KUkKLfRkmkQw2k4W3hT5L2y2ho'

export async function loadManualEvents() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/manual_events?select=*&order=date.asc`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY
    }
  })
  if (!res.ok) return []
  const rows = await res.json()
  return rows.map(r => ({
    id: r.id,
    title: r.title,
    type: r.type,
    date: r.date,
    time: r.time,
    locationId: r.location_id,
    locationName: r.location_name,
    locationCity: r.location_city,
    description: r.description,
    ticketUrl: r.ticket_url,
    spotifyUrl: r.spotify_url,
    source: 'manual'
  }))
}

export async function saveManualEvent(event, locationName, locationCity) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/manual_events`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      id: event.id,
      title: event.title,
      type: event.type,
      date: event.date,
      time: event.time,
      location_id: event.locationId,
      location_name: locationName,
      location_city: locationCity,
      description: event.description,
      ticket_url: event.ticketUrl,
      spotify_url: event.spotifyUrl
    })
  })
  return res.ok
}

export async function deleteOldManualEvents() {
  const today = new Date().toISOString().split('T')[0]
  await fetch(`${SUPABASE_URL}/rest/v1/manual_events?date=lt.${today}`, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY
    }
  })
}

export async function loadBookmarks() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/bookmarks?select=*`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
  })
  if (!res.ok) return { bookmarked: [], going: [] }
  const rows = await res.json()
  return {
    bookmarked: rows.filter(r => r.status === 'bookmarked').map(r => r.event_id),
    going: rows.filter(r => r.status === 'going').map(r => r.event_id)
  }
}

export async function toggleBookmark(eventId, status) {
  // Prüfen ob schon vorhanden
  const res = await fetch(`${SUPABASE_URL}/rest/v1/bookmarks?event_id=eq.${eventId}&status=eq.${status}`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
  })
  const rows = await res.json()
  if (rows.length > 0) {
    // Löschen
    await fetch(`${SUPABASE_URL}/rest/v1/bookmarks?event_id=eq.${eventId}&status=eq.${status}`, {
      method: 'DELETE',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
    })
    return false
  } else {
    // Hinzufügen
    await fetch(`${SUPABASE_URL}/rest/v1/bookmarks`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify({ event_id: String(eventId), status })
    })
    return true
  }
}