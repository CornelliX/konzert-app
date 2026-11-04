import { getLocations, getEvents, saveData, loadData } from './data.js'
import { loadBookmarks, toggleBookmark, loadRadar, addRadarArtist, addRadarArtistIfNew, removeRadarArtist, loadHistory, addHistoryEntry, removeHistoryEntry, removeHistoryEntryByEventId, updateHistoryRating, getUser, signInWithEmail, verifyOtp, signOut, localToday, loadProfile, saveProfile, loadCommunityHistories, loadPeerPrefs, savePeerPref, loadEventMarks, loadCommunityBookmarks, updateHistoryEntry } from './supabase.js'

// ISO-Datum + HH:MM sortiert als String korrekt; new Date(date + 'T' + time) wäre bei Events ohne
// Uhrzeit "Invalid Date" (NaN im Vergleich) und würde die Reihenfolge durcheinanderbringen
function byDateTime(a, b) {
  return (a.date + (a.time || '00:00')).localeCompare(b.date + (b.time || '00:00'))
}

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

// Nur http(s)-URLs durchlassen, bevor eine gescrapte oder manuell eingetragene URL als href
// landet - eine kompromittierte/bösartige Venue-Seite könnte sonst z.B. "javascript:..."
// einschleusen, das im Seitenkontext ausgeführt würde, sobald jemand klickt.
function safeUrl(url) {
  if (!url) return ''
  try {
    const u = new URL(url, location.href)
    return (u.protocol === 'http:' || u.protocol === 'https:') ? u.href : ''
  } catch { return '' }
}

// RFC 5545: Komma/Semikolon/Backslash escapen, vor allem aber Zeilenumbrüche entfernen -
// sonst könnte ein gescrapter Titel mit eingebettetem CR/LF zusätzliche ICS-Zeilen/Felder
// einschleusen (z.B. eine gefälschte URL oder einen Alarm) statt nur Text in SUMMARY zu sein.
function icsEscape(s) {
  return String(s ?? '').replace(/[\r\n]+/g, ' ').replace(/([,;\\])/g, '\\$1')
}

// Spotify-Suchlink ohne API/Credentials: öffnet die Spotify-Suchergebnisse für den
// (von Support-Acts/Zusätzen bereinigten) Künstlernamen. Kein direkter Artist-Link,
// aber robust und wartungsfrei - siehe spotifyUrl für den Fallback auf einen echten Link.
function spotifySearchUrl(title) {
  let core = String(title || '')
  // Promoter-Präfix wie "Landstreicher präsentiert: X" oder "Faible Booking lädt ein: X" -
  // danach steht erst der eigentliche Künstlername
  const prefixMatch = core.match(/^.+?\s+(?:presents?|präsentiert|lädt\s+ein)\s*:\s*(.+)$/i)
  if (prefixMatch) core = prefixMatch[1]
  // Support-Acts/Zusätze nach dem Namen abschneiden
  core = core
    .split(/\s*[+/]\s*|\s+feat\.?\s+|\s+ft\.?\s+|\s+w\/\s+|\s+support:?\s+|\s+special\s+guests?:?\s+|\s+mit\s+/i)[0]
    .replace(/\([^)]*\)/g, '')
    .trim()
  return `https://open.spotify.com/search/${encodeURIComponent(core || title)}`
}

// Trennzeichen zwischen Hauptact und Support-Act(s)/Zusätzen in einem Lineup-Titel - von
// extractArtists() (bereinigte Künstlernamen für Spotify/Radar/History) und renderTitleHtml()
// (Fett/Mager-Darstellung bei unverändertem Original-Text) gemeinsam genutzt, damit beide
// Stellen konsistent erkennen, wo der Hauptact endet.
const ACT_SEPARATOR_SOURCE = '\\s*\\+\\s*|\\s+feat\\.?\\s+|\\s+ft\\.?\\s+|\\s+w\\/\\s+|,?\\s*support:?\\s+|\\s+special\\s+guests?:?\\s+|\\s+mit\\s+'

// Emojis (samt Variation Selector/Joiner/Flaggen) und Leerraum am Anfang/Ende eines Künstlernamens
// entfernen ("🔥 Band 🎶" -> "Band"); Emojis mitten im Namen bleiben. Bleibt nichts übrig, gilt das Original.
const EMOJI_CLASS = '\\p{Extended_Pictographic}\\p{Emoji_Modifier}\\u200d\\ufe0f\\u{1F1E6}-\\u{1F1FF}'
const EDGE_EMOJI_RE = new RegExp(`^[\\s${EMOJI_CLASS}]+|[\\s${EMOJI_CLASS}]+$`, 'gu')
function stripEdgeEmoji(name) {
  const str = String(name ?? '')
  return str.replace(EDGE_EMOJI_RE, '') || str.trim()
}

// Platzhalter statt echter Künstlernamen ("Monad + tba.") - kein eigener Act
const ACT_PLACEHOLDER = /^(?:t\.?\s?b\.?\s?[acd]\.?|n\.?\s?n\.?|special\s+guests?|support|guests?|gäste|und\s+weitere|u\.?\s?a\.?|\.{2,}|…)$/i

// Erkennt mehrere im Titel genannte Künstler (Vorband + Hauptact etc.), z.B.
// "Enter Shikari + Holding Absence + The Callous Daoboys" -> 3 Namen. Bewusst kein Split
// an "/" (anders als spotifySearchUrl oben), da das echte Bandnamen wie "AC/DC" zerreißen
// würde - hier soll nur bei eindeutigen Mehrfach-Lineup-Trennern aufgesplittet werden.
function extractArtists(title) {
  let core = String(title || '')
  const prefixMatch = core.match(/^.+?\s+(?:presents?|präsentiert|lädt\s+ein)\s*:\s*(.+)$/i)
  if (prefixMatch) core = prefixMatch[1]
  core = core.split(/\s+live\s+@|\s+-\s+im\s+anschluss/i)[0]
  const rawParts = core.split(new RegExp(ACT_SEPARATOR_SOURCE, 'i'))
  const seen = new Set()
  const artists = []
  for (const raw of rawParts) {
    const clean = stripEdgeEmoji(raw.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim().replace(/^special\s+guests?:?\s+/i, '').replace(/^[|\-–—]\s*/, '').replace(/\s*[|\-–—]\s*$/, ''))
    if (clean.length < 2 || /^\d+$/.test(clean) || ACT_PLACEHOLDER.test(clean) || seen.has(clean.toLowerCase())) continue
    seen.add(clean.toLowerCase())
    artists.push(clean)
  }
  return artists.length ? artists : [stripEdgeEmoji(title)]
}

// Zeigt den Original-Titel unverändert an, stylt aber den Hauptact fett und alles ab dem
// ersten Lineup-Trenner (Support-Act, "feat. X" etc.) dünner. Anders als extractArtists()
// wird hier nichts bereinigt/entfernt (keine Klammern/Promoter-Präfixe gestrippt) - ein
// "(ausverkauft)"-Zusatz oder "X präsentiert:" soll im Kartentitel sichtbar bleiben.
function renderTitleHtml(title) {
  const str = String(title || '')
  const parts = str.split(new RegExp(`(${ACT_SEPARATOR_SOURCE})`, 'i'))
  if (parts.length <= 1) return `<span style="font-weight:700;">${esc(str)}</span>`
  let html = `<span style="font-weight:700;">${esc(parts[0])}</span>`
  for (let i = 1; i < parts.length; i += 2) {
    html += `<span style="font-weight:400; color:rgba(255,255,255,0.68);">${esc(parts[i])}${esc(parts[i + 1] || '')}</span>`
  }
  return html
}

// Der Scraper klassifiziert unbekannte Titel standardmäßig als "konzert" (z.B. Vorträge,
// Kulturabende ohne Musikbezug), wodurch der Spotify-Button fälschlich auftauchen kann.
// Bewusst konservativ/eng gehalten: breitere Begriffe wie "Fest", "Jubiläum", "Talk" wurden
// gegen echte Daten getestet und hätten legitime Konzerte fälschlich ausgeblendet (z.B.
// "Ritter Butzke Jubiläum w/ NTO", "J MAHON'S SPOOKFEST (DJ-Set)").
function looksLikeNonMusicEvent(title) {
  return /\b(kultur|vortrag|lesung|führung|vernissage|finissage|podiumsdiskussion|buchpräsentation|buchvorstellung|filmvorführung)\b/i.test(title || '')
}

let locations = getLocations()
// O(1)-Lookup statt locations.find() in Render-Hotpaths (getFilteredEvents/renderEventCard
// laufen pro Event bei jedem Tastendruck/Filterwechsel - bei mehreren tausend Events macht
// der lineare .find()-Scan dort spürbar den Unterschied)
const locationsById = new Map(locations.map(l => [l.id, l]))
// Cache für pro Render teure, aber pro Event unveränderliche Werte (Datumsformatierung via
// toLocaleDateString, Spotify-Erkennung via Regex-Splits). renderEventCard läuft bei jedem
// Filterwechsel/Suchlauf für alle sichtbaren Events erneut - bei ~2000+ Events (z.B. beim
// Zurücksetzen der Suche) hat das Neuberechnen dieser Werte bei jedem einzelnen Render
// spürbar Zeit gekostet, obwohl sich Titel/Datum eines Events zwischen zwei Renders nie ändern.
const eventRenderMetaCache = new Map()
function getEventRenderMeta(e) {
  let meta = eventRenderMetaCache.get(e.id)
  if (meta) return meta
  // Jahr nur mit anzeigen, wenn das Event nicht im laufenden Jahr stattfindet - sonst wäre
  // bei z.B. weit vorausgeplanten Konzerten ("27. November 2027") aus dem Datum allein nicht
  // ersichtlich, dass es nicht im aktuellen Jahr ist.
  const showYear = new Date(e.date + 'T12:00:00').getFullYear() !== new Date().getFullYear()
  const dateStr = new Date(e.date + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short', ...(showYear ? { year: 'numeric' } : {}) })
  const showSpotify = e.type === 'konzert' && !looksLikeNonMusicEvent(e.title)
  // Bei explizit hinterlegtem Spotify-Link (manuell eingetragene Events) keine Mehrfach-Erkennung -
  // der Link ist dann ja schon eindeutig
  const spotifyArtists = showSpotify && !e.spotifyUrl ? extractArtists(e.title) : []
  meta = { dateStr, showSpotify, spotifyArtists, spotifyMulti: spotifyArtists.length >= 2 }
  eventRenderMetaCache.set(e.id, meta)
  return meta
}
let currentUser = null
let events = []
let container = null
let filters = { cities: ['Berlin'], locationId: 'alle', dates: [], search: '' }
let headerScrollListenerAdded = false
let bookmarked = loadData('bookmarked') || []
let going = loadData('going') || []
let seenEvents = loadData('seenEvents') || []
let radar = []
let history = []
let currentView = 'liste'
let calendarOffset = 0
// Die Liste-Ansicht rendert bei mehreren tausend Events (z.B. "Alle Locations" in Berlin)
// nicht mehr alle auf einmal, sondern nur ein anfängliches Fenster - der Rest wird beim
// Scrollen in Häppchen nachgeladen. Das hält den Re-Render bei jedem Filterwechsel schnell,
// ohne dass Events unerreichbar würden (man scrollt einfach weiter und es kommt nach).
const EVENT_RENDER_BATCH = 60
let renderedEventLimit = EVENT_RENDER_BATCH
let loadMoreObserver = null
let swipeActiveWrapper = null
let swipeDocListenerAdded = false
let ptrListenerAdded = false
let dropdownListenerAdded = false
const bookmarkInFlight = new Set()
let fetchSeq = 0
let markSeenTimer = null
let titleAnimated = false
let lastNavTap = { view: '', at: 0 }
let radarOpen = false

// Community: Histories anderer Nutzer (freigegeben), eigene Betrachter-Einstellungen (Alias/Favorit)
// und das eigene Profil (Lord-Titel, Freigaben). historySlide: 0 = "Meine History", 1.. = fremde Listen
let communityRaw = []
let communityPeers = []
let bmRaw = []
let bmPeers = []
let peerPrefs = {}
let communityLoadedAt = 0
let historySlide = 0
let bookmarkSlide = 0
const peerRegistry = new Map()
let historyEditId = null
let historyEditOpen = false
let historyEditPrefill = ''
let myProfile = null
let myProfileError = false
let settingsOpen = false
// Längster Lord-Titel bzw. selbst vergebener Name (Datenbank: profiles_lord_title_check, peer_prefs_alias_check)
const LORD_NAME_MAX = 15
let eventMarks = {}
let eventMarksAt = {}

export async function renderApp(el) {
  // window.history: der Modul-Scope hat ein eigenes `history` (die History-Einträge)
  if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'
  window.scrollTo(0, 0)
  container = el
  container.innerHTML = `
    <div id="ptr-indicator" style="text-align:center; height:0; overflow:hidden; transition:height 0.2s; color:rgba(255,255,255,0.5); font-size:13px; display:flex; align-items:center; justify-content:center;">↻ Aktualisieren...</div>
    <div class="noise min-h-screen" style="background: linear-gradient(180deg, #05053a 0%, #120838 25%, #1e0848 45%, #3a0a52 60%, #52083a 78%, #620a1a 100%);">
      <div style="position:fixed; top:-10%; left:-10%; width:50vw; height:50vw; background:radial-gradient(circle, rgba(60,40,180,0.12) 0%, transparent 70%); pointer-events:none; z-index:0;"></div>
      <div style="position:fixed; bottom:-10%; right:-10%; width:40vw; height:40vw; background:radial-gradient(circle, rgba(140,20,60,0.10) 0%, transparent 70%); pointer-events:none; z-index:0;"></div>
      <div id="app-inner" class="relative z-10 max-w-xl mx-auto px-4 pb-28"></div>
    </div>
    <div id="app-modals"></div>
    <div id="bottom-nav" style="position:fixed; bottom:0; left:0; right:0; z-index:40;"></div>
  `
  const isReload = sessionStorage.getItem('lebe-loaded')
  if (!isReload) {
    document.getElementById('app-inner').innerHTML = renderSkeleton()
  }
  ;[currentUser, events] = await Promise.all([getUser(), getEvents()])
  if (currentUser) {
    const merged = await mergeAndSyncBookmarks()
    bookmarked = merged.bookmarked
    going = merged.going
    await checkRadarMatches()
    history = await loadHistory()
    await syncGoingToHistory()
    await backfillRadarFromHistory()
  }
  sessionStorage.setItem('lebe-loaded', '1')
  const c64El = document.querySelector('.c64-border')
  if (c64El) container.appendChild(c64El)
  render()
  requestAnimationFrame(() => window.scrollTo(0, 0))
  if (c64El) {
    c64El.style.opacity = '1'
    // Die App selbst lädt inzwischen (Netzwerk + Render) in ca. 1s - das C64-Intro sollte
    // diese Zeit überbrücken, nicht selbst noch draufsatteln. Früher 0.6s Fade + 800ms
    // Fallback, das hängte nach fertigem Laden nochmal spürbar Zeit an. Jetzt kürzer.
    c64El.style.transition = 'opacity 0.25s ease'
    requestAnimationFrame(() => {
      c64El.style.opacity = '0'
      // Sofort klick-durchlässig machen, sobald das Ausblenden beginnt - so kann das
      // fixed/z-index:9999-Element nie Klicks blockieren, selbst falls transitionend
      // ausbleibt (reduced-motion, Hintergrund-Tab, o.ä.)
      c64El.style.pointerEvents = 'none'
      const removeC64 = () => c64El.remove()
      c64El.addEventListener('transitionend', removeC64, { once: true })
      // Fallback: Element in jedem Fall entfernen, auch wenn transitionend nie feuert
      setTimeout(removeC64, 400)
    })
  }
}

async function mergeAndSyncBookmarks() {
  const bm = await loadBookmarks()
  const validIds = events.map(e => e.id)

  const localBm = loadData('bookmarked') || []
  const localGo = loadData('going') || []

  const toUploadBm = localBm.filter(id => validIds.some(v => v == id) && !bm.bookmarked.some(b => b == id))
  const toUploadGo = localGo.filter(id => validIds.some(v => v == id) && !bm.going.some(g => g == id))

  for (const id of toUploadBm) await toggleBookmark(id, 'bookmarked', true)
  for (const id of toUploadGo) await toggleBookmark(id, 'going', true)

  const synced = (toUploadBm.length || toUploadGo.length) ? await loadBookmarks() : bm
  return {
    bookmarked: synced.bookmarked.filter(id => validIds.some(v => v == id)),
    going: synced.going.filter(id => validIds.some(v => v == id))
  }
}

// Exakter (nur Groß-/Kleinschreibung toleranter) Artist-Abgleich statt Substring-Suche -
// sonst würde z.B. Radar-Eintrag "Pulp" fälschlich auf eine Band wie "Slow Pulp" anschlagen.
// extractArtists() zerlegt Lineup-Titel nur an eindeutigen Mehrfach-Trennern (+, feat., etc.),
// lässt aber einzelne Bandnamen mit Leerzeichen ("Slow Pulp") als ein Stück stehen - genau das
// wird hier für den Vergleich gebraucht.
function artistMatchesEvent(artist, event) {
  const needle = artist.trim().toLowerCase()
  return extractArtists(event.title).some(a => a.toLowerCase() === needle)
}

// Prüft die Radar-Künstlerliste des Nutzers gegen die frisch geladenen Events - bei Treffer
// wird das Event automatisch vorgemerkt (wie ein normaler Bookmark) und sofort aus dem Radar
// gelöscht, statt bei jedem künftigen Scrape erneut zu matchen (Spec: einmaliger Treffer).
async function checkRadarMatches() {
  radar = await loadRadar()
  if (!radar.length) return
  const matches = []
  for (const r of radar) {
    // Nur künftige Events: ein vergangener Termin, der noch bis zum nächsten Scrape in
    // events.json steht, darf den Radar-Eintrag nicht "verbrauchen"
    const hit = events.find(e => !isConcertOver(e.date) && artistMatchesEvent(r.artist, e))
    if (hit) matches.push({ radarEntry: r, event: hit })
  }
  for (const { radarEntry, event } of matches) {
    if (!bookmarked.some(b => b == event.id)) {
      bookmarked = [...bookmarked, event.id]
      await toggleBookmark(event.id, 'bookmarked', true)
    }
    radar = radar.filter(r => r.id !== radarEntry.id)
    await removeRadarArtist(radarEntry.id)
  }
  if (matches.length) showRadarBanner(matches)
}

// Ein Konzert gilt als besucht, sobald sein Tag vorbei ist - oder am Konzerttag selbst ab 20 Uhr
// Ortszeit: wer den "dabei"-Status bis dahin nicht geändert hat, ist mit Sicherheit dort, und kann
// direkt nach dem Konzert Sterne vergeben. Einheitliche Regel für History-Sichtbarkeit, "letztes
// Konzert" (Radar-Automatik), Snapshot-Löschen beim Entmarkieren und die Radar-Termin-Prüfung.
const CONCERT_OVER_HOUR = 20
function isConcertOver(date) {
  const today = localToday()
  return date < today || (date === today && new Date().getHours() >= CONCERT_OVER_HOUR)
}

// Per Hand nachgetragene Konzerte (ohne event_id) sind per Definition besucht und gelten schon am Tag
// selbst; aus "Bin dabei" angelegte Snapshots erscheinen erst, wenn das Konzert vorbei ist
function isHistoryVisible(h) {
  return isConcertOver(h.date) || (!h.eventId && h.date <= localToday())
}

// Je Artist das jüngste besuchte Konzert aus der History (Schlüssel: Name ohne Groß-/Kleinschreibung).
// Noch nicht besuchte Einträge zählen nicht: sie können keine Bewertung haben.
function latestConcerts() {
  const latest = new Map()
  for (const h of history) {
    if (!h.date || !isHistoryVisible(h)) continue
    const key = stripEdgeEmoji(h.title).toLowerCase()
    const cur = latest.get(key)
    if (!cur || h.date > cur.date || (h.date === cur.date && Number(h.id) > Number(cur.id))) latest.set(key, h)
  }
  return latest
}

// Nimmt einen Artist ins Radar auf, wenn er dort nicht schon steht (lokale Liste + DB-Abgleich) und
// kein künftiges Event hat - dann ist er ein Fall für die normale Liste, nicht fürs Radar.
async function autoAddRadar(artist) {
  const name = stripEdgeEmoji(artist)
  if (!name) return false
  if (radar.some(r => r.artist.trim().toLowerCase() === name.toLowerCase())) return false
  if (events.some(e => !isConcertOver(e.date) && artistMatchesEvent(name, e))) return false
  const added = await addRadarArtistIfNew(name)
  if (!added) return false
  radar.push(added)
  const list = document.getElementById('radar-list')
  if (list) { list.innerHTML = renderRadarList(); attachRadarRemoveEvents() }
  return true
}

// Einmalig je Gerät und Nutzer: alle Artists, deren letztes Konzert 4 oder 5 Sterne hat, ins Radar.
// Läuft nur einmal, sonst käme jeder bewusst aus dem Radar gelöschte Artist beim nächsten Start zurück.
async function backfillRadarFromHistory() {
  if (!currentUser) return
  const flag = 'radarBackfill4Stars:' + currentUser.id
  if (loadData(flag)) return
  let added = 0
  for (const h of latestConcerts().values()) {
    if ((h.rating || 0) >= 4 && await autoAddRadar(h.title)) added++
  }
  saveData(flag, true)
  if (added) showToast('📡 Radar', `${added} Artist${added > 1 ? 's' : ''} aus gut bewerteten Konzerten hinzugefügt`)
}

// Legt für ein Event einen History-Eintrag pro Act an (extractArtists() zerlegt "Main Act +
// Support Act" in einzelne Namen) - so landet ein vorhandener Support-Act als eigener
// History-Eintrag statt im Titel des Hauptacts versteckt zu bleiben. Bei Events ohne Support
// liefert extractArtists() genau ein Element (den vollen Titel), Verhalten bleibt dann wie zuvor.
async function archiveEventToHistory(ev) {
  // History führt ausschließlich Konzerte (keine Partys/Lesungen/Kurse)
  if (ev.type !== 'konzert') return []
  const loc = locationsById.get(ev.locationId)
  const locationName = loc ? loc.name : (ev.locationName || '')
  const locationCity = loc ? loc.city : (ev.locationCity || '')
  const added = []
  for (const artist of extractArtists(ev.title)) {
    const entry = await addHistoryEntry({ eventId: String(ev.id), title: artist, locationName, locationCity, date: ev.date })
    if (entry) added.push(entry)
  }
  return added
}

// Schreibt für jedes aktuell "dabei"-markierte Event einen History-Snapshot (Titel/Location/
// Datum), falls noch keiner existiert - unabhängig davon, ob das Event in der Zukunft oder
// Vergangenheit liegt. Wichtig: der Scraper entfernt vergangene Events aus events.json
// (spätestens beim nächsten wöchentlichen Lauf), daher wird der Snapshot bewusst sofort bei
// "dabei" angelegt statt erst nachträglich beim Verstreichen des Datums - sonst könnte das
// Event schon aus events.json verschwunden sein, bevor die App je Gelegenheit hatte, es zu
// archivieren. Die History-Sektion zeigt den Snapshot erst, wenn das Konzert vorbei ist (isConcertOver).
async function syncGoingToHistory() {
  if (!going.length) return
  const known = new Set([...history.map(h => h.eventId).filter(Boolean), ...(loadData('historyDismissed') || [])])
  for (const id of going) {
    if (known.has(String(id))) continue
    const ev = events.find(e => e.id == id)
    if (!ev) continue
    const added = await archiveEventToHistory(ev)
    if (added.length) history = [...history, ...added]
  }
}

// Eigene In-App-Toast statt alert() - passt sich dem Dark-Glass-Look der App an, ein
// natives alert()-Fenster ist immer schwarze Schrift auf weißem Grund und lässt sich
// nicht stylen.
function showToast(title, body, duration = 2500) {
  const el = document.createElement('div')
  el.className = 'glass'
  el.style = 'position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); width:min(90vw,420px); z-index:9999; background:rgba(22,18,60,0.98); border:1px solid rgba(168,85,247,0.4); border-left:4px solid #a855f7; color:white; border-radius:16px; padding:18px 20px; font-size:14px; box-shadow:0 25px 60px rgba(0,0,0,0.7), 0 0 40px rgba(168,85,247,0.2); cursor:pointer;'
  el.innerHTML = `<strong class="syne" style="color:#c89bfa; font-size:15px;">${esc(title)}</strong><br><span style="color:rgba(255,255,255,0.85);">${esc(body)}</span>`
  el.addEventListener('click', () => el.remove())
  document.body.appendChild(el)
  setTimeout(() => el.remove(), duration)
}

function showRadarBanner(matches) {
  const names = matches.map(m => m.event.title).join(', ')
  showToast('📡 Radar-Treffer!', `${names} — automatisch vorgemerkt.`, 3500)
  // Nur eine lokale Notification (kein Push) - kommt nur an, solange der Tab offen ist,
  // braucht aber kein eigenes Backend (siehe Entscheidung zu VAPID/Push oben im Chat).
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try { new Notification('📡 Radar-Treffer', { body: names }) } catch {}
  }
}

