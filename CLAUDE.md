# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**LE.BE LIVE** is a PWA concert and club event discovery app for Berlin and Leipzig. It combines a Vite-based frontend, a Node.js multi-venue scraper, and Supabase for auth/bookmarks.

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
- `history` — Per-user durable log of attended concerts (title/location/date snapshot, not an event_id reference, since the scraper prunes past events from events.json); shown in the Gemerkt view below the bookmarked/going cards, see `supabase/history.sql` for schema + RLS

### PWA

Service worker (`public/sw.js`) uses cache-first strategy for the app shell. `vite.config.js` sets `base: '/konzert-app/'` for GitHub Pages subdirectory deployment.
