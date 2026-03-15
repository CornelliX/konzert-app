import { getLocations, getEvents, saveData, loadData } from './data.js'
import { saveManualEvent, loadBookmarks, toggleBookmark, getUser, signInWithEmail, verifyOtp, signOut } from './supabase.js'

let locations = getLocations()
let currentUser = null
let events = []
let container = null
let filters = { cities: ['Berlin'], type: 'alle', locationId: 'alle', dates: [] }
let bookmarked = loadData('bookmarked') || []
let going = loadData('going') || []
let seenEvents = loadData('seenEvents') || []
let currentView = 'liste'
let calendarOffset = 0

export async function renderApp(el) {
  container = el
  currentUser = await getUser()
  events = await getEvents()
  if (currentUser) {
    const bm = await loadBookmarks()
    bookmarked = bm.bookmarked
    going = bm.going
  }
  render()
}

function isNew(event) {
  return !seenEvents.includes(event.id)
}

function markAllSeen() {
  seenEvents = events.map(e => e.id)
  saveData('seenEvents', seenEvents)
}

function render() {
  const newCount = events.filter(e => isNew(e)).length
  container.innerHTML = `
  <div id="ptr-indicator" style="text-align:center; height:0; overflow:hidden; transition:height 0.2s; color:rgba(255,255,255,0.5); font-size:13px; display:flex; align-items:center; justify-content:center;">↻ Aktualisieren...</div>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
      * { box-sizing: border-box; }
      body { font-family: 'DM Sans', sans-serif; }
      .syne { font-family: 'Syne', sans-serif; }
      input[type="date"], input[type="time"] { color-scheme: dark; color: rgba(255,255,255,0.4) !important; }
      input[type="date"]:valid, input[type="time"]:valid { color: white !important; }
      .glass {
        background: rgba(8,8,42,0.97);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255,255,255,0.08);
      }
      .btn-glass {
        background: rgba(255,255,255,0.07);
        border: 1px solid rgba(255,255,255,0.1);
        transition: all 0.2s ease;
        cursor: pointer;
      }
      .btn-glass:hover {
        background: rgba(255,255,255,0.12);
        border-color: rgba(255,255,255,0.2);
      }
      .card-hover { transition: transform 0.2s ease; }
      .card-hover:hover { transform: translateY(-1px); }
      input, textarea { color-scheme: dark; }
      input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.2); }
      .noise { position: relative; }
      .noise::after {
        content: '';
        position: fixed;
        inset: 0;
        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
        pointer-events: none;
        z-index: 0;
      }
      .scrollbar-hide { scrollbar-width: none; }
      .scrollbar-hide::-webkit-scrollbar { display: none; }
      .loc-option:hover { background: rgba(255,255,255,0.06) !important; }
    </style>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
    <style>
      .flatpickr-calendar { background:#1a1a3a; border:1px solid rgba(255,255,255,0.1); border-radius:16px; }
      .flatpickr-day { color:white; } .flatpickr-day:hover { background:rgba(99,102,241,0.3); }
      .flatpickr-day.selected { background:rgba(99,102,241,0.6); border-color:transparent; }
      .flatpickr-months, .flatpickr-weekdays, span.flatpickr-weekday { background:transparent; color:rgba(255,255,255,0.5); }
      .flatpickr-current-month, .numInputWrapper { color:white; }
      .flatpickr-prev-month svg, .flatpickr-next-month svg { fill:white; }
      .flatpickr-time { background:#1a1a3a !important; border-radius:12px !important; }
      .flatpickr-time input { color:white !important; background:transparent !important; }
      .flatpickr-time .numInputWrapper span { border-color:rgba(255,255,255,0.2) !important; }
      .flatpickr-time .numInputWrapper span svg { fill:white !important; }
      .flatpickr-input { width:100% !important; border-radius:12px !important; padding:10px 14px !important; font-size:14px !important; color:white !important; outline:none !important; background:rgba(255,255,255,0.06) !important; border:1px solid rgba(255,255,255,0.1) !important; font-family:'DM Sans',sans-serif !important; box-sizing:border-box !important; }
    </style>
    <div class="noise min-h-screen" style="background: linear-gradient(180deg, #05053a 0%, #120838 25%, #1e0848 45%, #3a0a52 60%, #52083a 78%, #620a1a 100%);">
      <div style="position:fixed; top:-10%; left:-10%; width:50vw; height:50vw; background:radial-gradient(circle, rgba(60,40,180,0.12) 0%, transparent 70%); pointer-events:none; z-index:0;"></div>
      <div style="position:fixed; bottom:-10%; right:-10%; width:40vw; height:40vw; background:radial-gradient(circle, rgba(140,20,60,0.10) 0%, transparent 70%); pointer-events:none; z-index:0;"></div>

      <div class="relative z-10 max-w-xl mx-auto px-4 pb-16">
        ${renderHeader(newCount)}
        ${currentUser ? '' : `
  <div class="glass rounded-2xl p-4 mb-4">
    <div id="login-step-1" class="flex gap-3 items-center">
      <input id="login-email" type="email" placeholder="E-Mail für Merkliste..." value="${localStorage.getItem('lebe-live-email') || ''}" style="${inputStyle} flex:1;" />
      <button id="login-btn" class="syne text-sm font-semibold px-4 py-2 rounded-xl" style="background:rgba(99,102,241,0.4); border:1px solid rgba(99,102,241,0.3); color:white; white-space:nowrap; cursor:pointer;">Code senden</button>
    </div>
    <div id="login-step-2" style="display:none;" class="flex gap-3 items-center">
      <input id="login-code" type="number" placeholder="6-stelliger Code..." style="${inputStyle} flex:1; letter-spacing:0.2em;" />
      <button id="verify-btn" class="syne text-sm font-semibold px-4 py-2 rounded-xl" style="background:rgba(99,102,241,0.4); border:1px solid rgba(99,102,241,0.3); color:white; white-space:nowrap; cursor:pointer;">Bestätigen</button>
    </div>
  </div>
`}
        ${currentUser ? `<div class="text-right mb-2" style="font-size:11px; color:rgba(255,255,255,0.3);">${currentUser.email} · <span id="logout-btn" style="cursor:pointer; text-decoration:underline;">Abmelden</span></div>` : ''}
        ${renderNav()}
        ${currentView === 'liste' ? renderListView() : ''}
        ${currentView === 'kalender' ? renderCalendarView() : ''}
        ${currentView === 'gemerkt' ? renderBookmarkedView() : ''}
      </div>
    </div>
    ${renderModals()}
  `
  attachEvents()
  if (newCount > 0 && currentView === 'liste') {
    setTimeout(() => markAllSeen(), 3000)
  }
}