function renderRadarList() {
  if (!radar.length) return `<p class="text-sm" style="color:rgba(255,255,255,0.3);">Noch keine Künstler im Radar.</p>`
  return [...radar].sort((a, b) => a.artist.localeCompare(b.artist, 'de', { sensitivity: 'base' })).map(r => `
    <div class="flex items-center justify-between rounded-xl px-3 py-2" style="background:rgba(8,8,42,0.92); border:1px solid rgba(99,102,241,0.12);">
      <span style="font-size:14px; color:white;">${esc(r.artist)}</span>
      <button data-radar-remove="${r.id}" style="color:rgba(255,255,255,0.4); background:none; border:none; cursor:pointer; font-size:16px; line-height:1;">×</button>
    </div>
  `).join('')
}

function attachRadarRemoveEvents() {
  document.querySelectorAll('[data-radar-remove]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.radarRemove
      const entry = radar.find(r => String(r.id) === id)
      if (!confirm(`„${entry?.artist ?? 'Artist'}“ aus dem Radar löschen?`)) return
      radar = radar.filter(r => String(r.id) !== id)
      const list = document.getElementById('radar-list')
      if (list) { list.innerHTML = renderRadarList(); attachRadarRemoveEvents() }
      paintHistoryIcons()
      await removeRadarArtist(id)
    })
  })
}

// Event-Karten existieren parallel in Liste und Kalender - nur die der sichtbaren Pane zählt
function findVisibleCard(id) {
  // Karten können mehrfach vorkommen (Liste/Kalender, eigene und fremde Merkliste) - nur die sichtbare zählt
  const cards = document.getElementById('pane-' + currentView)?.querySelectorAll(`[data-event-id="${id}"]`) || []
  return [...cards].find(el => el.offsetParent !== null)
}

function highlightEventCard(id) {
  const wrapper = findVisibleCard(id)
  if (!wrapper) return
  wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' })
  wrapper.classList.remove('card-glow-highlight')
  // Kurz warten, bevor die Glow-Animation startet - lief sie direkt parallel zum Start des
  // Scroll-Kinematik, konkurrierten beide um denselben Frame und das Aufleuchten wirkte
  // ruckelig. So ist der Scroll schon im Gange, bevor die (teurere) box-shadow-Animation
  // überhaupt zu malen beginnt.
  setTimeout(() => {
    wrapper.classList.add('card-glow-highlight')
    setTimeout(() => wrapper.classList.remove('card-glow-highlight'), 2000)
  }, 250)
}

function openBookmarks(eventId) {
  radarOpen = false
  document.getElementById('modal-radar')?.classList.add('hidden')
  currentView = 'gemerkt'
  bookmarkSlide = 0
  render()
  if (eventId != null) requestAnimationFrame(() => highlightEventCard(eventId))
}

function focusEvent(event) {
  const loc = locationsById.get(event.locationId)
  radarOpen = false
  document.getElementById('modal-radar')?.classList.add('hidden')
  currentView = 'liste'
  filters.cities = [loc ? loc.city : (event.locationCity || 'Berlin')]
  filters.locationId = 'alle'
  filters.search = event.title
  render()
  requestAnimationFrame(() => highlightEventCard(event.id))
}

function isNew(event) {
  return !seenEvents.includes(event.id)
}

function markAllSeen() {
  seenEvents = events.map(e => e.id)
  saveData('seenEvents', seenEvents)
}

function render() {
  swipeActiveWrapper = null
  // Radar- und Einstellungs-Modal werden unten neu (hidden) gerendert - Zustand und Nav müssen dazu passen
  radarOpen = false
  settingsOpen = false
  historyEditOpen = false
  const newCount = events.filter(e => isNew(e)).length
  const inner = document.getElementById('app-inner')
  inner.innerHTML = `
    ${renderHeader()}
    ${currentUser ? '' : `
  <div class="glass rounded-2xl p-4 mb-4">
    <div id="login-step-1">
      <div style="display:flex; border-radius:12px; overflow:hidden; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.06);">
        <input id="login-email" type="email" placeholder="E-Mail für Merkliste..." value="${esc(localStorage.getItem('lebe-live-email'))}" style="flex:1; min-width:0; padding:10px 14px; font-size:14px; color:white; outline:none; background:transparent; border:none; font-family:'DM Sans',sans-serif; color-scheme:dark;" />
        <button id="login-btn" class="syne text-sm font-semibold px-4" style="background:rgba(99,102,241,0.4); border:none; border-left:1px solid rgba(99,102,241,0.3); color:white; white-space:nowrap; cursor:pointer; transition:opacity 0.2s; flex-shrink:0;">Code senden</button>
      </div>
      <p id="login-hint" style="margin-top:8px; font-size:12px; color:rgba(255,255,255,0.35); min-height:16px;"></p>
    </div>
    <div id="login-step-2" style="display:none;">
      <p style="font-size:12px; color:rgba(255,255,255,0.45); margin-bottom:10px;">Code per E-Mail gesendet — bitte Postfach prüfen.</p>
      <div style="display:flex; border-radius:12px; overflow:hidden; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.06);">
        <input id="login-code" type="text" autocomplete="one-time-code" placeholder="6-stelliger Code..." style="flex:1; min-width:0; padding:10px 14px; font-size:14px; color:white; outline:none; background:transparent; border:none; font-family:'DM Sans',sans-serif; color-scheme:dark; letter-spacing:0.2em;" />
        <button id="verify-btn" class="syne text-sm font-semibold px-4" style="background:rgba(99,102,241,0.4); border:none; border-left:1px solid rgba(99,102,241,0.3); color:white; white-space:nowrap; cursor:pointer; transition:opacity 0.2s; flex-shrink:0;">Bestätigen</button>
      </div>
      <p id="verify-hint" style="margin-top:8px; font-size:12px; color:rgba(255,100,100,0.8); min-height:16px;"></p>
    </div>
  </div>
`}
    ${currentUser ? `<div class="text-right mb-2" style="font-size:11px; color:rgba(255,255,255,0.3);">${esc(currentUser.email)} · <span id="logout-btn" style="cursor:pointer; text-decoration:underline;">Abmelden</span></div>` : ''}
    <div id="filter-bar-wrap" style="${hidesFilterBar(currentView) ? 'display:none' : ''}">
      ${renderFilters()}
    </div>
    <div id="view-content">
      <div id="pane-liste" style="${currentView !== 'liste' ? 'display:none' : ''}">
        <div id="event-list-content">${renderGroupedEvents()}</div>
      </div>
      <div id="pane-kalender" style="${currentView !== 'kalender' ? 'display:none' : ''}">
        ${renderCalendarContent()}
      </div>
      <div id="pane-gemerkt" style="${currentView !== 'gemerkt' ? 'display:none' : ''}">
        ${currentView === 'gemerkt' ? renderBookmarkedView() : ''}
      </div>
      <div id="pane-history" style="${currentView !== 'history' ? 'display:none' : ''}">
        ${currentView === 'history' ? renderHistoryView() : ''}
      </div>
    </div>
  `
  document.getElementById('app-modals').innerHTML = renderModals()
  document.getElementById('bottom-nav').innerHTML = renderBottomNav()
  attachEvents()
  if (newCount > 0 && currentView === 'liste') {
    clearTimeout(markSeenTimer)
    markSeenTimer = setTimeout(() => markAllSeen(), 3000)
  }
  // Header scroll-fade (attach once)
  if (!headerScrollListenerAdded) {
    headerScrollListenerAdded = true
    window.addEventListener('scroll', () => {
      const hdr = document.getElementById('app-header')
      if (hdr) hdr.style.opacity = String(Math.max(0, 1 - window.scrollY / 90))
    }, { passive: true })
  }
}

// inModal: Kopie im Radar-Modal - ohne id (die gehört dem Header der Hauptansicht, siehe Scroll-Fade)
function renderHeader(inModal = false) {
  const firstRender = !titleAnimated
  titleAnimated = true
  return `
    <div ${inModal ? '' : 'id="app-header"'} class="pb-3" style="padding-top:max(1.5rem,env(safe-area-inset-top)); transition:opacity 0.3s ease;">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
        <div class="${firstRender ? 'title-glow-wrap' : ''}" style="flex-shrink:0;">
          <h1 class="syne leading-none ${firstRender ? 'title-glow' : 'title-glow-static'}" style="letter-spacing:-0.02em; font-weight:800; line-height:1; font-size:1.75rem; white-space:nowrap;">
            LE.BE LIVE
          </h1>
        </div>
        <div style="display:flex; align-items:center; gap:8px; min-width:0;">
          <div class="syne text-right" style="color:rgba(168,85,247,0.75); font-weight:700; font-size:0.52em; line-height:1.3; letter-spacing:0em; text-transform:uppercase; overflow:hidden; white-space:nowrap; ${firstRender ? 'animation:tagline-appear 1.5s ease 1s both;' : ''}">
            KONZERTE UND PARTYS<br>IN COOLEN LOCATIONS
          </div>
        </div>
      </div>
    </div>
  `
}

// ── Einstellungsmenü (Lord-Titel, Freigaben, Kurzanleitung) ─────────────────────────────────────

