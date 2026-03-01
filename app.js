import { getLocations, getEvents, saveData, loadData } from './data.js'

let locations = getLocations()
let events = []
let container = null
let filters = { cities: ['Berlin', 'Leipzig'], type: 'alle', locationId: 'alle', dates: [] }
let bookmarked = loadData('bookmarked') || []
let going = loadData('going') || []
let seenEvents = loadData('seenEvents') || []
let currentView = 'liste'
let calendarOffset = 0

export async function renderApp(el) {
  container = el
  events = await getEvents()
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
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
      * { box-sizing: border-box; }
      body { font-family: 'DM Sans', sans-serif; }
      .syne { font-family: 'Syne', sans-serif; }
      .glass {
        background: rgba(255,255,255,0.04);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255,255,255,0.08);
      }
      .glass-strong {
        background: rgba(255,255,255,0.07);
        backdrop-filter: blur(40px);
        -webkit-backdrop-filter: blur(40px);
        border: 1px solid rgba(255,255,255,0.12);
      }
      .glow-indigo { box-shadow: 0 0 20px rgba(99,102,241,0.15); }
      .glow-pink { box-shadow: 0 0 20px rgba(244,114,182,0.15); }
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
      .card-hover {
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      .card-hover:hover {
        transform: translateY(-1px);
      }
      input, select, textarea {
        color-scheme: dark;
      }
      input::placeholder, textarea::placeholder {
        color: rgba(255,255,255,0.2);
      }
      .noise {
        position: relative;
      }
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
    </style>

    <div class="noise min-h-screen" style="background: linear-gradient(145deg, #080b14 0%, #0c1120 40%, #0e0818 70%, #07100f 100%);">

      <!-- Ambient glow blobs -->
      <div style="position:fixed; top:-10%; left:-10%; width:50vw; height:50vw; background:radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%); pointer-events:none; z-index:0;"></div>
      <div style="position:fixed; bottom:-10%; right:-10%; width:40vw; height:40vw; background:radial-gradient(circle, rgba(168,85,247,0.07) 0%, transparent 70%); pointer-events:none; z-index:0;"></div>
      <div style="position:fixed; top:40%; left:30%; width:30vw; height:30vw; background:radial-gradient(circle, rgba(20,184,166,0.04) 0%, transparent 70%); pointer-events:none; z-index:0;"></div>

      <div class="relative z-10 max-w-xl mx-auto px-4 pb-28">
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
    <div class="pt-10 pb-6">
      <div class="flex items-start justify-between">
        <div>
          <p class="text-xs font-semibold tracking-[0.25em] uppercase mb-2" style="color: rgba(99,102,241,0.7);">Konzert & Club</p>
          <h1 class="syne text-4xl font-800 leading-none" style="color: white; letter-spacing: -0.02em;">
            Berlin<span style="color: rgba(255,255,255,0.2);">&thinsp;/&thinsp;</span>Leipzig
          </h1>
        </div>
        ${newCount > 0 ? `
          <div class="mt-1">
            <span class="text-xs font-semibold px-3 py-1.5 rounded-full" style="background: rgba(244,114,182,0.15); border: 1px solid rgba(244,114,182,0.25); color: #f472b6;">
              ${newCount} neu
            </span>
          </div>
        ` : ''}
      </div>
    </div>
  `
}

function renderNav() {
  const tabs = [
    { id: 'liste', label: 'Events' },
    { id: 'kalender', label: 'Kalender' },
    { id: 'gemerkt', label: `Gemerkt${bookmarked.length > 0 ? ' · ' + bookmarked.length : ''}` },
  ]
  return `
    <div class="flex gap-1.5 mb-6 p-1 rounded-2xl glass">
      ${tabs.map(t => `
        <button data-nav="${t.id}" class="flex-1 py-2.5 rounded-xl text-sm font-semibold syne transition-all duration-200 ${
          currentView === t.id ? 'text-white' : 'text-slate-500 hover:text-slate-300'
        }" ${currentView === t.id ? 'style="background: linear-gradient(135deg, rgba(99,102,241,0.5), rgba(168,85,247,0.5)); border: 1px solid rgba(99,102,241,0.3); backdrop-filter: blur(10px);"' : ''}>
          ${t.label}
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
    <div class="glass rounded-2xl p-4 mb-5 space-y-3">
      <div class="flex gap-2">
        ${['Berlin', 'Leipzig'].map(c => `
          <button data-city="${c}" class="flex-1 py-2 rounded-xl text-sm font-semibold syne tracking-wide transition-all duration-200 ${
            filters.cities.includes(c) ? 'text-white' : 'text-slate-600 hover:text-slate-400'
          }" style="${filters.cities.includes(c)
            ? 'background: rgba(99,102,241,0.2); border: 1px solid rgba(99,102,241,0.35);'
            : 'background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);'}">
            ${c}
          </button>
        `).join('')}
      </div>

      <div class="flex gap-2">
        ${[
          { val: 'alle', label: 'Alle' },
          { val: 'konzert', label: 'Konzerte' },
          { val: 'party', label: 'Partys' }
        ].map(t => `
          <button data-type="${t.val}" class="flex-1 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
            filters.type === t.val ? 'text-white' : 'text-slate-600 hover:text-slate-400'
          }" style="${filters.type === t.val
            ? 'background: rgba(168,85,247,0.2); border: 1px solid rgba(168,85,247,0.3);'
            : 'background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);'}">
            ${t.label}
          </button>
        `).join('')}
      </div>

      <select data-location-filter class="w-full rounded-xl px-3 py-2.5 text-sm text-slate-400 appearance-none outline-none" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.6);">
        <option value="alle">Alle Locations</option>
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

  const groups = {}
  filtered.forEach(e => {
    const d = new Date(e.date + 'T12:00:00')
    const diff = Math.floor((d - today) / 86400000)
    let label
    if (diff === 0) label = 'Heute'
    else if (diff === 1) label = 'Morgen'
    else if (diff <= 7) label = 'Diese Woche'
    else if (diff <= 14) label = 'Nächste Woche'
    else label = d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
    if (!groups[label]) groups[label] = []
    groups[label].push(e)
  })

  if (Object.keys(groups).length === 0) {
    return `
      ${renderFilters()}
      <div class="text-center py-20 text-slate-600">
        <p class="syne text-2xl mb-2">—</p>
        <p class="text-sm">Keine Events gefunden.</p>
      </div>
    `
  }

  return `
    ${renderFilters()}
    <div class="space-y-8">
      ${Object.entries(groups).map(([label, evts]) => `
        <div>
          <div class="flex items-center gap-3 mb-4">
            <div class="h-px flex-1" style="background: rgba(255,255,255,0.06);"></div>
            <span class="syne text-xs font-700 tracking-widest uppercase" style="color: rgba(255,255,255,0.25);">${label}</span>
            <div class="h-px flex-1" style="background: rgba(255,255,255,0.06);"></div>
          </div>
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

  const accentColor = isKonzert ? 'rgba(99,102,241,' : 'rgba(251,146,60,'
  const accentSolid = isKonzert ? '#818cf8' : '#fb923c'

  return `
    <div class="card-hover rounded-2xl overflow-hidden" style="
      background: rgba(255,255,255,0.03);
      border: 1px solid ${isGoing ? 'rgba(52,211,153,0.3)' : accentColor + '0.12)'};
      box-shadow: 0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05);
    ">
      <!-- Top accent line -->
      <div style="height: 2px; background: linear-gradient(90deg, ${accentSolid}, transparent);"></div>

      <div class="p-4">
        <div class="flex justify-between items-start gap-3">
          <div class="flex-1 min-w-0">

            <!-- Date & badges row -->
            <div class="flex items-center gap-2 mb-2 flex-wrap">
              <span class="syne text-xs font-700" style="color: ${accentSolid};">${dateStr} · ${e.time}</span>
              ${eventIsNew ? '<span class="text-xs font-bold" style="color: #f472b6; letter-spacing: 0.05em;">NEW</span>' : ''}
              ${isGoing ? '<span class="text-xs font-semibold" style="color: #34d399;">✓ dabei</span>' : ''}
            </div>

            <!-- Title -->
            <h3 class="syne font-700 text-white leading-tight mb-1" style="font-size: 1rem; letter-spacing: -0.01em;">${e.title}</h3>

            <!-- Location -->
            <p class="text-xs mb-2" style="color: rgba(255,255,255,0.35);">
              ${loc ? loc.name + ' <span style="color:rgba(255,255,255,0.15);">·</span> ' + loc.city : ''}
              ${e.type === 'konzert'
                ? '<span style="margin-left:6px; color: rgba(99,102,241,0.7);">Konzert</span>'
                : '<span style="margin-left:6px; color: rgba(251,146,60,0.7);">Party</span>'}
            </p>

            <!-- Artist bio -->
            ${e.description ? `
              <p class="text-xs leading-relaxed mb-3" style="color: rgba(255,255,255,0.4);">${e.description}</p>
            ` : ''}

          </div>

          <!-- Action icons -->
          <div class="flex flex-col gap-3 items-center pt-1">
            <button data-bookmark="${e.id}" title="Vormerken" class="text-lg transition-all duration-200 hover:scale-110" style="color: ${isBookmarked ? '#f472b6' : 'rgba(255,255,255,0.2)'};">♡</button>
            <button data-going="${e.id}" title="Ich gehe hin" class="text-lg transition-all duration-200 hover:scale-110" style="color: ${isGoing ? '#34d399' : 'rgba(255,255,255,0.2)'};">✓</button>
          </div>
        </div>

        <!-- Action buttons -->
        <div class="flex gap-2 flex-wrap mt-1">
          ${e.ticketUrl ? `
            <a href="${e.ticketUrl}" target="_blank" class="btn-glass text-xs font-medium px-3 py-1.5 rounded-lg text-slate-400 hover:text-white inline-block">
              Tickets →
            </a>
          ` : ''}
          ${e.spotifyUrl ? `
            <a href="${e.spotifyUrl}" target="_blank" class="btn-glass text-xs font-medium px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5" style="color: #1db954; border-color: rgba(29,185,84,0.2);">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#1db954"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
              Spotify
            </a>
          ` : ''}
          <button data-share="${e.id}" class="btn-glass text-xs font-medium px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-300">
            Teilen
          </button>
          ${isBookmarked ? `
            <button data-ics="${e.id}" class="btn-glass text-xs font-medium px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-300">
              + Kalender
            </button>
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
  const filtered = filteredAll.filter(e => {
    if (filters.dates.length === 0) return true
    return filters.dates.includes(e.date)
  })

  return `
    ${renderFilters()}
    <div class="glass rounded-2xl p-5 mb-5">
      <div class="flex items-center justify-between mb-5">
        <button data-cal-prev class="btn-glass w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white">‹</button>
        <h2 class="syne font-700 text-white tracking-wide capitalize">${monthName}</h2>
        <button data-cal-next class="btn-glass w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white">›</button>
      </div>

      <div class="grid grid-cols-7 gap-1 text-center mb-3">
        ${['Mo','Di','Mi','Do','Fr','Sa','So'].map(d => `
          <div class="text-xs font-semibold py-1" style="color: rgba(255,255,255,0.2);">${d}</div>
        `).join('')}
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
            <button data-date="${dateStr}" class="aspect-square rounded-xl text-sm font-medium flex items-center justify-center relative transition-all duration-150
              ${isPast ? 'opacity-25' : ''}
              ${!hasEvent && !isSelected && !isToday ? 'text-slate-700' : 'text-white'}
            " style="${
              isSelected
                ? 'background: rgba(99,102,241,0.5); border: 1px solid rgba(99,102,241,0.6);'
                : hasEvent
                  ? 'background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.25);'
                  : isToday
                    ? 'border: 1px solid rgba(255,255,255,0.2);'
                    : ''
            }">
              ${day}
              ${hasEvent && !isSelected ? `<span style="position:absolute;bottom:3px;left:50%;transform:translateX(-50%);width:3px;height:3px;border-radius:50%;background:#818cf8;"></span>` : ''}
            </button>
          `
        }).join('')}
      </div>

      ${filters.dates.length > 0 ? `
        <button data-clear-dates class="mt-4 w-full text-xs py-2 rounded-xl text-slate-500 hover:text-slate-300 transition-all btn-glass">
          Auswahl zurücksetzen (${filters.dates.length} ${filters.dates.length === 1 ? 'Tag' : 'Tage'})
        </button>
      ` : `<p class="text-center text-xs mt-4" style="color: rgba(255,255,255,0.15);">Tage antippen zum Filtern · Mehrfachauswahl möglich</p>`}
    </div>

    <div class="space-y-3">
      ${filters.dates.length > 0 && filtered.length === 0
        ? '<p class="text-center text-slate-600 py-6 text-sm">Keine Events an den gewählten Tagen.</p>'
        : filtered.map(e => renderEventCard(e)).join('')}
    </div>
  `
}

function renderBookmarkedView() {
  const bookmarkedEvents = events.filter(e => bookmarked.includes(e.id))
  const goingEvents = events.filter(e => going.includes(e.id))

  const section = (title, evts, emptyText) => `
    <div>
      <div class="flex items-center gap-3 mb-4">
        <div class="h-px flex-1" style="background: rgba(255,255,255,0.06);"></div>
        <span class="syne text-xs font-700 tracking-widest uppercase" style="color: rgba(255,255,255,0.25);">${title}</span>
        <div class="h-px flex-1" style="background: rgba(255,255,255,0.06);"></div>
      </div>
      ${evts.length === 0
        ? `<p class="text-slate-700 text-sm py-4 text-center">${emptyText}</p>`
        : `<div class="space-y-3">${evts.map(e => renderEventCard(e)).join('')}</div>`}
    </div>
  `

  return `
    <div class="space-y-8 pt-2">
      ${section('Dabei · ' + goingEvents.length, goingEvents, 'Noch keine Events.')}
      ${section('Vorgemerkt · ' + bookmarkedEvents.length, bookmarkedEvents, 'Noch keine Events.')}
    </div>
  `
}

function renderAddButton() {
  return `
    <button data-open-add class="fixed bottom-6 right-6 w-14 h-14 text-white rounded-2xl text-2xl shadow-2xl flex items-center justify-center z-50 transition-all hover:scale-105 active:scale-95 syne font-300" style="background: linear-gradient(135deg, rgba(99,102,241,0.8), rgba(168,85,247,0.8)); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.15); box-shadow: 0 8px 32px rgba(99,102,241,0.3);">
      +
    </button>
  `
}

const inputStyle = `
  width: 100%;
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 14px;
  color: white;
  outline: none;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  font-family: 'DM Sans', sans-serif;
`

function renderModals() {
  return `
    <div id="modal-add" class="hidden fixed inset-0 z-50 overflow-y-auto scrollbar-hide" style="background: rgba(0,0,0,0.8); backdrop-filter: blur(8px);">
      <div class="max-w-lg mx-auto mt-8 mb-12 mx-4 rounded-3xl overflow-hidden" style="background: rgba(12,17,32,0.95); border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 24px 80px rgba(0,0,0,0.6);">

        <div class="px-6 py-5" style="background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.15)); border-bottom: 1px solid rgba(255,255,255,0.06);">
          <h2 class="syne text-xl font-800 text-white">Hinzufügen</h2>
          <p class="text-xs mt-0.5" style="color: rgba(255,255,255,0.35);">Event oder Location eintragen</p>
        </div>

        <div class="p-6">
          <div class="flex gap-1.5 mb-5 p-1 rounded-xl glass">
            <button data-add-tab="event" id="tab-event" class="flex-1 py-2 rounded-lg text-sm font-semibold syne text-white" style="background: rgba(99,102,241,0.4); border: 1px solid rgba(99,102,241,0.3);">Event</button>
            <button data-add-tab="location" id="tab-location" class="flex-1 py-2 rounded-lg text-sm font-semibold syne text-slate-500">Location</button>
          </div>

          <div id="add-event-form">${renderAddEventForm()}</div>
          <div id="add-location-form" class="hidden">${renderAddLocationForm()}</div>

          <button data-close-add class="mt-3 w-full py-2 text-xs text-slate-600 hover:text-slate-400 transition-colors">Abbrechen</button>
        </div>
      </div>
    </div>
  `
}

function renderAddEventForm() {
  return `
    <div class="space-y-3">
      <input id="new-title" type="text" placeholder="Titel (z.B. Bandname – Releaseshow)" style="${inputStyle}" />
      <div class="flex gap-2">
        <select id="new-type" style="${inputStyle}">
          <option value="konzert">Konzert</option>
          <option value="party">Party</option>
        </select>
      </div>
      <div class="flex gap-2">
        <input id="new-date" type="date" style="${inputStyle} flex: 1;" />
        <input id="new-time" type="time" style="${inputStyle} flex: 1;" />
      </div>
      <select id="new-location" style="${inputStyle}">
        <option value="">Location wählen...</option>
        ${locations.sort((a,b) => a.name.localeCompare(b.name)).map(l => `<option value="${l.id}">${l.name} (${l.city})</option>`).join('')}
      </select>
      <textarea id="new-desc" placeholder="Kurzbeschreibung: Wer? Woher? Musikrichtung?" style="${inputStyle} height: 70px; resize: none;"></textarea>
      <input id="new-ticket" type="url" placeholder="Ticket-URL (optional)" style="${inputStyle}" />
      <input id="new-spotify" type="url" placeholder="Spotify-Link (optional)" style="${inputStyle}" />
      <button data-save-event class="w-full py-3 rounded-xl font-bold text-white text-sm syne transition-all hover:opacity-90" style="background: linear-gradient(135deg, rgba(99,102,241,0.7), rgba(168,85,247,0.7)); border: 1px solid rgba(99,102,241,0.3);">
        Event speichern
      </button>
    </div>
  `
}

function renderAddLocationForm() {
  return `
    <div class="space-y-3">
      <input id="new-loc-name" type="text" placeholder="Name der Location" style="${inputStyle}" />
      <select id="new-loc-city" style="${inputStyle}">
        <option value="Berlin">Berlin</option>
        <option value="Leipzig">Leipzig</option>
      </select>
      <input id="new-loc-website" type="url" placeholder="Website (optional)" style="${inputStyle}" />
      <input id="new-loc-capacity" type="number" placeholder="Kapazität (optional)" style="${inputStyle}" />
      <button data-save-location class="w-full py-3 rounded-xl font-bold text-white text-sm syne transition-all hover:opacity-90" style="background: linear-gradient(135deg, rgba(99,102,241,0.7), rgba(168,85,247,0.7)); border: 1px solid rgba(99,102,241,0.3);">
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
      } else {
        filters.cities.push(city)
      }
      render()
    })
  })

  document.querySelectorAll('[data-type]').forEach(btn => {
    btn.addEventListener('click', () => { filters.type = btn.dataset.type; render() })
  })

  const locFilter = document.querySelector('[data-location-filter]')
  if (locFilter) locFilter.addEventListener('change', () => { filters.locationId = locFilter.value; render() })

  const calPrev = document.querySelector('[data-cal-prev]')
  const calNext = document.querySelector('[data-cal-next]')
  if (calPrev) calPrev.addEventListener('click', () => { calendarOffset--; render() })
  if (calNext) calNext.addEventListener('click', () => { calendarOffset++; render() })

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

  document.querySelectorAll('[data-bookmark]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.bookmark)
      bookmarked = bookmarked.includes(id) ? bookmarked.filter(b => b !== id) : [...bookmarked, id]
      saveData('bookmarked', bookmarked)
      render()
    })
  })

  document.querySelectorAll('[data-going]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.going)
      going = going.includes(id) ? going.filter(g => g !== id) : [...going, id]
      saveData('going', going)
      render()
    })
  })

  document.querySelectorAll('[data-share]').forEach(btn => {
    btn.addEventListener('click', () => {
      const event = events.find(e => e.id === parseInt(btn.dataset.share))
      if (event) shareViaWhatsApp(event)
    })
  })

  document.querySelectorAll('[data-ics]').forEach(btn => {
    btn.addEventListener('click', () => {
      const event = events.find(e => e.id === parseInt(btn.dataset.ics))
      if (event) generateICS(event)
    })
  })

  const modal = document.getElementById('modal-add')
  document.querySelector('[data-open-add]')?.addEventListener('click', () => modal.classList.remove('hidden'))
  document.querySelector('[data-close-add]')?.addEventListener('click', () => modal.classList.add('hidden'))

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
      source: 'manual'
    }
    // Manuell gespeicherte Events separat in localStorage
    const manual = loadData('manual_events') || []
    manual.push(newEvent)
    saveData('manual_events', manual)
    events.push(newEvent)
    modal.classList.add('hidden')
    render()
  })

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
