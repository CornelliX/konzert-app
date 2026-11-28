# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**LiveLords** (written LIVELORDS in the in-app header logo; formerly "LE.BE LIVE") is a PWA concert and club event discovery app for Berlin and Leipzig. It combines a Vite-based frontend, a Node.js multi-venue scraper, and Supabase for auth/bookmarks.

## Commands

```bash
# Frontend development
npm run dev        # Start Vite dev server
npm run build      # Build for production
npm run preview    # Preview production build

# Scraper (run from scraper/ directory)
cd scraper && node scrape.js   # Run all scrapers, outputs public/events.json
```

There are no test or lint commands configured.

## Architecture

### Data Flow

1. `scraper/scrape.js` fetches 50+ Berlin/Leipzig venue websites → writes `public/events.json`
2. GitHub Actions runs scraper weekly (Wednesdays) and on push to main, then deploys to GitHub Pages at `/konzert-app/`
3. Frontend (`src/app.js`) fetches `events.json` + user-added events from Supabase
4. Bookmarks/attendance stored in localStorage and synced to Supabase when authenticated

### Frontend (`src/`)

- **`app.js`** — Monolithic UI component (~1000+ lines). All views (list, calendar, bookmarks), filters, and rendering logic live here. Uses inline HTML/CSS/JS patterns with Tailwind utility classes.
- **`data.js`** — localStorage management, location/venue data, and merging scraped + cached events on startup.
- **`supabase.js`** — Auth (magic link/email OTP), manual events CRUD, and bookmarks. Session stored in both localStorage and cookies for iOS Safari compatibility.
- **`main.js`** — Entry point; registers PWA service worker.

### Scraper (`scraper/scrape.js`)

Single large file (~2900 lines) with one async function per venue. Key shared utilities:

- `detectType(title, description)` — Classifies events as `konzert`, `party`, or `sonstige`
- `NOT_MUSIC` (in `main`) — drops non-music events entirely (Vortrag, Werkstatt, Mitmach, Plenum, Podium, Seminar, Infoveranstaltung, party-political events like Die Linke/SPD/…); title match always drops, description-only match keeps events also tagged party/konzert/festival/live/DJ
- `parseGermanDate(str)` — Handles various German date formats
- `stableId(locationId, date, title)` — Deterministic hash ID for deduplication across runs
- Scraping methods used: cheerio (static HTML), Puppeteer (JS-heavy sites), RSS feeds, iCal parsing

### Event Data Shape

```javascript
{
  id: number,
  title: string,
  date: "YYYY-MM-DD",
  time: "HH:MM",
  locationId: number,
  type: "konzert" | "party" | "sonstige",
  description: string,
  ticketUrl: string,
  spotifyUrl: string,
  source: string,
  addedAt: "YYYY-MM-DD"
}
```

`addedAt` is preserved across scraper runs to power "new event" indicators in the UI.

### Location/Venue Data

Venues are defined in `src/data.js` as a locations array. Each scraper function in `scrape.js` uses a hardcoded `locationId` matching this list. When adding a new venue, both files need updating.

### Supabase Tables