// Kleine Symbole im Anleitungstext: {name} im Text wird durch das gleiche Icon ersetzt, das die App an der Stelle zeigt.
// Als Funktion, da sie Icon-Konstanten weiter unten in der Datei nutzt (sonst Zugriff vor der Definition).
function guideIcon(token) {
  const chip = (inner, color = 'rgba(255,255,255,0.7)') => `<span style="display:inline-flex; align-items:center; justify-content:center; min-width:22px; height:20px; padding:0 5px; border-radius:6px; background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.1); vertical-align:middle; margin:0 1px; color:${color}; font-size:11px; line-height:1;">${inner}</span>`
  const svg = inner => `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`
  // Apple- und Google-Logo wie in der Icon-Leiste der Eventkarten (renderEventCard)
  const apple = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/></svg>'
  const google = '<svg width="13" height="13" viewBox="0 0 48 48" fill="currentColor"><path d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/></svg>'
  const icons = {
    info: chip(svg('<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>')),
    spotify: chip(HIST_SPOTIFY_SVG),
    apple: chip(apple),
    google: chip(google),
    share: chip(svg('<path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/>')),
    radar: chip(HIST_RADAR_SVG),
    edit: chip(HIST_EDIT_SVG),
    copy: chip(HIST_COPY_SVG),
    gear: chip(svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>')),
    herz: chip('♡', '#f472b6'),
    haken: chip('✓', '#34d399'),
    stern: chip('★', '#facc15'),
    fav: chip('☆', '#818cf8'),
    plus: chip('+'),
    pfeile: chip('‹ ›'),
    name: chip('Name')
  }
  return Object.hasOwn(icons, token) ? icons[token] : null
}

// Text der Anleitung: HTML-escaped, nur die bekannten {icon}-Platzhalter werden durch Symbole ersetzt
function guideText(text) {
  return esc(text).replace(/\{(\w+)\}/g, (m, token) => guideIcon(token) ?? m)
}

// Kurzanleitung: [Überschrift, [[Stichwort, Text], ...]]
const SETTINGS_GUIDE = [
  ['Events', [
    ['Überblick', 'Alle Konzerte und Partys in Berlin und Leipzig, nach Datum sortiert.'],
    ['Filtern und suchen', 'Nach Stadt und Location filtern, über die Suchleiste suchen.'],
    ['Karte wischen', 'Nach links wischen: {herz} „Vormerken“ oder {haken} „Bin dabei“ auswählen.'],
    ['Icon-Leiste', '{info} Link zum Event, {spotify} Spotify, {apple} {google} Kalender (Apple/Google), {share} Teilen.']
  ]],
  ['Kalender', [
    ['Monatsübersicht', 'Tippe auf einen Tag, um alle Events an diesem Tag zu sehen. Mehrere Tage lassen sich gleichzeitig auswählen.']
  ]],
  ['Gemerkt', [
    ['Meine Merkliste', 'Deine vorgemerkten Events und die, bei denen Du dabei bist. Unter jeder Karte steht, wer das Event ebenfalls {herz} vorgemerkt hat oder {haken} dabei ist: „Du“, Lords mit Namen und alle übrigen als „weitere Lords“ (nur Lords mit freigegebener Merkliste).'],
    ['Merklisten anderer Lords', 'Wische oben über die Überschrift oder tippe auf die Pfeile {pfeile} bzw. die Punkte, um „Merkliste von Lord …“ zu sehen. Die Karten dort funktionieren wie in den Events: Nach links wischen und {herz} „Vormerken“ oder {haken} „Bin dabei“ übernimmt das Event in Deine eigene Merkliste. Die fremde Liste änderst Du nie.'],
    ['Doppeltipp', 'Doppeltipp auf den Reiter „Gemerkt“ springt zurück zu „Meine Merkliste“.']
  ]],
  ['History', [
    ['Meine History', 'Deine besuchten Konzerte. Ein Event mit „Bin dabei“ erscheint hier am Konzerttag ab 20 Uhr automatisch. Vergib bis zu 5 Sterne {stern}, mit {plus} trägst Du ein früheres Konzert nach.'],
    ['Icons bei jedem Konzert', '{spotify} Spotify, {radar} zum Radar (nochmal tippen: wieder entfernen) und {edit} Bearbeiten. Beim Bearbeiten änderst Du Name, Location und Datum, markierst den Act mit „Support“ (steht dann grau als „(Support)“ hinter dem Namen) oder löschst den Eintrag (roter Knopf).'],
    ['History anderer Lords', 'Wische oben über die Überschrift oder tippe auf die Pfeile {pfeile} bzw. die Punkte. Icons dort: {spotify} Spotify, {radar} zu meinem Radar und {copy} „In meine History“. Das übernimmt das Konzert in Deine History, die Sterne vergibst Du dann selbst. Nochmal tippen macht es rückgängig.'],
    ['Doppeltipp', 'Doppeltipp auf den Reiter „History“ springt zurück zu „Meine History“.']
  ]],
  ['Listen anderer Lords (Merkliste und History)', [
    ['Favorit', 'Mit dem Stern {fav} oben machst Du einen Lord zum Favoriten. Favoriten werden beim Wischen zuerst angezeigt, danach alle anderen alphabetisch.'],
    ['Name vergeben', 'Hat ein Lord keinen Lord-Titel, gibst Du ihm mit {name} einen eigenen. Der Name wird überschrieben, sobald der Lord sich in seinen Einstellungen selbst einen gibt.']
  ]],
  ['Radar', [
    ['Künstler beobachten', 'Künstler ohne anstehendes Konzert {radar}. Sobald ein Konzert angekündigt wird, bekommst Du einen Treffer (mit Benachrichtigung, wenn erlaubt).'],
    ['Automatisch in die Merkliste', 'Neu angekündigte Konzerte von Künstlern auf der Radar-Liste werden automatisch in die Merkliste übernommen. Der Künstler wird danach aus der Radar-Liste gestrichen.'],
    ['Automatisch ins Radar', 'Künstler mit 4 oder 5 Sternen {stern} in der History kommen automatisch ins Radar.']
  ]],
  ['Einstellungen', [
    ['Öffnen', 'Tippe in Events und Kalender oben auf das Zahnrad {gear}.'],
    ['Lord-Titel', 'Hier wählst Du einen Usernamen, den andere über Deiner Merkliste und Deiner History sehen.'],
    ['Merkliste für alle sichtbar', 'Andere Lords sehen Deine vorgemerkten und „dabei“-Events samt Lord-Titel, als Liste „Merkliste von Lord …“ und an ihren eigenen Events.'],
    ['History für alle sichtbar', 'Andere Lords sehen Deine besuchten Konzerte mit Sternen.'],
    ['Standard', 'Beide Schalter sind zunächst auf „off“ und müssen von Dir eingeschaltet werden.']
  ]],
  ['Anmeldung', [
    ['E-Mail-Code', 'Merkliste, History und Radar funktionieren nur bei Anmeldung via E-Mail-Code. Ohne Anmeldung kannst Du nur in der Eventübersicht stöbern.']
  ]]
]

function renderSettingsBody() {
  const guide = `
    <details style="margin-top:20px; border-top:1px solid rgba(255,255,255,0.06); padding-top:14px;">
      <summary class="syne" style="font-size:13px; font-weight:700; color:white; cursor:pointer;">Kurzanleitung</summary>
      ${SETTINGS_GUIDE.map(([head, items]) => `
        <h4 class="syne" style="margin:18px 0 6px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.06); font-size:12px; font-weight:800; letter-spacing:0.08em; text-transform:uppercase; color:#a5b4fc;">${esc(head)}</h4>
        <ul style="list-style:disc; padding-left:18px; margin:0;">
          ${items.map(([lead, text]) => `<li class="text-xs" style="color:rgba(255,255,255,0.55); line-height:1.5; margin-top:6px;"><strong style="color:white; font-weight:700;">${esc(lead)}:</strong> ${guideText(text)}</li>`).join('')}
        </ul>
      `).join('')}
    </details>
  `
  if (!currentUser) return `<p class="text-sm" style="color:rgba(255,255,255,0.4);">Bitte zuerst mit E-Mail anmelden, um Einstellungen vorzunehmen.</p>${guide}`
  if (myProfileError) return `<p class="text-sm" style="color:rgba(255,120,120,0.85);">Die Einstellungen konnten nicht geladen werden. Bitte später noch einmal versuchen.</p>${guide}`
  if (!myProfile) return `<p class="text-sm" style="color:rgba(255,255,255,0.4);">Einstellungen werden geladen …</p>${guide}`
  const row = (key, label, hint) => `
    <div class="flex items-start justify-between gap-3" style="margin-top:18px;">
      <div style="min-width:0;">
        <div class="syne" style="font-size:13px; font-weight:700; color:white;">${label}</div>
        <p class="text-xs" style="color:rgba(255,255,255,0.4); margin-top:3px; line-height:1.45;">${hint}</p>
      </div>
      <button type="button" role="switch" aria-checked="${myProfile[key]}" aria-label="${label}" data-setting="${key}" class="toggle-switch"></button>
    </div>
  `
  return `
    <div>
      <label for="settings-lord" class="syne" style="display:block; font-size:13px; font-weight:700; color:white;">Lord-Titel</label>
      <p class="text-xs" style="color:rgba(255,255,255,0.4); margin:3px 0 8px; line-height:1.45;">Dieser Name (höchstens 15 Zeichen) wird anderen angezeigt, wenn sie deine History oder Merkliste sehen („History von Lord …“, „Merkliste von Lord …“).</p>
      <div style="display:flex; align-items:center; gap:8px;">
        <span class="syne" style="font-size:14px; font-weight:800; color:#818cf8;">Lord</span>
        <input id="settings-lord" type="text" maxlength="${LORD_NAME_MAX}" autocomplete="off" placeholder="z. B. Fontaines" value="${esc(myProfile.lordTitle ?? '')}" style="${inputStyle}" />
      </div>
    </div>
    ${row('shareBookmarks', 'Merkliste für alle sichtbar', 'Angemeldete Lords sehen deine vorgemerkten und „dabei“-Events samt deinem Lord-Titel: als Liste „Merkliste von Lord …“ und unter ihren eigenen Events.')}
    ${row('shareHistory', 'History für alle sichtbar', 'Angemeldete Lords können deine besuchten Konzerte samt Sternen unter deinem Lord-Titel ansehen.')}
    ${guide}
  `
}

function refreshSettingsBody() {
  const body = document.getElementById('settings-body')
  if (!body) return
  // Kurzanleitung bleibt aufgeklappt, wenn z. B. ein Schalter das Menü neu zeichnet
  const guideOpen = body.querySelector('details')?.open
  body.innerHTML = renderSettingsBody()
  if (guideOpen) body.querySelector('details').open = true
}

async function loadMyProfile() {
  myProfileError = false
  myProfile = await loadProfile()
  if (!myProfile) myProfileError = true
  refreshSettingsBody()
}

function openSettingsModal() {
  settingsOpen = true
  document.getElementById('modal-settings')?.classList.remove('hidden')
  refreshSettingsBody()
  if (currentUser && !myProfile) loadMyProfile()
}

function closeSettingsModal() {
  settingsOpen = false
  document.getElementById('modal-settings')?.classList.add('hidden')
}

async function toggleSetting(key) {
  myProfile[key] = !myProfile[key]
  refreshSettingsBody()
  if (!(await saveProfile({ [key]: myProfile[key] }))) {
    myProfile[key] = !myProfile[key]
    refreshSettingsBody()
    showToast('Fehler', 'Einstellung konnte nicht gespeichert werden.')
  }
}

async function saveLordTitle(value) {
  const title = value.trim().slice(0, LORD_NAME_MAX)
  if (title && title.length < 2) {
    showToast('Lord-Titel', 'Mindestens 2 Zeichen.')
    refreshSettingsBody()
    return
  }
  const before = myProfile.lordTitle
  myProfile.lordTitle = title || null
  if (await saveProfile({ lordTitle: title })) {
    showToast('Gespeichert', title ? `Lord ${title}` : 'Lord-Titel entfernt')
  } else {
    myProfile.lordTitle = before
    refreshSettingsBody()
    showToast('Fehler', 'Lord-Titel konnte nicht gespeichert werden.')
  }
}

function attachSettingsEvents() {
  const modal = document.getElementById('modal-settings')
  if (!modal) return
  modal.addEventListener('click', async e => {
    if (e.target === modal || e.target.closest('[data-close-settings]')) { closeSettingsModal(); return }
    const sw = e.target.closest('[data-setting]')
    if (sw && myProfile) await toggleSetting(sw.dataset.setting)
  })
  // change feuert beim Verlassen des Feldes bzw. mit Enter - gespeichert wird also nicht bei jedem Tastendruck
  modal.addEventListener('change', async e => {
    if (e.target.id === 'settings-lord' && myProfile) await saveLordTitle(e.target.value)
  })
}

function renderBottomNav() {
  // Nur noch anstehende Events zählen (wie die Karten der Merkliste), keine bereits besuchten
  const markedIds = new Set([...bookmarked, ...going].filter(Boolean).map(String))
  const bmCount = events.filter(e => markedIds.has(String(e.id)) && !isConcertOver(e.date)).length
  const tabs = [
    { id: 'liste', label: 'Events', icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/></svg>` },
    { id: 'kalender', label: 'Kalender', icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>` },
    { id: 'gemerkt', label: 'Gemerkt', badge: bmCount, icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="${bmCount > 0 ? 'rgba(244,114,182,0.7)' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>` },
    { id: 'history', label: 'History', icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><polyline points="3 4 3 9 8 9"/><polyline points="12 7 12 12 15 14"/></svg>` },
  ]
  return `
    <div style="max-width:576px; margin:0 auto; background:rgba(4,4,32,0.96); backdrop-filter:blur(24px); -webkit-backdrop-filter:blur(24px); border-top:1px solid rgba(255,255,255,0.07); display:flex; padding-bottom:env(safe-area-inset-bottom,0px);">
      ${tabs.map(t => {
        const active = !radarOpen && currentView === t.id
        return `<button data-nav="${t.id}" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; padding:10px 4px 11px; background:none; border:none; cursor:pointer; color:${active ? 'white' : 'rgba(255,255,255,0.42)'}; position:relative; transition:color 0.2s;">
          ${active ? `<span style="position:absolute; top:0; left:50%; transform:translateX(-50%); width:28px; height:2px; background:linear-gradient(90deg,#6366f1,#a855f7); border-radius:0 0 3px 3px;"></span>` : ''}
          <span style="position:relative; display:inline-block;">
            ${t.icon}
            ${t.badge > 0 ? `<span style="position:absolute; top:-4px; right:-6px; min-width:16px; height:16px; border-radius:8px; background:#f472b6; color:white; font-size:9px; font-weight:700; display:flex; align-items:center; justify-content:center; padding:0 3px;">${t.badge > 99 ? '99+' : t.badge}</span>` : ''}
          </span>
          <span class="syne" style="font-size:9px; font-weight:700; letter-spacing:0.05em; text-transform:uppercase;">${t.label}</span>
        </button>`
      }).join('')}
      <button data-open-radar style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; padding:10px 4px 11px; background:none; border:none; cursor:pointer; color:${radarOpen ? 'white' : 'rgba(99,102,241,0.7)'}; transition:color 0.2s; position:relative;">
        ${radarOpen ? `<span style="position:absolute; top:0; left:50%; transform:translateX(-50%); width:28px; height:2px; background:linear-gradient(90deg,#6366f1,#a855f7); border-radius:0 0 3px 3px;"></span>` : ''}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/></svg>
        <span class="syne" style="font-size:9px; font-weight:700; letter-spacing:0.05em; text-transform:uppercase;">Radar</span>
      </button>
    </div>
  `
}

function refreshBottomNav() {
  const nav = document.getElementById('bottom-nav')
  if (!nav) return
  nav.innerHTML = renderBottomNav()
  attachNavEvents()
  document.querySelector('[data-open-radar]')?.addEventListener('click', openRadarModal)
}

function openRadarModal() {
  radarOpen = true
  document.getElementById('modal-radar')?.classList.remove('hidden')
  refreshBottomNav()
}

function closeRadarModal() {
  radarOpen = false
  document.getElementById('modal-radar')?.classList.add('hidden')
  refreshBottomNav()
}

function renderFilters() {
  const locationOptions = locations
    .filter(l => filters.cities.includes(l.city))
    .sort((a, b) => a.name.localeCompare(b.name))

  const locName = filters.locationId === 'alle'
    ? 'Alle Locations'
    : (locations.find(l => l.id == filters.locationId)?.name || 'Alle Locations')

  return `
    <div class="glass rounded-2xl p-3 mb-5" style="overflow:visible; position:relative; z-index:10; display:flex; flex-direction:column; gap:8px;">
      <div style="display:flex; gap:0; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07); border-radius:10px; padding:3px;">
        ${['Berlin', 'Leipzig'].map(c => {
          const active = filters.cities[0] === c
          return `<button data-city="${c}" class="syne text-sm font-semibold transition-all duration-200" style="flex:1; padding:7px; border-radius:7px; cursor:pointer; border:none; ${active
            ? 'background:linear-gradient(135deg,rgba(99,102,241,0.55),rgba(168,85,247,0.45)); color:white; box-shadow:0 1px 8px rgba(99,102,241,0.25);'
            : 'background:transparent; color:rgba(255,255,255,0.32);'}">${c}</button>`
        }).join('')}
      </div>
      <div style="display:flex; gap:8px;">
        <div style="position:relative; flex:1;">
          <div id="filter-loc-selected" style="cursor:pointer; padding:9px 12px; border-radius:10px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; gap:6px;">
            <span style="font-size:13px; color:rgba(255,255,255,0.5); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${locName}</span>
            <span style="color:rgba(255,255,255,0.25); font-size:11px; flex-shrink:0;">▾</span>
          </div>
          <div id="filter-loc-dropdown" class="hidden scrollbar-hide" style="position:absolute; z-index:1000; width:100%; max-height:200px; overflow-y:auto; border-radius:10px; background:#0d1530; border:1px solid rgba(255,255,255,0.12); margin-top:4px;">
            <div data-filter-loc="alle" class="loc-option" style="padding:9px 12px; cursor:pointer; color:rgba(255,255,255,0.7); font-size:13px;">Alle Locations</div>
            ${locationOptions.map(l => `
              <div data-filter-loc="${l.id}" class="loc-option" style="padding:9px 12px; cursor:pointer; color:rgba(255,255,255,0.7); font-size:13px; border-top:1px solid rgba(255,255,255,0.04);">
                ${l.name}
              </div>
            `).join('')}
          </div>
        </div>
        <div style="display:flex; gap:10px; align-items:center; flex:1; min-width:0;">
          <div style="position:relative; flex:1; min-width:0;">
            <input id="search-input" type="search" placeholder="Suche…" value="${esc(filters.search)}" style="width:100%; box-sizing:border-box; padding:9px 30px 9px 12px; border-radius:10px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); color:white; font-size:13px; outline:none; -webkit-appearance:none; appearance:none;" />
            <button id="search-clear" type="button" aria-label="Suche löschen" style="position:absolute; right:4px; top:50%; transform:translateY(-50%); width:24px; height:24px; border:none; background:transparent; color:rgba(255,255,255,0.4); font-size:18px; line-height:1; cursor:pointer; display:${filters.search ? 'flex' : 'none'}; align-items:center; justify-content:center; border-radius:50%;">×</button>
          </div>
          <button id="settings-open" type="button" title="Einstellungen" aria-label="Einstellungen" class="btn-glass rounded-lg inline-flex items-center justify-center" style="flex-shrink:0; width:34px; height:34px; color:rgba(255,255,255,0.6);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button>
        </div>
      </div>
    </div>
  `
}

function getFilteredEvents() {
  return events.filter(e => {
    const loc = locationsById.get(e.locationId)
    const city = loc ? loc.city : (e.locationCity || '')
    if (!city) return true
    if (!filters.cities.includes(city)) return false
    if (filters.locationId !== 'alle' && e.locationId != filters.locationId) return false
    if (filters.search) {
      const s = filters.search.toLowerCase()
      if (!e.title.toLowerCase().includes(s)) return false
    }
    return true
  }).sort(byDateTime)
}

function renderGroupedEvents() {
  const today = new Date()
  today.setHours(0,0,0,0)
  const future = getFilteredEvents().filter(e => {
    const d = new Date(e.date + 'T12:00:00')
    return Math.floor((d - today) / 86400000) >= 0
  })
  const filtered = future.slice(0, renderedEventLimit)
  const hasMore = future.length > filtered.length
  const groups = {}
  filtered.forEach(e => {
    const d = new Date(e.date + 'T12:00:00')
    const diff = Math.floor((d - today) / 86400000)
    let label
    const todayDay = today.getDay() === 0 ? 6 : today.getDay() - 1
    const thisMonday = new Date(today); thisMonday.setDate(today.getDate() - todayDay)
    const nextMonday = new Date(thisMonday); nextMonday.setDate(thisMonday.getDate() + 7)
    const weekAfter = new Date(nextMonday); weekAfter.setDate(nextMonday.getDate() + 7)
    if (diff === 0) label = 'Heute'
    else if (diff === 1) label = 'Morgen'
    else if (d < nextMonday) label = 'Diese Woche'
    else if (d < weekAfter) label = 'Nächste Woche'
    else label = d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
    if (!groups[label]) groups[label] = []
    groups[label].push(e)
  })
  if (Object.keys(groups).length === 0) {
    return `<div class="text-center py-20" style="color:rgba(255,255,255,0.45);"><p class="syne text-2xl mb-2">—</p><p class="text-sm">Keine Events gefunden.</p></div>`
  }
  return `
    <div class="space-y-8">
      ${Object.entries(groups).map(([label, evts]) => `
        <div>
          <div class="flex items-center gap-3 mb-4">
            <div class="h-px flex-1" style="background:rgba(255,255,255,0.06);"></div>
            <span class="syne text-xs tracking-widest uppercase" style="color:rgba(255,255,255,0.45); font-weight:700;">${label}</span>
            <div class="h-px flex-1" style="background:rgba(255,255,255,0.06);"></div>
          </div>
          <div class="space-y-3">${evts.map(e => renderEventCard(e)).join('')}</div>
        </div>
      `).join('')}
    </div>
    ${hasMore ? `<div id="load-more-sentinel" style="height:1px;"></div><p class="text-center text-xs py-6 skeleton-pulse" style="color:rgba(255,255,255,0.25);">Weitere Events werden geladen…</p>` : ''}
  `
}

function renderSkeleton() {
  return `
    <div class="c64-border" style="position:fixed; top:0; bottom:0; left:50%; transform:translateX(-50%);
                width:min(100%,576px); z-index:9999;
                padding:max(24px,env(safe-area-inset-top)) 28px max(24px,env(safe-area-inset-bottom));">
      <div style="width:100%; height:100%; background:#2020AA; overflow:hidden;
                  font-family:'Press Start 2P',monospace; color:#9898FF;
                  font-size:min(calc((min(100vw,576px) - 80px) / 38), 13.1px); line-height:2.3;
                  padding:14px 12px;">
        <div>**** COMMODORE 64 BASIC V2 ****</div>
        <div>64K RAM SYSTEM&nbsp; 38911 BASIC BYTES FREE</div>
        <div>&nbsp;</div>
        <div>READY.</div>
        <div>LOAD &quot;LE.BE_LIVE&quot;,8,1</div>
        <div>&nbsp;</div>
        <div>PRESS PLAY ON TAPE</div>
        <div>OK</div>
        <div>&nbsp;</div>
        <div>MADE BY CRUX WITH CLAUDE</div>
        <div>CO-TESTED BY DR. JEEP</div>
        <div>&nbsp;</div>
        <div>READY.</div>
        <div>RUN<span style="display:inline-block; width:0.6em; height:1em; background:#9898FF; vertical-align:text-bottom; margin-left:0.15em; animation:c64blink 0.7s step-end infinite;"></span></div>
      </div>
    </div>
  `
}

// Eigene und fremde Markierungen eines Events als Zeilen unter der Karte (Gemerkt-Reiter), je Status eine Zeile:
// "♡ Vorgemerkt: Du, Lord Thomas und 2 weitere Lords". Lords mit Namen (Lord-Titel oder eigener Name des
// Betrachters) stehen mit Namen da (höchstens 3), alle übrigen werden als "weitere Lords" gezählt.
function formatEventMarks(id) {
  const lords = eventMarks[id] || []
  registerPeers(lords)
  const names = peerNames()
  const line = (status, symbol, color, word, mine) => {
    const these = lords.filter(l => l.status === status)
    const named = these.filter(l => names.get(l.publicId)?.named).map(l => names.get(l.publicId).name)
      .sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' })).slice(0, 3)
    const rest = these.length - named.length
    const parts = [...(mine ? ['Du'] : []), ...named.map(n => 'Lord ' + esc(n))]
    if (rest > 0) parts.push(parts.length ? `${rest} ${rest === 1 ? 'weiterer Lord' : 'weitere Lords'}` : `${rest} ${rest === 1 ? 'Lord' : 'Lords'}`)
    if (!parts.length) return ''
    const text = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} und ${parts[parts.length - 1]}` : parts[0]
    return `<div style="color:${color};">${symbol} ${word}: ${text}</div>`
  }
  return line('going', '✓', '#34d399', 'Dabei', going.some(g => g == id)) + line('bookmarked', '♡', '#f472b6', 'Vorgemerkt', bookmarked.some(b => b == id))
}

function paintEventMarks() {
  document.querySelectorAll('[data-marks]').forEach(el => { el.innerHTML = formatEventMarks(el.dataset.marks) })
}

// Holt die Lords für die Karten der Merkliste (je Event 60 s zwischengespeichert) und zeigt sie an.
// Schlägt das Laden fehl, bleibt es bei der bisherigen Anzeige.
async function loadMarksForVisible() {
  if (!currentUser) return
  const ids = [...new Set([...document.querySelectorAll('[data-marks]')].map(el => el.dataset.marks))]
  const stale = ids.filter(id => Date.now() - (eventMarksAt[id] || 0) >= 60000)
  if (stale.length) {
    const result = await loadEventMarks(stale)
    if (result) {
      for (const id of stale) { eventMarks[id] = result[id] || []; eventMarksAt[id] = Date.now() }
    }
  }
  paintEventMarks()
}

// showMarks: nur in "Meine Merkliste" - eigener Status und andere Lords unter der Karte (statt des Labels oben).
// peerNote: Karte in der Merkliste eines anderen Lords - Hinweis, ob er dabei ist oder vorgemerkt hat.
function renderEventCard(e, { showMarks = false, peerNote = null } = {}) {
  const loc = locationsById.get(e.locationId)
  const isBookmarked = bookmarked.some(b => b == e.id)
  const isGoing = going.some(g => g == e.id)
  const eventIsNew = isNew(e)
  const { dateStr, showSpotify, spotifyMulti } = getEventRenderMeta(e)
  const accentSolid = '#818cf8'
  const accentAlpha = 'rgba(99,102,241,'
  const spotifyIconSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>'
  // Beide Felder können aus gescrapten Venue-Seiten oder dem öffentlichen "Event
  // hinzufügen"-Formular stammen - nie ungeprüft als href verwenden (s. safeUrl)
  const infoHref = safeUrl(e.ticketUrl) || safeUrl(loc?.website ? 'https://' + loc.website : '')
  const spotifyHref = safeUrl(e.spotifyUrl) || spotifySearchUrl(e.title)

  return `
    <div class="event-swipe-wrapper" data-event-id="${e.id}" ${peerNote ? `data-peer-status="${esc(peerNote.status)}" data-peer-name="${esc(peerNote.name)}"` : ''} style="position:relative; overflow:hidden; border-radius:16px;">
      <div class="event-swipe-actions" style="position:absolute; right:0; top:0; bottom:0; width:160px; display:flex; flex-direction:column; gap:6px; justify-content:center; padding:6px 8px 6px 4px; z-index:0;">
        <button data-swipe-bookmark="${e.id}" style="flex:1; max-height:54px; border-radius:12px; border:1px solid ${isBookmarked ? 'rgba(244,114,182,0.5)' : 'rgba(244,114,182,0.35)'}; cursor:pointer; font-size:0.875rem; font-weight:600; background:${isBookmarked ? 'rgba(244,114,182,0.3)' : 'rgba(244,114,182,0.15)'}; color:#f472b6; font-family:'DM Sans',sans-serif;">♡ Vormerken</button>
        <button data-swipe-going="${e.id}" style="flex:1; max-height:54px; border-radius:12px; border:1px solid ${isGoing ? 'rgba(52,211,153,0.5)' : 'rgba(52,211,153,0.35)'}; cursor:pointer; font-size:0.875rem; font-weight:600; background:${isGoing ? 'rgba(52,211,153,0.25)' : 'rgba(52,211,153,0.12)'}; color:#34d399; font-family:'DM Sans',sans-serif;">✓ Bin dabei!</button>
      </div>
      <div class="event-swipe-card card-hover rounded-2xl overflow-hidden" style="position:relative; z-index:1; will-change:transform; touch-action:pan-y; background:rgba(8,8,42,0.92); border:1px solid ${isGoing ? 'rgba(52,211,153,0.3)' : accentAlpha + '0.12)'}; box-shadow:0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05);">
        <div style="height:2px; background:linear-gradient(90deg, ${accentSolid}, transparent);"></div>
        <div class="p-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-2 flex-wrap">
              <span class="syne text-xs" style="color:${accentSolid}; font-weight:700;">${dateStr} · ${esc(e.time)}</span>
              ${eventIsNew ? '<span class="text-xs font-bold" style="color:#f472b6; letter-spacing:0.05em;">NEW</span>' : ''}
              ${isGoing && !showMarks ? '<span class="text-xs font-semibold" style="color:#34d399;">✓ dabei</span>' : ''}
              ${isBookmarked && !isGoing && !showMarks ? '<span class="text-xs font-semibold" style="color:#f472b6;">♡ gemerkt</span>' : ''}
            </div>
            <h3 class="syne text-white leading-tight mb-1" style="font-size:1rem; letter-spacing:-0.01em;">${renderTitleHtml(e.title)}</h3>
            <p class="text-xs mb-2" style="color:rgba(255,255,255,0.62);">
              ${loc ? esc(loc.name) : esc(e.locationName || '')}
            </p>
            ${e.description ? `<p class="text-xs leading-relaxed mb-3" style="color:rgba(255,255,255,0.5);">${esc(e.description)}</p>` : ''}
            ${showMarks ? `<div data-marks="${e.id}" class="text-xs font-semibold">${formatEventMarks(e.id)}</div>` : peerNote ? `<div class="text-xs font-semibold mb-2" style="color:${peerNote.status === 'going' ? '#34d399' : '#f472b6'};">${peerNote.status === 'going' ? '✓' : '♡'} Lord ${esc(peerNote.name)} ${peerNote.status === 'going' ? 'ist dabei' : 'hat vorgemerkt'}</div>` : ''}
          </div>
          <div class="flex gap-2 mt-1" style="align-items:center;">
            <div style="display:flex; gap:6px; flex:1; min-width:0;">
              ${infoHref ? `<a href="${esc(infoHref)}" target="_blank" title="Infos" aria-label="Infos" class="btn-glass rounded-lg inline-flex items-center justify-center" style="flex:1; min-width:0; padding:7px 0; color:rgba(255,255,255,0.6);"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></a>` : ''}
              ${showSpotify ? (spotifyMulti
                ? `<button data-spotify-picker="${e.id}" title="Auf Spotify suchen" aria-label="Auf Spotify suchen" class="btn-glass rounded-lg inline-flex items-center justify-center" style="flex:1; min-width:0; padding:7px 0; color:rgba(255,255,255,0.6);">${spotifyIconSvg}</button>`
                : `<a href="${esc(spotifyHref)}" target="_blank" title="Auf Spotify suchen" aria-label="Auf Spotify suchen" class="btn-glass rounded-lg inline-flex items-center justify-center" style="flex:1; min-width:0; padding:7px 0; color:rgba(255,255,255,0.6);">${spotifyIconSvg}</a>`
              ) : ''}
              <button data-ics="${e.id}" title="Zu Apple Kalender hinzufügen" aria-label="Zu Apple Kalender hinzufügen" class="btn-glass rounded-lg inline-flex items-center justify-center" style="flex:1; min-width:0; padding:7px 0; color:rgba(255,255,255,0.5);"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/></svg></button>
              <button data-gcal="${e.id}" title="Zu Google Kalender hinzufügen" aria-label="Zu Google Kalender hinzufügen" class="btn-glass rounded-lg inline-flex items-center justify-center" style="flex:1; min-width:0; padding:7px 0; color:rgba(255,255,255,0.5);"><svg width="14" height="14" viewBox="0 0 48 48" fill="currentColor"><path d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/><path d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/><path d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/></svg></button>
              <button data-share="${e.id}" title="Teilen" aria-label="Teilen" class="btn-glass rounded-lg inline-flex items-center justify-center" style="flex:1; min-width:0; padding:7px 0; color:rgba(255,255,255,0.5);"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/></svg></button>
            </div>
            <span style="flex-shrink:0; color:rgba(255,255,255,0.6); font-size:18px; font-weight:400; letter-spacing:-3px; pointer-events:none; user-select:none; padding-right:2px; line-height:1;">‹‹</span>
          </div>
        </div>
      </div>
    </div>
  `
}

function renderCalendarContent() {
  const today = new Date()
  const viewDate = new Date(today.getFullYear(), today.getMonth() + calendarOffset, 1)
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7
  const monthName = viewDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
  const filteredAll = getFilteredEvents()
  const eventDates = filteredAll.map(e => e.date)
  const filtered = filters.dates.length > 0 ? filteredAll.filter(e => filters.dates.includes(e.date)) : []

  return `
    <div class="glass rounded-2xl p-5 mb-5" style="position:relative; z-index:1;">
      <div class="flex items-center justify-between mb-5">
        <button data-cal-prev class="btn-glass w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white">‹</button>
        <h2 class="syne font-700 text-white tracking-wide capitalize">${monthName}</h2>
        <button data-cal-next class="btn-glass w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white">›</button>
      </div>
      <div class="grid grid-cols-7 gap-1 text-center mb-3">
        ${['Mo','Di','Mi','Do','Fr','Sa','So'].map(d => `<div class="text-xs font-semibold py-1" style="color:rgba(255,255,255,0.2);">${d}</div>`).join('')}
      </div>
      <div class="grid grid-cols-7 gap-1">
        ${Array(firstDay).fill('<div></div>').join('')}
        ${Array.from({length: daysInMonth}, (_, i) => {
          const day = i + 1
          const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
          const hasEvent = eventDates.includes(dateStr)
          const isSelected = filters.dates.includes(dateStr)
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
          const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
          const isPast = dateStr < todayStr && !isToday
          return `
            <button data-date="${dateStr}" style="aspect-ratio:1; border-radius:12px; font-size:14px; font-weight:500; display:flex; align-items:center; justify-content:center; position:relative; transition:all 0.15s; ${isPast ? 'opacity:0.25;' : ''} color:${!hasEvent && !isSelected && !isToday ? 'rgba(255,255,255,0.2)' : 'white'}; background:${isSelected ? 'rgba(99,102,241,0.5)' : hasEvent ? 'rgba(99,102,241,0.12)' : 'transparent'}; border:${isSelected ? '1px solid rgba(99,102,241,0.6)' : hasEvent ? '1px solid rgba(99,102,241,0.25)' : isToday ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent'}; padding:4px; cursor:pointer;">
              ${day}
            </button>
          `
        }).join('')}
      </div>
      ${filters.dates.length > 0 ? `
        <button data-clear-dates class="mt-4 w-full text-xs py-2 rounded-xl text-slate-500 hover:text-slate-300 transition-all btn-glass">
          Auswahl zurücksetzen (${filters.dates.length} ${filters.dates.length === 1 ? 'Tag' : 'Tage'})
        </button>
      ` : `<p class="text-center text-xs mt-4" style="color:rgba(255,255,255,0.15);">Tage antippen zum Filtern · Mehrfachauswahl möglich</p>`}
    </div>
    <div class="space-y-3">
      ${filters.dates.length === 0
        ? ''
        : filtered.length === 0
          ? '<p class="text-center text-slate-600 py-6 text-sm">Keine Events an den gewählten Tagen.</p>'
          : filtered.map(e => renderEventCard(e)).join('')}
    </div>
  `
}

// Eigene Merkliste (ohne Kopfzeile): Karten mit den Lords darunter
function renderBookmarkedOwnHtml() {
  // Besuchte Konzerte gehören in die History und nicht mehr in die Merkliste. Das darf nicht davon
  // abhängen, dass der Scraper das Event aus events.json entfernt hat (läuft nur wöchentlich, bis
  // dahin standen vergangene "dabei"-Events weiter in der Liste - siehe isConcertOver)
  const bookmarkedEvents = events.filter(e => !isConcertOver(e.date) && bookmarked.some(b => b == e.id) && !going.some(g => g == e.id))
  const goingEvents = events.filter(e => !isConcertOver(e.date) && going.some(g => g == e.id))
  const allEvents = [
    ...goingEvents.map(e => ({ ...e, _status: 'dabei' })),
    ...bookmarkedEvents.map(e => ({ ...e, _status: 'gemerkt' }))
  ].sort(byDateTime)

  // Die History (besuchte Konzerte) hat seit dem eigenen Reiter "History" ihren Platz dort, siehe renderHistoryView()
  if (allEvents.length === 0) return `
    <div class="text-center py-20 text-slate-600">
      <p class="syne text-2xl mb-2">—</p>
      <p class="text-sm">Noch keine Events gespeichert.</p>
    </div>
  `

  return `
    <div class="space-y-3 pt-2">
      ${allEvents.map(e => renderEventCard(e, { showMarks: true })).join('')}
    </div>
  `
}

// Merkliste eines anderen Lords: seine anstehenden Events (dabei zuerst), Karten wie in der Event-Übersicht
// (Wischen: Vormerken / Bin dabei übernimmt das Event in die eigene Merkliste, die fremde bleibt unberührt)
function renderBookmarkPeerHtml(p) {
  const status = new Map()
  for (const m of p.marks) if (m.status === 'going' || !status.has(m.eventId)) status.set(m.eventId, m.status)
  const list = events.filter(e => !isConcertOver(e.date) && status.has(String(e.id)))
    .sort((a, b) => (Number(status.get(String(b.id)) === 'going') - Number(status.get(String(a.id)) === 'going')) || byDateTime(a, b))
  if (!list.length) return `<p class="text-sm pt-2" style="color:rgba(255,255,255,0.3);">Keine anstehenden Events vorgemerkt.</p>`
  return `<div class="space-y-3 pt-2">${list.map(e => renderEventCard(e, { peerNote: { status: status.get(String(e.id)), name: p.name } })).join('')}</div>`
}

// Merkliste: Kopfzeile mit Punkten (Wischen nur hier) und darunter "Meine Merkliste" bzw. die Liste eines anderen Lords
function renderBookmarkedView() {
  const own = renderBookmarkedOwnHtml()
  if (!currentUser) return own
  return `
    <div id="bookmark-carousel" class="pt-2">
      <div id="bookmark-carousel-head" style="padding:6px 0 2px;">${renderCarouselHead('bookmark')}</div>
      <div class="carousel-slide" data-i="0" style="${bookmarkSlide === 0 ? '' : 'display:none'}">${own}</div>
      <div id="bookmark-peer-slides">${renderPeerSlides('bookmark')}</div>
    </div>
  `
}

// "Meine Merkliste" neu zeichnen, wenn man von der Liste eines anderen Lords zurückkommt (dort kann man die eigene geändert haben)
function refreshBookmarkOwn() {
  const slide = document.querySelector('#bookmark-carousel .carousel-slide[data-i="0"]')
  if (!slide) return
  slide.innerHTML = renderBookmarkedOwnHtml()
  attachSwipeGestures()
  loadMarksForVisible()
}

function attachBookmarkEvents() {
  attachCarousel('bookmark')
  if (document.getElementById('bookmark-carousel')) ensureCommunityLoaded()
  loadMarksForVisible()
}

// Icons rechts neben den Bewertungssternen jedes History-Eintrags. Eigene Liste: Spotify, zum Radar, bearbeiten.
// Liste eines anderen Lords: Spotify, zu meinem Radar, in meine History. Radar und "In meine History" sind
// Schalter: aktiv gefärbt, ein zweiter Tipp macht die Aktion rückgängig.
const HIST_ICON_STYLE = 'display:inline-flex; align-items:center; justify-content:center; width:30px; height:28px; padding:0; color:rgba(255,255,255,0.55); background:none; border:none; cursor:pointer; text-decoration:none;'
const HIST_SPOTIFY_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>'
const HIST_RADAR_SVG = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4M19 5a10 10 0 0 1 0 14M5 19a10 10 0 0 1 0-14"/></svg>'
const HIST_EDIT_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>'
const HIST_COPY_SVG = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>'
const HIST_COPY_ON_SVG = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.5"/></svg>'
const HIST_ICON_OFF = 'rgba(255,255,255,0.55)'

// Ist der Artist im eigenen Radar? Gibt es das Konzert (Artist + Datum) schon in der eigenen History?
const sameName = (a, b) => stripEdgeEmoji(a).toLowerCase() === stripEdgeEmoji(b).toLowerCase()
function histRadarOn(title) { return radar.some(r => sameName(r.artist, title)) }
function findHistoryCopy(h) { return history.find(x => x.date === h.date && sameName(x.title, h.title)) }

// readOnly: Zeile aus der freigegebenen History eines anderen Nutzers - Sterne nur zur Anzeige, kein Bearbeiten.
// Alle Werte stammen dort aus fremden Konten und gehen ausnahmslos durch esc().
function renderHistoryRow(h, readOnly = false) {
  const dateStr = new Date(h.date + 'T12:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })
  const loc = [h.locationName, h.locationCity].filter(Boolean).join(', ')
  const rating = h.rating || 0
  const starColor = n => n <= rating ? '#facc15' : 'rgba(255,255,255,0.22)'
  const stars = readOnly
    ? `<div style="display:flex;" aria-label="${rating} von 5 Sternen">${[1, 2, 3, 4, 5].map(n => `<span style="padding:0 1px; font-size:15px; line-height:1; color:${starColor(n)};">★</span>`).join('')}</div>`
    : `<div class="history-stars" data-history-id="${h.id}" style="display:flex;">${[1, 2, 3, 4, 5].map(n => `<button data-star="${n}" aria-label="${n} Sterne" style="background:none; border:none; cursor:pointer; padding:0 1px; font-size:15px; line-height:1; color:${starColor(n)};">★</button>`).join('')}</div>`
  const btn = (attrs, label, color, svg) => `<button ${attrs} title="${label}" aria-label="${label}" style="${HIST_ICON_STYLE} color:${color};">${svg}</button>`
  const radarOn = histRadarOn(h.title)
  const copyOn = readOnly && !!findHistoryCopy(h)
  const actions = `
    <div style="display:flex; align-items:center; flex-shrink:0;">
      <a href="${esc(spotifySearchUrl(h.title))}" target="_blank" title="Auf Spotify suchen" aria-label="Auf Spotify suchen" style="${HIST_ICON_STYLE}">${HIST_SPOTIFY_SVG}</a>
      ${btn(`data-hist-radar="${esc(h.title)}"`, radarOn ? 'Aus dem Radar entfernen' : readOnly ? 'Zu meinem Radar' : 'Zum Radar', radarOn ? '#818cf8' : HIST_ICON_OFF, HIST_RADAR_SVG)}
      ${readOnly
        ? btn(`data-hist-copy="1" data-title="${esc(h.title)}" data-date="${esc(h.date)}" data-loc-name="${esc(h.locationName || '')}" data-loc-city="${esc(h.locationCity || '')}"${h.isSupport ? ' data-support="1"' : ''}`, copyOn ? 'Aus meiner History entfernen' : 'In meine History', copyOn ? '#34d399' : HIST_ICON_OFF, copyOn ? HIST_COPY_ON_SVG : HIST_COPY_SVG)
        : btn(`data-history-edit="${h.id}"`, 'Bearbeiten', HIST_ICON_OFF, HIST_EDIT_SVG)}
    </div>`
  return `
    <div class="rounded-xl px-3 py-2.5" style="background:rgba(8,8,42,0.92); border:1px solid rgba(255,255,255,0.07);">
      <div class="syne" style="display:flex; align-items:baseline; gap:5px; font-size:13px; font-weight:700; color:white;">
        <span style="min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${esc(h.title)}</span>${h.isSupport ? '<span style="flex-shrink:0; font-size:11px; font-weight:400; color:rgba(255,255,255,0.4);">(Support)</span>' : ''}
      </div>
      <div style="font-size:11px; color:rgba(255,255,255,0.4); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${loc ? esc(loc) + ' · ' : ''}${dateStr}</div>
      <div style="margin-top:2px; display:flex; align-items:center; justify-content:space-between;">${stars}${actions}</div>
    </div>
  `
}

// Drei einzelne <select> statt <input type="date"> - auf iOS zeigt auch ein <select> beim
// Antippen das native Wählrad, damit bekommt man Tag/Monat/Jahr als drei Wählräder ohne
// eigenes Picker-Widget zu bauen (der native type="date"-Picker ist je nach Plattform ein
// Kalenderraster statt eines Wählrads).
// Komplette Berlin/Leipzig-Venueliste, live gefiltert nach dem Tippfortschritt im
// Location-Feld (Substring, Groß-/Kleinschreibung egal) - nicht nur bereits in der History
// genutzte Orte, damit auch ein neuer Ort schnell gefunden wird.
function renderHistoryLocationOptions(filterText = '') {
  const needle = filterText.trim().toLowerCase()
  const matches = locations
    .filter(l => l.city === 'Berlin' || l.city === 'Leipzig')
    .filter(l => !needle || l.name.toLowerCase().includes(needle))
    .sort((a, b) => a.name.localeCompare(b.name))
  if (!matches.length) return `<div style="padding:10px 14px; color:rgba(255,255,255,0.35); font-size:13px;">Keine Treffer</div>`
  return matches.map((l, i) => `<div data-history-loc-option="${esc(l.name + ', ' + l.city)}" class="loc-option" style="padding:10px 14px; cursor:pointer; color:rgba(255,255,255,0.8); font-size:14px; ${i > 0 ? 'border-top:1px solid rgba(255,255,255,0.04);' : ''}">${esc(l.name)} <span style="color:rgba(255,255,255,0.35); font-size:12px;">${esc(l.city)}</span></div>`).join('')
}

function renderHistoryLocationDropdown(prefix = 'history') {
  return `
    <div id="${prefix}-location-dropdown" class="hidden scrollbar-hide" style="position:absolute; z-index:200; width:100%; max-height:200px; overflow-y:auto; border-radius:12px; background:#0d1530; border:1px solid rgba(255,255,255,0.12); margin-top:4px;">
      ${renderHistoryLocationOptions()}
    </div>
  `
}

function renderHistoryDatePicker(prefix = 'history') {
  const months = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']
  const currentYear = new Date().getFullYear()
  const selectStyle = `flex:1; min-width:0; box-sizing:border-box; border-radius:12px; padding:10px 6px; font-size:13px; color:white; outline:none; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); font-family:'DM Sans',sans-serif; color-scheme:dark;`
  const dayOptions = Array.from({ length: 31 }, (_, i) => i + 1).map(d => `<option value="${d}">${d}</option>`).join('')
  const monthOptions = months.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('')
  const yearOptions = Array.from({ length: 51 }, (_, i) => currentYear - i).map(y => `<option value="${y}">${y}</option>`).join('')
  return `
    <div>
      <label style="font-size:11px; color:rgba(255,255,255,0.4); font-family:'DM Sans',sans-serif; padding-left:4px; display:block; margin-bottom:4px;">Datum</label>
      <div style="display:flex; gap:6px;">
        <select id="${prefix}-day" style="${selectStyle}"><option value="">Tag</option>${dayOptions}</select>
        <select id="${prefix}-month" style="${selectStyle}"><option value="">Monat</option>${monthOptions}</select>
        <select id="${prefix}-year" style="${selectStyle}"><option value="">Jahr</option>${yearOptions}</select>
      </div>
    </div>
  `
}

// historyEntries kommt bereits absteigend nach Datum sortiert an - ein einfacher
// Jahreswechsel-Check beim Durchlaufen reicht daher für die Gliederung, ohne vorher
// extra nach Jahr gruppieren zu müssen.
function renderHistoryListHtml(historyEntries, readOnly = false) {
  if (!historyEntries.length) return `<p class="text-sm" style="color:rgba(255,255,255,0.3);">${readOnly ? 'Noch keine besuchten Konzerte sichtbar.' : 'Noch keine besuchten Konzerte eingetragen.'}</p>`
  let html = ''
  let lastYear = null
  for (const h of historyEntries) {
    const year = h.date.slice(0, 4)
    if (year !== lastYear) {
      html += `<div class="syne" style="margin:${lastYear ? '18px' : '0'} 0 2px 2px; font-size:11px; font-weight:800; letter-spacing:0.08em; color:rgba(255,255,255,0.3);">${year}</div>`
      lastYear = year
    }
    html += renderHistoryRow(h, readOnly)
  }
  return html
}

// ── Karussell-Reiter History und Merkliste: je "Meine ..." und die freigegebenen Listen anderer Lords ─────

const CAROUSEL = {
  history: { peers: () => communityPeers, slide: () => historySlide, set: i => { historySlide = i }, own: 'Meine History', other: 'History von Lord ' },
  bookmark: { peers: () => bmPeers, slide: () => bookmarkSlide, set: i => { bookmarkSlide = i }, own: 'Meine Merkliste', other: 'Merkliste von Lord ' }
}

// Alle bisher gesehenen Lords (History-Listen, Merklisten, Markierungen an Events), damit ein Lord in allen
// Ansichten denselben Namen trägt
function registerPeers(list) {
  for (const p of list) peerRegistry.set(p.publicId, { lordTitle: p.lordTitle, createdAt: p.createdAt })
}

// Anzeigename je Lord: Lord-Titel, sonst der eigene Name des Betrachters (Alias), sonst "Namenlos" - ein später
// gesetzter Lord-Titel überschreibt den Alias also automatisch. Gleiche Namen (ohne Groß-/Kleinschreibung) werden
// fortlaufend nummeriert, der erste ohne Zahl, in der Reihenfolge der Profil-Erstellung.
// publicId -> { named: hat Lord-Titel oder Alias, name }
function peerNames() {
  const out = new Map()
  const seen = new Map()
  const byCreation = [...peerRegistry].sort(([ia, a], [ib, b]) => String(a.createdAt).localeCompare(String(b.createdAt)) || String(ia).localeCompare(String(ib)))
  for (const [id, p] of byCreation) {
    const base = p.lordTitle || peerPrefs[id]?.alias || ''
    const shown = base || 'Namenlos'
    const n = (seen.get(shown.toLowerCase()) || 0) + 1
    seen.set(shown.toLowerCase(), n)
    out.set(id, { named: !!base, name: n === 1 ? shown : `${shown} ${n}` })
  }
  return out
}

// Reihenfolge der Listen anderer Lords: Favoriten zuerst, dann die übrigen, jeweils alphabetisch (wie im Radar)
function resolvePeers(peers) {
  registerPeers(peers)
  const names = peerNames()
  return peers
    .map(p => ({ ...p, isFavorite: !!peerPrefs[p.publicId]?.isFavorite, name: names.get(p.publicId).name }))
    .sort((a, b) => (Number(b.isFavorite) - Number(a.isFavorite)) || a.name.localeCompare(b.name, 'de', { sensitivity: 'base' }))
}

function recomputePeers() {
  communityPeers = resolvePeers(communityRaw)
  bmPeers = resolvePeers(bmRaw)
}

// Führt fn aus (z. B. neu sortieren) und lässt beide Karussells auf demselben Lord stehen
function keepSlides(fn) {
  const hid = communityPeers[historySlide - 1]?.publicId
  const bid = bmPeers[bookmarkSlide - 1]?.publicId
  fn()
  historySlide = hid ? communityPeers.findIndex(p => p.publicId === hid) + 1 : 0
  bookmarkSlide = bid ? bmPeers.findIndex(p => p.publicId === bid) + 1 : 0
}

// Kopfzeile: Titel, Aktionen (eigene History: "+"; Liste eines Lords: Favorit, ggf. Name vergeben) und ein Punkt
// je Liste (Favoriten in Akzentfarbe, die aktive weiß). Nur hier wird zwischen den Listen gewischt.
function renderCarouselHead(kind) {
  const c = CAROUSEL[kind]
  const peers = c.peers()
  const slide = c.slide()
  const total = 1 + peers.length
  const peer = slide > 0 ? peers[slide - 1] : null
  // Schriftgröße so, dass ein 15 Zeichen langer Name die Zeile bis kurz vor den Favoriten-Stern füllt (390 px Breite).
  // Bei einem Lord ohne Titel steht noch der "Name"-Knopf daneben, dort bleibt es bei der kleineren Schrift.
  const compact = !!peer && !peer.lordTitle
  const size = compact ? 11 : 13   // in Merkliste und History gleich groß
  const btn = 'btn-glass rounded-lg inline-flex items-center justify-center'
  const actions = peer
    ? `${peer.lordTitle ? '' : `<button data-peer-alias="${esc(peer.publicId)}" title="Namen vergeben" aria-label="Namen vergeben" class="${btn}" style="height:28px; padding:0 10px; color:rgba(255,255,255,0.6); font-size:11px;">Name</button>`}
       <button data-peer-fav="${esc(peer.publicId)}" title="${peer.isFavorite ? 'Favorit entfernen' : 'Als Favorit markieren'}" aria-label="${peer.isFavorite ? 'Favorit entfernen' : 'Als Favorit markieren'}" aria-pressed="${peer.isFavorite}" class="${btn}" style="width:28px; height:28px; color:${peer.isFavorite ? '#818cf8' : 'rgba(255,255,255,0.45)'}; font-size:16px; line-height:1;">${peer.isFavorite ? '★' : '☆'}</button>`
    : kind === 'history'
      ? `<button data-history-add-toggle title="Konzert nachtragen" aria-label="Konzert nachtragen" class="${btn}" style="width:28px; height:28px; color:rgba(255,255,255,0.6); font-size:16px; line-height:1;">+</button>`
      : ''
  // Pfeile links und rechts der Punkte (nicht neben der Überschrift, damit diese ihre Breite behält)
  const arrow = step => {
    const disabled = (step < 0 && slide === 0) || (step > 0 && slide === total - 1)
    return `<button data-slide-step="${step}" ${disabled ? 'disabled' : ''} aria-label="${step < 0 ? 'Vorherige Liste' : 'Nächste Liste'}" style="width:32px; height:24px; padding:0; border:none; background:none; color:rgba(255,255,255,0.85); font-size:26px; line-height:1; cursor:pointer; opacity:${disabled ? 0.2 : 1};">${step < 0 ? '‹' : '›'}</button>`
  }
  const dots = total > 1
    ? `<div style="display:flex; justify-content:center; align-items:center; margin:2px 0 8px;">${arrow(-1)}${Array.from({ length: total }, (_, i) => {
        const p = i > 0 ? peers[i - 1] : null
        const bg = i === slide ? 'white' : p?.isFavorite ? 'rgba(129,140,248,0.8)' : 'rgba(255,255,255,0.25)'
        return `<button data-dot="${i}" aria-label="${p ? c.other + esc(p.name) : c.own}" style="width:19px; height:19px; padding:6px; border:none; border-radius:50%; background-color:${bg}; background-clip:content-box; cursor:pointer;"></button>`
      }).join('')}${arrow(1)}</div>`
    : ''
  return `
    <div class="flex items-center justify-between mb-1" style="min-height:28px; gap:8px;">
      <h3 class="syne" style="font-size:${size}px; font-weight:600; letter-spacing:${compact ? 0.02 : 0.01}em; text-transform:uppercase; color:#818cf8; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${peer ? c.other + esc(peer.name) : c.own}</h3>
      <div style="display:flex; gap:6px; align-items:center; flex-shrink:0;">${actions}</div>
    </div>
    ${dots}
  `
}

function renderPeerSlides(kind) {
  const c = CAROUSEL[kind]
  return c.peers().map((p, i) => `
    <div class="carousel-slide" data-i="${i + 1}" data-peer="${esc(p.publicId)}" style="${c.slide() === i + 1 ? '' : 'display:none'}">
      ${kind === 'history' ? `<div class="space-y-2">${renderHistoryListHtml(p.entries, true)}</div>` : renderBookmarkPeerHtml(p)}
    </div>
  `).join('')
}

function renderHistoryView() {
  if (!currentUser) return `
    <div class="text-center py-20 text-slate-600">
      <p class="syne text-2xl mb-2">—</p>
      <p class="text-sm">Bitte zuerst mit E-Mail anmelden, um deine History zu sehen.</p>
    </div>
  `
  const historyEntries = history.filter(isHistoryVisible).sort((a, b) => b.date.localeCompare(a.date))
  return `
    <div id="history-carousel" class="pt-2">
      <div id="history-carousel-head" style="padding:6px 0 2px;">${renderCarouselHead('history')}</div>
      <div class="carousel-slide" data-i="0" style="${historySlide === 0 ? '' : 'display:none'}">
        <div id="history-add-form" class="hidden space-y-2 mb-3">
          <input id="history-title" type="text" placeholder="Artist / Titel" style="${inputStyle}" />
          <div style="position:relative;">
            <input id="history-location" type="text" placeholder="Location" autocomplete="off" style="${inputStyle}" />
            ${renderHistoryLocationDropdown()}
          </div>
          ${renderHistoryDatePicker()}
          <button data-history-save class="w-full py-2.5 rounded-xl font-bold text-white text-sm syne" style="background:linear-gradient(135deg, rgba(99,102,241,0.7), rgba(168,85,247,0.7)); border:1px solid rgba(99,102,241,0.3);">Konzert hinzufügen</button>
        </div>
        <div id="history-list" class="space-y-2">
          ${renderHistoryListHtml(historyEntries)}
        </div>
        <p id="history-community-hint" class="text-xs" style="margin-top:18px; color:rgba(255,255,255,0.3); ${communityLoadedAt && !communityPeers.length ? '' : 'display:none'}">Hier erscheinen die Histories anderer Lords, sobald sie freigegeben sind.</p>
      </div>
      <div id="history-peer-slides">${renderPeerSlides('history')}</div>
    </div>
  `
}

// Zeigt Liste `i` (0 = eigene) und aktualisiert Kopfzeile und Punkte. dir: 1 = von rechts, -1 = von links einblenden
function showSlide(kind, i, dir = 0) {
  const c = CAROUSEL[kind]
  const prev = c.slide()
  c.set(Math.max(0, Math.min(c.peers().length, i)))
  const slide = c.slide()
  document.querySelectorAll(`#${kind}-carousel .carousel-slide`).forEach(el => {
    const active = Number(el.dataset.i) === slide
    el.style.display = active ? '' : 'none'
    el.classList.remove('slide-from-right', 'slide-from-left')
    if (active && dir) el.classList.add(dir > 0 ? 'slide-from-right' : 'slide-from-left')
  })
  const head = document.getElementById(`${kind}-carousel-head`)
  if (head) head.innerHTML = renderCarouselHead(kind)
  if (kind === 'history') {
    const hint = document.getElementById('history-community-hint')
    if (hint) hint.style.display = communityLoadedAt && !communityPeers.length ? '' : 'none'
    if (slide === 0 && prev !== 0) { refreshHistoryList(); paintHistoryIcons() }
  } else if (slide === 0 && prev !== 0) {
    refreshBookmarkOwn()
  }
}

// Listen anderer Lords neu zeichnen (nach dem Laden oder nach Favorit/Name); eigene Liste und Formular bleiben unberührt
function refreshCommunityUI() {
  for (const kind of ['history', 'bookmark']) {
    const slides = document.getElementById(`${kind}-peer-slides`)
    if (!slides) continue
    slides.innerHTML = renderPeerSlides(kind)
    showSlide(kind, CAROUSEL[kind].slide())
  }
  attachSwipeGestures()
}

// Lädt die freigegebenen Histories und Merklisten und die eigenen Betrachter-Einstellungen (60-s-Cache; force
// umgeht ihn). Bei einem Ladefehler bleibt die bisherige Anzeige stehen; fehlt nur eine der beiden Listen
// (z. B. Datenbank-Funktion noch nicht eingerichtet), wird die andere trotzdem angezeigt.
async function ensureCommunityLoaded(force = false) {
  if (!currentUser) return
  if (!force && communityLoadedAt && Date.now() - communityLoadedAt < 60000) return
  const [peers, bm, prefs] = await Promise.all([loadCommunityHistories(), loadCommunityBookmarks(), loadPeerPrefs()])
  if (peers === null && bm === null) return
  keepSlides(() => {
    if (peers !== null) communityRaw = peers
    if (bm !== null) bmRaw = bm
    peerPrefs = prefs
    peerRegistry.clear()
    recomputePeers()
  })
  communityLoadedAt = Date.now()
  refreshCommunityUI()
}

async function togglePeerFavorite(publicId) {
  const before = peerPrefs[publicId]
  const next = !before?.isFavorite
  peerPrefs[publicId] = { ...(before || {}), isFavorite: next }
  // Die Liste rückt an ihre neue Position, die Ansicht bleibt auf ihr
  keepSlides(recomputePeers)
  refreshCommunityUI()
  if (!(await savePeerPref(publicId, { isFavorite: next }))) {
    if (before) peerPrefs[publicId] = before; else delete peerPrefs[publicId]
    keepSlides(recomputePeers)
    refreshCommunityUI()
    showToast('Fehler', 'Favorit konnte nicht gespeichert werden.')
  }
}

// Eigener Name für einen Lord ohne Lord-Titel. Nur für den Betrachter sichtbar, gilt in History und Merkliste.
async function assignPeerAlias(publicId) {
  const current = peerPrefs[publicId]?.alias || ''
  const input = prompt(`Name für diesen Lord (nur für dich sichtbar, höchstens ${LORD_NAME_MAX} Zeichen):`, current)
  if (input === null) return
  const alias = input.trim().slice(0, LORD_NAME_MAX)
  const before = peerPrefs[publicId]
  peerPrefs[publicId] = { ...(before || {}), alias: alias || null }
  keepSlides(recomputePeers)
  refreshCommunityUI()
  if (!(await savePeerPref(publicId, { alias }))) {
    if (before) peerPrefs[publicId] = before; else delete peerPrefs[publicId]
    keepSlides(recomputePeers)
    refreshCommunityUI()
    showToast('Fehler', 'Name konnte nicht gespeichert werden.')
  }
}

// Wischgeste und Kopfzeilen-Klicks eines Karussells. Gewischt wird nur in der Kopfzeile (Überschrift und Punkte),
// damit es nicht mit den Wischgesten der Karten (Vormerken / Bin dabei) kollidiert. Delegation, überlebt das Neuzeichnen.
function attachCarousel(kind) {
  const root = document.getElementById(`${kind}-carousel`)
  const head = document.getElementById(`${kind}-carousel-head`)
  if (!root || !head || root.dataset.bound) return
  root.dataset.bound = '1'
  let sx = 0, sy = 0
  head.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY }, { passive: true })
  head.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - sx
    const dy = e.changedTouches[0].clientY - sy
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return
    showSlide(kind, CAROUSEL[kind].slide() + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1)
  }, { passive: true })
  head.addEventListener('click', async e => {
    const step = e.target.closest('[data-slide-step]')
    if (step) { const d = Number(step.dataset.slideStep); showSlide(kind, CAROUSEL[kind].slide() + d, d); return }
    const dot = e.target.closest('[data-dot]')
    if (dot) { const i = Number(dot.dataset.dot); showSlide(kind, i, i > CAROUSEL[kind].slide() ? 1 : -1); return }
    if (e.target.closest('[data-history-add-toggle]')) {
      if (!currentUser) { alert('Bitte zuerst mit E-Mail anmelden um Konzerte nachzutragen.'); return }
      document.getElementById('history-add-form')?.classList.toggle('hidden')
      return
    }
    const fav = e.target.closest('[data-peer-fav]')
    if (fav) { await togglePeerFavorite(fav.dataset.peerFav); return }
    const alias = e.target.closest('[data-peer-alias]')
    if (alias) await assignPeerAlias(alias.dataset.peerAlias)
  })
  if (kind === 'history') {
    root.addEventListener('click', e => {
      const radarBtn = e.target.closest('[data-hist-radar]')
      if (radarBtn) { toggleHistoryRadar(radarBtn.dataset.histRadar); return }
      const copyBtn = e.target.closest('[data-hist-copy]')
      if (copyBtn) { toggleHistoryCopy(copyBtn); return }
      const editBtn = e.target.closest('[data-history-edit]')
      if (editBtn) openHistoryEdit(editBtn.dataset.historyEdit)
    })
  }
}

