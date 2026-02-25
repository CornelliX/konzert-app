import { getLocations, getEvents, saveData, loadData } from './data.js'

let locations = getLocations()
let events = getEvents()
let filters = { cities: ['Berlin', 'Leipzig'], type: 'alle', locationId: 'alle', dates: [] }
let bookmarked = loadData('bookmarked') || []
let going = loadData('going') || []
let seenEvents = loadData('seenEvents') || []
let currentView = 'liste'
let calendarOffset = 0 // Monate vom aktuellen Monat
let container = null

export function renderApp(el) {
  container = el
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
    <div class="min-h-screen" style="background: linear-gradient(135deg, #0a0e1a 0%, #0d1530 50%, #0a1628 100%);">
      <div class="max-w-2xl mx-auto px-4 pb-24">
        ${renderHeader(newCount)}
        ${renderNav()}
        ${currentView === 'liste' ? renderListView() : ''}
        ${currentView === 'kalender' ? renderCalendarView() : ''}
        ${currentView === 'gemerkt' ? renderBookmarkedView() : ''}
      </div>
    </div>
    ${renderAddButton()}
    ${renderModals()}
  `
  attachEvents()
  if (newCount > 0 && currentView === 'liste') {
    setTimeout(() => markAllSeen(), 3000)
  }
}

function renderHeader(newCount) {
  return `
    <div class="py-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-white tracking-tight">
            <span style="background: linear-gradient(90deg, #818cf8, #c084fc, #f472b6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Konzert & Club</span>
          </h1>
          <p class="text-slate-400 text-sm mt-1 tracking-wide uppercase">Berlin · Leipzig</p>
        </div>
        ${newCount > 0 ? `
          <div class="flex flex-col items-end">
            <span class="text-xs font-bold px-3 py-1.5 rounded-full text-white" style="background: linear-gradient(90deg, #818cf8, #f472b6);">
              ${newCount} neue Events
            </span>
          </div>
        ` : ''}
      </div>
    </div>
  `
}

function renderNav() {
  const tabs = [
    { id: 'liste', icon: '◈', label: 'Events' },
    { id: 'kalender', icon: '◷', label: 'Kalender' },
    { id: 'gemerkt', icon: '◆', label: `Gemerkt${bookmarked.length > 0 ? ' · ' + bookmarked.length : ''}` },
  ]
  return `
    <div class="flex gap-2 mb-6 p-1 rounded-2xl" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);">
      ${tabs.map(t => `
        <button data-nav="${t.id}" class="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
          currentView === t.id
            ? 'text-white shadow-lg'
            : 'text-slate-400 hover:text-slate-200'
        }" ${currentView === t.id ? 'style="background: linear-gradient(135deg, #3730a3, #7c3aed);"' : ''}>
          ${t.icon} ${t.label}
        </button>
      `).join('')}
    </div>
  `
}

function renderFilters() {
  const locationOptions = locations
    .filter(l => filters.cities.includes(l.city))
    .sort((a, b) => a.name.localeCompare(b.name))

  return `
    <div class="rounded-2xl p-4 mb-5 space-y-3" style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);">
      <!-- Städte -->
      <div class="flex gap-2">
        ${['Berlin', 'Leipzig'].map(c => `
          <button data-city="${c}" class="flex-1 py-2 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 ${
            filters.cities.includes(c)
              ? 'text-white'
              : 'text-slate-500 hover:text-slate-300'
          }" ${filters.cities.includes(c) ? 'style="background: linear-gradient(135deg, #1e3a5f, #1e40af);"' : 'style="background: rgba(255,255,255,0.04);"'}>
            ${c === 'Berlin' ? '🏙' : '🏛'} ${c}
          </button>
        `).join('')}
      </div>

      <!-- Typ -->
      <div class="flex gap-2">
        ${[
          { val: 'alle', icon: '✦', label: 'Alle' },
          { val: 'konzert', icon: '🎸', label: 'Konzerte' },
          { val: 'party', icon: '🎉', label: 'Partys' }
        ].map(t => `
          <button data-type="${t.val}" class="flex-1 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
            filters.type === t.val
              ? 'text-white'
              : 'text-slate-500 hover:text-slate-300'
          }" ${filters.type === t.val ? 'style="background: linear-gradient(135deg, #3730a3, #6d28d9);"' : 'style="background: rgba(255,255,255,0.04);"'}>
            ${t.icon} ${t.label}
          </button>
        `).join('')}
      </div>

      <!-- Location -->
      <select data-location-filter class="w-full rounded-xl px-3 py-2.5 text-sm text-slate-300 appearance-none" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);">
        <option value="alle">📍 Alle Locations</option>
        ${locationOptions.map(l => `<option value="${l.id}" ${filters.locationId == l.id ? 'selected' : ''}>${l.name} (${l.city})</option>`).join('')}
      </select>
    </div>
  `
}

function getFilteredEvents() {
  return events.filter(e => {
    const loc = locations.find(l => l.id === e.locationId)
    if (!loc) return false
    if (!filters.cities.includes(loc.city)) return false
    if (filters.type !== 'alle' && e.type !== filters.type) return false
    if (filters.locationId !== 'alle' && e.locationId != filters.locationId) return false
    return true
  }).sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time))
}

function renderListView() {
  const filtered = getFilteredEvents()
  const today = new Date()
  today.setHours(0,0,0,0)

  // Nach Datum gruppieren
  const groups = {}
  filtered.forEach(e => {
    const d = new Date(e.date + 'T12:00:00')
    const diff = Math.floor((d - today) / 86400000)
    let label
    if (diff === 0) label = '— Heute —'
    else if (diff === 1) label = '— Morgen —'
    else if (diff <= 7) label = '— Diese Woche —'
    else if (diff <= 14) label = '— Nächste Woche —'
    else {
      label = '— ' + d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }) + ' —'
    }
    if (!groups[label]) groups[label] = []
    groups[label].push(e)
  })

  if (Object.keys(groups).length === 0) {
    return `
      ${renderFilters()}
      <div class="text-center py-16 text-slate-500">
        <div class="text-4xl mb-3">🎵</div>
        <p>Keine Events gefunden.</p>
      </div>
    `
  }

  return `
    ${renderFilters()}
    <div class="space-y-6">
      ${Object.entries(groups).map(([label, evts]) => `
        <div>
          <div class="text-xs font-bold tracking-widest uppercase text-slate-500 text-center mb-3">${label}</div>
          <div class="space-y-3">
            ${evts.map(e => renderEventCard(e)).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `
}

function renderEventCard(e) {
  const loc = locations.find(l => l.id === e.locationId)
  const isBookmarked = bookmarked.includes(e.id)
  const isGoing = going.includes(e.id)
  const eventIsNew = isNew(e)
  const dateObj = new Date(e.date + 'T12:00:00')
  const dateStr = dateObj.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })
  const isKonzert = e.type === 'konzert'

  return `
    <div class="rounded-2xl overflow-hidden transition-all duration-200" style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,${isGoing ? '0.2' : '0.07'});">
      <!-- Farbiger Streifen oben -->
      <div class="h-0.5 w-full" style="background: linear-gradient(90deg, ${isKonzert ? '#3730a3, #818cf8' : '#7c2d12, #f97316'});"></div>

      <div class="p-4">
        <div class="flex justify-between items-start gap-3">
          <div class="flex-1 min-w-0">
            <!-- Badge + Neu -->
            <div class="flex items-center gap-2 mb-1.5 flex-wrap">
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full ${isKonzert ? 'text-indigo-300' : 'text-orange-300'}" style="background: ${isKonzert ? 'rgba(99,102,241,0.15)' : 'rgba(249,115,22,0.15)'};">
                ${isKonzert ? '🎸 Konzert' : '🎉 Party'}
              </span>
              ${eventIsNew ? '<span class="text-xs font-bold text-pink-400 animate-pulse">● NEU</span>' : ''}
              ${isGoing ? '<span class="text-xs font-bold text-emerald-400">✓ Ich gehe hin</span>' : ''}
            </div>

            <!-- Titel -->
            <h3 class="font-bold text-white text-base leading-tight truncate">${e.title}</h3>

            <!-- Location & Stadt -->
            <p class="text-slate-400 text-sm mt-0.5">${loc ? loc.name + ' <span class="text-slate-600">·</span> ' + loc.city : ''}</p>

            <!-- Datum -->
            <p class="text-sm font-semibold mt-1" style="color: #818cf8;">${dateStr} · ${e.time} Uhr</p>
          </div>

          <!-- Aktions-Icons -->
          <div class="flex flex-col gap-2 items-center">
            <button data-bookmark="${e.id}" title="Vormerken" class="text-xl transition-all duration-200 hover:scale-110 ${isBookmarked ? 'opacity-100' : 'opacity-25 hover:opacity-60'}">🔖</button>
            <button data-going="${e.id}" title="Ich gehe hin" class="text-xl transition-all duration-200 hover:scale-110 ${isGoing ? 'opacity-100' : 'opacity-25 hover:opacity-60'}">✅</button>
          </div>
        </div>

        ${e.description ? `<p class="text-slate-500 text-sm mt-2 leading-relaxed">${e.description}</p>` : ''}
        ${e.spotifyUrl ? renderSpotifyEmbed(e.spotifyUrl) : ''}

        <!-- Buttons -->
        <div class="flex gap-2 mt-3 flex-wrap">
          ${e.ticketUrl ? `
            <a href="${e.ticketUrl}" target="_blank" class="text-xs font-medium px-3 py-1.5 rounded-lg text-slate-300 transition-all hover:text-white" style="background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);">
              🎟 Tickets
            </a>
          ` : ''}
          <button data-share="${e.id}" class="text-xs font-medium px-3 py-1.5 rounded-lg text-slate-300 transition-all hover:text-white" style="background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);">
            📤 Teilen
          </button>
          ${isBookmarked ? `
            <button data-ics="${e.id}" class="text-xs font-medium px-3 py-1.5 rounded-lg text-slate-300 transition-all hover:text-white" style="background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);">
              📅 Kalender
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `
}

function renderSpotifyEmbed(url) {
  const parts = url.split('/')
  const spotifyId = parts.pop().split('?')[0]
  const type = url.includes('/track/') ? 'track' : url.includes('/album/') ? 'album' : 'artist'
  return `
    <div class="mt-3 rounded-xl overflow-hidden">
      <iframe src="https://open.spotify.com/embed/${type}/${spotifyId}"
        width="100%" height="80" frameborder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture">
      </iframe>
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

  const filtered = filteredAll.filter(e => {
    if (filters.dates.length === 0) return true
    return filters.dates.includes(e.date)
  })

  return `
    ${renderFilters()}
    <div class="rounded-2xl p-4 mb-5" style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);">

      <!-- Monats-Navigation -->
      <div class="flex items-center justify-between mb-4">
        <button data-cal-prev class="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-all" style="background: rgba(255,255,255,0.06);">‹</button>
        <h2 class="font-bold text-white tracking-wide">${monthName}</h2>
        <button data-cal-next class="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-all" style="background: rgba(255,255,255,0.06);">›</button>
      </div>

      <!-- Wochentage -->
      <div class="grid grid-cols-7 gap-1 text-center text-xs font-semibold tracking-wide mb-2" style="color: rgba(255,255,255,0.25);">
        ${['Mo','Di','Mi','Do','Fr','Sa','So'].map(d => `<div>${d}</div>`).join('')}
      </div>

      <!-- Tage -->
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
            <button data-date="${dateStr}" class="
              aspect-square rounded-xl text-sm font-medium flex items-center justify-center relative transition-all duration-150
              ${isPast ? 'opacity-30' : ''}
              ${!hasEvent && !isSelected ? 'text-slate-600 cursor-default' : ''}
              ${hasEvent && !isSelected ? 'text-white hover:opacity-80' : ''}
            " style="${
              isSelected
                ? 'background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white;'
                : hasEvent
                  ? 'background: rgba(99,102,241,0.2); border: 1px solid rgba(99,102,241,0.4);'
                  : isToday
                    ? 'border: 1px solid rgba(99,102,241,0.5);'
                    : ''
            }">
              ${day}
              ${hasEvent && !isSelected ? '<span class="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style="background: #818cf8;"></span>' : ''}
            </button>
          `
        }).join('')}
      </div>

      ${filters.dates.length > 0 ? `
        <button data-clear-dates class="mt-4 w-full text-xs text-slate-400 hover:text-white py-2 rounded-xl transition-all" style="background: rgba(255,255,255,0.04);">
          ✕ Auswahl zurücksetzen (${filters.dates.length} ${filters.dates.length === 1 ? 'Tag' : 'Tage'} gewählt)
        </button>
      ` : `<p class="text-center text-xs mt-3" style="color: rgba(255,255,255,0.2);">Tippe auf markierte Tage zum Filtern · Mehrfachauswahl möglich</p>`}
    </div>

    <!-- Events zur Auswahl -->
    <div class="space-y-3">
      ${filters.dates.length > 0 && filtered.length === 0
        ? '<p class="text-center text-slate-500 py-6">Keine Events an den gewählten Tagen.</p>'
        : filtered.map(e => renderEventCard(e)).join('')}
    </div>
  `
}

function renderBookmarkedView() {
  const bookmarkedEvents = events.filter(e => bookmarked.includes(e.id))
  const goingEvents = events.filter(e => going.includes(e.id))

  const section = (title, evts, emptyText) => `
    <div>
      <h2 class="text-sm font-bold tracking-widest uppercase mb-3" style="color: rgba(255,255,255,0.4);">${title}</h2>
      ${evts.length === 0
        ? `<p class="text-slate-600 text-sm py-4 text-center">${emptyText}</p>`
        : `<div class="space-y-3">${evts.map(e => renderEventCard(e)).join('')}</div>`}
    </div>
  `

  return `
    <div class="space-y-8">
      ${section('✓ Ich gehe hin · ' + goingEvents.length, goingEvents, 'Noch keine Events markiert.')}
      ${section('◆ Vorgemerkt · ' + bookmarkedEvents.length, bookmarkedEvents, 'Noch keine Events vorgemerkt.')}
    </div>
  `
}

function renderAddButton() {
  return `
    <button data-open-add class="fixed bottom-6 right-6 w-14 h-14 text-white rounded-2xl text-2xl shadow-2xl flex items-center justify-center z-50 transition-all hover:scale-105 active:scale-95" style="background: linear-gradient(135deg, #4f46e5, #7c3aed);">
      +
    </button>
  `
}

function renderModals() {
  return `
    <div id="modal-add" class="hidden fixed inset-0 z-50 overflow-y-auto" style="background: rgba(0,0,0,0.85);">
      <div class="max-w-lg mx-auto mt-8 mb-12 rounded-3xl mx-4 overflow-hidden" style="background: #0d1530; border: 1px solid rgba(255,255,255,0.1);">
        <!-- Modal-Header -->
        <div class="px-6 py-5" style="background: linear-gradient(135deg, rgba(79,70,229,0.3), rgba(124,58,237,0.3)); border-bottom: 1px solid rgba(255,255,255,0.08);">
          <h2 class="text-xl font-bold text-white">Hinzufügen</h2>
          <p class="text-slate-400 text-sm mt-0.5">Event oder Location eintragen</p>
        </div>

        <div class="p-6">
          <!-- Tabs -->
          <div class="flex gap-2 mb-5 p-1 rounded-xl" style="background: rgba(255,255,255,0.05);">
            <button data-add-tab="event" id="tab-event" class="flex-1 py-2 rounded-lg text-sm font-semibold text-white" style="background: linear-gradient(135deg, #4f46e5, #7c3aed);">🎸 Event</button>
            <button data-add-tab="location" id="tab-location" class="flex-1 py-2 rounded-lg text-sm font-semibold text-slate-400">📍 Location</button>
          </div>

          <div id="add-event-form">${renderAddEventForm()}</div>
          <div id="add-location-form" class="hidden">${renderAddLocationForm()}</div>

          <button data-close-add class="mt-4 w-full py-2 text-slate-500 hover:text-slate-300 text-sm transition-colors">Abbrechen</button>
        </div>
      </div>
    </div>
  `
}

const inputClass = 'w-full rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500'
const inputStyle = 'background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);'

function renderAddEventForm() {
  return `
    <div class="space-y-3">
      <input id="new-title" type="text" placeholder="Titel (z.B. Bandname – Releaseshow)" class="${inputClass}" style="${inputStyle}" />
      <div class="flex gap-2">
        <select id="new-type" class="${inputClass} flex-1" style="${inputStyle}">
          <option value="konzert">🎸 Konzert</option>
          <option value="party">🎉 Party</option>
        </select>
      </div>
      <div class="flex gap-2">
        <input id="new-date" type="date" class="${inputClass} flex-1" style="${inputStyle}" />
        <input id="new-time" type="time" class="${inputClass} flex-1" style="${inputStyle}" />
      </div>
      <select id="new-location" class="${inputClass}" style="${inputStyle}">
        <option value="">Location wählen...</option>
        ${locations.sort((a,b) => a.name.localeCompare(b.name)).map(l => `<option value="${l.id}">${l.name} (${l.city})</option>`).join('')}
      </select>
      <textarea id="new-desc" placeholder="Beschreibung (optional)" class="${inputClass} h-20 resize-none" style="${inputStyle}"></textarea>
      <input id="new-ticket" type="url" placeholder="Ticket-URL (optional)" class="${inputClass}" style="${inputStyle}" />
      <input id="new-spotify" type="url" placeholder="Spotify-Link (optional)" class="${inputClass}" style="${inputStyle}" />
      <button data-save-event class="w-full py-3 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90 active:scale-98" style="background: linear-gradient(135deg, #4f46e5, #7c3aed);">
        Event speichern
      </button>
    </div>
  `
}

function renderAddLocationForm() {
  return `
    <div class="space-y-3">
      <input id="new-loc-name" type="text" placeholder="Name der Location" class="${inputClass}" style="${inputStyle}" />
      <select id="new-loc-city" class="${inputClass}" style="${inputStyle}">
        <option value="Berlin">🏙 Berlin</option>
        <option value="Leipzig">🏛 Leipzig</option>
      </select>
      <input id="new-loc-website" type="url" placeholder="Website (optional)" class="${inputClass}" style="${inputStyle}" />
      <input id="new-loc-capacity" type="number" placeholder="Kapazität (optional)" class="${inputClass}" style="${inputStyle}" />
      <button data-save-location class="w-full py-3 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90" style="background: linear-gradient(135deg, #4f46e5, #7c3aed);">
        Location speichern
      </button>
    </div>
  `
}

function generateICS(event) {
  const loc = locations.find(l => l.id === event.locationId)
  const [h, m] = event.time.split(':').map(Number)
  const start = event.date.replace(/-/g,'') + 'T' + String(h).padStart(2,'0') + String(m).padStart(2,'0') + '00'
  const end = event.date.replace(/-/g,'') + 'T' + String(h+2).padStart(2,'0') + String(m).padStart(2,'0') + '00'
  const ics = [
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//KonzertApp//DE',
    'BEGIN:VEVENT',
    'UID:' + event.id + '@konzertapp',
    'SUMMARY:' + event.title,
    'DTSTART:' + start,
    'DTEND:' + end,
    'LOCATION:' + (loc ? loc.name : ''),
    'DESCRIPTION:' + (event.description || ''),
    'END:VEVENT','END:VCALENDAR'
  ].join('\r\n')
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = event.title.replace(/\s+/g,'-') + '.ics'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function shareViaWhatsApp(event) {
  const loc = locations.find(l => l.id === event.locationId)
  const dateStr = new Date(event.date + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const text = `${event.type === 'konzert' ? '🎸' : '🎉'} *${event.title}*\n📍 ${loc ? loc.name + ', ' + loc.city : ''}\n📅 ${dateStr} · ${event.time} Uhr${event.description ? '\n\n' + event.description : ''}${event.ticketUrl ? '\n\n🎟 Tickets: ' + event.ticketUrl : ''}`
  window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank')
}

function attachEvents() {
  // Navigation
  document.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => { currentView = btn.dataset.nav; render() })
  })

  // Stadt-Filter
  document.querySelectorAll('[data-city]').forEach(btn => {
    btn.addEventListener('click', () => {
      const city = btn.dataset.city
      if (filters.cities.includes(city)) {
        if (filters.cities.length > 1) filters.cities = filters.cities.filter(c => c !== city)
      } else {
        filters.cities.push(city)
      }
      render()
    })
  })

  // Typ-Filter
  document.querySelectorAll('[data-type]').forEach(btn => {
    btn.addEventListener('click', () => { filters.type = btn.dataset.type; render() })
  })

  // Location-Filter
  const locFilter = document.querySelector('[data-location-filter]')
  if (locFilter) locFilter.addEventListener('change', () => { filters.locationId = locFilter.value; render() })

  // Kalender Navigation
  const calPrev = document.querySelector('[data-cal-prev]')
  const calNext = document.querySelector('[data-cal-next]')
  if (calPrev) calPrev.addEventListener('click', () => { calendarOffset--; render() })
  if (calNext) calNext.addEventListener('click', () => { calendarOffset++; render() })

  // Datum-Auswahl
  document.querySelectorAll('[data-date]').forEach(btn => {
    btn.addEventListener('click', () => {
      const date = btn.dataset.date
      if (filters.dates.includes(date)) {
        filters.dates = filters.dates.filter(d => d !== date)
      } else {
        filters.dates.push(date)
      }
      render()
    })
  })

  const clearDates = document.querySelector('[data-clear-dates]')
  if (clearDates) clearDates.addEventListener('click', () => { filters.dates = []; render() })

  // Vormerken
  document.querySelectorAll('[data-bookmark]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.bookmark)
      bookmarked = bookmarked.includes(id) ? bookmarked.filter(b => b !== id) : [...bookmarked, id]
      saveData('bookmarked', bookmarked)
      render()
    })
  })

  // Ich gehe hin
  document.querySelectorAll('[data-going]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.going)
      going = going.includes(id) ? going.filter(g => g !== id) : [...going, id]
      saveData('going', going)
      render()
    })
  })

  // Teilen
  document.querySelectorAll('[data-share]').forEach(btn => {
    btn.addEventListener('click', () => {
      const event = events.find(e => e.id === parseInt(btn.dataset.share))
      if (event) shareViaWhatsApp(event)
    })
  })

  // Kalender-Export
  document.querySelectorAll('[data-ics]').forEach(btn => {
    btn.addEventListener('click', () => {
      const event = events.find(e => e.id === parseInt(btn.dataset.ics))
      if (event) generateICS(event)
    })
  })

  // Modal
  const modal = document.getElementById('modal-add')
  document.querySelector('[data-open-add]')?.addEventListener('click', () => modal.classList.remove('hidden'))
  document.querySelector('[data-close-add]')?.addEventListener('click', () => modal.classList.add('hidden'))

  // Modal Tabs
  document.querySelectorAll('[data-add-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.addTab
      document.getElementById('add-event-form').classList.toggle('hidden', tab !== 'event')
      document.getElementById('add-location-form').classList.toggle('hidden', tab !== 'location')
      document.querySelectorAll('[data-add-tab]').forEach(b => {
        const active = b.dataset.addTab === tab
        b.className = `flex-1 py-2 rounded-lg text-sm font-semibold ${active ? 'text-white' : 'text-slate-400'}`
        b.style.background = active ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : 'transparent'
      })
    })
  })

  // Event speichern
  document.querySelector('[data-save-event]')?.addEventListener('click', () => {
    const title = document.getElementById('new-title').value.trim()
    const date = document.getElementById('new-date').value
    const time = document.getElementById('new-time').value
    const locationId = parseInt(document.getElementById('new-location').value)
    if (!title || !date || !time || !locationId) {
      alert('Bitte Titel, Datum, Uhrzeit und Location angeben.')
      return
    }
    const newEvent = {
      id: Date.now(),
      title,
      type: document.getElementById('new-type').value,
      date, time, locationId,
      description: document.getElementById('new-desc').value.trim(),
      ticketUrl: document.getElementById('new-ticket').value.trim(),
      spotifyUrl: document.getElementById('new-spotify').value.trim(),
      isNew: true,
      savedAt: new Date().toISOString()
    }
    events.push(newEvent)
    saveData('events', events)
    modal.classList.add('hidden')
    render()
  })

  // Location speichern
  document.querySelector('[data-save-location]')?.addEventListener('click', () => {
    const name = document.getElementById('new-loc-name').value.trim()
    if (!name) { alert('Bitte einen Namen eingeben.'); return }
    const newLoc = {
      id: Date.now(),
      name,
      city: document.getElementById('new-loc-city').value,
      website: document.getElementById('new-loc-website').value.trim(),
      capacity: parseInt(document.getElementById('new-loc-capacity').value) || 0
    }
    locations.push(newLoc)
    saveData('locations', locations)
    modal.classList.add('hidden')
    render()
  })
}