function renderHeader(newCount) {
  return `
    <div class="pt-10 pb-6">
      <div class="flex items-center justify-between gap-2">
        <h1 class="syne text-5xl leading-none" style="color: white; letter-spacing: -0.02em; font-weight: 800; line-height: 1; flex-shrink:0;">
          LE.BE<br>LIVE
        </h1>
        ${newCount > 0 ? `<div style="flex-shrink:0; width:44px; height:44px; border-radius:50%; background:rgba(244,114,182,0.15); border:1px solid rgba(244,114,182,0.25); color:#f472b6; display:flex; flex-direction:column; align-items:center; justify-content:center; line-height:1.2;">
          <span style="font-size:10px; font-weight:700;">${newCount}</span>
          <span style="font-size:10px; font-weight:600;">neu</span>
        </div>` : ''}
        <div class="syne text-right" style="color:rgba(168,85,247,0.9); font-weight:700; font-size:0.65em; line-height:1.25; letter-spacing:0.04em; text-transform:uppercase; white-space:nowrap;">
          KONZERTE<br>UND PARTYS<br>IN LEIPZIG<br>UND BERLIN
        </div>
      </div>
    </div>
  `
}

function renderNav() {
  const tabs = [
    { id: 'liste', label: 'Events' },
    { id: 'kalender', label: 'Kalender' },
    { id: 'gemerkt', label: `Gemerkt${(bookmarked.filter(b => b).length + going.filter(g => g).length) > 0 ? ' · ' + (bookmarked.filter(b => b).length + going.filter(g => g).length) : ''}` },
  ]
  return `
    <div class="flex gap-1.5 mb-6 p-1 rounded-2xl glass">
      ${tabs.map(t => `
        <button data-nav="${t.id}" class="flex-1 py-2.5 rounded-xl text-sm font-semibold syne transition-all duration-200 ${
          currentView === t.id ? 'text-white' : 'text-slate-500 hover:text-slate-300'
        }" ${currentView === t.id ? 'style="background: linear-gradient(135deg, rgba(99,102,241,0.5), rgba(168,85,247,0.5)); border: 1px solid rgba(99,102,241,0.3);"' : ''}>
          ${t.label}
        </button>
      `).join('')}
      <button data-open-add style="width:38px; flex-shrink:0; border-radius:12px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:rgba(255,255,255,0.4); font-size:20px; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.2s;">+</button>
    </div>
  `
}