function refreshHistoryList() {
  const list = document.getElementById('history-list')
  if (!list) return
  const historyEntries = history.filter(isHistoryVisible).sort((a, b) => b.date.localeCompare(a.date))
  list.innerHTML = renderHistoryListHtml(historyEntries)
  attachHistoryRemoveEvents()
}

function attachHistoryRemoveEvents() {
  document.querySelectorAll('.history-stars').forEach(container => {
    const id = container.dataset.historyId
    container.querySelectorAll('[data-star]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const n = parseInt(btn.dataset.star)
        const entry = history.find(h => String(h.id) === id)
        if (!entry) return
        const prevRating = entry.rating ?? null
        // Tippen auf den schon gesetzten Stern entfernt die Bewertung wieder (Toggle-to-clear).
        entry.rating = (entry.rating || 0) === n ? null : n
        refreshHistoryList()
        const ok = await updateHistoryRating(id, entry.rating)
        if (!ok) {
          // Ohne diesen Revert blieb ein fehlgeschlagenes Speichern (z.B. fehlende rating-Spalte/
          // RLS-Policy in Supabase) unbemerkt - die Sterne sahen lokal gesetzt aus, waren es in
          // der DB aber nie, und verschwanden beim nächsten Laden (z.B. nach einem Deploy) wieder.
          entry.rating = prevRating
          refreshHistoryList()
          showToast('Fehler', 'Bewertung konnte nicht gespeichert werden.')
        } else if ((entry.rating || 0) >= 4 && latestConcerts().get(stripEdgeEmoji(entry.title).toLowerCase())?.id === entry.id) {
          // 4/5 Sterne für das letzte Konzert dieses Artists: automatisch ins Radar
          if (await autoAddRadar(entry.title)) showToast('📡 Zum Radar hinzugefügt', entry.title)
        }
      })
    })
  })
}

