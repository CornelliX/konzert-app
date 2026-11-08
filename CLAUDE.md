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

- `manual_events` — Legacy: nur lesend (Policy "Jeder kann lesen"); der Schreibzugriff wurde entfernt, kein Client-Code fügt mehr Events ein. Wird beim Start in `getEvents()` mit den gescrapten Events zusammengeführt.
- `bookmarks` — Per-user event bookmarks with status `"bookmarked"` or `"going"`
- `radar` — Per-user watchlist of artists without an upcoming show; matched against events on load, see `supabase/radar.sql` for schema + RLS
- `history` — Per-user durable log of attended concerts (title/location/date snapshot, not an event_id reference, since the scraper prunes past events from events.json); shown in its own History tab (between Gemerkt and Radar), see `supabase/history.sql` for schema + RLS
- `profiles` — Per-user Lord-Titel (display name) and opt-in switches `share_history` / `share_bookmarks` (default off); `public_id` is the only ID visible to others (never the auth ID/email). Only `user_id, lord_title, share_*` are client-writable (column grants), see `supabase/community.sql`
- `peer_prefs` — Per-viewer alias and favorite flag for other users' shared histories (keyed by `peer_public_id`)
- Other users' data is only reachable through security-definer RPCs, all `authenticated`-only: `get_community_histories()` (shared histories, attended concerts only), `get_community_bookmarks()` (shared Merklisten: event_id + status per Lord) and `get_event_lords(event_ids)` (who marked an event, with Lord-Titel; shown under the cards of "Meine Merkliste"). `supabase/community_v2.sql` adds the last two (run after `community.sql`). History and Gemerkt tabs are carousels ("Meine …" + one slide per sharing Lord, favorites first, then alphabetical); swiping works only on the header (title + dots) so it never clashes with the card swipes. Lord names are resolved client-side (`peerNames()`: Lord-Titel, else the viewer's alias, else "Namenlos", duplicates numbered). Settings (gear icon replacing the search lupe) hold Lord-Titel and the two switches; the Anleitung (`SETTINGS_GUIDE` in `app.js`, keep it in sync with feature changes) opens via "? Hilfe". The Statistik is no longer in the settings: the History carousel head has a bar-chart icon (`data-open-stats`) under the "+" (own history) or under the favorite star (another Lord's history) that opens `modal-settings` in `settingsMode = 'stats'` (`statsPeerId` = `'own'` or the Lord's publicId; title "Statistik" / "Statistik von Lord …"; a Lord's stats are compared against me plus the other Lords). (`computeStats`/`renderStatsHtml(entries, peerEntries)` in `app.js`: this year / collapsible "Vorherige Jahre" with one block per earlier year in the own history / overall, computed client-side from the own history vs. `communityRaw`; crown = LORD-REKORD if no sharing Lord has a higher value, ties all win, never for 0/empty or without peers; Top-5 locations count distinct visit days, ties share a rank, location spellings are unified by `canonLocation` ("X, Berlin" vs "X" + city; also used when saving history entries); no extra SQL)

### PWA

Service worker (`public/sw.js`) uses cache-first strategy for the app shell. `vite.config.js` sets `base: '/konzert-app/'` for GitHub Pages subdirectory deployment.

### UI notes

Event cards keep the swipe/hover actions only (visible Merken/Dabei buttons and a "⋯" menu were tried and removed on request); `toggleBookmarkStatus`/`toggleGoingStatus` do the work and every status change offers an undo toast (`offerUndo`). All icons (info, Spotify, Apple, Google, share) stay in one row. The event list appends the next batch on scroll (`appendMoreEvents`, no full re-render) and the carousels clip horizontally (`overflow-x: clip`) because zoom is allowed and a horizontal overflow makes iOS rescale the page. Double tap on a nav tab: Events = scroll to top, Kalender = current month, Radar = radar list to top, Gemerkt/History = own list. "? Hilfe" shows only the guide (`settingsMode = 'help'`), the settings modal has no guide. Touch targets are >= 44 px, faint text is >= 0.6 alpha white, inputs are 16 px (zoom stays allowed). The C64 intro bars animate via `transform` (compositor) so they keep moving while the main thread renders. A git tag `vor-ux-umbau` marks the state before this UX overhaul.