- `manual_events` — Legacy: nur lesend (Policy "Jeder kann lesen"); der Schreibzugriff wurde entfernt, kein Client-Code fügt mehr Events ein. Wird nach dem Start im Hintergrund nachgeladen und an die gescrapten Events angehängt (`loadManualEvents()` in `renderApp`); die Tabelle ist derzeit leer.
- `bookmarks` — Per-user event bookmarks with status `"bookmarked"` or `"going"`
- `radar` — Per-user watchlist of artists without an upcoming show; artists whose latest history concert gets 5 stars are added automatically (was 4–5 until 11/2026; existing entries were kept); matched against events on load, see `supabase/radar.sql` for schema + RLS
- `history` — Per-user durable log of attended concerts (title/location/date snapshot, not an event_id reference, since the scraper prunes past events from events.json); shown in its own History tab (between Gemerkt and Radar), see `supabase/history.sql` for schema + RLS. Up to 3 memory photos per entry (`history.photo_paths`, one JPEG per photo in the private bucket `history-photos` as `<user_id>/<uuid>.jpg`, `supabase/photos.sql` must be run once): picked in the "+" form and the edit dialog (staged, uploaded on Save), resized client-side to 1200 px (`src/photos.js`), shown as a swipeable scroll-snap gallery inside the history row (arrows/dots for >1). Images load lazily (IntersectionObserver) via batched signed URLs and are cached forever in the Cache API cache `lebe-photos` keyed by object name (`public/sw.js` must not delete it). Other Lords only get `photo_paths` from `get_community_histories()` if `profiles.share_photos` and `share_history` are on (storage policy uses `photos_shared()`)
- `profiles` — Per-user Lord-Titel (display name) and opt-in switches `share_history` / `share_bookmarks` (default off); `public_id` is the only ID visible to others (never the auth ID/email). Only `user_id, lord_title, share_*` are client-writable (column grants), see `supabase/community.sql`
- `peer_prefs` — Per-viewer alias and favorite flag for other users' shared histories (keyed by `peer_public_id`)
- Other users' data is only reachable through security-definer RPCs, all `authenticated`-only: `get_community_histories()` (shared histories, attended concerts only), `get_community_bookmarks()` (shared Merklisten: event_id + status per Lord) and `get_event_lords(event_ids)` (who marked an event, with Lord-Titel; shown under the cards of "Meine Merkliste"). `supabase/community_v2.sql` adds the last two (run after `community.sql`). History and Gemerkt tabs are carousels ("Meine …" + one slide per sharing Lord, favorites first, then alphabetical); swiping works only on the header (title + dots) so it never clashes with the card swipes. Lord names are resolved client-side (`peerNames()`: Lord-Titel, else the viewer's alias, else "Namenlos", duplicates numbered). Settings (gear icon replacing the search lupe) hold Lord-Titel and the two switches; the Anleitung (`SETTINGS_GUIDE` in `app.js`, keep it in sync with feature changes) opens via "? Hilfe". The Statistik is no longer in the settings: the History carousel head has a bar-chart icon (`data-open-stats`) under the "+" (own history) or under the favorite star (another Lord's history) that opens `modal-settings` in `settingsMode = 'stats'` (`statsPeerId` = `'own'` or the Lord's publicId; title "Statistik" / "Statistik von Lord …"; a Lord's stats are compared against me plus the other Lords). (`computeStats`/`renderStatsHtml(entries, peerEntries)` in `app.js`: this year / collapsible "Vorherige Jahre" with one block per earlier year in the own history / overall, computed client-side from the own history vs. `communityRaw`; crown = LORD-REKORD if no sharing Lord has a higher value, ties all win, never for 0/empty or without peers; Top-5 locations count distinct visit days, ties share a rank, location spellings are unified by `canonLocation` ("X, Berlin" vs "X" + city; also used when saving history entries); no extra SQL)

### PWA

Service worker (`public/sw.js`) uses cache-first strategy for the app shell. `vite.config.js` sets `base: '/konzert-app/'` for GitHub Pages subdirectory deployment.

### UI notes

Event cards keep the swipe/hover actions only (visible Merken/Dabei buttons and a "⋯" menu were tried and removed on request); `toggleBookmarkStatus`/`toggleGoingStatus` do the work and every status change offers an undo toast (`offerUndo`). All icons (info, Spotify, Apple, Google, share) stay in one row. The event list appends the next batch on scroll (`appendMoreEvents`, no full re-render) and the carousels clip horizontally (`overflow-x: clip`) because zoom is allowed and a horizontal overflow makes iOS rescale the page. Double tap on a nav tab: Events = scroll to top, Kalender = current month, Radar = radar list to top, Gemerkt/History = own list. "? Hilfe" shows only the guide (`settingsMode = 'help'`), the settings modal has no guide. Touch targets are >= 44 px, faint text is >= 0.6 alpha white, inputs are 16 px (zoom stays allowed). Startup speed: `public/sw.js` serves `events.json` stale-while-revalidate (cache `lebe-events`, kept by the activate cleanup): the app starts with the stored list and, if the background fetch differs, the SW posts `events-updated` and `applyEventsUpdate()` in `app.js` swaps the list in (re-checks bookmarks/radar, re-renders only if nothing is in progress). `index.html` starts the `events.json` fetch itself (`window.__eventsP`, consumed once by `getEvents()` in `data.js`) and loads the Tailwind CDN script `async`, so neither waits for the other; `renderApp` waits at most 0.3 s for `window.tailwind` before its first render; it draws with `peekUser()` + the locally stored bookmarks, and `loadAccountData()` then verifies the login and loads bookmarks/radar/history from Supabase in the background (re-render only when logged in); `index.html` preconnects to Supabase. The C64 intro is static markup in `index.html` (`#c64-intro`, first session open only: an inline head script sets `html.intro-on` or `html.no-intro` from sessionStorage `lebe-loaded`) and lasts a constant 2 s: the inline script drives it from a `requestAnimationFrame` loop (1.6 s after the first frame, then a 0.4 s CSS opacity transition, which keeps running on the compositor if the page stalls). On the iPhone the main thread stalled ~4 s after start (timers and frames alike); the cause was most likely the radar check (31 artists x 2700 event titles through `extractArtists`, Unicode emoji regex), now memoized in `artistMatchesEvent` (`artistCache`). Keep heavy per-event loops out of `loadAccountData`/`applyEventsUpdate`. If the app has not rendered by then, the intro waits for `window.__introRelease()`, which `renderApp` calls once frames are smooth again (3 frames < 50 ms, max 1 s). The Press Start 2P font is embedded in style.css. The fade removes `html.intro-on`, which un-pauses the header glow (starts 0.3 s later); `render()` keeps the existing `#app-header` node so a background re-render never cuts off or restarts the glow (pull-to-refresh removes it to replay). Diagnostic: the start timings (`localStorage.startTiming`) are shown at the bottom of the guide, remove once the intro is confirmed. Keep new startup work out of the critical path. The C64 intro bars animate via `transform` (compositor). A git tag `vor-ux-umbau` marks the state before this UX overhaul.