function attachHistoryEvents() {
  const form = document.getElementById('history-add-form')
  // Karussell (Wischen, Punkte, "+", Favorit, Name), Icons und Nachladen der fremden Listen
  attachCarousel('history')
  if (document.getElementById('history-carousel')) ensureCommunityLoaded()
  bindLocationPicker(document.getElementById('history-location'), document.getElementById('history-location-dropdown'))
  document.querySelector('[data-history-save]')?.addEventListener('click', async () => {
    const title = stripEdgeEmoji(document.getElementById('history-title')?.value.trim())
    const location = document.getElementById('history-location')?.value.trim()
    const day = document.getElementById('history-day')?.value
    const month = document.getElementById('history-month')?.value
    const year = document.getElementById('history-year')?.value
    if (!title || !day || !month || !year) { alert('Bitte mindestens Titel und Datum angeben.'); return }
    const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    // 31. Februar etc.: Date rollt in den Folgemonat über - dann stimmt der Monat nicht mehr
    if (new Date(date + 'T00:00:00').getMonth() + 1 !== Number(month)) { alert('Dieses Datum gibt es nicht - bitte Tag und Monat prüfen.'); return }
    const entry = await addHistoryEntry({ title, locationName: location, locationCity: '', date })
    if (!entry) { alert('Speichern fehlgeschlagen - bitte nochmal versuchen.'); return }
    history = [...history, entry]
    document.getElementById('history-title').value = ''
    document.getElementById('history-location').value = ''
    document.getElementById('history-day').value = ''
    document.getElementById('history-month').value = ''
    document.getElementById('history-year').value = ''
    form?.classList.add('hidden')
    refreshHistoryList()
  })
  attachHistoryRemoveEvents()
}