function renderFilters() {
  const locationOptions = locations
    .filter(l => filters.cities.includes(l.city))
    .sort((a, b) => a.name.localeCompare(b.name))

  return `
    <div class="glass rounded-2xl p-4 mb-5 space-y-3">
      <div class="flex gap-2">
        ${['Berlin', 'Leipzig'].map(c => `
          <button data-city="${c}" class="flex-1 py-2 rounded-xl text-sm font-semibold syne transition-all duration-200 ${
            filters.cities.includes(c) ? 'text-white' : 'text-slate-600 hover:text-slate-400'
          }" style="${filters.cities.includes(c)
            ? 'background: rgba(99,102,241,0.2); border: 1px solid rgba(99,102,241,0.35);'
            : 'background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);'}">
            ${c}
          </button>
        `).join('')}
      </div>
      <div style="position:relative;">
        <div id="filter-loc-selected" style="cursor:pointer; padding:10px 14px; border-radius:12px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:14px; color:rgba(255,255,255,0.5);">${
            filters.locationId === 'alle' ? 'Alle Locations' :
            (locations.find(l => l.id == filters.locationId)?.name || 'Alle Locations')
          }</span>
          <span style="color:rgba(255,255,255,0.3); font-size:12px;">▾</span>
        </div>
        <div id="filter-loc-dropdown" class="hidden scrollbar-hide" style="position:absolute; z-index:100; width:100%; max-height:200px; overflow-y:auto; border-radius:12px; background:#0d1530; border:1px solid rgba(255,255,255,0.12); margin-top:4px;">
          <div data-filter-loc="alle" class="loc-option" style="padding:10px 14px; cursor:pointer; color:rgba(255,255,255,0.7); font-size:14px;">Alle Locations</div>
          ${locationOptions.map(l => `
            <div data-filter-loc="${l.id}" class="loc-option" style="padding:10px 14px; cursor:pointer; color:rgba(255,255,255,0.7); font-size:14px; border-top:1px solid rgba(255,255,255,0.04);">
              ${l.name} <span style="color:rgba(255,255,255,0.3); font-size:12px;">${l.city}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `
}

function getFilteredEvents() {
  return events.filter(e => {
    const loc = locations.find(l => l.id === e.locationId)
    const city = loc ? loc.city : (e.locationCity || '')
    if (!city) return true
    if (!filters.cities.includes(city)) return false
    if (filters.type === 'sonstige') {
    if (e.type === 'konzert' || e.type === 'party') return false
    } else if (filters.type !== 'alle' && e.type !== filters.type) return false
    if (filters.locationId !== 'alle' && e.locationId != filters.locationId) return false
    return true
  }).sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time))
}

function renderListView() {
  const filtered = getFilteredEvents()
  const today = new Date()
  today.setHours(0,0,0,0)
  const groups = {}
  filtered.forEach(e => {
    const d = new Date(e.date + 'T12:00:00')
    const diff = Math.floor((d - today) / 86400000)
    let label
    // Montag der aktuellen Woche berechnen
    const todayDay = today.getDay() === 0 ? 6 : today.getDay() - 1 // 0=Mo, 6=So
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
    return `${renderFilters()}<div class="text-center py-20 text-slate-600"><p class="syne text-2xl mb-2">—</p><p class="text-sm">Keine Events gefunden.</p></div>`
  }
  return `
    ${renderFilters()}
    <div class="space-y-8">
      ${Object.entries(groups).map(([label, evts]) => `
        <div>
          <div class="flex items-center gap-3 mb-4">
            <div class="h-px flex-1" style="background: rgba(255,255,255,0.06);"></div>
            <span class="syne text-xs tracking-widest uppercase" style="color: rgba(255,255,255,0.25); font-weight:700;">${label}</span>
            <div class="h-px flex-1" style="background: rgba(255,255,255,0.06);"></div>
          </div>
          <div class="space-y-3">${evts.map(e => renderEventCard(e)).join('')}</div>
        </div>
      `).join('')}
    </div>
  `
}

function renderEventCard(e) {
  const loc = locations.find(l => l.id === e.locationId)
  const isBookmarked = bookmarked.some(b => b == e.id)
  const isGoing = going.some(g => g == e.id)
  const eventIsNew = isNew(e)
  const dateObj = new Date(e.date + 'T12:00:00')
  const dateStr = dateObj.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })
  const accentSolid = '#818cf8'
  const accentAlpha = 'rgba(99,102,241,'

  return `
    <div class="card-hover rounded-2xl overflow-hidden" style="background:rgba(8,8,42,0.92); border:1px solid ${isGoing ? 'rgba(52,211,153,0.3)' : accentAlpha + '0.12)'}; box-shadow:0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05);">
      <div style="height:2px; background:linear-gradient(90deg, ${accentSolid}, transparent);"></div>
      <div class="p-4">
        <div class="flex justify-between items-start gap-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-2 flex-wrap">
              <span class="syne text-xs" style="color:${accentSolid}; font-weight:700;">${dateStr} · ${e.time}</span>
              ${eventIsNew ? '<span class="text-xs font-bold" style="color:#f472b6; letter-spacing:0.05em;">NEW</span>' : ''}
              ${isGoing ? '<span class="text-xs font-semibold" style="color:#34d399;">✓ dabei</span>' : ''}
            </div>
            <h3 class="syne text-white leading-tight mb-1" style="font-size:1rem; font-weight:700; letter-spacing:-0.01em;">${e.title}</h3>
            <p class="text-xs mb-2" style="color:rgba(255,255,255,0.35);">
              ${loc ? loc.name + ' <span style="color:rgba(255,255,255,0.15);">·</span> ' + loc.city : (e.locationName ? e.locationName + ' <span style="color:rgba(255,255,255,0.15);">·</span> ' + (e.locationCity || '') : '')}
            </p>
            ${e.description ? `<p class="text-xs leading-relaxed mb-3" style="color:rgba(255,255,255,0.4);">${e.description}</p>` : ''}
          </div>
          <div class="flex flex-col gap-3 items-center pt-1">
            <button data-bookmark="${e.id}" title="Vormerken" style="color:${isBookmarked ? '#f472b6' : 'rgba(255,255,255,0.2)'}; background:none; border:none; cursor:pointer; font-size:1.125rem; transition:all 0.2s;">♡</button>
            <button data-going="${e.id}" title="Ich gehe hin" style="color:${isGoing ? '#34d399' : 'rgba(255,255,255,0.2)'}; background:none; border:none; cursor:pointer; font-size:1.125rem; transition:all 0.2s;">✓</button>
          </div>
        </div>
        <div class="flex gap-2 flex-wrap mt-1">
          ${e.ticketUrl ? `<a href="${e.ticketUrl}" target="_blank" class="btn-glass text-xs font-medium px-3 py-1.5 rounded-lg text-slate-400 hover:text-white inline-block">Infos →</a>` : (loc?.website ? `<a href="https://${loc.website}" target="_blank" class="btn-glass text-xs font-medium px-3 py-1.5 rounded-lg text-slate-400 hover:text-white inline-block">Infos →</a>` : '')}
          ${e.spotifyUrl ? `<a href="${e.spotifyUrl}" target="_blank" class="btn-glass text-xs font-medium px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5" style="color:#1db954; border-color:rgba(29,185,84,0.2);"><svg width="12" height="12" viewBox="0 0 24 24" fill="#1db954"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>Spotify</a>` : ''}
          <button data-share="${e.id}" class="btn-glass text-xs font-medium px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-300">Teilen</button>
          ${isBookmarked ? `
            <button data-ics="${e.id}" class="btn-glass text-xs font-medium px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-300">+ Apple</button>
            <button data-gcal="${e.id}" class="btn-glass text-xs font-medium px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-300">+ Google</button>
          ` : ''}
        </div>
      </div>
    </div>
  `
}

function renderCalendarView() {
  const today = new Date()
  const viewDate = new Date(today.getFullYear(), today.getMonth() + calendarOffset, 1)
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7
  const monthName = viewDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
  const filteredAll = getFilteredEvents()
  const eventDates = filteredAll.map(e => e.date)
  const filtered = filteredAll.filter(e => filters.dates.length === 0 || filters.dates.includes(e.date))

  return `
    ${renderFilters()}
    <div class="glass rounded-2xl p-5 mb-5">
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
          const isPast = new Date(dateStr) < today && !isToday
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
      ${filters.dates.length > 0 && filtered.length === 0
        ? '<p class="text-center text-slate-600 py-6 text-sm">Keine Events an den gewählten Tagen.</p>'
        : filtered.map(e => renderEventCard(e)).join('')}
    </div>
  `
}

function renderBookmarkedView() {
  const bookmarkedEvents = events.filter(e => bookmarked.some(b => b == e.id) && !going.some(g => g == e.id))
  const goingEvents = events.filter(e => going.some(g => g == e.id))
  const allEvents = [
    ...goingEvents.map(e => ({ ...e, _status: 'dabei' })),
    ...bookmarkedEvents.map(e => ({ ...e, _status: 'gemerkt' }))
  ].sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time))

  if (allEvents.length === 0) return `
    <div class="text-center py-20 text-slate-600">
      <p class="syne text-2xl mb-2">—</p>
      <p class="text-sm">Noch keine Events gespeichert.</p>
    </div>
  `

  return `
    <div class="space-y-3 pt-2">
      ${allEvents.map(e => `
        <div style="position:relative;">
          ${renderEventCard(e)}
          ${e._status === 'gemerkt' ? `<div style="position:absolute; top:12px; right:44px;">
            <span style="font-size:10px; font-weight:700; padding:3px 8px; border-radius:20px; background:rgba(168,85,247,0.15); color:#c084fc; border:1px solid rgba(168,85,247,0.25);">♥ gemerkt</span>
          </div>` : ''}
        </div>
      `).join('')}
    </div>
  `
}

const inputStyle = `width:100%; border-radius:12px; padding:10px 14px; font-size:14px; color:white; outline:none; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); font-family:'DM Sans',sans-serif; color-scheme:dark;`

function renderModals() {
  const sortedLocs = locations.slice().sort((a,b) => a.name.localeCompare(b.name))
  return `
    <div id="modal-add" class="hidden fixed inset-0 z-50 overflow-y-auto scrollbar-hide" style="background:rgba(0,0,0,0.8); backdrop-filter:blur(8px);">
      <div class="max-w-lg mx-auto mt-8 mb-12 mx-4 rounded-3xl overflow-hidden" style="background:rgba(12,17,32,0.97); border:1px solid rgba(255,255,255,0.1); box-shadow:0 24px 80px rgba(0,0,0,0.6);">
        <div class="px-6 py-5" style="background:linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.15)); border-bottom:1px solid rgba(255,255,255,0.06);">
          <h2 class="syne text-xl text-white" style="font-weight:800;">Hinzufügen</h2>
          <p class="text-xs mt-0.5" style="color:rgba(255,255,255,0.35);">Event oder Location eintragen</p>
        </div>
        <div class="p-6">
          <div class="flex gap-1.5 mb-5 p-1 rounded-xl glass">
            <button data-add-tab="event" class="flex-1 py-2 rounded-lg text-sm font-semibold syne text-white" style="background:rgba(99,102,241,0.4); border:1px solid rgba(99,102,241,0.3);">Event</button>
            <button data-add-tab="location" class="flex-1 py-2 rounded-lg text-sm font-semibold syne text-slate-500">Location</button>
          </div>

          <div id="add-event-form">
            <div class="space-y-3">
              <input id="new-title" type="text" placeholder="Titel (z.B. Bandname – Releaseshow)" style="${inputStyle}" />
              <div class="flex gap-2">
                <button data-etype="konzert" class="flex-1 py-2.5 rounded-xl text-sm font-semibold syne text-white" style="background:rgba(99,102,241,0.4); border:1px solid rgba(99,102,241,0.3);">Konzert</button>
                <button data-etype="party" class="flex-1 py-2.5 rounded-xl text-sm font-semibold syne text-slate-500" style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);">Party</button>
                <button data-etype="sonstige" class="flex-1 py-2.5 rounded-xl text-sm font-semibold syne text-slate-500" style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);">Sonstige</button>
              </div>
              <input type="hidden" id="new-type" value="konzert" />
              <div class="flex gap-2">
                <div style="flex:1; display:flex; flex-direction:column; gap:4px;">
                  <label style="font-size:11px; color:rgba(255,255,255,0.4); font-family:'DM Sans',sans-serif; padding-left:4px;">Datum</label>
                  <input id="new-date" type="text" style="width:100%; border-radius:12px; padding:10px 14px; font-size:14px; outline:none; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.2); font-family:'DM Sans',sans-serif; color:white; min-width:0;" />
                </div>
                <div style="flex:1; display:flex; flex-direction:column; gap:4px;">
                  <label style="font-size:11px; color:rgba(255,255,255,0.4); font-family:'DM Sans',sans-serif; padding-left:4px;">Uhrzeit</label>
                  <input id="new-time" type="text" style="width:100%; border-radius:12px; padding:10px 14px; font-size:14px; outline:none; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.2); font-family:'DM Sans',sans-serif; color:white; min-width:0;" />
                </div>
              </div>
              <div style="position:relative;">
                <div id="add-loc-selected" style="cursor:pointer; padding:10px 14px; border-radius:12px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); display:flex; justify-content:space-between; align-items:center;">
                  <span id="add-loc-text" style="font-size:14px; color:rgba(255,255,255,0.3);">Location wählen...</span>
                  <span style="color:rgba(255,255,255,0.3); font-size:12px;">▾</span>
                </div>
                <input type="hidden" id="new-location" value="" />
                <div id="add-loc-dropdown" class="hidden scrollbar-hide" style="position:absolute; z-index:200; width:100%; max-height:180px; overflow-y:auto; border-radius:12px; background:#0d1530; border:1px solid rgba(255,255,255,0.12); margin-top:4px;">
                  <div data-add-loc-option="__new__" class="loc-option" style="padding:10px 14px; cursor:pointer; color:#818cf8; font-size:14px; border-bottom:1px solid rgba(255,255,255,0.06);">+ Neue Location eingeben...</div>
                  ${sortedLocs.map(l => `<div data-add-loc-option="${l.id}" data-add-loc-name="${l.name}" class="loc-option" style="padding:10px 14px; cursor:pointer; color:rgba(255,255,255,0.8); font-size:14px; border-top:1px solid rgba(255,255,255,0.04);">${l.name} <span style="color:rgba(255,255,255,0.35); font-size:12px;">${l.city}</span></div>`).join('')}
                </div>
              </div>
              <div id="new-location-custom" class="hidden space-y-2">
                <input id="new-location-name" type="text" placeholder="Name der neuen Location" style="${inputStyle}" />
                <div class="flex gap-2">
                  <button data-city-pick="Berlin" class="flex-1 py-2 rounded-xl text-sm syne font-semibold text-white" style="background:rgba(99,102,241,0.3); border:1px solid rgba(99,102,241,0.3);">Berlin</button>
                  <button data-city-pick="Leipzig" class="flex-1 py-2 rounded-xl text-sm syne font-semibold text-slate-500" style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);">Leipzig</button>
                </div>
                <input type="hidden" id="new-location-city" value="Berlin" />
              </div>
              <textarea id="new-desc" placeholder="Kurzbeschreibung: Wer? Woher? Musikrichtung?" style="${inputStyle} height:70px; resize:none;"></textarea>
              <input id="new-ticket" type="url" placeholder="Ticket-URL (optional)" style="${inputStyle}" />
              <input id="new-spotify" type="url" placeholder="Spotify-Link (optional)" style="${inputStyle}" />
              <button data-save-event class="w-full py-3 rounded-xl font-bold text-white text-sm syne transition-all hover:opacity-90" style="background:linear-gradient(135deg, rgba(99,102,241,0.7), rgba(168,85,247,0.7)); border:1px solid rgba(99,102,241,0.3);">
                Event speichern
              </button>
            </div>
          </div>

          <div id="add-location-form" class="hidden">
            <div class="space-y-3">
              <input id="new-loc-name" type="text" placeholder="Name der Location" style="${inputStyle}" />
              <div class="flex gap-2">
                <button data-loc-city-pick="Berlin" class="flex-1 py-2 rounded-xl text-sm syne font-semibold text-white" style="background:rgba(99,102,241,0.3); border:1px solid rgba(99,102,241,0.3);">Berlin</button>
                <button data-loc-city-pick="Leipzig" class="flex-1 py-2 rounded-xl text-sm syne font-semibold text-slate-500" style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);">Leipzig</button>
              </div>
              <input type="hidden" id="new-loc-city" value="Berlin" />
              <input id="new-loc-website" type="url" placeholder="Website (optional)" style="${inputStyle}" />
              <input id="new-loc-capacity" type="number" placeholder="Kapazität (optional)" style="${inputStyle}" />
              <button data-save-location class="w-full py-3 rounded-xl font-bold text-white text-sm syne transition-all hover:opacity-90" style="background:linear-gradient(135deg, rgba(99,102,241,0.7), rgba(168,85,247,0.7)); border:1px solid rgba(99,102,241,0.3);">
                Location speichern
              </button>
            </div>
          </div>

          <button data-close-add class="mt-3 w-full py-2 text-xs text-slate-600 hover:text-slate-400 transition-colors">Abbrechen</button>
        </div>
      </div>
    </div>
  `
}

function generateICS(event) {
  const loc = locations.find(l => l.id === event.locationId)
  const [h, m] = event.time.split(':').map(Number)
  const start = event.date.replace(/-/g,'') + 'T' + String(h).padStart(2,'0') + String(m).padStart(2,'0') + '00'
  const end = event.date.replace(/-/g,'') + 'T' + String(h+2).padStart(2,'0') + String(m).padStart(2,'0') + '00'
  const ics = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//KonzertApp//DE','BEGIN:VEVENT',
    'UID:' + event.id + '@konzertapp','SUMMARY:' + event.title,'DTSTART:' + start,'DTEND:' + end,
    'LOCATION:' + (loc ? loc.name : ''),'DESCRIPTION:' + (event.description || ''),
    'END:VEVENT','END:VCALENDAR'].join('\r\n')
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = event.title.replace(/\s+/g,'-') + '.ics'; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function shareViaWhatsApp(event) {
  const loc = locations.find(l => l.id === event.locationId)
  const dateStr = new Date(event.date + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const text = `${event.type === 'konzert' ? '🎸' : '🎉'} *${event.title}*\n📍 ${loc ? loc.name + ', ' + loc.city : ''}\n📅 ${dateStr} · ${event.time} Uhr${event.description ? '\n\n' + event.description : ''}${event.ticketUrl ? '\n\nTickets: ' + event.ticketUrl : ''}`
  window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank')
}

function attachEvents() {
  document.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => { currentView = btn.dataset.nav; render() })
  })
  document.querySelectorAll('[data-city]').forEach(btn => {
    btn.addEventListener('click', () => {
      const city = btn.dataset.city
      if (filters.cities.includes(city)) {
        if (filters.cities.length > 1) filters.cities = filters.cities.filter(c => c !== city)
      } else { filters.cities.push(city) }
      render()
    })
  })
  document.querySelectorAll('[data-type]').forEach(btn => {
    btn.addEventListener('click', () => { filters.type = btn.dataset.type; render() })
  })

  // Filter Location Dropdown
  const filterLocSelected = document.getElementById('filter-loc-selected')
  const filterLocDropdown = document.getElementById('filter-loc-dropdown')
  filterLocSelected?.addEventListener('click', (e) => { e.stopPropagation(); filterLocDropdown.classList.toggle('hidden') })
  document.querySelectorAll('[data-filter-loc]').forEach(opt => {
    opt.addEventListener('click', () => {
      filters.locationId = opt.dataset.filterLoc
      filterLocDropdown.classList.add('hidden')
      render()
    })
  })

  const calPrev = document.querySelector('[data-cal-prev]')
  const calNext = document.querySelector('[data-cal-next]')
  if (calPrev) calPrev.addEventListener('click', () => { calendarOffset--; render() })
  if (calNext) calNext.addEventListener('click', () => { calendarOffset++; render() })

  document.querySelectorAll('[data-date]').forEach(btn => {
    btn.addEventListener('click', () => {
      const date = btn.dataset.date
      filters.dates = filters.dates.includes(date) ? filters.dates.filter(d => d !== date) : [...filters.dates, date]
      render()
    })
  })
  document.querySelector('[data-clear-dates]')?.addEventListener('click', () => { filters.dates = []; render() })

  document.querySelectorAll('[data-bookmark]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!currentUser) { alert('Bitte zuerst mit E-Mail anmelden um Events vorzumerken.'); return }
      const id = btn.dataset.bookmark
      if (going.some(g => g == id)) {
        await toggleBookmark(id, 'going')
        going = going.filter(g => g != id)
      }
      const isNow = await toggleBookmark(id, 'bookmarked')
      bookmarked = isNow ? [...bookmarked, id] : bookmarked.filter(b => b != id)
      render()
    })
  })
  document.querySelectorAll('[data-going]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!currentUser) { alert('Bitte zuerst mit E-Mail anmelden um Events vorzumerken.'); return }
      const id = btn.dataset.going
      if (bookmarked.some(b => b == id)) {
        await toggleBookmark(id, 'bookmarked')
        bookmarked = bookmarked.filter(b => b != id)
      }
      const isNow = await toggleBookmark(id, 'going')
      going = isNow ? [...going, id] : going.filter(g => g != id)
      render()
    })
  })

  // Modal
  const modal = document.getElementById('modal-add')
  document.querySelector('[data-open-add]')?.addEventListener('click', () => modal.classList.remove('hidden'))
  document.querySelector('[data-close-add]')?.addEventListener('click', () => modal.classList.add('hidden'))

  // Tabs
  document.querySelectorAll('[data-add-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.addTab
      document.getElementById('add-event-form').classList.toggle('hidden', tab !== 'event')
      document.getElementById('add-location-form').classList.toggle('hidden', tab !== 'location')
      document.querySelectorAll('[data-add-tab]').forEach(b => {
        const active = b.dataset.addTab === tab
        b.style.background = active ? 'rgba(99,102,241,0.4)' : 'transparent'
        b.style.border = active ? '1px solid rgba(99,102,241,0.3)' : 'none'
        b.style.color = active ? 'white' : 'rgba(255,255,255,0.3)'
      })
    })
  })

  // Event-Typ
  document.querySelectorAll('[data-etype]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('new-type').value = btn.dataset.etype
      document.querySelectorAll('[data-etype]').forEach(b => {
        const active = b.dataset.etype === btn.dataset.etype
        b.style.background = active ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.04)'
        b.style.border = active ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.08)'
        b.style.color = active ? 'white' : 'rgba(255,255,255,0.3)'
      })
    })
  })

  // Add Event Location Dropdown
  const addLocSelected = document.getElementById('add-loc-selected')
  const addLocDropdown = document.getElementById('add-loc-dropdown')
  addLocSelected?.addEventListener('click', (e) => { e.stopPropagation(); addLocDropdown.classList.toggle('hidden') })
  document.querySelectorAll('[data-add-loc-option]').forEach(opt => {
    opt.addEventListener('click', () => {
      const val = opt.dataset.addLocOption
      document.getElementById('new-location').value = val === '__new__' ? '' : val
      addLocDropdown.classList.add('hidden')
      const customDiv = document.getElementById('new-location-custom')
      const text = document.getElementById('add-loc-text')
      if (val === '__new__') {
        text.textContent = '+ Neue Location eingeben...'
        text.style.color = '#818cf8'
        customDiv.classList.remove('hidden')
      } else {
        text.textContent = opt.dataset.addLocName || opt.textContent.trim()
        text.style.color = 'rgba(255,255,255,0.8)'
        customDiv.classList.add('hidden')
      }
    })
  })

  // Stadt-Picker neue Location
  document.querySelectorAll('[data-city-pick]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('new-location-city').value = btn.dataset.cityPick
      document.querySelectorAll('[data-city-pick]').forEach(b => {
        const active = b.dataset.cityPick === btn.dataset.cityPick
        b.style.background = active ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.04)'
        b.style.border = active ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.08)'
        b.style.color = active ? 'white' : 'rgba(255,255,255,0.3)'
      })
    })
  })

  // Stadt-Picker Location-Form
  document.querySelectorAll('[data-loc-city-pick]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('new-loc-city').value = btn.dataset.locCityPick
      document.querySelectorAll('[data-loc-city-pick]').forEach(b => {
        const active = b.dataset.locCityPick === btn.dataset.locCityPick
        b.style.background = active ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.04)'
        b.style.border = active ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.08)'
        b.style.color = active ? 'white' : 'rgba(255,255,255,0.3)'
      })
    })
  })

  // Event speichern
  document.querySelector('[data-save-event]')?.addEventListener('click', async () => {
    const title = document.getElementById('new-title').value.trim()
    let date = document.getElementById('new-date').value
    let time = document.getElementById('new-time').value
    // TT.MM.JJJJ → JJJJ-MM-TT
    const dateParts = date.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
    if (dateParts) date = `${dateParts[3]}-${dateParts[2].padStart(2,'0')}-${dateParts[1].padStart(2,'0')}`
    // HH:MM validieren
    if (!time.match(/^\d{1,2}:\d{2}$/)) time = '20:00'
    let locationId = document.getElementById('new-location').value
    if (!title || !date || !time) { alert('Bitte Titel, Datum und Uhrzeit angeben.'); return }
    if (!locationId) {
      const locName = document.getElementById('new-location-name')?.value.trim()
      if (!locName) { alert('Bitte eine Location wählen oder neue Location eingeben.'); return }
      const newLoc = { id: Date.now(), name: locName, city: document.getElementById('new-location-city').value, website: '', capacity: 0 }
      locations.push(newLoc)
      saveData('locations', locations)
      locationId = newLoc.id
    } else {
      locationId = parseInt(locationId)
    }
    const newEvent = {
      id: Date.now(), title,
      type: document.getElementById('new-type').value,
      date, time, locationId,
      description: document.getElementById('new-desc').value.trim(),
      ticketUrl: document.getElementById('new-ticket').value.trim(),
      spotifyUrl: document.getElementById('new-spotify').value.trim(),
      source: 'manual'
    }
    const loc = locations.find(l => l.id === locationId)
    await saveManualEvent(newEvent, loc?.name || '', loc?.city || '')
    events = await getEvents()
    modal.classList.add('hidden')
    render()
  })

  // Location speichern
  document.querySelector('[data-save-location]')?.addEventListener('click', () => {
    const name = document.getElementById('new-loc-name').value.trim()
    if (!name) { alert('Bitte einen Namen eingeben.'); return }
    const newLoc = { id: Date.now(), name, city: document.getElementById('new-loc-city').value, website: document.getElementById('new-loc-website').value.trim(), capacity: parseInt(document.getElementById('new-loc-capacity').value) || 0 }
    locations.push(newLoc)
    saveData('locations', locations)
    modal.classList.add('hidden')
    render()
  })

  // Dropdowns schließen bei Klick außerhalb
  document.addEventListener('click', () => {
    filterLocDropdown?.classList.add('hidden')
    addLocDropdown?.classList.add('hidden')
  })

  // Pull-to-Refresh
  let ptStart = 0, ptPulling = false
  document.addEventListener('touchstart', e => {
    if (window.scrollY === 0) { ptStart = e.touches[0].clientY; ptPulling = true }
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
      if (indicator) indicator.innerHTML = '↻ Wird aktualisiert...'
      events = await getEvents()
      render()
    } else {
      if (indicator) indicator.style.height = '0'
    }
  }, { passive: true })
  // Datum/Uhrzeit - einfache Textfelder mit Auto-Formatierung
  const dateEl = document.getElementById('new-date')
  const timeEl = document.getElementById('new-time')
  if (dateEl) {
    dateEl.placeholder = 'TT.MM.JJJJ'
    dateEl.addEventListener('input', e => {
      let v = e.target.value.replace(/\D/g,'')
      if (v.length >= 3) v = v.slice(0,2) + '.' + v.slice(2)
      if (v.length >= 6) v = v.slice(0,5) + '.' + v.slice(5,9)
      e.target.value = v
    })
  }
  if (timeEl) {
    timeEl.placeholder = '20:00'
    timeEl.addEventListener('input', e => {
      let v = e.target.value.replace(/\D/g,'')
      if (v.length >= 3) v = v.slice(0,2) + ':' + v.slice(2,4)
      e.target.value = v
    })
  }
  // Login
document.getElementById('login-btn')?.addEventListener('click', async () => {
  const email = document.getElementById('login-email').value.trim()
  if (!email) return
  const ok = await signInWithEmail(email)
  if (ok) {
    document.getElementById('login-step-1').style.display = 'none'
    document.getElementById('login-step-2').style.display = 'flex'
  } else {
    alert('Fehler beim Senden. Bitte nochmal versuchen.')
  }
})

document.getElementById('verify-btn')?.addEventListener('click', async () => {
  const email = localStorage.getItem('lebe-live-email') || document.getElementById('login-email')?.value.trim()
  const code = document.getElementById('login-code').value.trim()
  if (!code) return
  const ok = await verifyOtp(email, code)
  if (ok) {
    currentUser = await getUser()
    const { bookmarked: b, going: g } = await loadBookmarks()
    bookmarked = b
    going = g
    render()
  } else {
    alert('Falscher Code. Bitte nochmal versuchen.')
  }
})

  // Teilen
  document.querySelectorAll('[data-share]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.share
      const e = events.find(ev => ev.id == id)
      if (!e) return
      const loc = locations.find(l => l.id === e.locationId)
      const locName = loc ? loc.name : (e.locationName || '')
      const text = `${e.title} – ${locName}, ${e.date} ${e.time}`
      if (navigator.share) {
        navigator.share({ title: e.title, text })
      } else {
        navigator.clipboard.writeText(text)
        alert('In Zwischenablage kopiert!')
      }
    })
  })

  // Kalender (.ics)
  document.querySelectorAll('[data-ics]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.ics
      const e = events.find(ev => ev.id == id)
      if (!e) return
      const loc = locations.find(l => l.id === e.locationId)
      const locName = loc ? loc.name : (e.locationName || '')
      const locCity = loc ? loc.city : (e.locationCity || '')
      const dtStart = e.date.replace(/-/g,'') + 'T' + (e.time || '20:00').replace(':','') + '00'
      const endHour = String(parseInt((e.time || '20:00').split(':')[0]) + 2).padStart(2,'0')
      const dtEnd = e.date.replace(/-/g,'') + 'T' + endHour + (e.time || '20:00').split(':')[1] + '00'
      const ics = ['BEGIN:VCALENDAR','VERSION:2.0','BEGIN:VEVENT',`DTSTART:${dtStart}`,`DTEND:${dtEnd}`,`SUMMARY:${e.title}`,`LOCATION:${locName}, ${locCity}`,`URL:${e.ticketUrl || ''}`, 'END:VEVENT','END:VCALENDAR'].join('\r\n')
      const blob = new Blob([ics], { type: 'text/calendar' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${e.title.replace(/\s+/g,'-')}.ics`
      a.click()
      URL.revokeObjectURL(url)
    })
  })
  // Google Calendar
  document.querySelectorAll('[data-gcal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.gcal
      const e = events.find(ev => ev.id == id)
      if (!e) return
      const loc = locations.find(l => l.id === e.locationId)
      const locName = loc ? loc.name : (e.locationName || '')
      const start = e.date.replace(/-/g,'') + 'T' + (e.time || '20:00').replace(':','') + '00'
      const endHour = String(parseInt((e.time || '20:00').split(':')[0]) + 2).padStart(2,'0')
      const end = e.date.replace(/-/g,'') + 'T' + endHour + (e.time || '20:00').split(':')[1] + '00'
      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(e.title)}&dates=${start}/${end}&location=${encodeURIComponent(locName)}&details=${encodeURIComponent(e.ticketUrl || '')}`
      window.open(url, '_blank')
    })
  })
}