const inputStyle =`width:100%; box-sizing:border-box; border-radius:12px; padding:10px 14px; font-size:14px; color:white; outline:none; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); font-family:'DM Sans',sans-serif; color-scheme:dark;`

function renderModals() {
  return `
    <div id="modal-radar" class="hidden fixed inset-0 z-30 overflow-y-auto scrollbar-hide" style="background:linear-gradient(180deg, #05053a 0%, #120838 25%, #1e0848 45%, #3a0a52 60%, #52083a 78%, #620a1a 100%); overscroll-behavior:contain; padding-bottom:90px;">
      <div class="max-w-xl mx-auto px-4">${renderHeader(true)}</div>
      <div class="max-w-lg mx-auto mt-2 mb-12 mx-4 rounded-3xl overflow-hidden" style="background:rgba(12,17,32,0.97); border:1px solid rgba(255,255,255,0.1); box-shadow:0 24px 80px rgba(0,0,0,0.6);">
        <div class="px-6 py-5" style="background:linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.15)); border-bottom:1px solid rgba(255,255,255,0.06);">
          <h2 class="syne text-xl text-white" style="font-weight:800;">Radar</h2>
          <p class="text-xs mt-0.5" style="color:rgba(255,255,255,0.35);">Künstler ohne anstehendes Konzert im Blick behalten</p>
        </div>
        <div class="p-6">
          ${currentUser ? `
            <div class="flex gap-2 mb-4">
              <input id="radar-input" type="text" placeholder="Künstlername..." style="${inputStyle}" />
              <button data-radar-add class="syne text-sm font-bold px-4 rounded-xl text-white" style="background:linear-gradient(135deg, rgba(99,102,241,0.7), rgba(168,85,247,0.7)); border:1px solid rgba(99,102,241,0.3); flex-shrink:0;">+</button>
            </div>
            <div id="radar-list" class="space-y-2">${renderRadarList()}</div>
          ` : `
            <p class="text-sm" style="color:rgba(255,255,255,0.4);">Bitte zuerst mit E-Mail anmelden, um ein Radar anzulegen.</p>
          `}
          <button data-close-radar class="mt-4 w-full py-2 text-xs text-slate-600 hover:text-slate-400 transition-colors">Schließen</button>
        </div>
      </div>
    </div>

    <div id="modal-settings" class="hidden fixed inset-0 z-50 overflow-y-auto scrollbar-hide" style="background:rgba(0,0,0,0.72); backdrop-filter:blur(8px); overscroll-behavior:contain;">
      <div class="max-w-lg mx-auto px-4" style="padding-top:max(56px, calc(env(safe-area-inset-top) + 24px)); padding-bottom:48px;">
        <div class="rounded-2xl overflow-hidden" style="background:rgba(8,8,42,0.96); border:1px solid rgba(99,102,241,0.18); box-shadow:0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05);">
          <div style="height:2px; background:linear-gradient(90deg, #818cf8, transparent);"></div>
          <div class="p-5">
            <div class="flex items-center justify-between" style="margin-bottom:6px;">
              <h2 class="syne text-xl text-white" style="font-weight:800;">Einstellungen</h2>
              <button data-close-settings type="button" aria-label="Schließen" style="color:rgba(255,255,255,0.45); background:none; border:none; cursor:pointer; font-size:24px; line-height:1; padding:4px 8px;">×</button>
            </div>
            <div id="settings-body">${renderSettingsBody()}</div>
          </div>
        </div>
      </div>
    </div>

    <div id="modal-history-edit" class="hidden fixed inset-0 z-50 overflow-y-auto scrollbar-hide" style="background:rgba(0,0,0,0.72); backdrop-filter:blur(8px); overscroll-behavior:contain;">
      <div class="max-w-lg mx-auto px-4" style="padding-top:max(56px, calc(env(safe-area-inset-top) + 24px)); padding-bottom:48px;">
        <div class="rounded-2xl" style="background:rgba(8,8,42,0.96); border:1px solid rgba(99,102,241,0.18); box-shadow:0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05);">
          <div style="height:2px; border-radius:16px 16px 0 0; background:linear-gradient(90deg, #818cf8, transparent);"></div>
          <div class="p-5 space-y-3">
            <div class="flex items-center justify-between">
              <h2 class="syne text-xl text-white" style="font-weight:800;">Eintrag bearbeiten</h2>
              <button data-close-history-edit type="button" aria-label="Schließen" style="color:rgba(255,255,255,0.45); background:none; border:none; cursor:pointer; font-size:24px; line-height:1; padding:4px 8px;">×</button>
            </div>
            <input id="hedit-title" type="text" placeholder="Artist / Titel" style="${inputStyle}" />
            <div style="position:relative;">
              <input id="hedit-location" type="text" placeholder="Location" autocomplete="off" style="${inputStyle}" />
              ${renderHistoryLocationDropdown('hedit')}
            </div>
            ${renderHistoryDatePicker('hedit')}
            <label class="flex items-center gap-2" style="cursor:pointer; color:rgba(255,255,255,0.75); font-size:14px; padding:2px 0;">
              <input id="hedit-support" type="checkbox" style="width:18px; height:18px; accent-color:#818cf8; cursor:pointer;" /> Support
            </label>
            <button data-history-edit-save type="button" class="w-full py-2.5 rounded-xl font-bold text-white text-sm syne" style="background:linear-gradient(135deg, rgba(99,102,241,0.7), rgba(168,85,247,0.7)); border:1px solid rgba(99,102,241,0.3);">Speichern</button>
            <button data-history-edit-delete type="button" class="w-full py-2.5 rounded-xl font-bold text-sm syne" style="background:rgba(239,68,68,0.18); border:1px solid rgba(239,68,68,0.55); color:#f87171;">Löschen</button>
          </div>
        </div>
      </div>
    </div>

    <div id="modal-spotify-picker" class="hidden fixed inset-0 z-50 overflow-y-auto scrollbar-hide" style="background:rgba(0,0,0,0.8); backdrop-filter:blur(8px);">
      <div class="max-w-sm mx-auto mt-24 mb-12 mx-4 rounded-3xl overflow-hidden" style="background:rgba(12,17,32,0.97); border:1px solid rgba(255,255,255,0.1); box-shadow:0 24px 80px rgba(0,0,0,0.6);">
        <div class="px-6 py-5" style="background:linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.15)); border-bottom:1px solid rgba(255,255,255,0.06);">
          <h2 class="syne text-xl text-white" style="font-weight:800;">Künstler wählen</h2>
          <p class="text-xs mt-0.5" style="color:rgba(255,255,255,0.35);">Mehrere Acts erkannt – wen auf Spotify suchen?</p>
        </div>
        <div id="spotify-picker-list" class="p-4 space-y-2"></div>
        <div class="px-6 pb-6">
          <button data-close-spotify-picker class="mt-1 w-full py-2 text-xs text-slate-600 hover:text-slate-400 transition-colors">Abbrechen</button>
        </div>
      </div>
    </div>
  `
}


function attachFilterBarEvents() {
  document.querySelectorAll('[data-city]').forEach(btn => {
    btn.addEventListener('click', () => {
      filters.cities = [btn.dataset.city]
      filters.locationId = 'alle'
      updateView(true)
    })
  })
  const filterLocSelected = document.getElementById('filter-loc-selected')
  const filterLocDropdown = document.getElementById('filter-loc-dropdown')
  filterLocSelected?.addEventListener('click', (e) => { e.stopPropagation(); filterLocDropdown.classList.toggle('hidden') })
  document.querySelectorAll('[data-filter-loc]').forEach(opt => {
    opt.addEventListener('click', () => {
      filters.locationId = opt.dataset.filterLoc
      filterLocDropdown.classList.add('hidden')
      updateView(true)
    })
  })
  const searchInput = document.getElementById('search-input')
  const searchClear = document.getElementById('search-clear')
  // Die Liste wird neu gerendert, wenn der Nutzer die Eingabe mit Enter/"Suchen" der Tastatur bestätigt,
  // oder automatisch 1s nach dem letzten Tastendruck (debounced) - so bleibt Tippen flüssig.
  // (Der frühere Lupen-Button ist dem Einstellungen-Zahnrad gewichen.)
  let searchDebounceTimer = null
  const commitSearch = (keepFocus = false) => {
    clearTimeout(searchDebounceTimer)
    filters.search = searchInput ? searchInput.value : ''
    if (!keepFocus) searchInput?.blur()
    updateView(false)
  }
  searchInput?.addEventListener('input', (e) => {
    if (searchClear) searchClear.style.display = e.target.value ? 'flex' : 'none'
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = setTimeout(() => commitSearch(true), 1000)
  })
  searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commitSearch() }
  })
  document.getElementById('settings-open')?.addEventListener('click', openSettingsModal)
  // preventDefault auf mousedown verhindert, dass der Tap den Fokus kurz vom Input wegnimmt -
  // sonst musste unten explizit wieder .focus() aufgerufen werden, was auf Mobilgeräten die
  // virtuelle Tastatur kurz zu- und wieder aufklappen lässt und den Clear-Tap spürbar träge
  // wirken ließ. So bleibt der Fokus durchgehend im Feld, Clear reagiert sofort.
  searchClear?.addEventListener('mousedown', (e) => e.preventDefault())
  searchClear?.addEventListener('click', () => {
    clearTimeout(searchDebounceTimer)
    filters.search = ''
    if (searchInput) searchInput.value = ''
    searchClear.style.display = 'none'
    updateView(false)
  })
}

function attachCalendarEvents() {
  document.querySelector('[data-cal-prev]')?.addEventListener('click', () => { calendarOffset--; refreshCalendarPane() })
  document.querySelector('[data-cal-next]')?.addEventListener('click', () => { calendarOffset++; refreshCalendarPane() })
  document.querySelectorAll('[data-date]').forEach(btn => {
    btn.addEventListener('click', () => {
      const date = btn.dataset.date
      filters.dates = filters.dates.includes(date) ? filters.dates.filter(d => d !== date) : [...filters.dates, date]
      refreshCalendarPane()
    })
  })
  document.querySelector('[data-clear-dates]')?.addEventListener('click', () => { filters.dates = []; refreshCalendarPane() })
}

function refreshCalendarPane() {
  const pane = document.getElementById('pane-kalender')
  if (!pane) return
  pane.innerHTML = renderCalendarContent()
  attachCalendarEvents()
  attachSwipeGestures()
}

function updateView(reRenderFilters = false) {
  // Jeder Aufruf hier kommt von einer Filteränderung (Stadt/Location/Suche) - das
  // Render-Fenster wird dabei immer zurückgesetzt, sonst würde z.B. nach dem Scrollen
  // tief in die Liste ein Filterwechsel plötzlich hunderte Events auf einmal rendern.
  renderedEventLimit = EVENT_RENDER_BATCH
  if (reRenderFilters) {
    const fbw = document.getElementById('filter-bar-wrap')
    if (fbw) { fbw.innerHTML = renderFilters(); attachFilterBarEvents() }
  }
  if (currentView === 'liste') {
    const listContent = document.getElementById('event-list-content')
    if (listContent) { listContent.innerHTML = renderGroupedEvents(); attachSwipeGestures() }
    const kalPane = document.getElementById('pane-kalender')
    if (kalPane) kalPane.dataset.stale = '1'
  } else if (currentView === 'kalender') {
    refreshCalendarPane()
    const listePane = document.getElementById('pane-liste')
    if (listePane) listePane.dataset.stale = '1'
  }
}

// Die Filterleiste (Stadt, Location, Suche, Einstellungen) gibt es nur in Events und Kalender
function hidesFilterBar(view) {
  return view === 'gemerkt' || view === 'history'
}

function attachNavEvents() {
  document.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => {
      // Die Nav-Leiste bleibt jetzt auch bei offenem Radar-Modal sichtbar/bedienbar (statt vom
      // Modal verdeckt zu werden) - ein Tab-Wechsel von dort aus soll das Modal dann aber auch
      // wieder schließen, sonst läge es weiter über der neu angezeigten Ansicht.
      const wasRadarOpen = radarOpen
      radarOpen = false
      document.getElementById('modal-radar')?.classList.add('hidden')
      // Doppeltipp auf "History" bzw. "Gemerkt" springt zu "Meine History" bzw. "Meine Merkliste" (über den Abstand
      // zweier click-Events, da dblclick bei Touch-Taps plattformabhängig unzuverlässig ist)
      const tapNow = Date.now()
      const isDoubleTap = lastNavTap.view === btn.dataset.nav && tapNow - lastNavTap.at < 400
      lastNavTap = { view: btn.dataset.nav, at: tapNow }
      if (isDoubleTap && currentView === btn.dataset.nav && (currentView === 'history' || currentView === 'gemerkt')) {
        showSlide(currentView === 'history' ? 'history' : 'bookmark', 0, -1)
        return
      }

      if (currentView === btn.dataset.nav) {
        if (wasRadarOpen) refreshBottomNav()
        return
      }
      const prevView = currentView
      currentView = btn.dataset.nav
      document.getElementById('pane-' + prevView).style.display = 'none'
      const newPane = document.getElementById('pane-' + currentView)
      newPane.style.display = ''
      const filterBar = document.getElementById('filter-bar-wrap')
      if (filterBar) filterBar.style.display = hidesFilterBar(currentView) ? 'none' : ''
      if (currentView === 'gemerkt') {
        newPane.innerHTML = renderBookmarkedView()
        attachSwipeGestures()
        attachBookmarkEvents()
      } else if (currentView === 'history') {
        newPane.innerHTML = renderHistoryView()
        attachHistoryEvents()
        attachSwipeGestures()
      } else if (newPane.dataset.stale) {
        delete newPane.dataset.stale
        if (currentView === 'liste') {
          document.getElementById('event-list-content').innerHTML = renderGroupedEvents()
          attachSwipeGestures()
        } else if (currentView === 'kalender') {
          refreshCalendarPane()
        }
      } else if (currentView === 'kalender') {
        attachCalendarEvents()
      }
      refreshBottomNav()
      window.scrollTo(0, 0)
    })
  })
}

function attachEvents() {
  attachNavEvents()
  attachSettingsEvents()

  // Modal
  document.querySelector('[data-open-radar]')?.addEventListener('click', openRadarModal)
  document.querySelector('[data-close-radar]')?.addEventListener('click', closeRadarModal)

  // Spotify-Künstler-Auswahl (mehrere Acts im Lineup erkannt)
  const spotifyPickerModal = document.getElementById('modal-spotify-picker')
  document.querySelector('[data-close-spotify-picker]')?.addEventListener('click', () => spotifyPickerModal?.classList.add('hidden'))
  spotifyPickerModal?.addEventListener('click', (ev) => { if (ev.target === spotifyPickerModal) spotifyPickerModal.classList.add('hidden') })

  // Radar: Künstler hinzufügen/entfernen
  const submitRadarArtist = async () => {
    const input = document.getElementById('radar-input')
    const artist = stripEdgeEmoji(input?.value.trim())
    if (!artist) return
    // Vor dem Speichern prüfen, ob der Künstler nicht längst ein Thema ist - Radar ist nur
    // für Artists ohne jeden Bezug zu einem aktuellen Event gedacht, nicht als Duplikat zur
    // Merkliste oder zu bereits existierenden Eventcards.
    const match = events.find(e => !isConcertOver(e.date) && artistMatchesEvent(artist, e))
    if (match) {
      const onWatchlist = bookmarked.some(b => b == match.id) || going.some(g => g == match.id)
      if (onWatchlist) openBookmarks(match.id)
      else focusEvent(match)
      return
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') Notification.requestPermission()
    input.value = ''
    const added = await addRadarArtist(artist)
    if (added) {
      radar.push(added)
      const list = document.getElementById('radar-list')
      if (list) { list.innerHTML = renderRadarList(); attachRadarRemoveEvents() }
    }
  }
  document.querySelector('[data-radar-add]')?.addEventListener('click', submitRadarArtist)
  document.getElementById('radar-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); submitRadarArtist() }
  })
  attachRadarRemoveEvents()

  // Dropdowns schließen bei Klick außerhalb (nur einmal)
  if (!dropdownListenerAdded) {
    dropdownListenerAdded = true
    document.addEventListener('click', () => {
      document.getElementById('filter-loc-dropdown')?.classList.add('hidden')
      document.getElementById('history-location-dropdown')?.classList.add('hidden')
      document.getElementById('hedit-location-dropdown')?.classList.add('hidden')
    })
  }

  // Pull-to-Refresh (nur einmal)
  if (!ptrListenerAdded) {
    ptrListenerAdded = true
    let ptStart = 0, ptPulling = false
    document.addEventListener('touchstart', e => {
      // Nicht bei offenem Radar: dort scrollt das Modal selbst, und der Refresh würde es per render() schließen
      if (window.scrollY === 0 && !radarOpen && !settingsOpen && !historyEditOpen) { ptStart = e.touches[0].clientY; ptPulling = true }
    }, { passive: true })
    document.addEventListener('touchmove', e => {
      if (!ptPulling) return
      const diff = e.touches[0].clientY - ptStart
      const indicator = document.getElementById('ptr-indicator')
      if (indicator && diff > 0) indicator.style.height = Math.min(diff / 2, 50) + 'px'
    }, { passive: true })
    document.addEventListener('touchend', async e => {
      if (!ptPulling) return
      ptPulling = false
      const diff = e.changedTouches[0].clientY - ptStart
      const indicator = document.getElementById('ptr-indicator')
      if (diff > 80) {
        if (indicator) indicator.textContent = '↻ Wird aktualisiert...'
        const seq = ++fetchSeq
        const bm = currentUser ? await loadBookmarks().catch(() => null) : null
        if (seq === fetchSeq) {
          if (bm) {
            const validIds = events.map(ev => ev.id)
            bookmarked = bm.bookmarked.filter(id => validIds.some(v => v == id))
            going = bm.going.filter(id => validIds.some(v => v == id))
          }
          titleAnimated = false
          // Pull-to-Refresh holt auch die Community-Daten (fremde Listen, Zähler) frisch
          communityLoadedAt = 0
          eventMarksAt = {}
          render()
        }
        const ind = document.getElementById('ptr-indicator')
        if (ind) { ind.style.height = '0'; ind.textContent = '↻ Aktualisieren...' }
      } else {
        if (indicator) indicator.style.height = '0'
      }
    }, { passive: true })
  }

  // Login
  document.getElementById('login-btn')?.addEventListener('click', async () => {
    const email = document.getElementById('login-email').value.trim()
    if (!email) return
    const btn = document.getElementById('login-btn')
    const hint = document.getElementById('login-hint')
    btn.textContent = 'Sende...'
    btn.disabled = true
    btn.style.opacity = '0.5'
    hint.textContent = ''
    const ok = await signInWithEmail(email)
    if (ok) {
      btn.classList.add('btn-sweep')
      setTimeout(() => {
        document.getElementById('login-step-1').style.display = 'none'
        document.getElementById('login-step-2').style.display = 'block'
      }, 500)
    } else {
      btn.textContent = 'Code senden'
      btn.disabled = false
      btn.style.opacity = '1'
      hint.textContent = 'Fehler beim Senden — bitte nochmal versuchen.'
    }
  })

  document.getElementById('verify-btn')?.addEventListener('click', async () => {
    const email = localStorage.getItem('lebe-live-email') || document.getElementById('login-email')?.value.trim()
    const code = document.getElementById('login-code').value.trim()
    if (!code) return
    const btn = document.getElementById('verify-btn')
    const hint = document.getElementById('verify-hint')
    btn.textContent = 'Prüfe...'
    btn.disabled = true
    btn.style.opacity = '0.5'
    hint.textContent = ''
    const ok = await verifyOtp(email, code)
    if (ok) {
      btn.classList.add('btn-sweep')
      setTimeout(async () => {
        currentUser = await getUser()
        const merged = await mergeAndSyncBookmarks()
        bookmarked = merged.bookmarked
        going = merged.going
        await checkRadarMatches()
        history = await loadHistory()
        await syncGoingToHistory()
        await backfillRadarFromHistory()
        render()
      }, 500)
    } else {
      btn.textContent = 'Bestätigen'
      btn.disabled = false
      btn.style.opacity = '1'
      hint.textContent = 'Falscher oder abgelaufener Code — bitte nochmal versuchen.'
    }
  })

  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    await signOut()
    // Nutzerdaten nicht im Speicher stehen lassen - sonst sieht auf einem geteilten Gerät die
    // nächste Person History/Merkliste, bis zum nächsten vollen Laden
    currentUser = null
    bookmarked = []
    going = []
    history = []
    radar = []
    communityRaw = []
    communityPeers = []
    bmRaw = []
    bmPeers = []
    peerPrefs = {}
    peerRegistry.clear()
    communityLoadedAt = 0
    historySlide = 0
    bookmarkSlide = 0
    myProfile = null
    myProfileError = false
    eventMarks = {}
    eventMarksAt = {}
    render()
  })

  attachFilterBarEvents()
  if (currentView === 'kalender') attachCalendarEvents()
  attachHistoryEditModal()
  if (currentView === 'history') attachHistoryEvents()
  attachSwipeGestures()
  if (currentView === 'gemerkt') attachBookmarkEvents()
}

function eventDateUTC(dateStr, timeStr) {
  const [y,m,d] = dateStr.split('-').map(Number)
  const [h,min] = (timeStr || '20:00').split(':').map(Number)
  return new Date(y, m-1, d, h, min, 0)
}

function closeSwipeWrapper(wrapper) {
  if (wrapper && wrapper._closeSwipe) wrapper._closeSwipe()
}

function attachSwipeToWrapper(wrapper) {
  const card = wrapper.querySelector('.event-swipe-card')
  if (!card) return
  // Mehrfachaufrufe (attachSwipeGestures() läuft über alle Panes) dürfen keine zweiten
  // Handler anhängen - sonst feuern Teilen/ICS/Kalender doppelt
  if (wrapper.dataset.swipeBound) return
  wrapper.dataset.swipeBound = '1'
  const REVEAL_WIDTH = 160, THRESHOLD = 60
  const SETTLE_TRANSITION = 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)'
  let startX = 0, startY = 0, currentDx = 0
  let directionLocked = null, isOpen = false
  let rafId = null

  // Während des Ziehens den Transform-Write auf einen rAF pro Frame begrenzen, statt bei
  // jedem touchmove-Event (die deutlich häufiger als die Bildwiederholrate feuern können)
  // sofort das DOM zu schreiben - das war die Ursache des hakeligen Wischens
  function scheduleTransform() {
    if (rafId !== null) return
    rafId = requestAnimationFrame(() => {
      card.style.transform = `translateX(${currentDx}px)`
      rafId = null
    })
  }

  card.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX
    startY = e.touches[0].clientY
    currentDx = isOpen ? -REVEAL_WIDTH : 0
    directionLocked = null
    card.style.transition = 'none'
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
  }, { passive: true })

  card.addEventListener('touchmove', e => {
    const dx = e.touches[0].clientX - startX
    const dy = e.touches[0].clientY - startY
    if (!directionLocked) {
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return
      directionLocked = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
    }
    if (directionLocked !== 'h') return
    e.preventDefault()
    const base = isOpen ? -REVEAL_WIDTH : 0
    currentDx = Math.max(-REVEAL_WIDTH, Math.min(0, base + dx))
    scheduleTransform()
  }, { passive: false })

  card.addEventListener('touchend', () => {
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
    card.style.transition = SETTLE_TRANSITION
    if (directionLocked !== 'h') return
    const base = isOpen ? -REVEAL_WIDTH : 0
    const delta = currentDx - base
    if (!isOpen && delta < -THRESHOLD) openCard()
    else if (isOpen && delta > THRESHOLD) closeCard()
    else card.style.transform = `translateX(${isOpen ? -REVEAL_WIDTH : 0}px)`
  }, { passive: true })

  function openCard() {
    if (swipeActiveWrapper && swipeActiveWrapper !== wrapper) closeSwipeWrapper(swipeActiveWrapper)
    card.style.transition = SETTLE_TRANSITION
    card.style.transform = `translateX(${-REVEAL_WIDTH}px)`
    isOpen = true
    swipeActiveWrapper = wrapper
  }
  function closeCard() {
    card.style.transition = SETTLE_TRANSITION
    card.style.transform = 'translateX(0)'
    isOpen = false
    if (swipeActiveWrapper === wrapper) swipeActiveWrapper = null
  }
  wrapper._closeSwipe = closeCard

  // Desktop hover: reveal actions on mouse-driven devices
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    wrapper.addEventListener('mousemove', e => {
      if (isOpen) return
      if (wrapper.getBoundingClientRect().right - e.clientX < 60) openCard()
    })
    wrapper.addEventListener('mouseleave', () => { if (isOpen) closeCard() })
  }

  // Card-level event handlers
  const id = wrapper.dataset.eventId
  wrapper.querySelector('[data-swipe-bookmark]')?.addEventListener('click', () => {
    if (bookmarkInFlight.has(id)) return
    bookmarkInFlight.add(id)
    setTimeout(() => bookmarkInFlight.delete(id), 400)
    if (!currentUser) { alert('Bitte zuerst mit E-Mail anmelden um Events vorzumerken.'); return }
    wrapper.querySelector('[data-swipe-bookmark]')?.classList.add('btn-sweep')
    const wasGoing = going.some(g => g == id)
    const isNow = !bookmarked.some(b => b == id)
    if (wasGoing) going = going.filter(g => g != id)
    bookmarked = isNow ? [...bookmarked, id] : bookmarked.filter(b => b != id)
    setTimeout(() => { if (currentView === 'gemerkt' && bookmarkSlide === 0) { render() } else { updateCard(id) } }, 400)
    if (wasGoing) toggleBookmark(id, 'going', false)
    toggleBookmark(id, 'bookmarked', isNow)
  })
  wrapper.querySelector('[data-swipe-going]')?.addEventListener('click', () => {
    if (bookmarkInFlight.has(id)) return
    bookmarkInFlight.add(id)
    setTimeout(() => bookmarkInFlight.delete(id), 400)
    if (!currentUser) { alert('Bitte zuerst mit E-Mail anmelden um Events vorzumerken.'); return }
    wrapper.querySelector('[data-swipe-going]')?.classList.add('btn-sweep')
    const wasBookmarked = bookmarked.some(b => b == id)
    const isNow = !going.some(g => g == id)
    if (wasBookmarked) bookmarked = bookmarked.filter(b => b != id)
    going = isNow ? [...going, id] : going.filter(g => g != id)
    setTimeout(() => { if (currentView === 'gemerkt' && bookmarkSlide === 0) { render() } else { updateCard(id) } }, 400)
    if (wasBookmarked) toggleBookmark(id, 'bookmarked', false)
    toggleBookmark(id, 'going', isNow)
    const ev = events.find(e => e.id == id)
    if (isNow && ev) {
      // Sofortiger History-Snapshot beim Markieren statt erst beim nächsten App-Start -
      // siehe syncGoingToHistory() für die Begründung (Event kann bis dahin schon aus
      // events.json verschwunden sein).
      if (!history.some(h => h.eventId === String(id))) {
        archiveEventToHistory(ev).then(added => { if (added.length) history = [...history, ...added] })
      }
    } else if (!isNow && ev && !isConcertOver(ev.date)) {
      // Nur bei noch nicht stattgefundenen Events den Snapshot mit entfernen - bei bereits
      // vergangenen bleibt er stehen (Korrektur dafür ist der Lösch-Button in der History).
      history = history.filter(h => h.eventId !== String(id))
      removeHistoryEntryByEventId(id)
    }
  })
  wrapper.querySelector('[data-share]')?.addEventListener('click', () => {
    const e = events.find(ev => ev.id == id)
    if (!e) return
    const loc = locations.find(l => l.id === e.locationId)
    const locName = loc ? loc.name : (e.locationName || '')
    const safeTicketUrl = safeUrl(e.ticketUrl)
    const infoUrl = safeTicketUrl ? `\n${safeTicketUrl}` : ''
    const text = `${e.title} – ${locName}, ${e.date} ${e.time}${infoUrl}`
    if (navigator.share) navigator.share({ title: e.title, text })
    else { navigator.clipboard.writeText(text); alert('In Zwischenablage kopiert!') }
  })
  wrapper.querySelector('[data-ics]')?.addEventListener('click', () => {
    const e = events.find(ev => ev.id == id)
    if (!e) return
    const loc = locations.find(l => l.id === e.locationId)
    const locName = loc ? loc.name : (e.locationName || '')
    const locCity = loc ? loc.city : (e.locationCity || '')
    const startDate = eventDateUTC(e.date, e.time)
    const endDate = new Date(startDate); endDate.setHours(endDate.getHours() + 2)
    const fmt = d => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}00`
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    const ticketUrl = safeUrl(e.ticketUrl)
    // UID/DTSTAMP sind nach RFC 5545 Pflicht - ohne sie lehnen manche Kalender-Apps den Import ab
    const ics = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//LE.BE LIVE//DE','BEGIN:VEVENT',`UID:${e.id}@lebe-live`,`DTSTAMP:${stamp}`,`DTSTART:${fmt(startDate)}`,`DTEND:${fmt(endDate)}`,`SUMMARY:${icsEscape(e.title)}`,`LOCATION:${icsEscape(locName)}, ${icsEscape(locCity)}`, ...(ticketUrl ? [`URL:${ticketUrl}`] : []), 'END:VEVENT','END:VCALENDAR'].join('\r\n')
    const blob = new Blob([ics], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${e.title.replace(/\s+/g,'-')}.ics`; a.click()
    // Nicht sofort freigeben - iOS Safari lädt die Datei asynchron und bekäme sonst eine tote URL
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  })
  wrapper.querySelector('[data-spotify-picker]')?.addEventListener('click', () => {
    const e = events.find(ev => ev.id == id)
    if (!e) return
    const list = document.getElementById('spotify-picker-list')
    const pickerModal = document.getElementById('modal-spotify-picker')
    if (!list || !pickerModal) return
    list.innerHTML = extractArtists(e.title).map(name => `<a href="${spotifySearchUrl(name)}" target="_blank" class="btn-glass rounded-xl flex items-center justify-between px-4 py-3 text-sm text-white" style="text-decoration:none;">${esc(name)}<span style="color:rgba(255,255,255,0.3);">›</span></a>`).join('')
    list.querySelectorAll('a').forEach(a => a.addEventListener('click', () => pickerModal.classList.add('hidden')))
    pickerModal.classList.remove('hidden')
  })
  wrapper.querySelector('[data-gcal]')?.addEventListener('click', () => {
    const e = events.find(ev => ev.id == id)
    if (!e) return
    const loc = locations.find(l => l.id === e.locationId)
    const locName = loc ? loc.name : (e.locationName || '')
    const startDate = eventDateUTC(e.date, e.time)
    const endDate = new Date(startDate); endDate.setHours(endDate.getHours() + 2)
    const fmtUtc = d => d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(e.title)}&dates=${fmtUtc(startDate)}/${fmtUtc(endDate)}&location=${encodeURIComponent(locName)}&details=${encodeURIComponent(e.ticketUrl || '')}`
    window.open(url, '_blank')
  })

}

function refreshRadarList() {
  const list = document.getElementById('radar-list')
  if (list) { list.innerHTML = renderRadarList(); attachRadarRemoveEvents() }
}

// Radar- und "In meine History"-Icons in allen Listen an den aktuellen Stand anpassen
function paintHistoryIcons() {
  document.querySelectorAll('[data-hist-radar]').forEach(b => {
    const on = histRadarOn(b.dataset.histRadar)
    b.style.color = on ? '#818cf8' : HIST_ICON_OFF
    b.title = on ? 'Aus dem Radar entfernen' : b.closest('[data-peer]') ? 'Zu meinem Radar' : 'Zum Radar'
    b.setAttribute('aria-label', b.title)
  })
  document.querySelectorAll('[data-hist-copy]').forEach(b => {
    const on = !!findHistoryCopy({ title: b.dataset.title, date: b.dataset.date })
    b.style.color = on ? '#34d399' : HIST_ICON_OFF
    b.innerHTML = on ? HIST_COPY_ON_SVG : HIST_COPY_SVG
    b.title = on ? 'Aus meiner History entfernen' : 'In meine History'
    b.setAttribute('aria-label', b.title)
  })
}

// History-Artist per Icon zum Radar hinzufügen - gleiche Dubletten-Prüfschleife wie beim
// manuellen Hinzufügen (submitRadarArtist), aber nur gegen künftige Events geprüft: ein
// History-Snapshot kann wegen des wöchentlichen Scraper-Laufs übergangsweise noch mit einem
// bereits vergangenen (gleichnamigen) Event in events.json kollidieren.
async function addHistoryArtistToRadar(artist) {
  artist = stripEdgeEmoji(artist)
  const match = events.find(e => !isConcertOver(e.date) && artistMatchesEvent(artist, e))
  if (match) {
    const onWatchlist = bookmarked.some(b => b == match.id) || going.some(g => g == match.id)
    if (onWatchlist) openBookmarks(match.id)
    else focusEvent(match)
    return
  }
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') Notification.requestPermission()
  const added = await addRadarArtistIfNew(artist)
  if (added) {
    radar.push(added)
    refreshRadarList()
    showToast('📡 Zum Radar hinzugefügt', artist)
  } else {
    showToast('Fehler', 'Konnte nicht zum Radar hinzugefügt werden.')
  }
}

// Radar-Icon: ein Tipp legt den Artist an, ein zweiter Tipp entfernt ihn nach Rückfrage wieder
async function toggleHistoryRadar(artist) {
  if (!currentUser) { alert('Bitte zuerst mit E-Mail anmelden.'); return }
  const existing = radar.find(r => sameName(r.artist, artist))
  if (!existing) {
    await addHistoryArtistToRadar(artist)
    paintHistoryIcons()
    return
  }
  if (!confirm(`„${existing.artist}“ aus dem Radar löschen?`)) return
  radar = radar.filter(r => r.id !== existing.id)
  refreshRadarList()
  paintHistoryIcons()
  if (!(await removeRadarArtist(existing.id))) {
    radar.push(existing)
    refreshRadarList()
    paintHistoryIcons()
    showToast('Fehler', 'Konnte nicht aus dem Radar entfernt werden.')
  }
}

// Löscht einen eigenen History-Eintrag (die Rückfrage stellt der Aufrufer)
async function deleteHistoryEntry(entry) {
  // Event merken, damit syncGoingToHistory() den bewusst gelöschten Eintrag nicht beim
  // nächsten Laden wieder anlegt (das Event bleibt ja "dabei" markiert)
  if (entry.eventId) saveData('historyDismissed', [...new Set([...(loadData('historyDismissed') || []), entry.eventId])])
  history = history.filter(h => String(h.id) !== String(entry.id))
  refreshHistoryList()
  paintHistoryIcons()
  return removeHistoryEntry(entry.id)
}

// "In meine History": übernimmt ein Konzert aus der Liste eines anderen Lords (ohne dessen Sterne),
// ein zweiter Tipp entfernt den Eintrag nach Rückfrage wieder
async function toggleHistoryCopy(btn) {
  if (!currentUser) { alert('Bitte zuerst mit E-Mail anmelden.'); return }
  const h = { title: btn.dataset.title, date: btn.dataset.date, locationName: btn.dataset.locName, locationCity: btn.dataset.locCity }
  const existing = findHistoryCopy(h)
  if (existing) {
    if (!confirm(`„${existing.title}“ aus der History löschen?`)) return
    if (!(await deleteHistoryEntry(existing))) {
      history = [...history, existing]
      refreshHistoryList()
      paintHistoryIcons()
      showToast('Fehler', 'Konnte nicht aus der History entfernt werden.')
    }
    return
  }
  const entry = await addHistoryEntry({ title: stripEdgeEmoji(h.title), locationName: h.locationName, locationCity: h.locationCity, date: h.date, isSupport: btn.dataset.support === '1' })
  if (!entry) { showToast('Fehler', 'Konnte nicht in die History übernommen werden.'); return }
  history = [...history, entry]
  refreshHistoryList()
  paintHistoryIcons()
  showToast('✓ In meine History übernommen', entry.title)
}

// ── Eintrag bearbeiten (Titel, Ort, Datum; Löschen) ─────────────────────────────────────────────

function openHistoryEdit(id) {
  const entry = history.find(h => String(h.id) === String(id))
  const modal = document.getElementById('modal-history-edit')
  if (!entry || !modal) return
  historyEditId = entry.id
  historyEditOpen = true
  historyEditPrefill = [entry.locationName, entry.locationCity].filter(Boolean).join(', ')
  document.getElementById('hedit-title').value = entry.title
  document.getElementById('hedit-support').checked = !!entry.isSupport
  document.getElementById('hedit-location').value = historyEditPrefill
  const [y, m, d] = entry.date.split('-').map(Number)
  const yearSel = document.getElementById('hedit-year')
  if (![...yearSel.options].some(o => o.value === String(y))) yearSel.add(new Option(y, y))
  document.getElementById('hedit-day').value = String(d)
  document.getElementById('hedit-month').value = String(m)
  yearSel.value = String(y)
  modal.classList.remove('hidden')
}

function closeHistoryEdit() {
  historyEditOpen = false
  historyEditId = null
  document.getElementById('modal-history-edit')?.classList.add('hidden')
  document.getElementById('hedit-location-dropdown')?.classList.add('hidden')
}

async function saveHistoryEdit() {
  const entry = history.find(h => String(h.id) === String(historyEditId))
  if (!entry) { closeHistoryEdit(); return }
  const title = stripEdgeEmoji(document.getElementById('hedit-title').value.trim())
  const location = document.getElementById('hedit-location').value.trim()
  const day = document.getElementById('hedit-day').value
  const month = document.getElementById('hedit-month').value
  const year = document.getElementById('hedit-year').value
  const isSupport = document.getElementById('hedit-support').checked
  if (!title || !day || !month || !year) { alert('Bitte mindestens Titel und Datum angeben.'); return }
  const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  if (new Date(date + 'T00:00:00').getMonth() + 1 !== Number(month)) { alert('Dieses Datum gibt es nicht - bitte Tag und Monat prüfen.'); return }
  // Ort unverändert: Name und Stadt des Eintrags behalten (sie stehen getrennt in der Datenbank)
  const place = location === historyEditPrefill ? { locationName: entry.locationName, locationCity: entry.locationCity } : { locationName: location, locationCity: '' }
  if (!(await updateHistoryEntry(entry.id, { title, ...place, date, isSupport }))) { alert('Speichern fehlgeschlagen - bitte nochmal versuchen.'); return }
  Object.assign(entry, { title, ...place, date, isSupport })
  closeHistoryEdit()
  refreshHistoryList()
  paintHistoryIcons()
}

async function deleteHistoryFromEdit() {
  const entry = history.find(h => String(h.id) === String(historyEditId))
  if (!entry) { closeHistoryEdit(); return }
  if (!confirm(`„${entry.title}“ aus der History löschen?`)) return
  closeHistoryEdit()
  await deleteHistoryEntry(entry)
}

function attachHistoryEditModal() {
  const modal = document.getElementById('modal-history-edit')
  if (!modal) return
  bindLocationPicker(document.getElementById('hedit-location'), document.getElementById('hedit-location-dropdown'))
  modal.addEventListener('click', async e => {
    if (e.target === modal || e.target.closest('[data-close-history-edit]')) { closeHistoryEdit(); return }
    if (e.target.closest('[data-history-edit-save]')) { await saveHistoryEdit(); return }
    if (e.target.closest('[data-history-edit-delete]')) await deleteHistoryFromEdit()
  })
}

// Location-Feld mit live gefilterter Venue-Liste (Substring, z.B. "C" -> "Ca" -> ...), statt nur einmal
// beim Öffnen eine feste Liste zu zeigen
function bindLocationPicker(input, dropdown) {
  if (!input || !dropdown) return
  const bindOptions = () => dropdown.querySelectorAll('[data-history-loc-option]').forEach(opt => {
    opt.addEventListener('click', () => {
      input.value = opt.dataset.historyLocOption
      dropdown.classList.add('hidden')
    })
  })
  input.addEventListener('click', e => { e.stopPropagation(); dropdown.classList.remove('hidden') })
  input.addEventListener('focus', () => dropdown.classList.remove('hidden'))
  input.addEventListener('input', () => {
    dropdown.innerHTML = renderHistoryLocationOptions(input.value)
    dropdown.classList.remove('hidden')
    bindOptions()
  })
  bindOptions()
}

function attachSwipeGestures() {
  if (!swipeDocListenerAdded) {
    swipeDocListenerAdded = true
    document.addEventListener('touchstart', e => {
      if (swipeActiveWrapper && !swipeActiveWrapper.contains(e.target)) closeSwipeWrapper(swipeActiveWrapper)
    }, { passive: true })
  }
  document.querySelectorAll('.event-swipe-wrapper').forEach(wrapper => attachSwipeToWrapper(wrapper))
  setupLoadMoreObserver()
}

// Lädt beim Scrollen in Richtung Listenende das nächste Häppchen Events nach (siehe
// EVENT_RENDER_BATCH). Wird nach jedem Render der Liste-Ansicht neu aufgesetzt, da der
// Sentinel-Knoten beim Neu-Rendern jedes Mal ersetzt wird.
function setupLoadMoreObserver() {
  if (loadMoreObserver) { loadMoreObserver.disconnect(); loadMoreObserver = null }
  const sentinel = document.getElementById('load-more-sentinel')
  if (!sentinel) return
  loadMoreObserver = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) return
    loadMoreObserver.disconnect()
    loadMoreObserver = null
    renderedEventLimit += EVENT_RENDER_BATCH
    const listContent = document.getElementById('event-list-content')
    if (listContent) { listContent.innerHTML = renderGroupedEvents(); attachSwipeGestures() }
  }, { rootMargin: '600px 0px' })
  loadMoreObserver.observe(sentinel)
}

function updateCard(id) {
  const e = events.find(ev => ev.id == id)
  if (!e) return
  const wrapper = findVisibleCard(id)
  if (!wrapper) { render(); return }
  // Die Karte in der jeweils anderen Pane ist jetzt veraltet - beim Tab-Wechsel neu rendern
  const other = document.getElementById(currentView === 'liste' ? 'pane-kalender' : 'pane-liste')
  if (other) other.dataset.stale = '1'
  const temp = document.createElement('div')
  const note = wrapper.dataset.peerStatus ? { status: wrapper.dataset.peerStatus, name: wrapper.dataset.peerName } : null
  temp.innerHTML = renderEventCard(e, { peerNote: note })
  const newWrapper = temp.firstElementChild
  wrapper.replaceWith(newWrapper)
  attachSwipeToWrapper(newWrapper)
}